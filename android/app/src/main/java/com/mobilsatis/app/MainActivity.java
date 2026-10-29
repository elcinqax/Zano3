package com.mobilsatis.app;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.util.Base64;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setFitsSystemWindows(true);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new PdfShareBridge(), "AndroidShare");
        // Load bundled web assets or local app URL
        webView.loadUrl("file:///android_asset/dist/index.html");
    }

    private final class PdfShareBridge {
        @JavascriptInterface
        public void sharePdf(String base64Pdf, String fileName) {
            try {
                File file = new File(getCacheDir(), fileName.endsWith(".pdf") ? fileName : fileName + ".pdf");
                try (FileOutputStream output = new FileOutputStream(file)) {
                    output.write(Base64.getDecoder().decode(base64Pdf));
                }
                Uri uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", file);
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType("application/pdf");
                share.putExtra(Intent.EXTRA_STREAM, uri);
                share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivity(Intent.createChooser(share, "PDF'i şu uygulamayla paylaş"));
            } catch (Exception error) {
                error.printStackTrace();
            }
        }
    }

    @Override
    public void onBackPressed() {
        webView.evaluateJavascript("window.dispatchEvent(new Event('appbackbutton'))", null);
    }
}
