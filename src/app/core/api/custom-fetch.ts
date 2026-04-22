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

import { HttpClient, HttpParams } from '@angular/common/http';
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

  const params = new HttpParams();
  const httpParams = config.params
    ? Object.entries(config.params).reduce((acc, [key, value]) => {
        if (value == null) return acc;
        if (Array.isArray(value)) {
          return value.reduce((a, v) => a.append(key, String(v)), acc);
        }
        return acc.set(key, String(value));
      }, params)
    : params;

  return http.request<T>(config.method, fullUrl, {
    params: httpParams,
    body: config.data,
    headers: config.headers,
  });
};
