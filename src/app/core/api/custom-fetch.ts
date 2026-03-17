/**
 * Custom fetch mutator para os serviços gerados pelo Orval (client: 'angular').
 *
 * O Orval gera serviços Angular por tag (mode: 'tags-split') que chamam
 * esta função como: `customFetch<T>(config, this.http)`
 *
 * Responsabilidades:
 *   1. Prepend da base URL do environment (o Orval gera paths relativos)
 *   2. Proxy para o Angular HttpClient — o `apiKeyInterceptor` já existente
 *      injeta o header X-API-Key automaticamente, sem duplicar lógica
 *   3. Retorna Observable<T> — o Angular client espera Observable, não Promise
 *
 * Referenciado em orval.config.ts → output.override.mutator.
 * NÃO editar o nome da função exportada sem actualizar o config.
 */

import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CustomFetchConfig = {
  url: string;
  method: string;
  params?: Record<string, string | number | boolean | null | Array<string | number | boolean>>;
  data?: unknown;
  headers?: Record<string, string>;
};

export const customFetch = <T>(config: CustomFetchConfig, http: HttpClient): Observable<T> => {
  const fullUrl = `${environment.apiUrl}${config.url}`;

  return http.request<T>(config.method, fullUrl, {
    params: config.params as Record<string, string | string[]>,
    body: config.data,
    headers: config.headers,
  });
};
