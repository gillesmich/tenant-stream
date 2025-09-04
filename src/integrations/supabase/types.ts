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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      caution_payments: {
        Row: {
          amount: number
          caution_request_id: string
          created_at: string
          id: string
          status: string
          stripe_payment_intent_id: string | null
          tenant_profile_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          caution_request_id: string
          created_at?: string
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          tenant_profile_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          caution_request_id?: string
          created_at?: string
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          tenant_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caution_payments_caution_request_id_fkey"
            columns: ["caution_request_id"]
            isOneToOne: false
            referencedRelation: "caution_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caution_payments_tenant_profile_id_fkey"
            columns: ["tenant_profile_id"]
            isOneToOne: false
            referencedRelation: "tenant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      caution_requests: {
        Row: {
          amount: number
          created_at: string
          duration_months: number
          expires_at: string
          id: string
          owner_id: string
          property_address: string
          status: string
          tenant_email: string
          tenant_phone: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          duration_months: number
          expires_at?: string
          id?: string
          owner_id: string
          property_address: string
          status?: string
          tenant_email: string
          tenant_phone: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          duration_months?: number
          expires_at?: string
          id?: string
          owner_id?: string
          property_address?: string
          status?: string
          tenant_email?: string
          tenant_phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          lease_id: string | null
          mime_type: string | null
          owner_id: string
          property_id: string | null
          signed: boolean | null
          signed_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          lease_id?: string | null
          mime_type?: string | null
          owner_id: string
          property_id?: string | null
          signed?: boolean | null
          signed_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          lease_id?: string | null
          mime_type?: string | null
          owner_id?: string
          property_id?: string | null
          signed?: boolean | null
          signed_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inventories: {
        Row: {
          created_at: string
          general_comments: string | null
          id: string
          inventory_date: string
          inventory_type: string
          owner_id: string
          owner_validation_status: string | null
          property_id: string | null
          rooms: Json
          tenant_phone: string | null
          tenant_validation_code: string | null
          tenant_validation_date: string | null
          tenant_validation_status: string | null
          updated_at: string
          validation_expires_at: string | null
        }
        Insert: {
          created_at?: string
          general_comments?: string | null
          id?: string
          inventory_date: string
          inventory_type: string
          owner_id: string
          owner_validation_status?: string | null
          property_id?: string | null
          rooms?: Json
          tenant_phone?: string | null
          tenant_validation_code?: string | null
          tenant_validation_date?: string | null
          tenant_validation_status?: string | null
          updated_at?: string
          validation_expires_at?: string | null
        }
        Update: {
          created_at?: string
          general_comments?: string | null
          id?: string
          inventory_date?: string
          inventory_type?: string
          owner_id?: string
          owner_validation_status?: string | null
          property_id?: string | null
          rooms?: Json
          tenant_phone?: string | null
          tenant_validation_code?: string | null
          tenant_validation_date?: string | null
          tenant_validation_status?: string | null
          updated_at?: string
          validation_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventories_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          charges_amount: number | null
          created_at: string
          deposit_amount: number | null
          document_url: string | null
          end_date: string | null
          id: string
          lease_type: string
          notes: string | null
          owner_id: string
          property_id: string
          rent_amount: number
          signed_at: string | null
          signed_by_owner: boolean | null
          signed_by_tenant: boolean | null
          start_date: string
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          charges_amount?: number | null
          created_at?: string
          deposit_amount?: number | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          lease_type: string
          notes?: string | null
          owner_id: string
          property_id: string
          rent_amount: number
          signed_at?: string | null
          signed_by_owner?: boolean | null
          signed_by_tenant?: boolean | null
          start_date: string
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          charges_amount?: number | null
          created_at?: string
          deposit_amount?: number | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          lease_type?: string
          notes?: string | null
          owner_id?: string
          property_id?: string
          rent_amount?: number
          signed_at?: string | null
          signed_by_owner?: boolean | null
          signed_by_tenant?: boolean | null
          start_date?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          available_date: string | null
          bedrooms: number | null
          charges_amount: number | null
          city: string
          created_at: string
          deposit_amount: number | null
          description: string | null
          furnished: boolean | null
          id: string
          images: string[] | null
          owner_id: string
          postal_code: string
          property_type: string
          rent_amount: number
          rooms: number | null
          status: string | null
          surface: number | null
          title: string
          updated_at: string
        }
        Insert: {
          address: string
          available_date?: string | null
          bedrooms?: number | null
          charges_amount?: number | null
          city: string
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          furnished?: boolean | null
          id?: string
          images?: string[] | null
          owner_id: string
          postal_code: string
          property_type: string
          rent_amount: number
          rooms?: number | null
          status?: string | null
          surface?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string
          available_date?: string | null
          bedrooms?: number | null
          charges_amount?: number | null
          city?: string
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          furnished?: boolean | null
          id?: string
          images?: string[] | null
          owner_id?: string
          postal_code?: string
          property_type?: string
          rent_amount?: number
          rooms?: number | null
          status?: string | null
          surface?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rents: {
        Row: {
          charges_amount: number | null
          created_at: string
          due_date: string
          id: string
          last_reminder_date: string | null
          lease_id: string
          notes: string | null
          owner_id: string
          paid_amount: number | null
          paid_date: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          receipt_sent: boolean | null
          reminder_count: number | null
          rent_amount: number
          status: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          charges_amount?: number | null
          created_at?: string
          due_date: string
          id?: string
          last_reminder_date?: string | null
          lease_id: string
          notes?: string | null
          owner_id: string
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          period_end: string
          period_start: string
          receipt_sent?: boolean | null
          reminder_count?: number | null
          rent_amount: number
          status?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          charges_amount?: number | null
          created_at?: string
          due_date?: string
          id?: string
          last_reminder_date?: string | null
          lease_id?: string
          notes?: string | null
          owner_id?: string
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          receipt_sent?: boolean | null
          reminder_count?: number | null
          rent_amount?: number
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rents_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tenant_profiles: {
        Row: {
          address_line1: string
          address_line2: string | null
          caution_request_id: string | null
          city: string
          country: string
          created_at: string
          email: string
          first_name: string
          gender: string | null
          id: string
          last_name: string
          phone: string
          postal_code: string
          updated_at: string
          user_id: string | null
          verification_status: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          caution_request_id?: string | null
          city: string
          country?: string
          created_at?: string
          email: string
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          phone: string
          postal_code: string
          updated_at?: string
          user_id?: string | null
          verification_status?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          caution_request_id?: string | null
          city?: string
          country?: string
          created_at?: string
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          phone?: string
          postal_code?: string
          updated_at?: string
          user_id?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_profiles_caution_request_id_fkey"
            columns: ["caution_request_id"]
            isOneToOne: false
            referencedRelation: "caution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employer: string | null
          first_name: string
          id: string
          last_name: string
          monthly_income: number | null
          occupation: string | null
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer?: string | null
          first_name: string
          id?: string
          last_name: string
          monthly_income?: number | null
          occupation?: string | null
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer?: string | null
          first_name?: string
          id?: string
          last_name?: string
          monthly_income?: number | null
          occupation?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          tenant_profile_id: string
          type: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          tenant_profile_id: string
          type: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          tenant_profile_id?: string
          type?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "verification_codes_tenant_profile_id_fkey"
            columns: ["tenant_profile_id"]
            isOneToOne: false
            referencedRelation: "tenant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_inventory_validation_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
