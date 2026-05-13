export type WebsiteStatus = "no_website" | "weak_website" | "good_website" | "unknown";
export type DemoSiteStatus = "draft" | "reviewed" | "approved" | "published" | "archived";
export type OutreachStatus = "draft" | "approved" | "sent" | "rejected";
export type PaymentType = "setup" | "maintenance";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Business = {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  existing_website_url: string | null;
  source_url: string | null;
  external_place_id: string | null;
  notes: string | null;
  website_status: WebsiteStatus;
  lead_score: number;
  archived_at: string | null;
  archive_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type DemoSite = {
  id: string;
  business_id: string;
  slug: string;
  hero_headline: string;
  subheadline: string | null;
  services_json: Json;
  about_text: string | null;
  call_to_action: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  generated_html_or_json: Json;
  status: DemoSiteStatus;
  created_at: string;
  updated_at: string;
};

export type OutreachMessage = {
  id: string;
  business_id: string;
  subject: string;
  body: string;
  status: OutreachStatus;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  business_id: string;
  stripe_payment_link: string;
  stripe_payment_link_id: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  amount: number;
  status: string;
  payment_type: PaymentType;
  is_active: boolean;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  user_id: string;
  email: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: Business;
        Insert: Omit<Partial<Business>, "id" | "created_at" | "updated_at"> & { name: string };
        Update: Partial<Omit<Business, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      demo_sites: {
        Row: DemoSite;
        Insert: Omit<Partial<DemoSite>, "id" | "created_at" | "updated_at"> & {
          business_id: string;
          slug: string;
          hero_headline: string;
        };
        Update: Partial<Omit<DemoSite, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "demo_sites_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      outreach_messages: {
        Row: OutreachMessage;
        Insert: Omit<Partial<OutreachMessage>, "id" | "created_at" | "updated_at"> & {
          business_id: string;
          subject: string;
          body: string;
        };
        Update: Partial<Omit<OutreachMessage, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "outreach_messages_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: Payment;
        Insert: Omit<Partial<Payment>, "id" | "created_at" | "updated_at"> & {
          business_id: string;
          stripe_payment_link: string;
          amount: number;
        };
        Update: Partial<Omit<Payment, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_users: {
        Row: AdminUser;
        Insert: Omit<Partial<AdminUser>, "created_at"> & { user_id: string };
        Update: Partial<Omit<AdminUser, "user_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      website_status: WebsiteStatus;
      demo_site_status: DemoSiteStatus;
      outreach_status: OutreachStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
