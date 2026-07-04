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
      agent_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          input: Json | null
          kind: Database["public"]["Enums"]["agent_kind"]
          output: Json | null
          started_at: string
          status: Database["public"]["Enums"]["run_status"]
          user_id: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          kind: Database["public"]["Enums"]["agent_kind"]
          output?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          user_id: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          kind?: Database["public"]["Enums"]["agent_kind"]
          output?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          user_id?: string
        }
        Relationships: []
      }
      agent_steps: {
        Row: {
          agent: Database["public"]["Enums"]["agent_kind"]
          created_at: string
          error: string | null
          id: string
          input: Json | null
          latency_ms: number | null
          output: Json | null
          run_id: string
          tokens: number | null
        }
        Insert: {
          agent: Database["public"]["Enums"]["agent_kind"]
          created_at?: string
          error?: string | null
          id?: string
          input?: Json | null
          latency_ms?: number | null
          output?: Json | null
          run_id: string
          tokens?: number | null
        }
        Update: {
          agent?: Database["public"]["Enums"]["agent_kind"]
          created_at?: string
          error?: string | null
          id?: string
          input?: Json | null
          latency_ms?: number | null
          output?: Json | null
          run_id?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          scholarship_id: string
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          timeline: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          scholarship_id: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          timeline?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          scholarship_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          timeline?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          application_id: string
          created_at: string
          id: string
          items: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          extracted_text: string | null
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          review: Json | null
          score: number | null
          storage_path: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          id?: string
          kind: Database["public"]["Enums"]["document_kind"]
          review?: Json | null
          score?: number | null
          storage_path?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          review?: Json | null
          score?: number | null
          storage_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          achievements: string | null
          avatar_url: string | null
          bio: string | null
          cgpa: number | null
          completion_pct: number | null
          country: string | null
          created_at: string
          degree_level: Database["public"]["Enums"]["degree_level"] | null
          email: string | null
          field_of_study: string | null
          full_name: string | null
          graduation_year: number | null
          skills: string[] | null
          target_countries: string[] | null
          target_fields: string[] | null
          university: string | null
          updated_at: string
          user_id: string
          work_years: number | null
        }
        Insert: {
          achievements?: string | null
          avatar_url?: string | null
          bio?: string | null
          cgpa?: number | null
          completion_pct?: number | null
          country?: string | null
          created_at?: string
          degree_level?: Database["public"]["Enums"]["degree_level"] | null
          email?: string | null
          field_of_study?: string | null
          full_name?: string | null
          graduation_year?: number | null
          skills?: string[] | null
          target_countries?: string[] | null
          target_fields?: string[] | null
          university?: string | null
          updated_at?: string
          user_id: string
          work_years?: number | null
        }
        Update: {
          achievements?: string | null
          avatar_url?: string | null
          bio?: string | null
          cgpa?: number | null
          completion_pct?: number | null
          country?: string | null
          created_at?: string
          degree_level?: Database["public"]["Enums"]["degree_level"] | null
          email?: string | null
          field_of_study?: string | null
          full_name?: string | null
          graduation_year?: number | null
          skills?: string[] | null
          target_countries?: string[] | null
          target_fields?: string[] | null
          university?: string | null
          updated_at?: string
          user_id?: string
          work_years?: number | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          kind: string
          message: string
          read_at: string | null
          remind_at: string
          scholarship_id: string | null
          sent_at: string | null
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          kind: string
          message: string
          read_at?: string | null
          remind_at: string
          scholarship_id?: string | null
          sent_at?: string | null
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string
          read_at?: string | null
          remind_at?: string
          scholarship_id?: string | null
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_scholarships: {
        Row: {
          created_at: string
          id: string
          note: string | null
          scholarship_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          scholarship_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          scholarship_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_scholarships_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarships: {
        Row: {
          amount_usd: number | null
          apply_url: string | null
          benefits: string | null
          country: string | null
          created_at: string
          deadline: string | null
          degree_level: Database["public"]["Enums"]["degree_level"] | null
          eligibility: string | null
          eligible_countries: string[] | null
          embedding: string | null
          fields: string[] | null
          funding_type: Database["public"]["Enums"]["funding_type"] | null
          id: string
          is_active: boolean | null
          min_cgpa: number | null
          provider: string
          required_documents: string[] | null
          source: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          amount_usd?: number | null
          apply_url?: string | null
          benefits?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          degree_level?: Database["public"]["Enums"]["degree_level"] | null
          eligibility?: string | null
          eligible_countries?: string[] | null
          embedding?: string | null
          fields?: string[] | null
          funding_type?: Database["public"]["Enums"]["funding_type"] | null
          id?: string
          is_active?: boolean | null
          min_cgpa?: number | null
          provider: string
          required_documents?: string[] | null
          source?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          amount_usd?: number | null
          apply_url?: string | null
          benefits?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          degree_level?: Database["public"]["Enums"]["degree_level"] | null
          eligibility?: string | null
          eligible_countries?: string[] | null
          embedding?: string | null
          fields?: string[] | null
          funding_type?: Database["public"]["Enums"]["funding_type"] | null
          id?: string
          is_active?: boolean | null
          min_cgpa?: number | null
          provider?: string
          required_documents?: string[] | null
          source?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      match_scholarships: {
        Args: {
          filter_country?: string
          filter_degree?: Database["public"]["Enums"]["degree_level"]
          match_count?: number
          query_embedding: string
        }
        Returns: {
          amount_usd: number
          apply_url: string
          country: string
          deadline: string
          degree_level: Database["public"]["Enums"]["degree_level"]
          funding_type: Database["public"]["Enums"]["funding_type"]
          id: string
          provider: string
          similarity: number
          summary: string
          title: string
        }[]
      }
    }
    Enums: {
      agent_kind:
        | "supervisor"
        | "search"
        | "eligibility"
        | "ranking"
        | "doc_review"
        | "checklist"
        | "reminder"
        | "tracker"
        | "chat"
      app_role: "admin" | "user"
      application_status:
        | "saved"
        | "preparing"
        | "ready"
        | "redirected"
        | "submitted"
        | "under_review"
        | "interview"
        | "awarded"
        | "rejected"
      degree_level:
        | "school"
        | "undergraduate"
        | "postgraduate"
        | "phd"
        | "postdoc"
        | "any"
      document_kind:
        | "resume"
        | "sop"
        | "essay"
        | "personal_statement"
        | "recommendation"
        | "transcript"
        | "other"
      funding_type:
        | "full"
        | "partial"
        | "stipend"
        | "tuition"
        | "travel"
        | "research"
        | "other"
      run_status: "running" | "succeeded" | "failed"
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
      agent_kind: [
        "supervisor",
        "search",
        "eligibility",
        "ranking",
        "doc_review",
        "checklist",
        "reminder",
        "tracker",
        "chat",
      ],
      app_role: ["admin", "user"],
      application_status: [
        "saved",
        "preparing",
        "ready",
        "redirected",
        "submitted",
        "under_review",
        "interview",
        "awarded",
        "rejected",
      ],
      degree_level: [
        "school",
        "undergraduate",
        "postgraduate",
        "phd",
        "postdoc",
        "any",
      ],
      document_kind: [
        "resume",
        "sop",
        "essay",
        "personal_statement",
        "recommendation",
        "transcript",
        "other",
      ],
      funding_type: [
        "full",
        "partial",
        "stipend",
        "tuition",
        "travel",
        "research",
        "other",
      ],
      run_status: ["running", "succeeded", "failed"],
    },
  },
} as const
