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
          facebook_handle: string | null
          full_name: string
          id: string
          instagram_handle: string | null
          location: string | null
          referral_code: string | null
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
          facebook_handle?: string | null
          full_name: string
          id?: string
          instagram_handle?: string | null
          location?: string | null
          referral_code?: string | null
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
          facebook_handle?: string | null
          full_name?: string
          id?: string
          instagram_handle?: string | null
          location?: string | null
          referral_code?: string | null
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
      inquiries: {
        Row: {
          artist_name: string
          budget_range: string | null
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string | null
          song_title: string | null
          status: string
        }
        Insert: {
          artist_name: string
          budget_range?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone?: string | null
          song_title?: string | null
          status?: string
        }
        Update: {
          artist_name?: string
          budget_range?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string | null
          song_title?: string | null
          status?: string
        }
        Relationships: []
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
      partner_commissions: {
        Row: {
          commission_cents: number
          commission_rate: number
          created_at: string
          dancer_id: string
          dancer_payout_cents: number
          id: string
          paid_at: string | null
          partner_id: string
          payout_id: string
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          commission_cents: number
          commission_rate: number
          created_at?: string
          dancer_id: string
          dancer_payout_cents: number
          id?: string
          paid_at?: string | null
          partner_id: string
          payout_id: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          commission_cents?: number
          commission_rate?: number
          created_at?: string
          dancer_id?: string
          dancer_payout_cents?: number
          id?: string
          paid_at?: string | null
          partner_id?: string
          payout_id?: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: true
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_referrals: {
        Row: {
          dancer_id: string
          id: string
          linked_at: string
          partner_id: string
        }
        Insert: {
          dancer_id: string
          id?: string
          linked_at?: string
          partner_id: string
        }
        Update: {
          dancer_id?: string
          id?: string
          linked_at?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          commission_tiers: Json
          created_at: string
          earnings_window_months: number
          email: string
          id: string
          name: string
          referral_code: string
          status: string
          stripe_account_id: string | null
          stripe_onboarded: boolean
          user_id: string | null
        }
        Insert: {
          commission_tiers?: Json
          created_at?: string
          earnings_window_months?: number
          email: string
          id?: string
          name: string
          referral_code: string
          status?: string
          stripe_account_id?: string | null
          stripe_onboarded?: boolean
          user_id?: string | null
        }
        Update: {
          commission_tiers?: Json
          created_at?: string
          earnings_window_months?: number
          email?: string
          id?: string
          name?: string
          referral_code?: string
          status?: string
          stripe_account_id?: string | null
          stripe_onboarded?: boolean
          user_id?: string | null
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
      producer_applications: {
        Row: {
          artwork_url: string | null
          bio: string | null
          created_at: string
          demo_url: string | null
          email: string
          genre: string | null
          id: string
          instagram_url: string | null
          legal_name: string
          location: string | null
          other_social_url: string | null
          portfolio_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          soundcloud_url: string | null
          spotify_url: string | null
          stage_name: string | null
          status: string
          tiktok_url: string | null
          website_url: string | null
        }
        Insert: {
          artwork_url?: string | null
          bio?: string | null
          created_at?: string
          demo_url?: string | null
          email: string
          genre?: string | null
          id?: string
          instagram_url?: string | null
          legal_name: string
          location?: string | null
          other_social_url?: string | null
          portfolio_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          stage_name?: string | null
          status?: string
          tiktok_url?: string | null
          website_url?: string | null
        }
        Update: {
          artwork_url?: string | null
          bio?: string | null
          created_at?: string
          demo_url?: string | null
          email?: string
          genre?: string | null
          id?: string
          instagram_url?: string | null
          legal_name?: string
          location?: string | null
          other_social_url?: string | null
          portfolio_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          stage_name?: string | null
          status?: string
          tiktok_url?: string | null
          website_url?: string | null
        }
        Relationships: []
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
      admin_accept_counter: {
        Args: { p_offer_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_all_contracts: {
        Args: { p_user_id: string }
        Returns: {
          admin_signed_at: string
          created_at: string
          deal_type: string
          id: string
          offer_id: string
          offer_version: number
          pdf_url: string
          producer_name: string
          producer_signed_at: string
          status:
            | "generated"
            | "sent_for_signature"
            | "signed_by_producer"
            | "signed_by_platform"
            | "fully_executed"
            | "archived"
          track_title: string
        }[]
      }
      admin_archive_contract: {
        Args: { p_contract_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_contract_detail: {
        Args: { p_contract_id: string; p_user_id: string }
        Returns: {
          admin_signed_at: string
          created_at: string
          created_by: string
          deal_type: string
          hash_checksum: string
          id: string
          offer_id: string
          offer_version: number
          pdf_url: string
          producer_name: string
          producer_signed_at: string
          rendered_body: string
          status:
            | "generated"
            | "sent_for_signature"
            | "signed_by_producer"
            | "signed_by_platform"
            | "fully_executed"
            | "archived"
          template_version: string
          track_title: string
        }[]
      }
      admin_contract_history: {
        Args: { p_contract_id: string; p_user_id: string }
        Returns: {
          changed_at: string
          changed_by: string
          id: string
          new_state: string
          previous_state: string
        }[]
      }
      admin_contract_signatures: {
        Args: { p_contract_id: string; p_user_id: string }
        Returns: {
          id: string
          ip_address: string
          signed_at: string
          signer_id: string
          signer_role: string
          user_agent: string
        }[]
      }
      admin_create_offer: {
        Args: {
          p_buyout_amount: number
          p_deal_type: string
          p_exclusivity: boolean
          p_expires_at: string
          p_platform_split: number
          p_producer_split: number
          p_term_length: string
          p_territory: string
          p_track_id: string
          p_user_id: string
        }
        Returns: string
      }
      admin_deal_offers: {
        Args: { p_user_id: string }
        Returns: {
          buyout_amount: number
          created_at: string
          deal_type: string
          exclusivity_flag: boolean
          expires_at: string
          id: string
          platform_split_percent: number
          producer_name: string
          producer_split_percent: number
          status:
            | "draft"
            | "sent"
            | "viewed"
            | "countered"
            | "revised"
            | "accepted"
            | "rejected"
            | "expired"
            | "signed"
          term_length: string
          territory: string
          track_id: string
          track_title: string
          version_number: number
        }[]
      }
      admin_deal_overview: {
        Args: { p_user_id: string }
        Returns: {
          active_deals: number
          approval_rate: number
          pending_payout_liability: number
          total_revenue: number
          total_tracks: number
          tracks_under_review: number
        }[]
      }
      admin_deal_track_detail: {
        Args: { p_track_id: string; p_user_id: string }
        Returns: {
          artwork_url: string
          bpm: number
          created_at: string
          denial_reason: string
          explicit_flag: boolean
          file_url: string
          genre: string
          id: string
          isrc: string
          master_ownership_percent: number
          mood_tags: Json
          producer_email: string
          producer_name: string
          publishing_ownership_percent: number
          status:
            | "draft"
            | "submitted"
            | "under_review"
            | "denied"
            | "offer_pending"
            | "offer_sent"
            | "counter_received"
            | "deal_signed"
            | "active"
            | "expired"
            | "terminated"
          title: string
        }[]
      }
      admin_deal_track_history: {
        Args: { p_track_id: string; p_user_id: string }
        Returns: {
          changed_at: string
          changed_by: string
          id: string
          new_state: string
          override_reason: string
          previous_state: string
        }[]
      }
      admin_deal_tracks: {
        Args: { p_status?: string; p_user_id: string }
        Returns: {
          bpm: number
          created_at: string
          denial_reason: string
          genre: string
          id: string
          isrc: string
          producer_id: string
          producer_name: string
          status:
            | "draft"
            | "submitted"
            | "under_review"
            | "denied"
            | "offer_pending"
            | "offer_sent"
            | "counter_received"
            | "deal_signed"
            | "active"
            | "expired"
            | "terminated"
          title: string
        }[]
      }
      admin_deny_track: {
        Args: { p_reason: string; p_track_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_force_state: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_new_state: string
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_generate_contract: {
        Args: { p_offer_id: string; p_user_id: string }
        Returns: string
      }
      admin_offer_history: {
        Args: { p_offer_id: string; p_user_id: string }
        Returns: {
          changed_at: string
          changed_by: string
          id: string
          new_state: string
          override_reason: string
          previous_state: string
        }[]
      }
      admin_reject_counter: {
        Args: { p_offer_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_reopen_track: {
        Args: { p_track_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_revenue_events: {
        Args: { p_campaign_id?: string; p_user_id: string }
        Returns: {
          campaign_id: string
          created_at: string
          distribution_id: string
          gross_revenue: number
          id: string
          net_revenue: number
          payout_status: Database["public"]["Enums"]["payout_status"]
          platform_amount: number
          platform_fee: number
          producer_amount: number
          producer_name: string
          track_id: string
          track_title: string
        }[]
      }
      admin_review_track: {
        Args: { p_track_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_revise_offer: {
        Args: {
          p_buyout_amount: number
          p_exclusivity: boolean
          p_expires_at: string
          p_offer_id: string
          p_platform_split: number
          p_producer_split: number
          p_term_length: string
          p_territory: string
          p_user_id: string
        }
        Returns: string
      }
      admin_send_contract: {
        Args: { p_contract_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_sign_contract: {
        Args: {
          p_contract_id: string
          p_ip_address?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_track_contracts: {
        Args: { p_track_id: string; p_user_id: string }
        Returns: {
          admin_signed_at: string
          created_at: string
          id: string
          offer_id: string
          offer_version: number
          pdf_url: string
          producer_signed_at: string
          status:
            | "generated"
            | "sent_for_signature"
            | "signed_by_producer"
            | "signed_by_platform"
            | "fully_executed"
            | "archived"
        }[]
      }
      admin_track_offers: {
        Args: { p_track_id: string; p_user_id: string }
        Returns: {
          buyout_amount: number
          created_at: string
          created_by: string
          deal_type: string
          exclusivity_flag: boolean
          expires_at: string
          id: string
          platform_split_percent: number
          producer_split_percent: number
          status:
            | "draft"
            | "sent"
            | "viewed"
            | "countered"
            | "revised"
            | "accepted"
            | "rejected"
            | "expired"
            | "signed"
          term_length: string
          territory: string
          version_number: number
        }[]
      }
      admin_update_contract_pdf: {
        Args: {
          p_contract_id: string
          p_hash_checksum: string
          p_pdf_url: string
          p_user_id: string
        }
        Returns: undefined
      }
      auto_generate_contract: { Args: { p_offer_id: string }; Returns: string }
      check_producer_stripe_status: {
        Args: { p_user_id: string }
        Returns: {
          stripe_account_id: string
          stripe_onboarded: boolean
        }[]
      }
      complete_payout: {
        Args: {
          p_payout_id: string
          p_stripe_event_id?: string
          p_stripe_transfer_id: string
        }
        Returns: undefined
      }
      create_assignment: {
        Args: { p_campaign_id: string; p_user_id: string }
        Returns: string
      }
      create_producer_record_on_approve: {
        Args: {
          p_email?: string
          p_legal_name: string
          p_stage_name?: string
          p_user_id: string
        }
        Returns: undefined
      }
      fail_payout: {
        Args: { p_error: string; p_payout_id: string }
        Returns: undefined
      }
      finance_liability_summary: {
        Args: { p_user_id: string }
        Returns: {
          total_dancer_liability: number
          total_dancer_paid: number
          total_producer_liability: number
          total_producer_paid: number
        }[]
      }
      finance_pending_producer_payouts: {
        Args: { p_user_id: string }
        Returns: {
          distribution_count: number
          pending_amount: number
          producer_id: string
          producer_name: string
          stripe_account_id: string
          stripe_onboarded: boolean
        }[]
      }
      finance_producer_payouts: {
        Args: { p_status?: string; p_user_id: string }
        Returns: {
          amount: number
          created_at: string
          error_message: string
          flagged_for_review: boolean
          id: string
          payout_provider_reference: string
          payout_type: string
          processed_at: string
          producer_id: string
          producer_name: string
          retry_count: number
          status: Database["public"]["Enums"]["payout_status"]
          stripe_event_id: string
        }[]
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
      get_dancer_submissions: {
        Args: { p_dancer_id: string }
        Returns: {
          artist_name: string
          campaign_title: string
          cover_image_url: string
          id: string
          platform: string
          submitted_at: string
          video_url: string
        }[]
      }
      get_producer_id: { Args: { p_user_id: string }; Returns: string }
      get_producer_stripe_info: {
        Args: { p_user_id: string }
        Returns: {
          stripe_account_id: string
          stripe_onboarded: boolean
        }[]
      }
      get_public_profile: {
        Args: { p_dancer_id: string }
        Returns: {
          avatar_url: string
          bio: string
          dance_style: string
          full_name: string
          id: string
          instagram_handle: string
          location: string
          tiktok_handle: string
          youtube_handle: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_deal_admin: { Args: { _user_id: string }; Returns: boolean }
      is_deal_viewer: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_distributions_processing: {
        Args: {
          p_distribution_ids: string[]
          p_payout_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      process_payout_queue: {
        Args: { p_producer_id?: string; p_user_id: string }
        Returns: {
          distribution_ids: string[]
          producer_id: string
          producer_name: string
          stripe_account_id: string
          total_amount: number
        }[]
      }
      producer_accept_offer: {
        Args: { p_offer_id: string; p_user_id: string }
        Returns: undefined
      }
      producer_contract_detail: {
        Args: { p_contract_id: string; p_user_id: string }
        Returns: {
          admin_signed_at: string
          created_at: string
          deal_type: string
          id: string
          offer_id: string
          offer_version: number
          pdf_url: string
          producer_signed_at: string
          rendered_body: string
          status:
            | "generated"
            | "sent_for_signature"
            | "signed_by_producer"
            | "signed_by_platform"
            | "fully_executed"
            | "archived"
          template_version: string
          track_title: string
        }[]
      }
      producer_contracts: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
          offer_id: string
          offer_version: number
          pdf_url: string
          producer_signed_at: string
          status:
            | "generated"
            | "sent_for_signature"
            | "signed_by_producer"
            | "signed_by_platform"
            | "fully_executed"
            | "archived"
          track_title: string
        }[]
      }
      producer_counter_offer: {
        Args: {
          p_buyout_amount: number
          p_offer_id: string
          p_platform_split: number
          p_producer_split: number
          p_term_length: string
          p_territory: string
          p_user_id: string
        }
        Returns: string
      }
      producer_earnings: {
        Args: { p_user_id: string }
        Returns: {
          event_date: string
          gross_revenue: number
          id: string
          net_revenue: number
          payout_status: Database["public"]["Enums"]["payout_status"]
          platform_amount: number
          platform_fee: number
          producer_amount: number
          track_title: string
        }[]
      }
      producer_earnings_by_campaign: {
        Args: { p_user_id: string }
        Returns: {
          campaign_id: string
          event_count: number
          total_producer: number
          track_id: string
          track_title: string
        }[]
      }
      producer_earnings_by_track: {
        Args: { p_user_id: string }
        Returns: {
          distribution_count: number
          total_gross: number
          total_net: number
          total_platform: number
          total_producer: number
          track_id: string
          track_title: string
        }[]
      }
      producer_offer_detail: {
        Args: { p_offer_id: string; p_user_id: string }
        Returns: {
          buyout_amount: number
          created_at: string
          deal_type: string
          exclusivity_flag: boolean
          expires_at: string
          id: string
          platform_split_percent: number
          producer_split_percent: number
          status:
            | "draft"
            | "sent"
            | "viewed"
            | "countered"
            | "revised"
            | "accepted"
            | "rejected"
            | "expired"
            | "signed"
          term_length: string
          territory: string
          track_id: string
          track_title: string
          version_number: number
        }[]
      }
      producer_offers: {
        Args: { p_user_id: string }
        Returns: {
          buyout_amount: number
          created_at: string
          deal_type: string
          expires_at: string
          id: string
          platform_split_percent: number
          producer_split_percent: number
          status:
            | "draft"
            | "sent"
            | "viewed"
            | "countered"
            | "revised"
            | "accepted"
            | "rejected"
            | "expired"
            | "signed"
          track_id: string
          track_title: string
          version_number: number
        }[]
      }
      producer_overview: {
        Args: { p_user_id: string }
        Returns: {
          active_deals: number
          pending_earnings: number
          total_earned: number
          total_tracks: number
          tracks_under_review: number
        }[]
      }
      producer_payouts: {
        Args: { p_user_id: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          payout_type: string
          processed_at: string
          status: Database["public"]["Enums"]["payout_status"]
        }[]
      }
      producer_reject_offer: {
        Args: { p_offer_id: string; p_user_id: string }
        Returns: undefined
      }
      producer_sign_contract: {
        Args: {
          p_contract_id: string
          p_ip_address?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      producer_submit_track:
        | {
            Args: {
              p_artwork_url: string
              p_bpm: number
              p_explicit: boolean
              p_file_url: string
              p_genre: string
              p_isrc: string
              p_master_pct: number
              p_mood_tags: string
              p_publishing_pct: number
              p_title: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_artwork_url: string
              p_bpm: number
              p_explicit: boolean
              p_file_url: string
              p_first_name?: string
              p_genre: string
              p_isrc: string
              p_last_name?: string
              p_master_pct: number
              p_mood_tags: string
              p_publishing_pct: number
              p_title: string
              p_user_id: string
            }
            Returns: string
          }
      producer_track_detail: {
        Args: { p_track_id: string; p_user_id: string }
        Returns: {
          artwork_url: string
          bpm: number
          created_at: string
          explicit_flag: boolean
          file_url: string
          genre: string
          id: string
          isrc: string
          master_ownership_percent: number
          mood_tags: Json
          publishing_ownership_percent: number
          status:
            | "draft"
            | "submitted"
            | "under_review"
            | "denied"
            | "offer_pending"
            | "offer_sent"
            | "counter_received"
            | "deal_signed"
            | "active"
            | "expired"
            | "terminated"
          title: string
        }[]
      }
      producer_track_history: {
        Args: { p_track_id: string; p_user_id: string }
        Returns: {
          changed_at: string
          id: string
          new_state: string
          previous_state: string
        }[]
      }
      producer_tracks: {
        Args: { p_user_id: string }
        Returns: {
          bpm: number
          created_at: string
          deal_type: string
          earnings: number
          genre: string
          id: string
          isrc: string
          status:
            | "draft"
            | "submitted"
            | "under_review"
            | "denied"
            | "offer_pending"
            | "offer_sent"
            | "counter_received"
            | "deal_signed"
            | "active"
            | "expired"
            | "terminated"
          title: string
        }[]
      }
      set_producer_stripe_onboarded: {
        Args: { p_stripe_account_id: string }
        Returns: undefined
      }
      update_contract_hash_after_signature: {
        Args: { p_contract_id: string; p_hash_checksum: string }
        Returns: undefined
      }
      update_producer_stripe: {
        Args: { p_stripe_account_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      acceptance_status:
        | "accepted"
        | "submitted"
        | "approved"
        | "rejected"
        | "paid"
      app_role:
        | "admin"
        | "dancer"
        | "producer"
        | "super_admin"
        | "finance_admin"
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
      app_role: ["admin", "dancer", "producer", "super_admin", "finance_admin"],
      application_status: ["none", "pending", "approved", "rejected"],
      campaign_status: ["draft", "active", "paused", "completed"],
      payout_status: ["pending", "processing", "completed", "failed"],
      review_status: ["pending", "approved", "rejected"],
    },
  },
} as const
