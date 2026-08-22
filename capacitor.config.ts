import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.daziu.roofingcrm',
  appName: 'RoofingCRM',
  webDir: 'dist',
  backgroundColor: '#07101e',
  android: {
    backgroundColor: '#07101e',
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#07101e',
      showSpinner: false,
    },
  },
};

export default config;
