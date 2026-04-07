/**
 * Mobile-safe opening of external URLs (Meet, Zoom, etc.).
 * window.open after await is often blocked; fallback navigates current tab.
 */
export function openExternalUrl(url) {
  if (!url || typeof url !== 'string') return false
  const u = url.trim()
  if (!u) return false
  try {
    const w = window.open(u, '_blank', 'noopener,noreferrer')
    if (w && !w.closed) return true
  } catch (_) {}
  try {
    window.location.assign(u)
    return true
  } catch (_) {
    return false
  }
}

const IOS_LIKE =
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod|iOS/i.test(navigator.userAgent || '')

/**
 * Save blob to device / open preview (works better on iOS than <a download> alone).
 */
export function saveOrOpenBlob(blob, fileName, mimeHint) {
  const type = mimeHint || blob?.type || 'application/octet-stream'
  const b = blob instanceof Blob ? blob : new Blob([blob], { type })
  const name = fileName || 'document'
  const url = URL.createObjectURL(b)

  const revokeLater = () =>
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url)
      } catch (_) {}
    }, 120_000)

  if (IOS_LIKE) {
    try {
      const w = window.open(url, '_blank', 'noopener,noreferrer')
      if (!w) window.location.href = url
    } catch (_) {
      try {
        window.location.href = url
      } catch (_e) {}
    }
    revokeLater()
    return
  }

  try {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch (_) {
    try {
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (_e) {
      window.location.href = url
    }
  }
  revokeLater()
}
