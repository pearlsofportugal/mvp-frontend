import { Routes } from '@angular/router';
// const projectName = "Pearl Collector"
const projectName = "MVP Scraper"
export interface NavRoute {
  path: string;
  label: string;
}

export const NAV_ROUTES: NavRoute[] = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/sites', label: 'Sites' },
  { path: '/jobs', label: 'Jobs' },
  { path: '/real-estate', label: 'Real Estate' },
  { path: '/enhancement', label: 'Enhancement' },
  { path: '/imodigi', label: 'Imodigi' },
  { path: '/export', label: 'Export' },
];

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    title: `Dashboard — ${projectName}`,
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
  },
  {
    path: 'sites',
    children: [
      {
        path: '',
        title: `Sites — ${projectName}`,
        loadComponent: () =>
          import('./features/sites/sites').then((m) => m.SitesComponent),
      },
      {
        path: 'new',
        title: `New Site — ${projectName}`,
        loadComponent: () =>
          import('./features/sites/wizard/site-wizard').then((m) => m.SiteWizardComponent),
      },
      {
        path: ':key/edit',
        title: `Edit Site — ${projectName}`,
        loadComponent: () =>
          import('./features/sites/wizard/site-wizard').then((m) => m.SiteWizardComponent),
      },
    ],
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
    path: 'imodigi',
    title: `Imodigi — ${projectName}`,
    loadComponent: () =>
      import('./features/imodigi/imodigi').then((m) => m.ImodigiComponent),
  },
  {
    path: 'export',
    title: `Export — ${projectName}`,
    loadComponent: () =>
      import('./features/export/export').then((m) => m.ExportComponent),
  },
];
