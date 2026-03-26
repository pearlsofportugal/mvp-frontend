import { Routes } from '@angular/router';
// const projectName = "Pearl Collector"
const projectName = "MVP Scraper"
export interface NavRoute {
  path: string;
  label: string;
}

export const NAV_ROUTES: NavRoute[] = [
  { path: '/sites', label: 'Sites' },
  { path: '/jobs', label: 'Jobs' },
  { path: '/real-estate', label: 'Real Estate' },
  { path: '/enhancement', label: 'Enhancement' },
  { path: '/export', label: 'Export' },
];

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'sites',
    pathMatch: 'full',
  },
  {
    path: 'sites',
    title: `Sites — ${projectName}`,
    loadComponent: () =>
      import('./features/sites/sites').then((m) => m.SitesComponent),
  },
  {
    path: 'jobs',
    title: `Jobs — ${projectName}`,
    loadComponent: () =>
      import('./features/jobs/jobs').then((m) => m.JobsComponent),
  },
  {
    path: 'real-estate',
    title: `Real Estate — ${projectName}`,
    loadComponent: () =>
      import('./features/listings/listings').then((m) => m.ListingsComponent),
  },
  {
    path: 'enhancement',
    title: `Enhancement — ${projectName}`,
    loadComponent: () =>
      import('./features/enhancement/enhancement').then(
        (m) => m.EnhancementComponent
      ),
  },
  {
    path: 'export',
    title: `Export — ${projectName}`,
    loadComponent: () =>
      import('./features/export/export').then((m) => m.ExportComponent),
  },
];
