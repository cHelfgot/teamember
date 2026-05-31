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
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          content: string
          created_at: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          id: string
          title: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          content?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          id?: string
          title?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          hours_paid: number
          id: string
          note: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          hours_paid: number
          id?: string
          note?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          hours_paid?: number
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_read: boolean
          title: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_read?: boolean
          title: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_read?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          characterization_hours_estimate: number | null
          characterization_text: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          free_notes: string | null
          hourly_rate: number
          id: string
          last_10h_threshold: number
          miro_link: string | null
          name: string
          owner_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          process_status: Database["public"]["Enums"]["process_status"]
          updated_at: string
        }
        Insert: {
          characterization_hours_estimate?: number | null
          characterization_text?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          free_notes?: string | null
          hourly_rate?: number
          id?: string
          last_10h_threshold?: number
          miro_link?: string | null
          name: string
          owner_id: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          process_status?: Database["public"]["Enums"]["process_status"]
          updated_at?: string
        }
        Update: {
          characterization_hours_estimate?: number | null
          characterization_text?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          free_notes?: string | null
          hourly_rate?: number
          id?: string
          last_10h_threshold?: number
          miro_link?: string | null
          name?: string
          owner_id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          process_status?: Database["public"]["Enums"]["process_status"]
          updated_at?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          client_id: string
          created_at: string
          description: string
          hours: number
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string
          hours: number
          id?: string
          log_date?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string
          hours?: number
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          client_id: string
          comments: string | null
          created_at: string
          id: string
          member_user_id: string
          professionalism_rating: number
          service_rating: number
        }
        Insert: {
          client_id: string
          comments?: string | null
          created_at?: string
          id?: string
          member_user_id: string
          professionalism_rating: number
          service_rating: number
        }
        Update: {
          client_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          member_user_id?: string
          professionalism_rating?: number
          service_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_tokens: {
        Row: {
          client_id: string
          created_at: string
          id: string
          token: string
          used: boolean
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          token?: string
          used?: boolean
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          token?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feedback_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      inspiration_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      learning_links: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          url: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          url: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "learning_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
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
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member"
      doc_type: "free" | "ten_hours" | "daily_summary"
      payment_status: "paid" | "partial" | "due"
      process_status:
        | "pending_characterization"
        | "in_characterization"
        | "pending_approval"
        | "implementation"
        | "training"
        | "live"
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
      app_role: ["admin", "member"],
      doc_type: ["free", "ten_hours", "daily_summary"],
      payment_status: ["paid", "partial", "due"],
      process_status: [
        "pending_characterization",
        "in_characterization",
        "pending_approval",
        "implementation",
        "training",
        "live",
      ],
    },
  },
} as const
