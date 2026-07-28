import { CapacitorConfig } from '@capacitor/cli';

// APP_URL should point to your deployed ProofTrack URL.
// Set this env var when running `npx cap sync` or via GitHub Actions secret.
// Falls back to the Replit dev domain for local testing.
const APP_URL =
  process.env.APP_URL ||
  'https://34d75385-cf2e-4b4e-8cd1-034cd5db7efd-00-jwbsphrwddww.kirk.replit.dev/';

const config: CapacitorConfig = {
  appId: 'com.prooftrack.app',
  appName: 'ProofTrack',
  // webDir is required by the CLI but unused when server.url is set
  webDir: 'www',
  server: {
    url: APP_URL,
    // Allow the WebView to load the remote URL (HTTPS only)
    cleartext: false,
  },
  android: {
    // Let Android WebView handle file inputs / camera intents natively
    allowMixedContent: false,
    // Keep screen on while app is open (good for proof capture)
    // Remove if you don't want this behaviour
    backgroundColor: '#0f0f11',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 800,
      backgroundColor: '#0f0f11',
      showSpinner: false,
    },
  },
};

export default config;
