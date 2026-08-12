export const APP_RELEASE_BASE = 'https://github.com/Lumi-CRM/Lumi-CRM.github.io/releases/latest/download'
export const ANDROID_APK_URL = `${APP_RELEASE_BASE}/LumiCRM-Android.apk`
export const WINDOWS_INSTALLER_URL = `${APP_RELEASE_BASE}/LumiCRM-Windows-Setup.exe`

export type AppPlatform = 'android' | 'ios' | 'windows' | 'other'

export const detectAppPlatform = (): AppPlatform => {
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes('android')) return 'android'
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios'
  if (userAgent.includes('windows')) return 'windows'
  return 'other'
}

export const isInstalledApplication = () => {
  const nativeWindow = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
  return window.matchMedia('(display-mode: standalone)').matches
    || navigator.userAgent.includes('Electron')
    || nativeWindow.Capacitor?.isNativePlatform?.() === true
}
