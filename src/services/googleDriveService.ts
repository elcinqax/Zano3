import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { DriveBackupFile } from '../types';

// Ensure single Firebase instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Workspace Drive scope: create and manage files created by this app
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to track sign-in state
let isSigningIn = false;
// In-memory token cache (MUST NOT be stored in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

// Subscribed listeners for auth state changes
const authListeners = new Set<(user: User | null, token: string | null) => void>();

const notifyListeners = (user: User | null, token: string | null) => {
  authListeners.forEach((listener) => {
    try {
      listener(user, token);
    } catch (e) {
      console.error('Error in auth listener:', e);
    }
  });
};

/**
 * Initialize Firebase Auth listener.
 */
export const initGoogleAuth = (
  onAuthChange?: (user: User | null, token: string | null) => void
): (() => void) => {
  if (onAuthChange) {
    authListeners.add(onAuthChange);
    // Immediately call with current in-memory state
    onAuthChange(cachedUser, cachedAccessToken);
  }

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      cachedUser = user;
      // If we don't have token but user exists, token might be expired or not in memory
      notifyListeners(user, cachedAccessToken);
    } else {
      cachedUser = null;
      cachedAccessToken = null;
      notifyListeners(null, null);
    }
  });

  return () => {
    if (onAuthChange) authListeners.delete(onAuthChange);
    unsubscribe();
  };
};

/**
 * Sign in with Google Popup and obtain access token
 */
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Google Drive erişim belirteci alınamadı.');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    notifyListeners(result.user, cachedAccessToken);

    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Google Sign-in Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out from Google Auth
 */
export const signOutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
  notifyListeners(null, null);
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getCurrentGoogleUser = (): User | null => {
  return cachedUser;
};

/**
 * Upload a JSON backup file to Google Drive using multipart upload
 */
export const uploadBackupToGoogleDrive = async (
  fileName: string,
  jsonContent: string
): Promise<{ id: string; name: string }> => {
  if (!cachedAccessToken) {
    throw new Error('Google Drive bağlantısı bulunamadı. Lütfen önce Google ile giriş yapın.');
  }

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'MobilSatış POS ve Kasa Yedek Dosyası',
    properties: {
      app: 'mobilsatis',
      type: 'backup',
    },
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      notifyListeners(cachedUser, null);
      throw new Error('Oturum süresi doldu. Lütfen tekrar Google ile giriş yapın.');
    }
    const errText = await response.text();
    throw new Error(`Google Drive yükleme hatası (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return { id: data.id, name: data.name };
};

/**
 * List existing MobilSatış backups stored in Google Drive
 */
export const listGoogleDriveBackups = async (): Promise<DriveBackupFile[]> => {
  if (!cachedAccessToken) {
    return [];
  }

  const query = encodeURIComponent("name contains 'mobilsatis' and trashed = false");
  const fields = encodeURIComponent('files(id, name, size, createdTime, modifiedTime, webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&fields=${fields}&pageSize=20`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      notifyListeners(cachedUser, null);
      throw new Error('Oturum süresi doldu. Lütfen tekrar bağlanın.');
    }
    const err = await response.text();
    throw new Error(`Google Drive listeleme hatası: ${err}`);
  }

  const data = await response.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : undefined,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
  }));
};

/**
 * Download a backup file content from Google Drive by file ID
 */
export const downloadGoogleDriveBackupContent = async (fileId: string): Promise<string> => {
  if (!cachedAccessToken) {
    throw new Error('Google Drive bağlantısı bulunamadı.');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Dosya indirilemedi (${response.status})`);
  }

  return await response.text();
};

/**
 * Delete a backup file from Google Drive (Requires explicit confirmation before calling)
 */
export const deleteGoogleDriveBackup = async (fileId: string): Promise<void> => {
  if (!cachedAccessToken) {
    throw new Error('Google Drive bağlantısı bulunamadı.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Yedek dosyası silinemedi (${response.status})`);
  }
};
