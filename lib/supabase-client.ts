import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Simplified singleton pattern for client-side Supabase client
let supabaseClientInstance: any = null

export const getSupabaseClient = () => {
  if (typeof window === "undefined") {
    // Server-side - create a new client each time
    return createServerSupabaseClient()
  }

  // Client-side - use singleton pattern
  if (!supabaseClientInstance) {
    try {
      // Check if environment variables are available
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error("Supabase environment variables are missing")
        // Return a mock client that won't actually make network requests
        return createMockSupabaseClient()
      }

      // Initialize with specific options for better performance and security
      supabaseClientInstance = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false, // Disable automatic URL parsing for security
          },
          global: {
            fetch: fetch.bind(globalThis),
          },
          realtime: {
            params: {
              eventsPerSecond: 1,
            },
          },
        },
      )
    } catch (error) {
      console.error("Error initializing Supabase client:", error)
      // Fallback to a mock client if initialization fails
      return createMockSupabaseClient()
    }
  }

  return supabaseClientInstance
}

// Create a server-side client (for server components and API routes)
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  if (!supabaseUrl || !supabaseKey) {
    console.error("Server-side Supabase environment variables are missing")
    return createMockSupabaseClient()
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Improved mock client with more realistic behavior
function createMockSupabaseClient() {
  return {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
        order: () => ({ data: [], error: null }),
        limit: () => ({ data: [], error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    channel: () => ({
      on: () => ({
        subscribe: () => ({
          unsubscribe: () => {},
        }),
      }),
    }),
  }
}
