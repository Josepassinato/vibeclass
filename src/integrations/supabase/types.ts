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
      certificates: {
        Row: {
          certificate_code: string
          certificate_type: string
          created_at: string
          id: string
          issued_at: string
          module_id: string | null
          module_title: string | null
          student_id: string
          student_name: string
        }
        Insert: {
          certificate_code: string
          certificate_type?: string
          created_at?: string
          id?: string
          issued_at?: string
          module_id?: string | null
          module_title?: string | null
          student_id: string
          student_name: string
        }
        Update: {
          certificate_code?: string
          certificate_type?: string
          created_at?: string
          id?: string
          issued_at?: string
          module_id?: string | null
          module_title?: string | null
          student_id?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string
          description: string
          difficulty_level: string
          evaluation_criteria: Json | null
          evidence_type: string
          id: string
          instructions: string
          is_active: boolean
          mission_order: number | null
          points_reward: number
          time_limit_minutes: number | null
          title: string
          updated_at: string
          video_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          difficulty_level?: string
          evaluation_criteria?: Json | null
          evidence_type?: string
          id?: string
          instructions: string
          is_active?: boolean
          mission_order?: number | null
          points_reward?: number
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          difficulty_level?: string
          evaluation_criteria?: Json | null
          evidence_type?: string
          id?: string
          instructions?: string
          is_active?: boolean
          mission_order?: number | null
          points_reward?: number
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_released: boolean | null
          module_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_released?: boolean | null
          module_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_released?: boolean | null
          module_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      squad_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          squad_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          squad_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          squad_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_mission_submissions: {
        Row: {
          ai_evaluation: Json | null
          ai_feedback: string | null
          created_at: string
          evaluated_at: string | null
          evidence_text: string | null
          evidence_url: string | null
          id: string
          mission_id: string
          score: number | null
          squad_id: string
          status: string
          submitted_at: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          ai_evaluation?: Json | null
          ai_feedback?: string | null
          created_at?: string
          evaluated_at?: string | null
          evidence_text?: string | null
          evidence_url?: string | null
          id?: string
          mission_id: string
          score?: number | null
          squad_id: string
          status?: string
          submitted_at?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          ai_evaluation?: Json | null
          ai_feedback?: string | null
          created_at?: string
          evaluated_at?: string | null
          evidence_text?: string | null
          evidence_url?: string | null
          id?: string
          mission_id?: string
          score?: number | null
          squad_id?: string
          status?: string
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_mission_submissions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_mission_submissions_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          created_at: string
          current_members: number
          id: string
          is_active: boolean
          max_members: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_members?: number
          id?: string
          is_active?: boolean
          max_members?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_members?: number
          id?: string
          is_active?: boolean
          max_members?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_achievements: {
        Row: {
          average_score: number | null
          badges: Json | null
          created_at: string
          current_streak: number
          id: string
          last_activity_at: string | null
          level: number
          longest_streak: number
          missions_attempted: number
          missions_completed: number
          student_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          average_score?: number | null
          badges?: Json | null
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_at?: string | null
          level?: number
          longest_streak?: number
          missions_attempted?: number
          missions_completed?: number
          student_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          average_score?: number | null
          badges?: Json | null
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_at?: string | null
          level?: number
          longest_streak?: number
          missions_attempted?: number
          missions_completed?: number
          student_id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          last_position_seconds: number | null
          student_id: string
          updated_at: string
          video_id: string
          watch_time_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          last_position_seconds?: number | null
          student_id: string
          updated_at?: string
          video_id: string
          watch_time_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          last_position_seconds?: number | null
          student_id?: string
          updated_at?: string
          video_id?: string
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_lesson_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      student_mission_submissions: {
        Row: {
          ai_evaluation: Json | null
          ai_feedback: string | null
          attempt_number: number
          created_at: string
          evaluated_at: string | null
          evidence_text: string | null
          evidence_url: string | null
          id: string
          mission_id: string
          score: number | null
          status: string
          student_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          ai_evaluation?: Json | null
          ai_feedback?: string | null
          attempt_number?: number
          created_at?: string
          evaluated_at?: string | null
          evidence_text?: string | null
          evidence_url?: string | null
          id?: string
          mission_id: string
          score?: number | null
          status?: string
          student_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          ai_evaluation?: Json | null
          ai_feedback?: string | null
          attempt_number?: number
          created_at?: string
          evaluated_at?: string | null
          evidence_text?: string | null
          evidence_url?: string | null
          id?: string
          mission_id?: string
          score?: number | null
          status?: string
          student_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_mission_submissions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_observations: {
        Row: {
          confidence_level: number | null
          context: string | null
          created_at: string
          emotional_state: string | null
          id: string
          observation_data: Json
          observation_type: string
          student_id: string
          video_id: string | null
        }
        Insert: {
          confidence_level?: number | null
          context?: string | null
          created_at?: string
          emotional_state?: string | null
          id?: string
          observation_data: Json
          observation_type: string
          student_id: string
          video_id?: string | null
        }
        Update: {
          confidence_level?: number | null
          context?: string | null
          created_at?: string
          emotional_state?: string | null
          id?: string
          observation_data?: Json
          observation_type?: string
          student_id?: string
          video_id?: string | null
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          areas_to_improve: string[] | null
          created_at: string
          emotional_patterns: Json | null
          id: string
          interaction_count: number | null
          last_seen_at: string | null
          learning_style: string | null
          name: string | null
          personality_notes: string | null
          preferences: Json | null
          strengths: string[] | null
          student_id: string
          total_study_time_minutes: number | null
          updated_at: string
        }
        Insert: {
          areas_to_improve?: string[] | null
          created_at?: string
          emotional_patterns?: Json | null
          id?: string
          interaction_count?: number | null
          last_seen_at?: string | null
          learning_style?: string | null
          name?: string | null
          personality_notes?: string | null
          preferences?: Json | null
          strengths?: string[] | null
          student_id: string
          total_study_time_minutes?: number | null
          updated_at?: string
        }
        Update: {
          areas_to_improve?: string[] | null
          created_at?: string
          emotional_patterns?: Json | null
          id?: string
          interaction_count?: number | null
          last_seen_at?: string | null
          learning_style?: string | null
          name?: string | null
          personality_notes?: string | null
          preferences?: Json | null
          strengths?: string[] | null
          student_id?: string
          total_study_time_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      student_quiz_attempts: {
        Row: {
          attempted_at: string
          id: string
          is_correct: boolean
          quiz_id: string
          selected_option_index: number
          student_id: string
          video_id: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          is_correct: boolean
          quiz_id: string
          selected_option_index: number
          student_id: string
          video_id: string
        }
        Update: {
          attempted_at?: string
          id?: string
          is_correct?: boolean
          quiz_id?: string
          selected_option_index?: number
          student_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "video_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_quiz_attempts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      student_quiz_results: {
        Row: {
          completed_at: string
          correct_answers: number
          id: string
          passed: boolean
          score_percentage: number
          student_id: string
          total_questions: number
          video_id: string
        }
        Insert: {
          completed_at?: string
          correct_answers?: number
          id?: string
          passed?: boolean
          score_percentage?: number
          student_id: string
          total_questions?: number
          video_id: string
        }
        Update: {
          completed_at?: string
          correct_answers?: number
          id?: string
          passed?: boolean
          score_percentage?: number
          student_id?: string
          total_questions?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_quiz_results_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
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
      video_quizzes: {
        Row: {
          correct_option_index: number
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          options: Json
          question: string
          question_order: number | null
          timestamp_seconds: number | null
          updated_at: string
          video_id: string
        }
        Insert: {
          correct_option_index: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: Json
          question: string
          question_order?: number | null
          timestamp_seconds?: number | null
          updated_at?: string
          video_id: string
        }
        Update: {
          correct_option_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: Json
          question?: string
          question_order?: number | null
          timestamp_seconds?: number | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_quizzes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          analysis: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_configured: boolean | null
          is_released: boolean | null
          lesson_order: number | null
          module_id: string | null
          teacher_intro: string | null
          teaching_moments: Json | null
          thumbnail_url: string | null
          title: string
          transcript: string | null
          updated_at: string
          video_type: string | null
          video_url: string | null
          youtube_id: string | null
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_configured?: boolean | null
          is_released?: boolean | null
          lesson_order?: number | null
          module_id?: string | null
          teacher_intro?: string | null
          teaching_moments?: Json | null
          thumbnail_url?: string | null
          title: string
          transcript?: string | null
          updated_at?: string
          video_type?: string | null
          video_url?: string | null
          youtube_id?: string | null
        }
        Update: {
          analysis?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_configured?: boolean | null
          is_released?: boolean | null
          lesson_order?: number | null
          module_id?: string | null
          teacher_intro?: string | null
          teaching_moments?: Json | null
          thumbnail_url?: string | null
          title?: string
          transcript?: string | null
          updated_at?: string
          video_type?: string | null
          video_url?: string | null
          youtube_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
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
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
