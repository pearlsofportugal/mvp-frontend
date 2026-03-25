import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SitesService } from '../../core/services/sites.service';
import type { SiteConfigRead, SiteConfigCreate } from '../../core/api/model';
import { SiteListComponent } from './components/site-list/site-list';
import { SiteFormComponent } from './components/site-form/site-form';

@Component({
  selector: 'app-sites',
  imports: [SiteListComponent, SiteFormComponent],
  templateUrl: './sites.html',
  styleUrl: './sites.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SitesComponent {
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  // UI state
  protected readonly showForm = signal(false);
  protected readonly editingSite = signal<SiteConfigRead | null>(null);

  // Trigger para refresh explícito
  private readonly refreshTick = signal(0);

  // Data resource (reativo)
  readonly sitesResource = rxResource<SiteConfigRead[], number>({
    params: () => this.refreshTick(),
    stream: () => this.sitesService.list(),
  });

  // View model
  protected readonly sites = computed<SiteConfigRead[]>(
    () => this.sitesResource.value() ?? []
  );

  protected readonly loading = computed<boolean>(
    () => this.sitesResource.isLoading()
  );

  onShowCreateForm(): void {
    this.editingSite.set(null);
    this.showForm.set(true);
  }

  onEditSite(site: SiteConfigRead): void {
    this.editingSite.set(site);
    this.showForm.set(true);
  }

  onDeleteSite(key: string): void {
    this.sitesService.remove(key).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.reloadSites(),
      error: () => {},
    });
  }

  onFormSuccess(): void {
    this.showForm.set(false);
    this.editingSite.set(null);
    this.reloadSites();
  }

  onFormCancel(): void {
    this.showForm.set(false);
    this.editingSite.set(null);
  }

  onReactivateSite(key: string): void {
    const site = this.sites().find(s => s.key === key);
    if (!site) return;
    this.sitesService.create(site as unknown as SiteConfigCreate).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.reloadSites(),
      error: () => {},
    });
  }

  private reloadSites(): void {
    this.refreshTick.update((v) => v + 1);
  }
}