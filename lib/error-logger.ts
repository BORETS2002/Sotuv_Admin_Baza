// Error logging and monitoring utilities

interface ErrorLogEntry {
  timestamp: string
  message: string
  stack?: string
  componentName?: string
  userId?: string
  url: string
  userAgent: string
}

// Maximum number of error logs to keep in local storage
const MAX_ERROR_LOGS = 50
const ERROR_LOG_KEY = "warehouse_error_logs"

// Log an error
export function logError(error: Error, componentName?: string): void {
  try {
    const user = localStorage.getItem("user")
    const userId = user ? JSON.parse(user).id : undefined

    const errorEntry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentName,
      userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
    }

    // Save to local storage
    saveErrorLog(errorEntry)

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error logged:", errorEntry)
    }

    // Here you could send the error to a server-side logging service
    // sendErrorToServer(errorEntry)
  } catch (loggingError) {
    console.error("Error while logging error:", loggingError)
  }
}

// Save error log to local storage
function saveErrorLog(entry: ErrorLogEntry): void {
  try {
    // Get existing logs
    const existingLogsJson = localStorage.getItem(ERROR_LOG_KEY)
    const existingLogs: ErrorLogEntry[] = existingLogsJson ? JSON.parse(existingLogsJson) : []

    // Add new log and limit the size
    const updatedLogs = [entry, ...existingLogs].slice(0, MAX_ERROR_LOGS)

    // Save back to local storage
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(updatedLogs))
  } catch (error) {
    console.error("Failed to save error log:", error)
  }
}

// Get all error logs
export function getErrorLogs(): ErrorLogEntry[] {
  try {
    const logsJson = localStorage.getItem(ERROR_LOG_KEY)
    return logsJson ? JSON.parse(logsJson) : []
  } catch (error) {
    console.error("Failed to retrieve error logs:", error)
    return []
  }
}

// Clear all error logs
export function clearErrorLogs(): void {
  try {
    localStorage.removeItem(ERROR_LOG_KEY)
  } catch (error) {
    console.error("Failed to clear error logs:", error)
  }
}

// Setup global error handler
export function setupGlobalErrorHandler(): () => void {
  const errorHandler = (event: ErrorEvent) => {
    logError(event.error || new Error(event.message))
    // Don't prevent default to allow browser's default error handling
  }

  const rejectionHandler = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))

    logError(error, "UnhandledPromiseRejection")
  }

  window.addEventListener("error", errorHandler)
  window.addEventListener("unhandledrejection", rejectionHandler)

  // Return cleanup function
  return () => {
    window.removeEventListener("error", errorHandler)
    window.removeEventListener("unhandledrejection", rejectionHandler)
  }
}
