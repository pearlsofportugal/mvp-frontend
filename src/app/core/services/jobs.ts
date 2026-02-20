// src/app/core/services/jobs.ts
//
// MELHORIA: Adicionado streamJobProgress() que usa SSE para progresso em tempo real.
//
// O EventSource nativo do browser não suporta headers customizados (X-API-Key).
// Usamos @microsoft/fetch-event-source que faz SSE sobre fetch() com suporte a headers.
//
// SETUP:
//   npm install @microsoft/fetch-event-source
//
// O método streamJobProgress() retorna um Observable<ScrapeJob> que:
//   - Emite um valor a cada evento SSE recebido
//   - Completa automaticamente quando o job termina (evento 'done')
//   - Propaga erros via Observable error channel
//   - Cancela a ligação SSE quando o Observable é unsubscribed (takeUntilDestroyed, etc.)

import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { ScrapeJob, ScrapeJobCreate } from '../models/scrape-job.model';
import { BaseApiService } from './base-api.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class JobsService extends BaseApiService {
  private readonly path = '/api/v1/jobs';

  getAll(): Observable<ScrapeJob[]> {
    return this.get<ScrapeJob[]>(this.path);
  }

  getById(id: string): Observable<ScrapeJob> {
    return this.get<ScrapeJob>(this.buildRoute(`${this.path}/:id`, { id }));
  }

  create(data: ScrapeJobCreate): Observable<ScrapeJob> {
    return this.post<ScrapeJob>(this.path, data);
  }

  cancel(id: string): Observable<ScrapeJob> {
    return this.post<ScrapeJob>(this.buildRoute(`${this.path}/:id/cancel`, { id }), {});
  }

  remove(id: string): Observable<void> {
    return this.delete(this.buildRoute(`${this.path}/:id`, { id }));
  }

  /**
   * Stream de progresso de um job via Server-Sent Events.
   *
   * Emite atualizações em tempo real enquanto o job está a correr.
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
   *
   * FALLBACK: se SSE falhar (browser antigo, proxy incompatível), o JobDetailComponent
   * tem um botão "Atualizar" que chama getById() diretamente.
   */
  streamJobProgress(jobId: string): Observable<ScrapeJob> {
    const subject = new Subject<ScrapeJob>();
    const abortController = new AbortController();
    const url = `${environment.apiUrl}${this.path}/${jobId}/stream`;

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
          const data = JSON.parse(event.data);

          if (event.event === 'done') {
            // Emitir estado final e completar o Observable
            subject.next(data as ScrapeJob);
            subject.complete();
            abortController.abort();
            return;
          }

          if (event.event === 'error') {
            subject.error(new Error(data.message ?? 'Erro no stream SSE'));
            abortController.abort();
            return;
          }

          if (event.event === 'heartbeat') {
            // Ignorar heartbeats — são só keepalive
            return;
          }

          // 'progress' e 'status' — emitir atualização parcial do job
          subject.next(data as ScrapeJob);

        } catch (e) {
          console.warn('[SSE] Erro a parsear evento:', event.data, e);
        }
      },

      onerror: (err) => {
        subject.error(err);
        // Retornar para impedir que o fetchEventSource faça retry automático
        throw err;
      },

      onclose: () => {
        // Ligação fechada pelo servidor — completar se ainda não completou
        if (!subject.closed) {
          subject.complete();
        }
      },
    });

    // Quando o Observable é unsubscribed, cancelar a ligação SSE
    return new Observable<ScrapeJob>((observer) => {
      const subscription = subject.subscribe(observer);
      return () => {
        subscription.unsubscribe();
        abortController.abort();
      };
    });
  }
}