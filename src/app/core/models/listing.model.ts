export interface RealEstate {
  id: string;
  partner_id?: string;
  source_partner: string;
  source_url?: string;
  scrape_job_id?: string;

  // Basic info
  title?: string;
  listing_type?: string;
  property_type?: string;
  typology?: string;
  bedrooms?: number;
  bathrooms?: number;
  floor?: string;

  // Financial
  price_amount?: number;
  price_currency?: string;
  price_per_m2?: number;

  // Areas
  area_useful_m2?: number;
  area_gross_m2?: number;
  area_land_m2?: number;

  // Location
  district?: string;
  county?: string;
  parish?: string;
  full_address?: string;
  latitude?: number;
  longitude?: number;

  // Features
  has_garage?: boolean;
  has_elevator?: boolean;
  has_balcony?: boolean;
  has_air_conditioning?: boolean;
  has_pool?: boolean;

  // Building
  energy_certificate?: string;
  construction_year?: number;

  // Contact
  advertiser?: string;
  contacts?: string;

  // Content
  raw_description?: string;
  description?: string;
  enriched_description?: string;
  description_quality_score?: number;
  meta_description?: string;
  page_title?: string;
  headers?: Array<{ level: string; text: string }>;

  // Raw
  raw_payload?: Record<string, unknown>;

  // Relations
  media_assets?: RealEstateMedia[];
  price_history?: PriceHistoryEntry[];

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface RealEstateListItem {
  id: string;
  title?: string;
  source_partner: string;
  property_type?: string;
  typology?: string;
  price_amount?: number;
  price_currency?: string;
  district?: string;
  county?: string;
  area_useful_m2?: number;
  bedrooms?: number;
  bathrooms?: number;
  source_url?: string;
  created_at: string;
  updated_at: string;
}

export interface RealEstateMedia {
  id: string;
  url: string;
  alt_text?: string;
  type?: string;
  position?: number;
}

export interface PriceHistoryEntry {
  id: string;
  price_amount: number;
  price_currency: string;
  recorded_at: string;
}

export interface RealEstateFilters {
  source_partner?: string;
  property_type?: string;
  typology?: string;
  district?: string;
  county?: string;
  parish?: string;
  price_min?: number;
  price_max?: number;
  bedrooms_min?: number;
  bedrooms_max?: number;
  bedrooms?: number;
  area_min?: number;
  area_max?: number;
  has_garage?: boolean;
  has_pool?: boolean;
  has_elevator?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  page_size: number;
}

export interface RealEstateStats {
  total_listings: number;
  avg_price?: number;
  min_price?: number;
  max_price?: number;
  avg_area?: number;
  by_district?: Record<string, number>;
  by_property_type?: Record<string, number>;
  by_source_partner?: Record<string, number>;
  by_typology?: Record<string, number>;
}
