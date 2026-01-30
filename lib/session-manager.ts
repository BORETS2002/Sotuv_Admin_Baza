// Session management utilities
const SESSION_KEY = "warehouse_management_session"
const USER_KEY = "user"
const LOGIN_TIME_KEY = "userLoginTime"

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000

export interface User {
  id: string
  email: string
  role: string
  employee?: {
    first_name: string
    last_name: string
    position: string
  }
}

export interface Session {
  user: User
  expires_at: string
}

// Save session data
export function saveSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    localStorage.setItem(USER_KEY, JSON.stringify(session.user))
    localStorage.setItem(LOGIN_TIME_KEY, new Date().toISOString())
  } catch (error) {
    console.error("Error saving session:", error)
  }
}

// Get current session
export function getSession(): Session | null {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY)
    if (!sessionData) return null

    const session = JSON.parse(sessionData) as Session

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      clearSession()
      return null
    }

    return session
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}

// Get current user
export function getUser(): User | null {
  try {
    const userData = localStorage.getItem(USER_KEY)
    if (!userData) return null

    return JSON.parse(userData) as User
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}

// Clear all session data
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(LOGIN_TIME_KEY)
  } catch (error) {
    console.error("Error clearing session:", error)
  }
}

// Check if session is active
export function isSessionActive(): boolean {
  const session = getSession()
  return session !== null
}

// Extend session expiry
export function extendSession(): void {
  const session = getSession()
  if (!session) return

  // Set new expiry time (30 minutes from now)
  const newExpiryTime = new Date(Date.now() + SESSION_TIMEOUT)
  session.expires_at = newExpiryTime.toISOString()

  saveSession(session)
}

// Setup session activity monitoring
export function setupSessionMonitoring(): () => void {
  // Extend session on user activity
  const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"]

  const handleUserActivity = () => {
    if (isSessionActive()) {
      extendSession()
    }
  }

  // Add event listeners
  activityEvents.forEach((event) => {
    window.addEventListener(event, handleUserActivity)
  })

  // Return cleanup function
  return () => {
    activityEvents.forEach((event) => {
      window.removeEventListener(event, handleUserActivity)
    })
  }
}
