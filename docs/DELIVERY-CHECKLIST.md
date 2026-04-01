# Delivery Checklist

## Windows
- Build installer: `npm run desktop:build`
- Installer output: `release/RoofingCRM Setup 0.0.0.exe`
- Unpacked app: `release/win-unpacked/RoofingCRM.exe`
- Data path: app-managed desktop data file via Electron user data folder

## Android
- Build debug APK: `npm run android:debug`
- Build release APK: `npm run android:release`
- Debug APK output: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK output: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

## Before handoff
- Smoke test create/edit/delete flows on Windows
- Smoke test inspection photos and backup export/import on Windows
- Install Android build on a real device and confirm startup, persistence, and file/photo behavior
- Add a final app icon for Windows and Android
- Decide whether Android handoff uses debug install, signed APK, or Play Store/internal sharing
- If delivering Android outside Play Store, generate a signing key and produce a signed release APK
