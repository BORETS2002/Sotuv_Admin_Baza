export interface Department {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string | null
}

export interface Employee {
  id: string
  first_name: string
  last_name: string
  department_id: string
  position: string
  phone: string
  email: string
  created_at: string
  updated_at: string | null
}

export interface ItemCategory {
  id: string
  name: string
  department_id: string | null
  created_at: string
  updated_at: string | null
}

export interface Item {
  id: string
  name: string
  category_id: string
  department_id: string
  serial_number: string
  status: "available" | "in_use" | "damaged" | "under_repair" | "discarded"
  condition: string
  added_by: string
  created_at: string
  updated_at: string | null
}

export interface ItemTransaction {
  id: string
  item_id: string
  employee_id: string
  issued_by: string
  received_by: string | null
  issued_at: string
  returned_at: string | null
  status_before: string
  status_after: string
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface User {
  id: string
  email: string
  employee_id: string
  role: "superadmin" | "admin" | "user"
  created_at: string
  updated_at: string | null
}

export interface Report {
  id: string
  title: string
  description: string
  report_type: "monthly" | "weekly" | "custom"
  department_id: string | null
  created_by: string
  approved_by: string | null
  start_date: string
  end_date: string
  status: "draft" | "submitted" | "approved"
  created_at: string
  updated_at: string | null
}

export interface ReportDetail {
  id: string
  report_id: string
  transaction_id: string
  notes: string | null
  created_at: string
  updated_at: string | null
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: Department
        Insert: Omit<Department, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Department>
      }
      employees: {
        Row: Employee
        Insert: Omit<Employee, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Employee>
      }
      users: {
        Row: User
        Insert: Omit<User, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<User>
      }
      item_categories: {
        Row: ItemCategory
        Insert: Omit<ItemCategory, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<ItemCategory>
      }
      items: {
        Row: Item
        Insert: Omit<Item, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Item>
      }
      item_transactions: {
        Row: ItemTransaction
        Insert: Omit<ItemTransaction, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<ItemTransaction>
      }
      reports: {
        Row: Report
        Insert: Omit<Report, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Report>
      }
      report_details: {
        Row: ReportDetail
        Insert: Omit<ReportDetail, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<ReportDetail>
      }
    }
  }
}
