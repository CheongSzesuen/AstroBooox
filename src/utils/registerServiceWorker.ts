let isReloadingForSw = false

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const swUrl = `/sw.js?v=${encodeURIComponent(__BUILD_VERSION__)}`
  const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' })

  const activateAndReload = () => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  if (registration.waiting) {
    activateAndReload()
  }

  registration.addEventListener('updatefound', () => {
    const installingWorker = registration.installing
    if (!installingWorker) {
      return
    }
    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        activateAndReload()
      }
    })
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isReloadingForSw) {
      return
    }
    isReloadingForSw = true
    window.location.reload()
  })

  window.setInterval(() => {
    registration.update().catch(() => {})
  }, 60 * 1000)
}
