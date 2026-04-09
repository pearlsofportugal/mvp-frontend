import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SitesService } from '../../core/services/sites.service';
import type { SiteConfigRead } from '../../core/api/model';
import { SiteListComponent } from './components/site-list/site-list';
import { Spinner } from "../../shared/components/spinner/spinner";

@Component({
  selector: 'app-sites',
  imports: [SiteListComponent, Spinner],
  templateUrl: './sites.html',
  styleUrl: './sites.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SitesComponent {
  private readonly sitesService = inject(SitesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly refreshTick = signal(0);

  readonly sitesResource = rxResource<SiteConfigRead[], number>({
    params: () => this.refreshTick(),
    stream: () => this.sitesService.list(),
  });

  protected readonly sites = computed<SiteConfigRead[]>(
    () => this.sitesResource.value() ?? []
  );

  protected readonly loading = computed<boolean>(
    () => this.sitesResource.isLoading()
  );

  onNewSite(): void {
    this.router.navigate(['/sites/new']);
  }

  onEditSite(site: SiteConfigRead): void {
    this.router.navigate(['/sites', site.key, 'edit']);
  }

  onDeleteSite(key: string): void {
    this.sitesService.remove(key).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.reloadSites(),
      error: () => {},
    });
  }

  private reloadSites(): void {
    this.refreshTick.update((v) => v + 1);
  }
}