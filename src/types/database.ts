export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string;
          created_at: string;
          game_session_id: string | null;
          id: string;
          profile_id: string;
        };
        Insert: {
          activity_type?: string;
          created_at?: string;
          game_session_id?: string | null;
          id?: string;
          profile_id: string;
        };
        Update: {
          activity_type?: string;
          created_at?: string;
          game_session_id?: string | null;
          id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_game_session_id_fkey";
            columns: ["game_session_id"];
            isOneToOne: false;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          body: string;
          created_at: string;
          game_session_id: string;
          id: string;
          profile_id: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          game_session_id: string;
          id?: string;
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          game_session_id?: string;
          id?: string;
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_game_session_id_fkey";
            columns: ["game_session_id"];
            isOneToOne: false;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      game_participants: {
        Row: {
          added_by: string;
          confirmation_status: string;
          created_at: string;
          guest_name: string | null;
          id: string;
          is_winner: boolean;
          position: number | null;
          profile_id: string | null;
          score: number | null;
          score_breakdown: Json | null;
          session_id: string;
          updated_at: string;
        };
        Insert: {
          added_by: string;
          confirmation_status?: string;
          created_at?: string;
          guest_name?: string | null;
          id?: string;
          is_winner?: boolean;
          position?: number | null;
          profile_id?: string | null;
          score?: number | null;
          score_breakdown?: Json | null;
          session_id: string;
          updated_at?: string;
        };
        Update: {
          added_by?: string;
          confirmation_status?: string;
          created_at?: string;
          guest_name?: string | null;
          id?: string;
          is_winner?: boolean;
          position?: number | null;
          profile_id?: string | null;
          score?: number | null;
          score_breakdown?: Json | null;
          session_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_participants_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_participants_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_participants_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      game_sessions: {
        Row: {
          cooperative_outcome: string | null;
          cooperative_score: number | null;
          created_at: string;
          created_by: string;
          game_id: string;
          group_id: string | null;
          id: string;
          location: string | null;
          notes: string | null;
          played_at: string;
          team_details: Json | null;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          cooperative_outcome?: string | null;
          cooperative_score?: number | null;
          created_at?: string;
          created_by: string;
          game_id: string;
          group_id?: string | null;
          id?: string;
          location?: string | null;
          notes?: string | null;
          played_at?: string;
          team_details?: Json | null;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          cooperative_outcome?: string | null;
          cooperative_score?: number | null;
          created_at?: string;
          created_by?: string;
          game_id?: string;
          group_id?: string | null;
          id?: string;
          location?: string | null;
          notes?: string | null;
          played_at?: string;
          team_details?: Json | null;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_sessions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_sessions_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_sessions_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      games: {
        Row: {
          bgg_id: number | null;
          categories: string[];
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          image_url: string | null;
          max_players: number | null;
          mechanics: string[];
          min_players: number | null;
          playtime_minutes_max: number | null;
          playtime_minutes_min: number | null;
          publisher: string | null;
          scoring_schema: Json | null;
          scoring_type: string;
          slug: string;
          title: string;
          updated_at: string;
          year_published: number | null;
        };
        Insert: {
          bgg_id?: number | null;
          categories?: string[];
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          max_players?: number | null;
          mechanics?: string[];
          min_players?: number | null;
          playtime_minutes_max?: number | null;
          playtime_minutes_min?: number | null;
          publisher?: string | null;
          scoring_schema?: Json | null;
          scoring_type?: string;
          slug: string;
          title: string;
          updated_at?: string;
          year_published?: number | null;
        };
        Update: {
          bgg_id?: number | null;
          categories?: string[];
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          max_players?: number | null;
          mechanics?: string[];
          min_players?: number | null;
          playtime_minutes_max?: number | null;
          playtime_minutes_min?: number | null;
          publisher?: string | null;
          scoring_schema?: Json | null;
          scoring_type?: string;
          slug?: string;
          title?: string;
          updated_at?: string;
          year_published?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "games_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      group_invitations: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          invited_by: string;
          invitee_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          invited_by: string;
          invitee_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          invited_by?: string;
          invitee_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_invitations_invitee_id_fkey";
            columns: ["invitee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: {
          added_by: string;
          created_at: string;
          group_id: string;
          id: string;
          profile_id: string;
          role: string;
        };
        Insert: {
          added_by: string;
          created_at?: string;
          group_id: string;
          id?: string;
          profile_id: string;
          role?: string;
        };
        Update: {
          added_by?: string;
          created_at?: string;
          group_id?: string;
          id?: string;
          profile_id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      likes: {
        Row: {
          created_at: string;
          game_session_id: string;
          id: string;
          profile_id: string;
        };
        Insert: {
          created_at?: string;
          game_session_id: string;
          id?: string;
          profile_id: string;
        };
        Update: {
          created_at?: string;
          game_session_id?: string;
          id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "likes_game_session_id_fkey";
            columns: ["game_session_id"];
            isOneToOne: false;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "likes_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          actor_id: string | null;
          comment_id: string | null;
          created_at: string;
          game_session_id: string | null;
          group_id: string | null;
          id: string;
          is_read: boolean;
          payload: NonNullable<Json>;
          profile_id: string;
          type: string;
        };
        Insert: {
          actor_id?: string | null;
          comment_id?: string | null;
          created_at?: string;
          game_session_id?: string | null;
          group_id?: string | null;
          id?: string;
          is_read?: boolean;
          payload?: NonNullable<Json>;
          profile_id: string;
          type: string;
        };
        Update: {
          actor_id?: string | null;
          comment_id?: string | null;
          created_at?: string;
          game_session_id?: string | null;
          group_id?: string | null;
          id?: string;
          is_read?: boolean;
          payload?: NonNullable<Json>;
          profile_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_game_session_id_fkey";
            columns: ["game_session_id"];
            isOneToOne: false;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          created_at: string;
          game_session_id: string;
          id: string;
          storage_path: string;
          uploaded_by: string;
        };
        Insert: {
          created_at?: string;
          game_session_id: string;
          id?: string;
          storage_path: string;
          uploaded_by: string;
        };
        Update: {
          created_at?: string;
          game_session_id?: string;
          id?: string;
          storage_path?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photos_game_session_id_fkey";
            columns: ["game_session_id"];
            isOneToOne: false;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          activated_at: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          first_game_logged_at: string | null;
          id: string;
          privacy: string;
          referral_source: string | null;
          updated_at: string;
          username: string;
        };
        Insert: {
          activated_at?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          first_game_logged_at?: string | null;
          id: string;
          privacy?: string;
          referral_source?: string | null;
          updated_at?: string;
          username: string;
        };
        Update: {
          activated_at?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          first_game_logged_at?: string | null;
          id?: string;
          privacy?: string;
          referral_source?: string | null;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_view_game_session: { Args: { p_session_id: string }; Returns: boolean };
      is_group_member: { Args: { p_group_id: string }; Returns: boolean };
      is_session_participant: { Args: { p_session_id: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
