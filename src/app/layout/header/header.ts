import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
  PLATFORM_ID,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HealthService } from '../../core/services/health.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-header',
  imports: [ RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit {
  private readonly healthService = inject(HealthService);
  protected readonly isHealthy = signal(false);
  protected readonly healthText = signal('A verificar...');
private readonly destroyRef = inject(DestroyRef);

  protected readonly navItems: NavItem[] = [
    { path: '/sites', label: 'Sites', icon: '' },
    { path: '/jobs', label: 'Jobs', icon: '' },
    { path: '/real-estate', label: 'Real Estate', icon: '' },
    { path: '/enhancement', label: 'Enhancement', icon: '' },
    { path: '/export', label: 'Export', icon: '' },
  ];

ngOnInit(): void {
  const intervalId = setInterval(() => this.checkHealth(), 30_000);
  this.destroyRef.onDestroy(() => clearInterval(intervalId));
  this.checkHealth();
}

  private checkHealth(): void {
    this.healthService.checkHealth().subscribe({
      next: (status) => {
        this.isHealthy.set(status.status === 'healthy');
        this.healthText.set(status.status === 'healthy' ? 'Online' : 'Offline');
      },
      error: () => {
        this.isHealthy.set(false);
        this.healthText.set('Offline');
      },
    });
  }
}
