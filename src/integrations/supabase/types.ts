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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          bio: string | null
          created_at: string
          dance_style: string | null
          email: string
          full_name: string
          id: string
          instagram_handle: string | null
          location: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          status: string
          tiktok_handle: string | null
          years_experience: number | null
          youtube_handle: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          dance_style?: string | null
          email: string
          full_name: string
          id?: string
          instagram_handle?: string | null
          location?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          tiktok_handle?: string | null
          years_experience?: number | null
          youtube_handle?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          dance_style?: string | null
          email?: string
          full_name?: string
          id?: string
          instagram_handle?: string | null
          location?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          tiktok_handle?: string | null
          years_experience?: number | null
          youtube_handle?: string | null
        }
        Relationships: []
      }
      campaign_acceptances: {
        Row: {
          accepted_at: string
          campaign_id: string
          dancer_id: string
          deadline: string
          id: string
          status: Database["public"]["Enums"]["acceptance_status"]
        }
        Insert: {
          accepted_at?: string
          campaign_id: string
          dancer_id: string
          deadline: string
          id?: string
          status?: Database["public"]["Enums"]["acceptance_status"]
        }
        Update: {
          accepted_at?: string
          campaign_id?: string
          dancer_id?: string
          deadline?: string
          id?: string
          status?: Database["public"]["Enums"]["acceptance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "campaign_acceptances_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          accepted_count: number
          artist_name: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          due_days_after_accept: number
          end_date: string | null
          id: string
          instagram_sound_url: string | null
          max_creators: number
          pay_scale: Json
          report_links: Json
          required_hashtags: string[]
          required_mentions: string[]
          required_platforms: string[]
          slug: string
          song_url: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          tiktok_sound_url: string | null
          title: string
          track_id: string | null
        }
        Insert: {
          accepted_count?: number
          artist_name: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          due_days_after_accept?: number
          end_date?: string | null
          id?: string
          instagram_sound_url?: string | null
          max_creators?: number
          pay_scale?: Json
          report_links?: Json
          required_hashtags?: string[]
          required_mentions?: string[]
          required_platforms?: string[]
          slug: string
          song_url?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          tiktok_sound_url?: string | null
          title: string
          track_id?: string | null
        }
        Update: {
          accepted_count?: number
          artist_name?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          due_days_after_accept?: number
          end_date?: string | null
          id?: string
          instagram_sound_url?: string | null
          max_creators?: number
          pay_scale?: Json
          report_links?: Json
          required_hashtags?: string[]
          required_mentions?: string[]
          required_platforms?: string[]
          slug?: string
          song_url?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          tiktok_sound_url?: string | null
          title?: string
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      nav_links: {
        Row: {
          created_at: string
          href: string
          id: string
          label: string
          position: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          href: string
          id?: string
          label: string
          position?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          href?: string
          id?: string
          label?: string
          position?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount_cents: number
          completed_at: string | null
          created_at: string
          dancer_id: string
          id: string
          status: Database["public"]["Enums"]["payout_status"]
          stripe_transfer_id: string | null
          submission_id: string
        }
        Insert: {
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          dancer_id: string
          id?: string
          status?: Database["public"]["Enums"]["payout_status"]
          stripe_transfer_id?: string | null
          submission_id: string
        }
        Update: {
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          dancer_id?: string
          id?: string
          status?: Database["public"]["Enums"]["payout_status"]
          stripe_transfer_id?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          application_reviewed_at: string | null
          application_status: Database["public"]["Enums"]["application_status"]
          application_submitted_at: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          dance_style: string | null
          full_name: string | null
          id: string
          instagram_handle: string | null
          location: string | null
          rejection_reason: string | null
          stripe_account_id: string | null
          stripe_onboarded: boolean
          tiktok_handle: string | null
          years_experience: number | null
          youtube_handle: string | null
        }
        Insert: {
          application_reviewed_at?: string | null
          application_status?: Database["public"]["Enums"]["application_status"]
          application_submitted_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          dance_style?: string | null
          full_name?: string | null
          id: string
          instagram_handle?: string | null
          location?: string | null
          rejection_reason?: string | null
          stripe_account_id?: string | null
          stripe_onboarded?: boolean
          tiktok_handle?: string | null
          years_experience?: number | null
          youtube_handle?: string | null
        }
        Update: {
          application_reviewed_at?: string | null
          application_status?: Database["public"]["Enums"]["application_status"]
          application_submitted_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          dance_style?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          location?: string | null
          rejection_reason?: string | null
          stripe_account_id?: string | null
          stripe_onboarded?: boolean
          tiktok_handle?: string | null
          years_experience?: number | null
          youtube_handle?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          acceptance_id: string
          campaign_id: string
          comment_count: number
          dancer_id: string
          id: string
          like_count: number
          platform: string
          rejection_reason: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          submitted_at: string
          video_url: string
          view_count: number
        }
        Insert: {
          acceptance_id: string
          campaign_id: string
          comment_count?: number
          dancer_id: string
          id?: string
          like_count?: number
          platform: string
          rejection_reason?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          submitted_at?: string
          video_url: string
          view_count?: number
        }
        Update: {
          acceptance_id?: string
          campaign_id?: string
          comment_count?: number
          dancer_id?: string
          id?: string
          like_count?: number
          platform?: string
          rejection_reason?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          submitted_at?: string
          video_url?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "submissions_acceptance_id_fkey"
            columns: ["acceptance_id"]
            isOneToOne: false
            referencedRelation: "campaign_acceptances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          artist_name: string
          audio_url: string | null
          bpm: number | null
          cover_image_url: string | null
          created_at: string
          duration_seconds: number | null
          genre: string | null
          id: string
          instagram_sound_url: string | null
          mood: string | null
          spotify_url: string | null
          status: string
          tiktok_sound_url: string | null
          title: string
          updated_at: string
          usage_rules: string | null
        }
        Insert: {
          artist_name: string
          audio_url?: string | null
          bpm?: number | null
          cover_image_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          genre?: string | null
          id?: string
          instagram_sound_url?: string | null
          mood?: string | null
          spotify_url?: string | null
          status?: string
          tiktok_sound_url?: string | null
          title: string
          updated_at?: string
          usage_rules?: string | null
        }
        Update: {
          artist_name?: string
          audio_url?: string | null
          bpm?: number | null
          cover_image_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          genre?: string | null
          id?: string
          instagram_sound_url?: string | null
          mood?: string | null
          spotify_url?: string | null
          status?: string
          tiktok_sound_url?: string | null
          title?: string
          updated_at?: string
          usage_rules?: string | null
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
      create_assignment: {
        Args: { p_campaign_id: string; p_user_id: string }
        Returns: string
      }
      get_campaign_dancers: {
        Args: { p_campaign_id: string }
        Returns: {
          avatar_url: string
          dancer_id: string
          full_name: string
          instagram_handle: string
          tiktok_handle: string
          video_links: Json
        }[]
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
      acceptance_status:
        | "accepted"
        | "submitted"
        | "approved"
        | "rejected"
        | "paid"
      app_role: "admin" | "dancer"
      application_status: "none" | "pending" | "approved" | "rejected"
      campaign_status: "draft" | "active" | "paused" | "completed"
      payout_status: "pending" | "processing" | "completed" | "failed"
      review_status: "pending" | "approved" | "rejected"
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
      acceptance_status: [
        "accepted",
        "submitted",
        "approved",
        "rejected",
        "paid",
      ],
      app_role: ["admin", "dancer"],
      application_status: ["none", "pending", "approved", "rejected"],
      campaign_status: ["draft", "active", "paused", "completed"],
      payout_status: ["pending", "processing", "completed", "failed"],
      review_status: ["pending", "approved", "rejected"],
    },
  },
} as const
