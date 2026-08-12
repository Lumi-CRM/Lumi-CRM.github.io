import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.lumicrm.office',
  appName: 'LumiCRM',
  webDir: 'dist',
  android: {
    backgroundColor: '#070b14',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_launcher_foreground',
      iconColor: '#4f46e5',
    },
  },
}

export default config
