import { Injectable, inject } from '@angular/core';
import { Observable, Subject, map } from 'rxjs';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { JobsService as GeneratedJobsService } from '../api/generated/jobs/jobs.service';
import type { JobCreate, JobRead, JobListRead } from '../api/model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class JobsService {
  private readonly api = inject(GeneratedJobsService);
  private readonly basePath = '/api/v1/jobs';

  getAll(): Observable<JobListRead[]> {
    return this.api
      .listJobs()
      .pipe(map((r) => r.data ?? []));
  }

  getById(id: string): Observable<JobRead> {
    return this.api
      .getJob(id)
      .pipe(map((r) => r.data!));
  }

  create(data: JobCreate): Observable<JobRead> {
    return this.api
      .createJob(data)
      .pipe(map((r) => r.data!));
  }

  cancel(id: string): Observable<JobRead> {
    return this.api
      .cancelJob(id)
      .pipe(map((r) => r.data!));
  }

  remove(id: string): Observable<void> {
    return this.api
      .deleteJob(id)
      .pipe(map(() => void 0));
  }

  /**
   * Stream de progresso de um job via Server-Sent Events.
   *
   * Emite atualizacoes em tempo real enquanto o job esta a correr.
   * Completa quando o job termina (completed/failed/cancelled).
   *
   * USO:
   *   this.jobsService.streamJobProgress(jobId)
   *     .pipe(takeUntilDestroyed(this.destroyRef))
   *     .subscribe({
   *       next: (job) => this.liveJob.set(job),
   *       error: (err) => this.streamError.set(err.message),
   *       complete: () => this.streaming.set(false),
   *     });
   */
  streamJobProgress(jobId: string): Observable<JobRead> {
    const subject = new Subject<JobRead>();
    const abortController = new AbortController();
    const url = `${environment.apiUrl}${this.basePath}/${jobId}/stream`;

    fetchEventSource(url, {
      method: 'GET',
      headers: {
        'X-API-Key': environment.apiKey ?? '',
        Accept: 'text/event-stream',
      },
      signal: abortController.signal,

      onopen: async (response) => {
        if (!response.ok) {
          subject.error(new Error(`SSE falhou com status ${response.status}`));
          abortController.abort();
        }
      },

      onmessage: (event) => {
        if (!event.data) return;

        try {
          const data = JSON.parse(event.data) as JobRead;

          if (event.event === 'done') {
            subject.next(data);
            subject.complete();
            abortController.abort();
            return;
          }

          if (event.event === 'error') {
            subject.error(new Error((data as unknown as { message?: string }).message ?? 'Erro no stream SSE'));
            abortController.abort();
            return;
          }

          if (event.event === 'heartbeat') {
            return;
          }

          subject.next(data);
        } catch (e) {
          console.warn('[SSE] Erro a parsear evento:', event.data, e);
        }
      },

      onerror: (err) => {
        subject.error(err);
        throw err;
      },

      onclose: () => {
        if (!subject.closed) {
          subject.complete();
        }
      },
    });

    return new Observable<JobRead>((observer) => {
      const subscription = subject.subscribe(observer);
      return () => {
        subscription.unsubscribe();
        abortController.abort();
      };
    });
  }
}
