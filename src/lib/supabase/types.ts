export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type StaffRole = "owner" | "manager" | "operator";
export type MembershipStatus = "invited" | "active" | "suspended";
export type StoreStatus = "active" | "paused" | "archived";
export type ProductInventoryMode = "unique" | "stocked" | "variant";
export type ProductLifecycle = "draft" | "intake" | "active" | "archived";
export type ProductPublication = "published" | "unpublished" | "scheduled";
export type ProductChannel = "storefront" | "physical-store" | "whatsapp" | "instagram";
export type CloudinaryAssetKind =
  | "product-cover"
  | "product-detail"
  | "product-defect"
  | "store-logo"
  | "store-brand";

export type EmptyTable = {
  Row: never;
  Insert: never;
  Update: never;
  Relationships: [];
};

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  auth_user_id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  avatar_cloudinary_public_id: string | null;
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
  status: StoreStatus;
  created_at: string;
  updated_at: string;
};

export type StoreMembershipRow = {
  id: string;
  store_id: string;
  profile_id: string;
  role: StaffRole;
  status: MembershipStatus;
  created_by_cli: boolean;
  created_at: string;
  updated_at: string;
};

export type RoleCapabilityRow = {
  role: StaffRole;
  capability: string;
  created_at: string;
};

export type StaffInvitationRow = {
  id: string;
  store_id: string;
  email: string;
  role: Exclude<StaffRole, "owner">;
  status: "pending" | "accepted" | "revoked" | "expired";
  invited_by: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type CatalogueCategoryRow = {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type CatalogueCollectionRow = CatalogueCategoryRow;

export type ProductRow = {
  id: string;
  store_id: string;
  category_id: string | null;
  collection_id: string | null;
  slug: string;
  name: string;
  description: string;
  inventory_mode: ProductInventoryMode;
  brand: string | null;
  price: number;
  reference_price: number | null;
  cost: number | null;
  lifecycle: ProductLifecycle;
  publication: ProductPublication;
  low_stock_threshold: number;
  archive_number: string | null;
  sku: string | null;
  condition: string | null;
  size_label: string | null;
  colour: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductChannelRow = {
  product_id: string;
  channel: ProductChannel;
  created_at: string;
};

export type ProductVariantRow = {
  id: string;
  product_id: string;
  label: string;
  sku: string | null;
  size: string | null;
  colour: string | null;
  price: number | null;
  cost: number | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type CloudinaryAssetRow = {
  id: string;
  store_id: string;
  provider: "cloudinary";
  resource_type: "image";
  kind: CloudinaryAssetKind;
  public_id: string;
  secure_url: string;
  delivery_url: string | null;
  format: string | null;
  version: number | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  alt: string;
  created_by_profile_id: string | null;
  created_at: string;
};

export type ProductMediaRow = {
  id: string;
  store_id: string;
  product_id: string;
  variant_id: string | null;
  asset_id: string;
  kind: Extract<CloudinaryAssetKind, "product-cover" | "product-detail" | "product-defect">;
  position: number;
  created_at: string;
};

export type StoreBrandAssetRow = {
  id: string;
  store_id: string;
  asset_id: string;
  kind: Extract<CloudinaryAssetKind, "store-logo" | "store-brand">;
  position: number;
  created_at: string;
};

export type ProductMeasurementRow = {
  id: string;
  product_id: string;
  label: string;
  value: string;
  position: number;
};

export type StockLevelRow = {
  id: string;
  store_id: string;
  product_id: string;
  variant_id: string | null;
  total_received: number;
  available: number;
  reserved: number;
  sold: number;
  returned: number;
  damaged: number;
  updated_at: string;
};

export type StockMovementRow = {
  id: string;
  store_id: string;
  product_id: string;
  variant_id: string | null;
  kind:
    | "received"
    | "reserved"
    | "released"
    | "sold"
    | "returned"
    | "restocked"
    | "damaged"
    | "adjusted";
  quantity: number;
  occurred_at: string;
  actor_profile_id: string | null;
  note: string | null;
  related_order_id: string | null;
  related_hold_id: string | null;
  related_return_id: string | null;
};

export type IntakeRecordRow = {
  id: string;
  store_id: string;
  product_id: string;
  stage:
    | "received"
    | "photographing"
    | "details-required"
    | "pricing-review"
    | "ready-to-publish"
    | "published";
  assigned_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerRow = {
  id: string;
  store_id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  type: "individual" | "stylist" | "reseller" | "walk-in";
  created_at: string;
  updated_at: string;
};

export type CustomerAddressRow = {
  id: string;
  customer_id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  country: string;
  is_default: boolean;
  delivery_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerNoteRow = {
  id: string;
  store_id: string;
  customer_id: string;
  body: string;
  author_profile_id: string | null;
  created_at: string;
};

export type CustomerSavedProductRow = {
  customer_id: string;
  product_id: string;
  created_at: string;
};

export type HoldRow = {
  id: string;
  store_id: string;
  customer_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  stage: "product" | "cart" | "checkout" | "payment";
  source: "storefront" | "admin" | "whatsapp" | "instagram" | "physical-store";
  payment_progress: string | null;
  status: "active" | "released" | "converted" | "expired";
  started_at: string;
  expires_at: string;
  released_at: string | null;
  converted_order_id: string | null;
  note: string | null;
};

export type OrderRow = {
  id: string;
  store_id: string;
  customer_id: string;
  source: "online-order" | "offline-sale" | "hold-conversion";
  channel: string | null;
  payment_status: string;
  payment_method: string | null;
  fulfilment_status: string;
  total: number;
  refunded_amount: number;
  placed_at: string;
  delivery_city: string | null;
  delivery_address: Json | null;
  courier: Json | null;
  notes: string | null;
  attention: string | null;
  created_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderLineRow = {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  stock_state: "uncommitted" | "reserved" | "sold" | "returned" | "released";
};

export type OrderTimelineEventRow = {
  id: string;
  store_id: string;
  order_id: string;
  status: string;
  occurred_at: string;
  actor_profile_id: string | null;
  note: string | null;
};

export type OrderPaymentEventRow = {
  id: string;
  store_id: string;
  order_id: string;
  payment_status: string;
  amount: number;
  method: string | null;
  occurred_at: string;
  actor_profile_id: string | null;
  note: string | null;
};

export type ReturnRow = {
  id: string;
  store_id: string;
  order_id: string;
  customer_id: string;
  status: string;
  reason: string | null;
  refund_amount: number;
  note: string | null;
  requested_at: string;
  updated_at: string;
};

export type ReturnLineRow = {
  id: string;
  return_id: string;
  order_line_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  disposition: "pending" | "restock" | "damaged";
};

export type ProductReviewRow = {
  id: string;
  store_id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: "published" | "pending";
  created_at: string;
  updated_at: string;
};

export type StoreSettingsRow = {
  store_id: string;
  identity: Json;
  selling: Json;
  payments: Json;
  notifications: Json;
  updated_at: string;
};

export type DeliveryZoneRow = {
  id: string;
  store_id: string;
  name: string;
  city: string;
  rate: number;
  estimated_days: string | null;
  enabled: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type PickupLocationRow = {
  id: string;
  store_id: string;
  name: string;
  address: string;
  enabled: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ActivityEventRow = {
  id: string;
  store_id: string;
  kind: string;
  title: string;
  detail: string | null;
  actor_profile_id: string | null;
  product_id: string | null;
  order_id: string | null;
  customer_id: string | null;
  occurred_at: string;
};

export type AuditEventRow = {
  id: string;
  store_id: string;
  actor_profile_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: Json;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<ProfileRow>;
      organizations: TableDefinition<OrganizationRow>;
      stores: TableDefinition<StoreRow>;
      store_memberships: TableDefinition<StoreMembershipRow>;
      role_capabilities: TableDefinition<RoleCapabilityRow, RoleCapabilityRow, never>;
      staff_invitations: TableDefinition<StaffInvitationRow>;
      catalogue_categories: TableDefinition<CatalogueCategoryRow>;
      catalogue_collections: TableDefinition<CatalogueCollectionRow>;
      products: TableDefinition<ProductRow>;
      product_channels: TableDefinition<ProductChannelRow, ProductChannelRow, never>;
      product_variants: TableDefinition<ProductVariantRow>;
      cloudinary_assets: TableDefinition<CloudinaryAssetRow>;
      product_media: TableDefinition<ProductMediaRow>;
      store_brand_assets: TableDefinition<StoreBrandAssetRow>;
      product_measurements: TableDefinition<ProductMeasurementRow>;
      stock_levels: TableDefinition<StockLevelRow>;
      stock_movements: TableDefinition<StockMovementRow>;
      intake_records: TableDefinition<IntakeRecordRow>;
      customers: TableDefinition<CustomerRow>;
      customer_addresses: TableDefinition<CustomerAddressRow>;
      customer_notes: TableDefinition<CustomerNoteRow>;
      customer_saved_products: TableDefinition<
        CustomerSavedProductRow,
        CustomerSavedProductRow,
        never
      >;
      holds: TableDefinition<HoldRow>;
      orders: TableDefinition<OrderRow>;
      order_lines: TableDefinition<OrderLineRow>;
      order_timeline_events: TableDefinition<OrderTimelineEventRow>;
      order_payment_events: TableDefinition<OrderPaymentEventRow>;
      returns: TableDefinition<ReturnRow>;
      return_lines: TableDefinition<ReturnLineRow>;
      product_reviews: TableDefinition<ProductReviewRow>;
      store_settings: TableDefinition<StoreSettingsRow>;
      delivery_zones: TableDefinition<DeliveryZoneRow>;
      pickup_locations: TableDefinition<PickupLocationRow>;
      activity_events: TableDefinition<ActivityEventRow>;
      audit_events: TableDefinition<AuditEventRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      staff_role: StaffRole;
      membership_status: MembershipStatus;
      store_status: StoreStatus;
      product_inventory_mode: ProductInventoryMode;
      product_lifecycle: ProductLifecycle;
      product_publication: ProductPublication;
      product_channel: ProductChannel;
      cloudinary_asset_kind: CloudinaryAssetKind;
    };
    CompositeTypes: Record<string, never>;
  };
};
