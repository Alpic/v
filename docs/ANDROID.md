# V Android wrapper

One WebView Activity (`android/app/src/main/kotlin/fi/kuljento/v/MainActivity.kt`) around https://v.kuljento.fi.
Package `fi.kuljento.v`, minSdk 26, target/compile 36. Only AndroidX (core, activity, swiperefreshlayout, webkit).
The APK changes only when native code changes; everything else ships through the website.

## JS contract (web/app.js needs no change)
The wrapper injects, at document start, `window.VApp = { versionCode: <int>, installApk(url) }`
(`versionCode` is a plain number, as `app.js` reads `window.VApp?.versionCode`; `installApk(upd.apk)` takes the `apk` URL from `version.json`).
In a normal browser `window.VApp` is undefined, so the update banner stays hidden.
`installApk`: DownloadManager -> sha256 compared with a fresh `https://v.kuljento.fi/version.json` (aborts if sha256 is null) -> installer intent via FileProvider.
First time Android sends the user to "Install unknown apps" for V; the install continues when they return.
Native-only helpers (`window.VAppNative`: `save`, `retry`, `installApk`) are for the wrapper; do not call them from app code.
The JSON export (`a.download` + blob URL) is saved by the wrapper to Downloads (MediaStore; a save dialog on Android 8-9).

## versionCode
`versionCode = major*10000 + minor*100 + patch` of the tag `app-vX.Y.Z` (so `app-v0.1.0` = 100). Local builds default to versionCode 1, versionName 0.1.0.
The placeholder `web/version.json` (versionCode 1) is overwritten by the first release.

## Create the keystore (once, never commit it)
    keytool -genkeypair -v -keystore v-release.jks -alias v -keyalg RSA -keysize 4096 -validity 10950
    base64 -w0 v-release.jks > v-release.b64      # paste into the secret, then delete this file
Keep `v-release.jks` + passwords in the password manager. Losing the key means users must reinstall.

## GitHub secrets (repo Alpic/v, Settings > Secrets > Actions)
`V_KEYSTORE_B64` (contents of v-release.b64), `V_KEYSTORE_PASS`, `V_KEY_ALIAS` (`v`), `V_KEY_PASS`.
The Gradle build decodes the keystore from env itself. Without them a local `assembleRelease` is unsigned; CI refuses to publish.

## Release
    git tag app-v0.1.0 && git push origin app-v0.1.0
(or Actions > Android > Run workflow with `version` = `0.1.0`). The job builds and signs `v.apk`, creates the GitHub release
`app-v0.1.0` (stable URL https://github.com/Alpic/v/releases/latest/download/v.apk) and commits versionCode, versionName, sha256, size,
date to `web/version.json` on main (Pages then serves it). Note: the "latest" release must be an app release.

## Local
    cd android && ./gradlew assembleDebug     # needs ANDROID_HOME (SDK platform 36, build-tools); no secrets needed
Output: `android/app/build/outputs/apk/debug/app-debug.apk`.
