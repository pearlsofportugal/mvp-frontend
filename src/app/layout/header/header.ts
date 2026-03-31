import { ChangeDetectionStrategy, Component, inject, signal, computed, PLATFORM_ID, effect } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HealthService } from '../../core/services/health.service';
import { ThemeService } from '../../core/services/theme.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer, switchMap } from 'rxjs';
import { NAV_ROUTES } from '../../app.routes';
import { isPlatformBrowser } from '@angular/common';
import { PollingService } from '../../core/services/polling-service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly healthService = inject(HealthService);
  protected readonly themeService = inject(ThemeService);
  protected readonly isHealthy = signal(false);
  protected readonly healthText = computed(() => (this.isHealthy() ? 'Online' : 'Offline'));
  private readonly pollingService = inject(PollingService)
  protected readonly navItems = NAV_ROUTES;

   constructor() {
    effect(() => {
    this.pollingService.tick(); // reativa sempre que o timer dispara
    this.healthService.checkHealth().subscribe({
      next: (status) => this.isHealthy.set(status?.status === 'healthy'),
      error: () => this.isHealthy.set(false),
    });
  });
  }
}
