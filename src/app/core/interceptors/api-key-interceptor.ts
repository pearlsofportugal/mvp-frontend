// src/app/core/interceptors/api-key.interceptor.ts
//
// FIX (prioridade alta): Injeta o header X-API-Key em todos os pedidos HTTP
// ao backend. Lê a key do environment para manter configuração centralizada.
//
// SETUP:
//   1. Adicionar a environments/environment.ts:
//      export const environment = {
//        apiUrl: 'http://localhost:8000',
//        apiKey: 'a-tua-chave-aqui',   // ← adicionar esta linha
//      };
//
//   2. Adicionar a environments/environment.prod.ts com a key de produção.
//      NUNCA commitar keys reais — usar variáveis de ambiente no CI/CD.
//
//   3. Registar o interceptor em app.config.ts (ver abaixo).
//
// NOTA: Esta abordagem expõe a key no bundle JS — aceitável para uma ferramenta
// interna. Para apps públicas, usa autenticação por sessão (cookies HttpOnly).

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiKeyInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  // Só adiciona o header a pedidos para o nosso backend
  // (evita enviar a key a CDNs ou APIs de terceiros)
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const apiKey = environment.apiKey;
  if (!apiKey) {
    // Em dev pode não estar configurada — não bloquear
    console.warn('[ApiKeyInterceptor] API key não configurada no environment.');
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      'X-API-Key': apiKey,
    },
  });

  return next(authReq);
};