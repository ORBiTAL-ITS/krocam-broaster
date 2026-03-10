import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Web Client ID de Google (OAuth 2.0) para Sign-In nativo en la app.
 * Obtener en: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs (tipo Web).
 * Mismo proyecto que Firebase.
 */
const googleWebClientId =
  typeof process !== 'undefined' && process.env?.VITE_GOOGLE_WEB_CLIENT_ID
    ? process.env.VITE_GOOGLE_WEB_CLIENT_ID
    : '';

const config: CapacitorConfig = {
  appId: 'com.orbitalits.krocambroaster',
  appName: 'Krocam Broaster Samir',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: googleWebClientId,
    },
    FirebaseMessaging: {
      presentationOptions: ['alert', 'badge', 'sound'],
    },
    // Capgo Social Login: solo usamos Google y (opcional) Apple.
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: true,
        twitter: false,
      },
      logLevel: 1,
    },
  },
};

export default config;
