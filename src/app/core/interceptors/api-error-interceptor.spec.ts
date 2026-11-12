import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';

import { apiErrorInterceptor, extractApiErrorMessage } from './api-error-interceptor';

describe('apiErrorInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => apiErrorInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });
});

describe('extractApiErrorMessage', () => {
  const err = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

  it('mostra campo e motivo dos erros 422 do envelope ApiResponse', () => {
    const msg = extractApiErrorMessage(
      err(422, {
        success: false,
        message: 'Validation failed',
        errors: [{ code: 'VALIDATION_ERROR', message: 'Input should be a valid UUID', field: 'scrape_job_id' }],
      }),
    );
    expect(msg).toBe('Validação: scrape_job_id — Input should be a valid UUID');
  });

  it('usa errors[0].message (objeto) em vez de devolver o objeto', () => {
    const msg = extractApiErrorMessage(
      err(404, { success: false, message: 'x', errors: [{ code: 'NOT_FOUND', message: 'Listing not found' }] }),
    );
    expect(msg).toBe('Listing not found');
  });

  it('cai para message quando não há errors', () => {
    expect(extractApiErrorMessage(err(409, { message: 'Job already running' }))).toBe('Job already running');
  });

  it('suporta HTTPException.detail do FastAPI (ex.: 503 sem API_KEY)', () => {
    expect(extractApiErrorMessage(err(503, { detail: 'API_KEY is not configured on the server.' }))).toBe(
      'API_KEY is not configured on the server.',
    );
  });

  it('não rebenta com corpo Blob (downloads)', () => {
    expect(extractApiErrorMessage(err(500, new Blob(['{}'])))).toBe('Erro 500: algo correu mal.');
  });
});
