import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NEVER } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';

import { SitesService } from '../../../core/services/sites.service';
import type { SiteConfigRead } from '../../../core/api/model';
import { StepBasicComponent } from './steps/step-basic/step-basic';
import { StepListingComponent } from './steps/step-listing/step-listing';
import { StepSelectorsComponent } from './steps/step-selectors/step-selectors';
import { StepTestScrapeComponent } from './steps/step-test-scrape/step-test-scrape';
import { StepScheduleComponent } from './steps/step-schedule/step-schedule';
import { StepDoneComponent } from './steps/step-done/step-done';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Basic Config',
  2: 'Listing Page',
  3: 'Selectors',
  4: 'Test Scrape',
  5: 'Scheduling',
  6: 'Done',
};

@Component({
  selector: 'app-site-wizard',
  imports: [
    StepBasicComponent,
    StepListingComponent,
    StepSelectorsComponent,
    StepTestScrapeComponent,
    StepScheduleComponent,
    StepDoneComponent,
  ],
  templateUrl: './site-wizard.html',
  styleUrl: './site-wizard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteWizardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sitesService = inject(SitesService);

  private readonly routeKey = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('key'))),
    { initialValue: null },
  );

  protected readonly isEditMode = computed(() => !!this.routeKey());

  // The site created/loaded — shared across all steps
  protected readonly site = signal<SiteConfigRead | null>(null);

  private readonly siteResource = rxResource({
    params: () => this.routeKey(),
    stream: ({ params: key }) =>
      key ? this.sitesService.getByKey(key) : NEVER,
  });

  constructor() {
    // When edit mode loads the site from backend, populate the site signal
    effect(() => {
      const loaded = this.siteResource.value();
      if (loaded) this.site.set(loaded);
    });
  }

  protected readonly currentStep = signal<WizardStep>(1);
  protected readonly steps: WizardStep[] = [1, 2, 3, 4, 5, 6];
  protected readonly stepLabels = STEP_LABELS;

  protected isStepUnlocked(step: WizardStep): boolean {
    if (step === 1) return true;
    return this.site() !== null;
  }

  protected goToStep(step: WizardStep): void {
    if (!this.isStepUnlocked(step)) return;
    this.currentStep.set(step);
  }

  protected onSiteCreated(site: SiteConfigRead): void {
    this.site.set(site);
    // Move URL to edit mode so reloads keep state, then advance to step 2
    this.router.navigate(['/sites', site.key, 'edit'], { replaceUrl: true });
    this.currentStep.set(2);
  }

  protected onSiteUpdated(site: SiteConfigRead): void {
    this.site.set(site);
  }

  protected onCancel(): void {
    this.router.navigate(['/sites']);
  }

  protected onLaunchJob(): void {
    const key = this.site()?.key;
    if (key) {
      this.router.navigate(['/jobs'], { queryParams: { site_key: key } });
    } else {
      this.router.navigate(['/jobs']);
    }
  }
}
