CodeZenzi Android wrapper + GitHub Actions workflow

These are NEW files only. They do not replace your Next.js website source.
The Android app opens https://codezenzii.vercel.app/ in an Android WebView.
The website's Gemini API calls remain on Vercel; do not put the Gemini key in this Android project or in GitHub source files.

Files to add at the root of your existing GitHub repository:
- .github/workflows/build-apk.yml
- android-wrapper/settings.gradle
- android-wrapper/build.gradle
- android-wrapper/gradle.properties
- android-wrapper/app/build.gradle
- android-wrapper/app/src/main/AndroidManifest.xml
- android-wrapper/app/src/main/res/values/styles.xml
- android-wrapper/app/src/main/java/com/codezenzi/app/MainActivity.java

After committing these files:
1. Open the repository's Actions tab.
2. Select "Build CodeZenzi APK" from the left workflow list.
3. Click "Run workflow" and confirm.
4. Open the completed run and download the "CodeZenzi-debug-apk" artifact.
5. Extract the downloaded artifact ZIP; inside is app-debug.apk.

This creates a debug APK for testing. It is not a signed release APK for Play Store publishing.
