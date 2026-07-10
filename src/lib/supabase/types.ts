export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type EmptyTable = {
  Row: never;
  Insert: never;
  Update: never;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: Record<string, EmptyTable>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
