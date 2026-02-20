// src/app/core/interceptors/api-error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
// import { NotificationService } from '../services/notification.service'; // o teu serviço de toasts

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
 const notify = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const apiError = error.error;
      
      // Usa a mensagem da API se existir, caso contrário mensagem genérica
      const message =
        apiError?.detail ||
        apiError?.message ||
        `Erro ${error.status}: algo correu mal`;

      notify.error(message);

      return throwError(() => error);
    })
  );
};
