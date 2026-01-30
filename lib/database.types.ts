export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          first_name: string
          last_name: string
          department_id: string | null
          position: string | null
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          department_id?: string | null
          position?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          department_id?: string | null
          position?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          employee_id: string | null
          role: "superadmin" | "admin" | "user"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          employee_id?: string | null
          role: "superadmin" | "admin" | "user"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          employee_id?: string | null
          role?: "superadmin" | "admin" | "user"
          created_at?: string
          updated_at?: string
        }
      }
      item_categories: {
        Row: {
          id: string
          name: string
          department_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          department_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          department_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      items: {
        Row: {
          id: string
          name: string
          category_id: string | null
          department_id: string | null
          serial_number: string | null
          status: "available" | "in_use" | "damaged" | "under_repair" | "discarded"
          condition: string | null
          added_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category_id?: string | null
          department_id?: string | null
          serial_number?: string | null
          status: "available" | "in_use" | "damaged" | "under_repair" | "discarded"
          condition?: string | null
          added_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category_id?: string | null
          department_id?: string | null
          serial_number?: string | null
          status?: "available" | "in_use" | "damaged" | "under_repair" | "discarded"
          condition?: string | null
          added_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      item_transactions: {
        Row: {
          id: string
          item_id: string
          employee_id: string | null
          issued_by: string | null
          received_by: string | null
          issued_at: string | null
          returned_at: string | null
          status_before: string | null
          status_after: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          employee_id?: string | null
          issued_by?: string | null
          received_by?: string | null
          issued_at?: string | null
          returned_at?: string | null
          status_before?: string | null
          status_after?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          employee_id?: string | null
          issued_by?: string | null
          received_by?: string | null
          issued_at?: string | null
          returned_at?: string | null
          status_before?: string | null
          status_after?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          title: string
          description: string | null
          report_type: "daily" | "weekly" | "monthly" | "custom"
          department_id: string | null
          created_by: string | null
          approved_by: string | null
          start_date: string | null
          end_date: string | null
          status: "draft" | "submitted" | "approved" | "rejected"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          report_type: "daily" | "weekly" | "monthly" | "custom"
          department_id?: string | null
          created_by?: string | null
          approved_by?: string | null
          start_date?: string | null
          end_date?: string | null
          status: "draft" | "submitted" | "approved" | "rejected"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          report_type?: "daily" | "weekly" | "monthly" | "custom"
          department_id?: string | null
          created_by?: string | null
          approved_by?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: "draft" | "submitted" | "approved" | "rejected"
          created_at?: string
          updated_at?: string
        }
      }
      report_details: {
        Row: {
          id: string
          report_id: string
          transaction_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          report_id: string
          transaction_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          transaction_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
