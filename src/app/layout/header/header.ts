import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { HealthService } from '../../core/services/health.service';
import { ThemeService } from '../../core/services/theme.service';
import { NAV_ROUTES } from '../../app.routes';
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
  private readonly pollingService = inject(PollingService);
  protected readonly navItems = NAV_ROUTES;

  private readonly healthResource = rxResource({
    params: () => this.pollingService.tick(),
    stream: () => this.healthService.checkHealth(),
  });

  protected readonly isHealthy = computed(
    () => this.healthResource.value()?.status === 'healthy',
  );
  protected readonly healthText = computed(() => (this.isHealthy() ? 'Online' : 'Offline'));
}
