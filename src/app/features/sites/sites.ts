import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { SitesService } from '../../core/services/sites.service';
import { SiteConfig } from '../../core/models/site-config.model';
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

  // UI state
  protected readonly showForm = signal(false);
  protected readonly editingSite = signal<SiteConfig | null>(null);
  private readonly actionError = signal<string | null>(null);

  // Trigger para refresh explícito
  private readonly refreshTick = signal(0);

  // Data resource (reativo)
  readonly sitesResource = rxResource<SiteConfig[], number>({
    params: () => this.refreshTick(),
    stream: () => this.sitesService.list(),
  });

  // View model
  protected readonly sites = computed<SiteConfig[]>(
    () => this.sitesResource.value() ?? []
  );

  protected readonly loading = computed<boolean>(
    () => this.sitesResource.isLoading()
  );

  protected readonly error = computed<string | null>(() => {
    if (this.actionError()) return this.actionError();

    const err = this.sitesResource.error();
    if (!err) return null;
    return err instanceof Error ? err.message : 'Erro ao carregar sites';
  });

  onShowCreateForm(): void {
    this.editingSite.set(null);
    this.showForm.set(true);
  }

  onEditSite(site: SiteConfig): void {
    this.editingSite.set(site);
    this.showForm.set(true);
  }

  onDeleteSite(key: string): void {
    if (!confirm('Desativar este site?')) return;

    this.actionError.set(null);

    this.sitesService.remove(key).subscribe({
      next: () => this.reloadSites(),
      error: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Erro ao desativar site';
        this.actionError.set(message);
        console.error('Error disabling site:', err);
      },
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

  private reloadSites(): void {
    this.refreshTick.update((v) => v + 1);
  }
}