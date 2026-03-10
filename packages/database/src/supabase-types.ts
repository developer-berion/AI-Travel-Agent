export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    CompositeTypes: Record<string, never>;
    Enums: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      operator_profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_active: boolean;
          role: "operator" | "admin";
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          is_active?: boolean;
          role?: "operator" | "admin";
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          role?: "operator" | "admin";
        };
        Relationships: [];
      };
      quote_sessions: {
        Row: {
          active_quote_version: number;
          agency_name: string;
          archived_at: string | null;
          commercial_status: string;
          created_at: string;
          id: string;
          latest_context_summary: string;
          operator_id: string;
          pending_question: string | null;
          recommendation_mode: string;
          status: string;
          title: string;
          trip_label: string;
          trip_start_date: string | null;
          updated_at: string;
        };
        Insert: {
          active_quote_version?: number;
          agency_name: string;
          archived_at?: string | null;
          commercial_status: string;
          created_at?: string;
          id?: string;
          latest_context_summary?: string;
          operator_id: string;
          pending_question?: string | null;
          recommendation_mode: string;
          status: string;
          title: string;
          trip_label: string;
          trip_start_date?: string | null;
          updated_at?: string;
        };
        Update: {
          active_quote_version?: number;
          agency_name?: string;
          archived_at?: string | null;
          commercial_status?: string;
          created_at?: string;
          id?: string;
          latest_context_summary?: string;
          operator_id?: string;
          pending_question?: string | null;
          recommendation_mode?: string;
          status?: string;
          title?: string;
          trip_label?: string;
          trip_start_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      quote_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          quote_session_id: string;
          role: "operator" | "assistant" | "system";
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          quote_session_id: string;
          role: "operator" | "assistant" | "system";
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          quote_session_id?: string;
          role?: "operator" | "assistant" | "system";
        };
        Relationships: [];
      };
      structured_intakes: {
        Row: {
          contradictions: Json;
          created_at: string;
          extracted_fields: Json;
          id: string;
          missing_fields: Json;
          quote_session_id: string;
          readiness_snapshot: Json;
          requested_service_lines: Json;
        };
        Insert: {
          contradictions?: Json;
          created_at?: string;
          extracted_fields: Json;
          id?: string;
          missing_fields: Json;
          quote_session_id: string;
          readiness_snapshot: Json;
          requested_service_lines: Json;
        };
        Update: {
          contradictions?: Json;
          created_at?: string;
          extracted_fields?: Json;
          id?: string;
          missing_fields?: Json;
          quote_session_id?: string;
          readiness_snapshot?: Json;
          requested_service_lines?: Json;
        };
        Relationships: [];
      };
      selected_quote_items: {
        Row: {
          created_at: string;
          id: string;
          option_snapshot: Json;
          quote_session_id: string;
          service_line: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          option_snapshot: Json;
          quote_session_id: string;
          service_line: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          option_snapshot?: Json;
          quote_session_id?: string;
          service_line?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shortlists: {
        Row: {
          created_at: string;
          id: string;
          quote_session_id: string;
          reason: string | null;
          service_line: string;
          weak_shortlist: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          quote_session_id: string;
          reason?: string | null;
          service_line: string;
          weak_shortlist?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          quote_session_id?: string;
          reason?: string | null;
          service_line?: string;
          weak_shortlist?: boolean;
        };
        Relationships: [];
      };
      normalized_options: {
        Row: {
          availability_state: string;
          caveat: string | null;
          created_at: string;
          currency: string;
          destination: string;
          headline_price: number;
          id: string;
          service_line: string;
          shortlist_id: string;
          supplier_metadata: Json;
          title: string;
          tradeoff: string;
          why_it_fits: string;
        };
        Insert: {
          availability_state: string;
          caveat?: string | null;
          created_at?: string;
          currency: string;
          destination: string;
          headline_price: number;
          id?: string;
          service_line: string;
          shortlist_id: string;
          supplier_metadata?: Json;
          title: string;
          tradeoff: string;
          why_it_fits: string;
        };
        Update: {
          availability_state?: string;
          caveat?: string | null;
          created_at?: string;
          currency?: string;
          destination?: string;
          headline_price?: number;
          id?: string;
          service_line?: string;
          shortlist_id?: string;
          supplier_metadata?: Json;
          title?: string;
          tradeoff?: string;
          why_it_fits?: string;
        };
        Relationships: [];
      };
      quote_context_snapshots: {
        Row: {
          created_at: string;
          id: string;
          payload: Json;
          quote_session_id: string;
          summary: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          payload: Json;
          quote_session_id: string;
          summary: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          payload?: Json;
          quote_session_id?: string;
          summary?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          created_at: string;
          event_name: string;
          id: string;
          payload: Json;
          quote_session_id: string;
        };
        Insert: {
          created_at?: string;
          event_name: string;
          id?: string;
          payload?: Json;
          quote_session_id: string;
        };
        Update: {
          created_at?: string;
          event_name?: string;
          id?: string;
          payload?: Json;
          quote_session_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
  };
};
