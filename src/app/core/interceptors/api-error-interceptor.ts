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

/** Forma de `ErrorDetail` no envelope `ApiResponse.errors[]` do backend. */
interface ApiErrorDetail {
  code?: string;
  message?: string;
  field?: string | null;
}

export function extractApiErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Sem ligação ao servidor. Verifica se o backend está ativo.';
  }

  if (error.status === 401) {
    return 'Não autorizado. Verifica a API key nas configurações.';
  }

  const body = error.error;

  // Downloads (responseType: 'blob') devolvem o corpo do erro como Blob.
  if (!body || body instanceof Blob) {
    return `Erro ${error.status}: algo correu mal.`;
  }

  // 1. ApiResponse.errors[] — objetos { code, message, field }. Tem prioridade sobre
  //    `message` porque no 422 o `message` é sempre o genérico "Validation failed",
  //    enquanto `errors[0]` diz qual o campo e o motivo.
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const first = body.errors[0] as ApiErrorDetail | string;
    if (typeof first === 'string' && first) return first;
    if (typeof first === 'object' && first?.message) {
      return first.code === 'VALIDATION_ERROR' && first.field
        ? `Validação: ${first.field} — ${first.message}`
        : first.message;
    }
  }

  // 2. ApiResponse.message (erros da app — NotFoundError, DuplicateError, etc.)
  if (typeof body.message === 'string' && body.message) {
    return body.message;
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