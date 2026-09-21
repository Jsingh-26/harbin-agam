import './style.css'

const isNative = new URLSearchParams(location.search).has('nativePreview') || Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.())

if (isNative) {
  document.documentElement.classList.add('native-app')
  void import('./mobile')
} else {
  void import('./web')
}
