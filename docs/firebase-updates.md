# Harbin & Agam - private Android updates via Firebase App Distribution

Goal: private, family-only APK updates for `com.jsingh26.harbinagam`, separate
from Cleverbot's Firebase app and release stream. Nothing here creates any
Firebase resource by itself; this is the exact checklist to run once the
gesture review APK is accepted.

## 1. Firebase app (separate from Cleverbot)

1. Firebase console -> project used for the family apps (or a new project).
2. Add Android app: package `com.jsingh26.harbinagam`, nickname "Harbin & Agam".
3. Download `google-services.json`, put it at `android/app/google-services.json`
   (gitignored). The gradle build applies the google-services plugin
   automatically only when that file exists.
4. Enable **App Distribution**, create a tester group (family emails).

## 2. Production signing (keystore)

1. Generate the release keystore (keep a backup in the vault):
   `keytool -genkeypair -v -keystore harbin-agam-release.keystore -alias harbin-agam -keyalg RSA -keysize 2048 -validity 10950`
2. Copy `android/keystore.properties.template` to `android/keystore.properties`
   and fill in the passwords. Both files are gitignored; `assembleRelease`
   signs with this keystore when the properties file exists, otherwise it
   falls back to the debug key so review builds keep compiling anywhere.
3. GitHub secrets for CI: `KEYSTORE_BASE64` (base64 of the keystore),
   `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.

## 3. CI distribution (manual approval)

`.github/workflows/android-firebase.yml` is a manual-dispatch workflow gated
by a GitHub **Environment** named `firebase-distribution` (add required
reviewers so every release needs an explicit approve). Secrets needed:

- `FIREBASE_APP_ID_HARBINAGAM` - from the Firebase app created in step 1
  (format `1:...:android:...`; different app id from Cleverbot).
- `FIREBASE_SERVICE_ACCOUNT` - JSON key of a service account with the
  **Firebase App Distribution Admin** role.
- `GOOGLE_SERVICES_JSON` - contents of the app's google-services.json.

Run: Actions -> "Android - Firebase App Distribution" -> Run workflow ->
approve the environment gate -> testers get the new APK invite/update notice.

## 4. In-app "Check for updates" (after the Firebase app exists)

1. `android/app/build.gradle`: add
   `implementation 'com.google.firebase:firebase-appdistribution'`
   (the google-services plugin already applies conditionally).
2. Small Capacitor plugin bridging
   `FirebaseAppDistribution.updateIfNewReleaseAvailable()` to a
   "Check for updates" row in the game Settings modal; hidden on web.
3. First run: tester signs in via the App Distribution prompt once; after
   that the button reports "up to date" or starts the update.
