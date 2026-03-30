import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { timer, EMPTY } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PollingService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly tick = toSignal(
    isPlatformBrowser(this.platformId) ? timer(0, 30_000) : EMPTY,
    { initialValue: 0 }
  );
}
