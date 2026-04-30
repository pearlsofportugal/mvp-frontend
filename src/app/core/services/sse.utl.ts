import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Observable, timer } from 'rxjs';

interface SseOptions<T> {
  apiKey: string;
  isTerminal?: (data: T) => boolean;

  // retry config
  maxRetries?: number;
  baseRetryDelayMs?: number;
  maxRetryDelayMs?: number;

  // idle timeout (ms without messages)
  idleTimeoutMs?: number;

  // dedup
  dedup?: boolean;
}
export function createSseObservable<T>(url: string, options: SseOptions<T>): Observable<T> {
  const {
    apiKey,
    isTerminal,
    maxRetries = 5,
    baseRetryDelayMs = 500,
    maxRetryDelayMs = 10_000,
    idleTimeoutMs = 30_000,
    dedup = true,
  } = options;

  return new Observable<T>((subscriber) => {
    let abortController: AbortController | null = new AbortController();

    let retries = 0;
    let finished = false;

    let lastEventHash: string | null = null;
    let idleTimer: any = null;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);

      idleTimer = setTimeout(() => {
        if (!finished) {
          finished = true;
          abortController?.abort();
          subscriber.error(new Error('SSE idle timeout reached'));
        }
      }, idleTimeoutMs);
    };

    const getBackoff = () => {
      return Math.min(baseRetryDelayMs * Math.pow(2, retries), maxRetryDelayMs);
    };

    const start = async () => {
      if (finished) return;

      try {
        resetIdleTimer();

        await fetchEventSource(url, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            'X-API-Key': apiKey,
          },
          signal: abortController!.signal,

          onopen: async (response) => {
            const contentType = response.headers.get('content-type') || '';

            if (!response.ok || !contentType.includes('text/event-stream')) {
              throw new Error(`SSE failed: ${response.status} ${response.statusText}`);
            }
          },

          onmessage: (msg) => {
            if (finished) return;

            resetIdleTimer();

            if (!msg.data || msg.event === 'heartbeat') return;

            if (msg.event === 'done') {
              finished = true;
              abortController?.abort();
              subscriber.complete();
              return;
            }

            if (msg.event === 'error') {
              finished = true;
              abortController?.abort();
              try {
                const errData = JSON.parse(msg.data) as { message?: string };
                subscriber.error(new Error(errData.message ?? 'Erro no stream SSE'));
              } catch {
                subscriber.error(new Error(msg.data));
              }
              return;
            }

            try {
              const data = JSON.parse(msg.data) as T;

              if (dedup) {
                const hash = JSON.stringify(data);
                if (hash === lastEventHash) return;
                lastEventHash = hash;
              }

              subscriber.next(data);

              if (isTerminal?.(data)) {
                finished = true;
                abortController?.abort();
                subscriber.complete();
              }
            } catch (err) {
              finished = true;
              abortController?.abort();
              subscriber.error(err);
            }
          },

          onerror: (err) => {
            if (finished) throw err; // para o fetchEventSource de fazer retry

            abortController?.abort();

            if (retries >= maxRetries) {
              finished = true;
              subscriber.error(err);
              throw err;
            }

            const delay = getBackoff();
            retries++;

            timer(delay).subscribe(() => {
              if (!finished) {
                abortController = new AbortController();
                start();
              }
            });
          },
        });
      } catch (err) {
        if (finished) return;

        abortController?.abort();

        if (retries >= maxRetries) {
          finished = true;
          subscriber.error(err);
          return;
        }

        const delay = getBackoff();
        retries++;

        timer(delay).subscribe(() => {
          if (!finished) {
            abortController = new AbortController();
            start();
          }
        });
      }
    };

    start();

    return () => {
      finished = true;
      abortController?.abort();
      abortController = null;

      if (idleTimer) clearTimeout(idleTimer);
    };
  });
}
