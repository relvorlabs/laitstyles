export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type EmptyTable = {
  Row: never;
  Insert: never;
  Update: never;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  auth_user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationRow = {
  id: string;
  name: string;
  owner_profile_id: string;
  created_at: string;
  updated_at: string;
};

export type StoreRow = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  status: "active" | "paused" | "archived";
  created_at: string;
  updated_at: string;
};

export type StoreMembershipRow = {
  id: string;
  store_id: string;
  profile_id: string;
  role: "owner" | "manager" | "operator";
  status: "invited" | "active" | "suspended";
  created_at: string;
  updated_at: string;
};

export type RoleCapabilityRow = {
  id: string;
  role: "owner" | "manager" | "operator";
  capability: string;
  created_at: string;
};

export type CustomerRow = {
  id: string;
  store_id: string;
  profile_id: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<ProfileRow>;
      organizations: TableDefinition<OrganizationRow>;
      stores: TableDefinition<StoreRow>;
      store_memberships: TableDefinition<StoreMembershipRow>;
      role_capabilities: TableDefinition<RoleCapabilityRow>;
      customers: TableDefinition<CustomerRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
