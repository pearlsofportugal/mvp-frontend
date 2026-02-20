export interface ScrapeJob {
  id: string;
  site_key: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  start_url: string;
  max_pages: number;
  progress?: ScrapeJobProgress;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
}

export interface ScrapeJobProgress {
  pages_visited: number;
  listings_found: number;
  listings_scraped: number;
  errors: number;
}

export interface ScrapeJobCreate {
  site_key: string;
  start_url: string;
  max_pages?: number;
  config?: {
    min_delay?: number;
    max_delay?: number;
    user_agent?: string;
  };
}
