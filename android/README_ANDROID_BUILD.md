# Mobil Satış Android APK Projesi

Bu dizin, Mobil Satış uygulamasının yerel Android Studio projesidir.

## APK Derleme Adımları (Android Studio):
1. **Android Studio** programını açın.
2. `Open Project` seçeneğiyle bu `android/` klasörünü seçin.
3. Menüden `Build > Build Bundle(s) / APK(s) > Build APK(s)` seçeneğine tıklayın.
4. Derlenen `.apk` dosyanız `app/build/outputs/apk/debug/app-debug.apk` konumunda oluşturulacaktır.

## Komut Satırından Derleme (Gradle):
```bash
cd android
./gradlew assembleDebug
```
Oluşan APK dosyasını doğrudan Android telefonunuza yükleyebilirsiniz.

## Alternatif: Telefona Doğrudan 1 Tıkla Yükleme (PWA)
Uygulama linkini telefonunuzdaki Chrome tarayıcısında açıp **"Uygulamayı Yükle"** butonuna basarak APK derlemeye gerek kalmadan da doğrudan ana ekranınıza gerçek bir uygulama olarak kurabilirsiniz!
