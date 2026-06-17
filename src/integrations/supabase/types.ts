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
      ai_jobs: {
        Row: {
          created_at: string
          episode_id: string | null
          error: string | null
          id: string
          input: Json | null
          kind: Database["public"]["Enums"]["ai_job_kind"]
          output: Json | null
          status: Database["public"]["Enums"]["ai_job_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          episode_id?: string | null
          error?: string | null
          id?: string
          input?: Json | null
          kind: Database["public"]["Enums"]["ai_job_kind"]
          output?: Json | null
          status?: Database["public"]["Enums"]["ai_job_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          episode_id?: string | null
          error?: string | null
          id?: string
          input?: Json | null
          kind?: Database["public"]["Enums"]["ai_job_kind"]
          output?: Json | null
          status?: Database["public"]["Enums"]["ai_job_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author: string
          body: string
          created_at: string
          episode_id: string | null
          id: string
          network: Database["public"]["Enums"]["network_kind"]
          post_url: string | null
          replied: boolean | null
          sentiment: Database["public"]["Enums"]["sentiment"] | null
          user_id: string
        }
        Insert: {
          author: string
          body: string
          created_at?: string
          episode_id?: string | null
          id?: string
          network: Database["public"]["Enums"]["network_kind"]
          post_url?: string | null
          replied?: boolean | null
          sentiment?: Database["public"]["Enums"]["sentiment"] | null
          user_id: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          episode_id?: string | null
          id?: string
          network?: Database["public"]["Enums"]["network_kind"]
          post_url?: string | null
          replied?: boolean | null
          sentiment?: Database["public"]["Enums"]["sentiment"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          angle: string | null
          aspect: string | null
          caption: string | null
          created_at: string
          duration_s: number | null
          hashtags: string[] | null
          id: string
          progress_pct: number | null
          progress_step: string | null
          script: string | null
          status: Database["public"]["Enums"]["episode_status"]
          thumb_url: string | null
          title: string
          topic: string | null
          updated_at: string
          user_id: string
          video_url: string | null
          voice: string | null
        }
        Insert: {
          angle?: string | null
          aspect?: string | null
          caption?: string | null
          created_at?: string
          duration_s?: number | null
          hashtags?: string[] | null
          id?: string
          progress_pct?: number | null
          progress_step?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["episode_status"]
          thumb_url?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          voice?: string | null
        }
        Update: {
          angle?: string | null
          aspect?: string | null
          caption?: string | null
          created_at?: string
          duration_s?: number | null
          hashtags?: string[] | null
          id?: string
          progress_pct?: number | null
          progress_step?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["episode_status"]
          thumb_url?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          voice?: string | null
        }
        Relationships: []
      }
      metrics: {
        Row: {
          comments: number | null
          created_at: string
          date: string
          episode_id: string | null
          followers: number | null
          id: string
          likes: number | null
          network: Database["public"]["Enums"]["network_kind"]
          retention_pct: number | null
          shares: number | null
          user_id: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string
          date: string
          episode_id?: string | null
          followers?: number | null
          id?: string
          likes?: number | null
          network: Database["public"]["Enums"]["network_kind"]
          retention_pct?: number | null
          shares?: number | null
          user_id: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string
          date?: string
          episode_id?: string | null
          followers?: number | null
          id?: string
          likes?: number | null
          network?: Database["public"]["Enums"]["network_kind"]
          retention_pct?: number | null
          shares?: number | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      networks: {
        Row: {
          connected_at: string | null
          created_at: string
          handle: string | null
          id: string
          network: Database["public"]["Enums"]["network_kind"]
          status: Database["public"]["Enums"]["network_status"]
          token_ref: string | null
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          network: Database["public"]["Enums"]["network_kind"]
          status?: Database["public"]["Enums"]["network_status"]
          token_ref?: string | null
          user_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          network?: Database["public"]["Enums"]["network_kind"]
          status?: Database["public"]["Enums"]["network_status"]
          token_ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          brand_name: string | null
          brand_voice: string | null
          created_at: string
          defaults: Json | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          brand_name?: string | null
          brand_voice?: string | null
          created_at?: string
          defaults?: Json | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          brand_name?: string | null
          brand_voice?: string | null
          created_at?: string
          defaults?: Json | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          created_at: string
          episode_id: string
          external_id: string | null
          id: string
          network: Database["public"]["Enums"]["network_kind"]
          scheduled_at: string
          status: Database["public"]["Enums"]["post_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          episode_id: string
          external_id?: string | null
          id?: string
          network: Database["public"]["Enums"]["network_kind"]
          scheduled_at: string
          status?: Database["public"]["Enums"]["post_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          episode_id?: string
          external_id?: string | null
          id?: string
          network?: Database["public"]["Enums"]["network_kind"]
          scheduled_at?: string
          status?: Database["public"]["Enums"]["post_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      seed_demo_for_user: { Args: { _uid: string }; Returns: undefined }
    }
    Enums: {
      ai_job_kind: "angles" | "script" | "caption" | "render"
      ai_job_status: "queued" | "running" | "done" | "failed"
      app_role: "admin" | "user"
      episode_status: "draft" | "generating" | "ready" | "published" | "failed"
      network_kind: "x" | "youtube" | "instagram" | "tiktok"
      network_status: "connected" | "disconnected" | "pending"
      post_status: "scheduled" | "publishing" | "published" | "failed"
      sentiment: "pos" | "neu" | "neg"
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
      ai_job_kind: ["angles", "script", "caption", "render"],
      ai_job_status: ["queued", "running", "done", "failed"],
      app_role: ["admin", "user"],
      episode_status: ["draft", "generating", "ready", "published", "failed"],
      network_kind: ["x", "youtube", "instagram", "tiktok"],
      network_status: ["connected", "disconnected", "pending"],
      post_status: ["scheduled", "publishing", "published", "failed"],
      sentiment: ["pos", "neu", "neg"],
    },
  },
} as const
