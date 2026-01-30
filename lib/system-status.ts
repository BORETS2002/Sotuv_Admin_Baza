// System status monitoring utilities

// Performance metrics
interface PerformanceMetrics {
  pageLoadTime: number
  resourceLoadTime: number
  domInteractive: number
  domComplete: number
}

// Track page load performance
export function trackPagePerformance(): PerformanceMetrics | null {
  if (typeof window === "undefined" || !window.performance) {
    return null
  }

  try {
    const perfData = window.performance.timing
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart
    const resourceLoadTime = perfData.domComplete - perfData.domLoading
    const domInteractive = perfData.domInteractive - perfData.navigationStart
    const domComplete = perfData.domComplete - perfData.navigationStart

    return {
      pageLoadTime,
      resourceLoadTime,
      domInteractive,
      domComplete,
    }
  } catch (error) {
    console.error("Error tracking performance:", error)
    return null
  }
}

// Check browser storage availability
export function checkStorageAvailability(): { localStorage: boolean; sessionStorage: boolean } {
  let localStorageAvailable = false
  let sessionStorageAvailable = false

  try {
    localStorage.setItem("test", "test")
    localStorage.removeItem("test")
    localStorageAvailable = true
  } catch (e) {
    localStorageAvailable = false
  }

  try {
    sessionStorage.setItem("test", "test")
    sessionStorage.removeItem("test")
    sessionStorageAvailable = true
  } catch (e) {
    sessionStorageAvailable = false
  }

  return {
    localStorage: localStorageAvailable,
    sessionStorage: sessionStorageAvailable,
  }
}

// Check network status
export function getNetworkInfo(): { online: boolean; connectionType: string | null } {
  if (typeof navigator === "undefined") {
    return { online: true, connectionType: null }
  }

  const online = navigator.onLine

  // Get connection type if available
  let connectionType = null
  if ("connection" in navigator && navigator.connection) {
    connectionType = (navigator as any).connection.effectiveType || null
  }

  return { online, connectionType }
}

// Check browser compatibility
export function checkBrowserCompatibility(): { compatible: boolean; issues: string[] } {
  const issues: string[] = []

  if (typeof window === "undefined") {
    return { compatible: true, issues: [] }
  }

  // Check for essential features
  if (!window.localStorage) {
    issues.push("localStorage not supported")
  }

  if (!window.fetch) {
    issues.push("fetch API not supported")
  }

  if (!window.Promise) {
    issues.push("Promises not supported")
  }

  if (!window.history || !window.history.pushState) {
    issues.push("History API not supported")
  }

  return {
    compatible: issues.length === 0,
    issues,
  }
}

// Log system diagnostics
export function logSystemDiagnostics(): void {
  if (typeof window === "undefined") return

  const performance = trackPagePerformance()
  const storage = checkStorageAvailability()
  const network = getNetworkInfo()
  const browser = checkBrowserCompatibility()

  console.group("System Diagnostics")
  console.log("Performance:", performance)
  console.log("Storage:", storage)
  console.log("Network:", network)
  console.log("Browser Compatibility:", browser)
  console.groupEnd()
}
