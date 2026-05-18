# Frontend

## Android local signing

Local `npx expo run:android` builds use `android/app/debug.keystore`. To install over an EAS/dev build on the same device and keep Google Maps working, that keystore must use the same app signing key fingerprint that Google APIs are restricted to.

1. Download the Android keystore from EAS:

   ```bash
   npx eas credentials -p android
   ```

   Save the `.jks` file in this folder. The current helper expects `@wtarit__ubc-newcomers.jks`.

2. Import the EAS key into Expo's generated debug keystore:

   ```bash
   npm run android:use-eas-keystore
   ```

   Enter the keystore password, key alias, and key password from EAS when prompted.

3. Build locally:

   ```bash
   npm run android
   ```

The generated `android/` folder does not need manual Gradle signing changes.
