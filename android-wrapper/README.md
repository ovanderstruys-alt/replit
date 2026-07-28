# ProofTrack — Android APK

This directory contains the [Capacitor](https://capacitorjs.com/) wrapper that
turns the ProofTrack web app into a real, installable Android app.  The APK
loads the live hosted web app inside a full-screen WebView — so any changes you
deploy to Replit are reflected immediately without rebuilding the APK.

---

## How it works

```
Your phone  ──▶  ProofTrack.apk (this wrapper)
                     └── WebView ──▶  https://your-deployed-app.replit.app/
```

The APK is a thin native shell (~5 MB).  All the real UI and logic live in the
hosted web app.  Camera access goes through Android's native file-chooser/camera
intent, which Capacitor enables automatically — no browser address bar, no
"Add to Home Screen" shortcut.

---

## Building the APK (recommended: GitHub Actions)

### Step 1 — Deploy your Replit app first

The APK needs a **stable URL** to load.  The Replit dev-domain
(`*.replit.dev`) works while you're working but can change; use the deployed
production URL for the permanent APK.

Deploy the app in Replit (click **Publish** or use the Deploy pane), then copy
the URL — it looks like `https://prooftrack.replit.app/`.

### Step 2 — Push this project to GitHub

From the Replit shell:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 3 — Add your app URL as a GitHub secret

In your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|------|-------|
| `APP_URL` | `https://your-deployed-app.replit.app/` |

### Step 4 — Run the workflow

Go to **Actions → Build ProofTrack APK → Run workflow**.

GitHub will:
1. Install Java 17 + Android SDK
2. Run `npx cap sync android` (bakes your URL into the APK)
3. Build `app-debug.apk`
4. Upload it as a downloadable artifact (kept for 30 days)

Click the finished run → scroll to **Artifacts** → download **ProofTrack-debug**.

---

## Installing the APK on your Android phone (sideloading)

1. **Transfer the APK** to your phone (AirDrop-equivalent: send via Google Drive,
   email yourself, USB cable, or use the Files app).

2. **Enable unknown sources** on your phone:
   - Android 8+: Settings → Apps → Special app access → Install unknown apps →
     pick your file manager → Allow
   - Older: Settings → Security → Unknown sources → Enable

3. **Tap the APK file** in your file manager and follow the install prompt.

4. **Launch ProofTrack** from your app drawer — full-screen, no browser bar,
   with its own icon.

---

## Updating the APK

When you change the **URL** (e.g. new deployment domain), re-run the GitHub
Actions workflow.  When you only change the **web app** content, you do
**not** need to rebuild — the APK always loads the latest deployed version.

---

## Local build (optional)

If you have Android Studio / the Android SDK installed locally:

```bash
cd android-wrapper
npm ci
APP_URL=https://your-app.replit.app/ npx cap sync android
cd android
./gradlew assembleDebug
# APK is at: app/build/outputs/apk/debug/app-debug.apk
```

---

## Camera permissions

The following permissions are declared in `AndroidManifest.xml`:

| Permission | Why |
|-----------|-----|
| `CAMERA` | Take photos/videos directly in-app |
| `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` | Upload from gallery (Android 13+) |
| `READ_EXTERNAL_STORAGE` | Upload from gallery (Android ≤ 12) |
| `INTERNET` | Load the hosted web app |

Android will prompt the user to grant camera/storage when they first try to
submit proof.
