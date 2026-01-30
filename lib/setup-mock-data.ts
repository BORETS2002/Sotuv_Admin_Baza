// Optimize the setupMockData function to make it faster
export async function setupMockData() {
  // Skip this function in production to improve performance
  if (process.env.NODE_ENV === "production") {
    return
  }

  try {
    // Instead of checking the database, just set up the mock users directly
    // This is faster than checking the database first
    const mockUsers = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@example.com",
        password_hash: "$2a$10$rU.rI.YHIVs3fQPe8BSxB.GJlJXlGOGbIiT6zPRF9Kq9GINXcLHZO", // placeholder
        role: "superadmin",
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        email: "bobur@example.com",
        password_hash: "$2a$10$rU.rI.YHIVs3fQPe8BSxB.GJlJXlGOGbIiT6zPRF9Kq9GINXcLHZO", // placeholder
        role: "admin",
      },
    ]

    // Store mock users in localStorage for faster access
    if (typeof window !== "undefined") {
      localStorage.setItem("mockUsers", JSON.stringify(mockUsers))
    }

    console.log("Mock data setup complete")
  } catch (error) {
    console.error("Error setting up mock data:", error)
  }
}
