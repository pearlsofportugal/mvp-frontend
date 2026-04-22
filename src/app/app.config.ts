import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { NoPreloading, provideRouter, withPreloading } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { apiErrorInterceptor } from './core/interceptors/api-error-interceptor';
import { apiKeyInterceptor } from './core/interceptors/api-key-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withPreloading(NoPreloading)),
    provideHttpClient(withFetch(), withInterceptors([apiKeyInterceptor, apiErrorInterceptor])),
    provideClientHydration(withEventReplay()),
  ],
};
