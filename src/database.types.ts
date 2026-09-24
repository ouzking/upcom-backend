export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      article_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          slug?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          category_id: string | null
          content: string | null
          cover_image_path: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          content?: string | null
          cover_image_path?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          content?: string | null
          cover_image_path?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "article_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          internal_notes: string | null
          ip_hash: string | null
          message: string
          name: string
          notified_at: string | null
          phone: string | null
          status: Database["public"]["Enums"]["contact_status"]
          subject: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          internal_notes?: string | null
          ip_hash?: string | null
          message: string
          name: string
          notified_at?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          subject?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          internal_notes?: string | null
          ip_hash?: string | null
          message?: string
          name?: string
          notified_at?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          subject?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          cover_image_path: string | null
          created_at: string
          description: string | null
          end_date: string | null
          event_date: string
          excerpt: string | null
          id: string
          is_featured: boolean
          location: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          location?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          location?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      project_images: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          display_order: number
          id: string
          image_path: string
          project_id: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_path: string
          project_id: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_path?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          category_id: string | null
          client_name: string | null
          cover_image_path: string | null
          created_at: string
          description: string | null
          display_order: number
          excerpt: string | null
          id: string
          is_featured: boolean
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          category_id?: string | null
          client_name?: string | null
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          category_id?: string | null
          client_name?: string | null
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          assigned_to: string | null
          budget: string | null
          company: string | null
          created_at: string
          deadline: string | null
          email: string
          id: string
          internal_notes: string | null
          ip_hash: string | null
          message: string
          name: string
          notified_at: string | null
          phone: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget?: string | null
          company?: string | null
          created_at?: string
          deadline?: string | null
          email: string
          id?: string
          internal_notes?: string | null
          ip_hash?: string | null
          message: string
          name: string
          notified_at?: string | null
          phone?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget?: string | null
          company?: string | null
          created_at?: string
          deadline?: string | null
          email?: string
          id?: string
          internal_notes?: string | null
          ip_hash?: string | null
          message?: string
          name?: string
          notified_at?: string | null
          phone?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          image_path: string | null
          is_featured: boolean
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          image_path?: string | null
          is_featured?: boolean
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          image_path?: string | null
          is_featured?: boolean
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          description: string | null
          email: string | null
          favicon_path: string | null
          id: number
          logo_path: string | null
          map_url: string | null
          opening_hours: string | null
          phone_primary: string | null
          phone_secondary: string | null
          tagline: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          company_name: string
          created_at?: string
          description?: string | null
          email?: string | null
          favicon_path?: string | null
          id?: number
          logo_path?: string | null
          map_url?: string | null
          opening_hours?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          tagline?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          description?: string | null
          email?: string | null
          favicon_path?: string | null
          id?: number
          logo_path?: string | null
          map_url?: string | null
          opening_hours?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          tagline?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          label: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          biography: string | null
          created_at: string
          display_order: number
          email: string | null
          id: string
          linkedin_url: string | null
          name: string
          phone: string | null
          photo_path: string | null
          position: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          biography?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          phone?: string | null
          photo_path?: string | null
          position: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          biography?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          photo_path?: string | null
          position?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          company: string | null
          content: string
          created_at: string
          display_order: number
          id: string
          is_featured: boolean
          name: string
          photo_path: string | null
          role: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          company?: string | null
          content: string
          created_at?: string
          display_order?: number
          id?: string
          is_featured?: boolean
          name: string
          photo_path?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          company?: string | null
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          is_featured?: boolean
          name?: string
          photo_path?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_access: {
        Args: never
        Returns: {
          permissions: Database["public"]["Enums"]["app_permission"][]
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
    }
    Enums: {
      app_permission:
        | "services.manage"
        | "projects.manage"
        | "articles.manage"
        | "events.manage"
        | "team.manage"
        | "testimonials.manage"
        | "quotes.view"
        | "quotes.manage"
        | "contacts.view"
        | "contacts.manage"
        | "settings.manage"
        | "users.manage"
      app_role:
        | "super_admin"
        | "editor"
        | "commercial"
        | "communication_manager"
      contact_status: "new" | "read" | "replied" | "archived"
      content_status: "draft" | "published" | "archived"
      quote_status: "new" | "in_progress" | "contacted" | "converted" | "closed"
      social_platform:
        | "facebook"
        | "instagram"
        | "linkedin"
        | "x"
        | "youtube"
        | "tiktok"
        | "whatsapp"
        | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_permission: [
        "services.manage",
        "projects.manage",
        "articles.manage",
        "events.manage",
        "team.manage",
        "testimonials.manage",
        "quotes.view",
        "quotes.manage",
        "contacts.view",
        "contacts.manage",
        "settings.manage",
        "users.manage",
      ],
      app_role: [
        "super_admin",
        "editor",
        "commercial",
        "communication_manager",
      ],
      contact_status: ["new", "read", "replied", "archived"],
      content_status: ["draft", "published", "archived"],
      quote_status: ["new", "in_progress", "contacted", "converted", "closed"],
      social_platform: [
        "facebook",
        "instagram",
        "linkedin",
        "x",
        "youtube",
        "tiktok",
        "whatsapp",
        "other",
      ],
    },
  },
} as const

