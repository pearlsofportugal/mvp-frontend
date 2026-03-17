import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HealthService } from '../../core/services/health.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer, switchMap } from 'rxjs';
import { NAV_ROUTES } from '../../app.routes';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly healthService = inject(HealthService);
  protected readonly isHealthy = signal(false);
  protected readonly healthText = computed(() => (this.isHealthy() ? 'Online' : 'Offline'));

  protected readonly navItems = NAV_ROUTES;

  constructor() {
    timer(0, 30_000)
      .pipe(
        switchMap(() => this.healthService.checkHealth()),
        takeUntilDestroyed(), 
      )
      .subscribe({
        next: (status) => this.isHealthy.set(status?.status === 'healthy'),
        error: () => this.isHealthy.set(false),
      });
  }
}
