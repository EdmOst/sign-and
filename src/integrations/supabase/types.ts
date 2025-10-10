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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      backup_configs: {
        Row: {
          created_at: string
          created_by: string | null
          email_notifications: string[] | null
          enabled: boolean
          frequency: string
          id: string
          include_metadata: boolean
          last_backup_at: string | null
          next_backup_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email_notifications?: string[] | null
          enabled?: boolean
          frequency?: string
          id?: string
          include_metadata?: boolean
          last_backup_at?: string | null
          next_backup_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email_notifications?: string[] | null
          enabled?: boolean
          frequency?: string
          id?: string
          include_metadata?: boolean
          last_backup_at?: string | null
          next_backup_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          backup_id: string
          backup_type: string
          created_at: string
          created_by: string | null
          document_count: number
          error_message: string | null
          file_size_bytes: number | null
          id: string
          status: string
        }
        Insert: {
          backup_id: string
          backup_type?: string
          created_at?: string
          created_by?: string | null
          document_count?: number
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          status?: string
        }
        Update: {
          backup_id?: string
          backup_type?: string
          created_at?: string
          created_by?: string | null
          document_count?: number
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          status?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          company_name: string | null
          created_at: string
          id: string
          invoice_module_enabled: boolean | null
          license_expires_at: string | null
          license_key: string | null
          license_status: string | null
          logo_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          id?: string
          invoice_module_enabled?: boolean | null
          license_expires_at?: string | null
          license_key?: string | null
          license_status?: string | null
          logo_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          id?: string
          invoice_module_enabled?: boolean | null
          license_expires_at?: string | null
          license_key?: string | null
          license_status?: string | null
          logo_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_signatures: Json | null
          customer_signed: boolean | null
          customer_signed_at: string | null
          id: string
          last_downloaded_at: string | null
          last_downloaded_by_email: string | null
          last_downloaded_by_name: string | null
          last_previewed_at: string | null
          last_previewed_by_email: string | null
          last_previewed_by_name: string | null
          name: string
          original_filename: string
          pdf_data: string
          share_token: string | null
          signatures: Json
          signed_at: string
          signed_by_email: string | null
          signed_by_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_signatures?: Json | null
          customer_signed?: boolean | null
          customer_signed_at?: string | null
          id?: string
          last_downloaded_at?: string | null
          last_downloaded_by_email?: string | null
          last_downloaded_by_name?: string | null
          last_previewed_at?: string | null
          last_previewed_by_email?: string | null
          last_previewed_by_name?: string | null
          name: string
          original_filename: string
          pdf_data: string
          share_token?: string | null
          signatures?: Json
          signed_at?: string
          signed_by_email?: string | null
          signed_by_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_signatures?: Json | null
          customer_signed?: boolean | null
          customer_signed_at?: string | null
          id?: string
          last_downloaded_at?: string | null
          last_downloaded_by_email?: string | null
          last_downloaded_by_name?: string | null
          last_previewed_at?: string | null
          last_previewed_by_email?: string | null
          last_previewed_by_name?: string | null
          name?: string
          original_filename?: string
          pdf_data?: string
          share_token?: string | null
          signatures?: Json
          signed_at?: string
          signed_by_email?: string | null
          signed_by_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_company_settings: {
        Row: {
          address: string
          barcode_prefix: string | null
          barcode_suffix: string | null
          bic: string | null
          company_name: string
          created_at: string | null
          iban: string | null
          id: string
          issuer_email: string | null
          issuer_first_name: string | null
          issuer_last_name: string | null
          issuer_phone: string | null
          issuer_role: string | null
          legal_notes: string | null
          logo_url: string | null
          payment_terms: string | null
          show_barcodes: boolean | null
          show_product_codes: boolean | null
          smtp_from_email: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_username: string | null
          template_footer_height: number | null
          template_header_height: number | null
          template_logo_width: number | null
          template_margin_bottom: number | null
          template_margin_left: number | null
          template_margin_right: number | null
          template_margin_top: number | null
          template_primary_color: string | null
          template_secondary_color: string | null
          template_show_logo: boolean | null
          updated_at: string | null
          user_id: string
          vat_number: string | null
        }
        Insert: {
          address: string
          barcode_prefix?: string | null
          barcode_suffix?: string | null
          bic?: string | null
          company_name: string
          created_at?: string | null
          iban?: string | null
          id?: string
          issuer_email?: string | null
          issuer_first_name?: string | null
          issuer_last_name?: string | null
          issuer_phone?: string | null
          issuer_role?: string | null
          legal_notes?: string | null
          logo_url?: string | null
          payment_terms?: string | null
          show_barcodes?: boolean | null
          show_product_codes?: boolean | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          template_footer_height?: number | null
          template_header_height?: number | null
          template_logo_width?: number | null
          template_margin_bottom?: number | null
          template_margin_left?: number | null
          template_margin_right?: number | null
          template_margin_top?: number | null
          template_primary_color?: string | null
          template_secondary_color?: string | null
          template_show_logo?: boolean | null
          updated_at?: string | null
          user_id: string
          vat_number?: string | null
        }
        Update: {
          address?: string
          barcode_prefix?: string | null
          barcode_suffix?: string | null
          bic?: string | null
          company_name?: string
          created_at?: string | null
          iban?: string | null
          id?: string
          issuer_email?: string | null
          issuer_first_name?: string | null
          issuer_last_name?: string | null
          issuer_phone?: string | null
          issuer_role?: string | null
          legal_notes?: string | null
          logo_url?: string | null
          payment_terms?: string | null
          show_barcodes?: boolean | null
          show_product_codes?: boolean | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          template_footer_height?: number | null
          template_header_height?: number | null
          template_logo_width?: number | null
          template_margin_bottom?: number | null
          template_margin_left?: number | null
          template_margin_right?: number | null
          template_margin_top?: number | null
          template_primary_color?: string | null
          template_secondary_color?: string | null
          template_show_logo?: boolean | null
          updated_at?: string | null
          user_id?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      invoice_customers: {
        Row: {
          address: string
          created_at: string | null
          customer_group: string | null
          customer_number: string | null
          email: string | null
          id: string
          name: string
          person_id: string | null
          updated_at: string | null
          user_id: string
          vat_number: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          customer_group?: string | null
          customer_number?: string | null
          email?: string | null
          id?: string
          name: string
          person_id?: string | null
          updated_at?: string | null
          user_id: string
          vat_number?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          customer_group?: string | null
          customer_number?: string | null
          email?: string | null
          id?: string
          name?: string
          person_id?: string | null
          updated_at?: string | null
          user_id?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      invoice_email_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          invoice_id: string
          line_order: number
          name: string
          product_id: string | null
          quantity: number
          subtotal: number
          total: number
          unit_price: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          invoice_id: string
          line_order?: number
          name: string
          product_id?: string | null
          quantity?: number
          subtotal: number
          total: number
          unit_price: number
          vat_amount: number
          vat_rate: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          invoice_id?: string
          line_order?: number
          name?: string
          product_id?: string | null
          quantity?: number
          subtotal?: number
          total?: number
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "invoice_products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_products: {
        Row: {
          barcode: string | null
          created_at: string | null
          default_price: number
          default_vat_rate: number
          description: string | null
          id: string
          name: string
          product_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          barcode?: string | null
          created_at?: string | null
          default_price: number
          default_vat_rate?: number
          description?: string | null
          id?: string
          name: string
          product_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          barcode?: string | null
          created_at?: string | null
          default_price?: number
          default_vat_rate?: number
          description?: string | null
          id?: string
          name?: string
          product_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string | null
          custom_text: string | null
          customer_id: string
          deleted_at: string | null
          discount_amount: number | null
          discount_percentage: number | null
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          pdf_url: string | null
          sent_at: string | null
          status: string
          subtotal: number
          total: number
          total_vat: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_text?: string | null
          customer_id: string
          deleted_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          due_date: string
          id?: string
          invoice_number: string
          issue_date: string
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          total_vat?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_text?: string | null
          customer_id?: string
          deleted_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          total_vat?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "invoice_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action_description: string
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_license_valid: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      generate_customer_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: { p_user_id: string }
        Returns: string
      }
      generate_share_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
