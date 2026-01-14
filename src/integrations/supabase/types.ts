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
      audit_trail: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip_address: unknown | null
          payload: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: unknown | null
          payload?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: unknown | null
          payload?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      campus: {
        Row: {
          address: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      campus_filiere: {
        Row: {
          campus_id: string
          created_at: string
          filiere_id: string
          id: string
        }
        Insert: {
          campus_id: string
          created_at?: string
          filiere_id: string
          id?: string
        }
        Update: {
          campus_id?: string
          created_at?: string
          filiere_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campus_filiere_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campus_filiere_filiere_id_fkey"
            columns: ["filiere_id"]
            isOneToOne: false
            referencedRelation: "filiere"
            referencedColumns: ["id"]
          },
        ]
      }
      class: {
        Row: {
          campus_id: string
          created_at: string
          filiere_id: string
          group_code: string
          id: string
          is_active: boolean
          label: string
          updated_at: string
          year: number
        }
        Insert: {
          campus_id: string
          created_at?: string
          filiere_id: string
          group_code: string
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
          year: number
        }
        Update: {
          campus_id?: string
          created_at?: string
          filiere_id?: string
          group_code?: string
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_filiere_id_fkey"
            columns: ["filiere_id"]
            isOneToOne: false
            referencedRelation: "filiere"
            referencedColumns: ["id"]
          },
        ]
      }
      filiere: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          pole: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          pole: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          pole?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice: {
        Row: {
          campus_id: string
          created_at: string
          drive_pdf_url: string | null
          id: string
          is_locked: boolean
          month: number
          notes: string | null
          observations: string | null
          original_filename: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          teacher_id: string
          total_ht: number
          total_ttc: number
          updated_at: string
          year: number
        }
        Insert: {
          campus_id: string
          created_at?: string
          drive_pdf_url?: string | null
          id?: string
          is_locked?: boolean
          month: number
          notes?: string | null
          observations?: string | null
          original_filename?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          teacher_id: string
          total_ht?: number
          total_ttc?: number
          updated_at?: string
          year: number
        }
        Update: {
          campus_id?: string
          created_at?: string
          drive_pdf_url?: string | null
          id?: string
          is_locked?: boolean
          month?: number
          notes?: string | null
          observations?: string | null
          original_filename?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          teacher_id?: string
          total_ht?: number
          total_ttc?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_import: {
        Row: {
          created_at: string
          drive_url: string | null
          error_message: string | null
          filename: string
          id: string
          import_date: string
          processed_lines: number
          status: string
          teacher_id: string
          total_lines: number
        }
        Insert: {
          created_at?: string
          drive_url?: string | null
          error_message?: string | null
          filename: string
          id?: string
          import_date?: string
          processed_lines?: number
          status?: string
          teacher_id: string
          total_lines?: number
        }
        Update: {
          created_at?: string
          drive_url?: string | null
          error_message?: string | null
          filename?: string
          id?: string
          import_date?: string
          processed_lines?: number
          status?: string
          teacher_id?: string
          total_lines?: number
        }
        Relationships: []
      }
      invoice_line: {
        Row: {
          campus_id: string
          class_id: string | null
          course_title: string
          created_at: string
          date: string
          end_time: string
          filiere_id: string
          hours_qty: number
          id: string
          invoice_id: string
          is_late: boolean
          observations: string | null
          prevalidated_at: string | null
          prevalidated_by: string | null
          start_time: string
          unit_price: number
          updated_at: string
          validation_status: string | null
        }
        Insert: {
          campus_id: string
          class_id?: string | null
          course_title: string
          created_at?: string
          date: string
          end_time: string
          filiere_id: string
          hours_qty: number
          id?: string
          invoice_id: string
          is_late?: boolean
          observations?: string | null
          prevalidated_at?: string | null
          prevalidated_by?: string | null
          start_time: string
          unit_price: number
          updated_at?: string
          validation_status?: string | null
        }
        Update: {
          campus_id?: string
          class_id?: string | null
          course_title?: string
          created_at?: string
          date?: string
          end_time?: string
          filiere_id?: string
          hours_qty?: number
          id?: string
          invoice_id?: string
          is_late?: boolean
          observations?: string | null
          prevalidated_at?: string | null
          prevalidated_by?: string | null
          start_time?: string
          unit_price?: number
          updated_at?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_filiere_id_fkey"
            columns: ["filiere_id"]
            isOneToOne: false
            referencedRelation: "filiere"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_prevalidated_by_fkey"
            columns: ["prevalidated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_time: string
          blocked_until: string | null
          created_at: string
          email: string | null
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string
          blocked_until?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address: unknown
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string
          blocked_until?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment: {
        Row: {
          amount_ttc: number
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string
          reference: string | null
        }
        Insert: {
          amount_ttc: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          reference?: string | null
        }
        Update: {
          amount_ttc?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          campus_id: string | null
          created_at: string
          email: string
          first_name: string
          hire_date: string | null
          id: string
          is_active: boolean
          is_new_teacher: boolean | null
          last_name: string
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          campus_id?: string | null
          created_at?: string
          email: string
          first_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          is_new_teacher?: boolean | null
          last_name: string
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          campus_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          is_new_teacher?: boolean | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_themes: {
        Row: {
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          is_active: boolean
          start_date: string | null
          theme_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          theme_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          theme_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_assignment_data: {
        Row: {
          assigned_user_id: string | null
          campus_names: string | null
          created_at: string
          email: string
          error_message: string | null
          first_name: string
          id: string
          is_processed: boolean | null
          last_name: string
          phone: string | null
          processed_at: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          campus_names?: string | null
          created_at?: string
          email: string
          error_message?: string | null
          first_name: string
          id?: string
          is_processed?: boolean | null
          last_name: string
          phone?: string | null
          processed_at?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          campus_names?: string | null
          created_at?: string
          email?: string
          error_message?: string | null
          first_name?: string
          id?: string
          is_processed?: boolean | null
          last_name?: string
          phone?: string | null
          processed_at?: string | null
        }
        Relationships: []
      }
      teacher_import: {
        Row: {
          created_at: string
          error_message: string | null
          filename: string
          id: string
          imported_by: string
          processed_teachers: number
          status: string
          total_teachers: number
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          filename: string
          id?: string
          imported_by: string
          processed_teachers?: number
          status?: string
          total_teachers?: number
        }
        Update: {
          created_at?: string
          error_message?: string | null
          filename?: string
          id?: string
          imported_by?: string
          processed_teachers?: number
          status?: string
          total_teachers?: number
        }
        Relationships: []
      }
      teacher_profile: {
        Row: {
          created_at: string
          hourly_rate_max: number | null
          hourly_rate_min: number | null
          id: string
          rib_account_holder: string | null
          rib_bank_name: string | null
          rib_bic: string | null
          rib_iban: string | null
          specialities: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          rib_account_holder?: string | null
          rib_bank_name?: string | null
          rib_bic?: string | null
          rib_iban?: string | null
          specialities?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          rib_account_holder?: string | null
          rib_bank_name?: string | null
          rib_bic?: string | null
          rib_iban?: string | null
          specialities?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      temp_access_credentials: {
        Row: {
          created_at: string
          created_by: string
          email: string
          exported_at: string | null
          id: string
          is_password_changed: boolean
          temp_password: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          exported_at?: string | null
          id?: string
          is_password_changed?: boolean
          temp_password: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          exported_at?: string | null
          id?: string
          is_password_changed?: boolean
          temp_password?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_temp_credentials_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          action: string
          browser_info: Json | null
          details: Json | null
          device_info: Json | null
          duration_ms: number | null
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          ip_address: unknown | null
          location_info: Json | null
          session_id: string | null
          success: boolean | null
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          browser_info?: Json | null
          details?: Json | null
          device_info?: Json | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          location_info?: Json | null
          session_id?: string | null
          success?: boolean | null
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          browser_info?: Json | null
          details?: Json | null
          device_info?: Json | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          location_info?: Json | null
          session_id?: string | null
          success?: boolean | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_creation_requests: {
        Row: {
          campus_id: string
          created_at: string
          email: string
          first_name: string
          id: string
          justification: string | null
          last_name: string
          phone: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_by: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        Insert: {
          campus_id: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          justification?: string | null
          last_name: string
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_by: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          campus_id?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          justification?: string | null
          last_name?: string
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_by?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_creation_requests_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_log: {
        Row: {
          action: string
          actor_id: string
          comment: string | null
          created_at: string
          id: string
          invoice_id: string
          new_status: Database["public"]["Enums"]["invoice_status"] | null
          previous_status: Database["public"]["Enums"]["invoice_status"] | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          action: string
          actor_id: string
          comment?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          new_status?: Database["public"]["Enums"]["invoice_status"] | null
          previous_status?: Database["public"]["Enums"]["invoice_status"] | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          action?: string
          actor_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          new_status?: Database["public"]["Enums"]["invoice_status"] | null
          previous_status?: Database["public"]["Enums"]["invoice_status"] | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "validation_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_prevalidate_invoice_lines: {
        Args: { director_user_id: string; invoice_id_param: string }
        Returns: Json
      }
      can_prevalidate_invoice_line: {
        Args: { director_user_id: string; line_id: string }
        Returns: boolean
      }
      can_user_view_invoice: {
        Args: { invoice_id_param: string; user_id_param: string }
        Returns: boolean
      }
      get_current_user_role_and_campus: {
        Args: Record<PropertyKey, never>
        Returns: {
          campus_id: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      is_login_blocked: {
        Args: { check_email?: string; check_ip: unknown }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_login_attempt: {
        Args: {
          attempt_email: string
          attempt_ip: unknown
          attempt_success: boolean
          attempt_user_agent?: string
        }
        Returns: string
      }
      log_user_activity: {
        Args: {
          action_param: string
          browser_info_param?: Json
          details_param?: Json
          device_info_param?: Json
          duration_ms_param?: number
          entity_id_param?: string
          entity_type_param?: string
          error_message_param?: string
          ip_address_param?: unknown
          success_param?: boolean
          user_agent_param?: string
        }
        Returns: string
      }
      notify_teacher_rejection: {
        Args: {
          invoice_id_param: string
          rejection_reason: string
          teacher_user_id: string
        }
        Returns: undefined
      }
      prevalidate_invoice_line: {
        Args: {
          director_user_id: string
          line_id: string
          observation?: string
        }
        Returns: boolean
      }
      set_active_theme: {
        Args: { p_theme_name: string }
        Returns: undefined
      }
    }
    Enums: {
      invoice_status:
        | "pending"
        | "prevalidated"
        | "validated"
        | "paid"
        | "rejected"
      payment_method: "virement" | "cheque" | "especes" | "autre"
      user_role: "SUPER_ADMIN" | "COMPTABLE" | "DIRECTEUR_CAMPUS" | "ENSEIGNANT"
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
      invoice_status: [
        "pending",
        "prevalidated",
        "validated",
        "paid",
        "rejected",
      ],
      payment_method: ["virement", "cheque", "especes", "autre"],
      user_role: ["SUPER_ADMIN", "COMPTABLE", "DIRECTEUR_CAMPUS", "ENSEIGNANT"],
    },
  },
} as const
