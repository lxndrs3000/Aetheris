import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aetheris.app',
  appName: 'Aetheris',
  webDir: 'dist',
  backgroundColor: '#0d0e14',
  android: {
    backgroundColor: '#0d0e14',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
