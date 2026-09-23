export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string
          company_name: string
          contact_person: string
          created_at: string
          email: string
          forklift_brand: string
          forklift_model: string
          id: string
          name: string
          phone: string
          serial_no: string
        }
        Insert: {
          address?: string
          company_name?: string
          contact_person?: string
          created_at?: string
          email?: string
          forklift_brand?: string
          forklift_model?: string
          id?: string
          name: string
          phone?: string
          serial_no?: string
        }
        Update: {
          address?: string
          company_name?: string
          contact_person?: string
          created_at?: string
          email?: string
          forklift_brand?: string
          forklift_model?: string
          id?: string
          name?: string
          phone?: string
          serial_no?: string
        }
        Relationships: []
      }
      forklift_photos: {
        Row: {
          caption: string
          created_at: string
          customer_id: string
          forklift_id: string | null
          id: string
          public_url: string
          storage_path: string
          uploaded_by: string | null
          work_order_id: string | null
        }
        Insert: {
          caption?: string
          created_at?: string
          customer_id: string
          forklift_id?: string | null
          id?: string
          public_url?: string
          storage_path: string
          uploaded_by?: string | null
          work_order_id?: string | null
        }
        Update: {
          caption?: string
          created_at?: string
          customer_id?: string
          forklift_id?: string | null
          id?: string
          public_url?: string
          storage_path?: string
          uploaded_by?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forklift_photos_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forklift_photos_forklift_id_fkey"
            columns: ["forklift_id"]
            isOneToOne: false
            referencedRelation: "forklifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forklift_photos_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      forklifts: {
        Row: {
          brand: string
          code: string
          created_at: string
          customer_id: string
          fuel_type: string
          hour_meter: number
          id: string
          last_service_at: string | null
          last_service_hours: number | null
          model: string
          serial_no: string
          service_interval_hours: number
          service_interval_months: number
        }
        Insert: {
          brand?: string
          code?: string
          created_at?: string
          customer_id: string
          fuel_type?: string
          hour_meter?: number
          id?: string
          last_service_at?: string | null
          last_service_hours?: number | null
          model?: string
          serial_no?: string
          service_interval_hours?: number
          service_interval_months?: number
        }
        Update: {
          brand?: string
          code?: string
          created_at?: string
          customer_id?: string
          fuel_type?: string
          hour_meter?: number
          id?: string
          last_service_at?: string | null
          last_service_hours?: number | null
          model?: string
          serial_no?: string
          service_interval_hours?: number
          service_interval_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "forklifts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      service_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          fuel_type: string
          id: string
          items: Json
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          fuel_type?: string
          id?: string
          items?: Json
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          fuel_type?: string
          id?: string
          items?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      technicians: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          phone?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          fault_description: string
          forklift_id: string | null
          form_approved: boolean
          form_approved_at: string | null
          hour_meter: number | null
          id: string
          invoice_no: string
          invoice_note: string
          invoice_status: string
          invoiced_at: string | null
          service_items: Json
          service_note: string
          signature_data: string | null
          signature_name: string
          started_at: string | null
          status: string
          technician_id: string | null
          transfer_note: string
          transferred_at: string | null
          transferred_from: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          fault_description: string
          forklift_id?: string | null
          form_approved?: boolean
          form_approved_at?: string | null
          hour_meter?: number | null
          id?: string
          invoice_no?: string
          invoice_note?: string
          invoice_status?: string
          invoiced_at?: string | null
          service_items?: Json
          service_note?: string
          signature_data?: string | null
          signature_name?: string
          started_at?: string | null
          status?: string
          technician_id?: string | null
          transfer_note?: string
          transferred_at?: string | null
          transferred_from?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          fault_description?: string
          forklift_id?: string | null
          form_approved?: boolean
          form_approved_at?: string | null
          hour_meter?: number | null
          id?: string
          invoice_no?: string
          invoice_note?: string
          invoice_status?: string
          invoiced_at?: string | null
          service_items?: Json
          service_note?: string
          signature_data?: string | null
          signature_name?: string
          started_at?: string | null
          status?: string
          technician_id?: string | null
          transfer_note?: string
          transferred_at?: string | null
          transferred_from?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_forklift_id_fkey"
            columns: ["forklift_id"]
            isOneToOne: false
            referencedRelation: "forklifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_transferred_from_fkey"
            columns: ["transferred_from"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "technician"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "technician"],
    },
  },
} as const
