import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { rxResource, takeUntilDestroyed, toSignal, toObservable } from '@angular/core/rxjs-interop';
import { forkJoin, of, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SitesService } from '../../core/services/sites.service';
import type { SiteConfigRead, SiteConfigScheduleInfo } from '../../core/api/model';
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

  private readonly enabledSites = computed(() =>
    this.sites().filter((s) => s.schedule_enabled && s.is_active)
  );

  protected readonly scheduleInfoMap = toSignal(
    toObservable(this.enabledSites).pipe(
      switchMap((enabled) => {
        if (!enabled.length) return of(new Map<string, SiteConfigScheduleInfo>());
        return forkJoin(
          Object.fromEntries(enabled.map((s) => [s.key, this.sitesService.getSchedule(s.key)]))
        ).pipe(
          map((result) => new Map<string, SiteConfigScheduleInfo>(Object.entries(result))),
          catchError(() => of(new Map<string, SiteConfigScheduleInfo>()))
        );
      })
    ),
    { initialValue: new Map<string, SiteConfigScheduleInfo>() }
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