// src/app/core/interceptors/api-error-interceptor.ts
//
// MELHORIA: Interceptor melhorado para extrair a mensagem certa da estrutura
// ApiResponse do backend.
//
// ANTES: tentava apenas apiError?.detail || apiError?.message
//   Problema: o backend envolve os erros em ApiResponse com campos
//   { success, message, errors[], trace_id } — o campo "detail" só existe
//   nas exceções FastAPI nativas (HTTPException). Para erros da app (NotFoundError,
//   DuplicateError, etc.) o handler devolve "message", não "detail".
//   Resultado: muitos erros mostravam "Erro 404: algo correu mal" em vez de
//   "Site config 'xyz' not found".
//
// DEPOIS:
//   1. Tenta body.message (ApiResponse da app — caso mais comum)
//   2. Tenta body.errors[0] (lista de erros do ApiResponse)
//   3. Tenta body.detail (HTTPException nativa do FastAPI)
//   4. Tenta body.detail[0].msg (erros de validação Pydantic)
//   5. Fallback genérico com status code
//
//   Casos especiais tratados:
//   - status 0: sem ligação ao servidor (CORS, backend offline)
//   - status 401: não autorizado (API key inválida)
//   - status 422: erro de validação (mostra o primeiro campo inválido)

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = extractApiErrorMessage(error);
      notify.error(message);
      return throwError(() => error);
    }),
  );
};

/**
 * Extrai a mensagem de erro mais informativa possível da resposta HTTP.
 * Tenta os formatos por ordem de prioridade.
 */
function extractApiErrorMessage(error: HttpErrorResponse): string {
  // Sem ligação (CORS, servidor offline, timeout de rede)
  if (error.status === 0) {
    return 'Sem ligação ao servidor. Verifica se o backend está ativo.';
  }

  if (error.status === 401) {
    return 'Não autorizado. Verifica a API key nas configurações.';
  }

  const body = error.error;

  if (!body) {
    return `Erro ${error.status}: algo correu mal.`;
  }

  // 1. ApiResponse.message (erros da app — NotFoundError, DuplicateError, etc.)
  if (typeof body.message === 'string' && body.message) {
    return body.message;
  }

  // 2. ApiResponse.errors[] (pode ter múltiplos erros de validação)
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return body.errors[0];
  }

  // 3. HTTPException.detail (string) — erros FastAPI nativos
  if (typeof body.detail === 'string' && body.detail) {
    return body.detail;
  }

  // 4. Pydantic validation errors — detail é um array de objetos
  if (Array.isArray(body.detail) && body.detail.length > 0) {
    const first = body.detail[0];
    const field = first?.loc?.slice(1).join('.') ?? 'campo';
    const msg = first?.msg ?? 'inválido';
    return `Validação: ${field} — ${msg}`;
  }

  return `Erro ${error.status}: algo correu mal.`;
}