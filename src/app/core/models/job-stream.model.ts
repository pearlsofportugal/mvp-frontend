import type { JobProgress, JobStatus } from '../api/model';

/**
 * Payload dos eventos `status` / `progress` / `done` de `GET /api/v1/jobs/{id}/stream`.
 *
 * O OpenAPI não descreve o corpo do SSE. O backend (`_sse_job_stream` em
 * `app/api/v1/scrape_jobs.py`) emite apenas este subconjunto — NÃO é um `JobRead`
 * (não traz `id`, `site_key`, `start_url`…). Fazer merge sobre o job já carregado.
 */
export interface JobStreamEvent {
  job_id: string;
  status: JobStatus;
  progress?: JobProgress | null;
  error_message?: string | null;
}
