import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'sites',
    pathMatch: 'full',
  },
  {
    path: 'sites',
    loadComponent: () =>
      import('./features/sites/sites').then((m) => m.SitesComponent),
  },
  {
    path: 'jobs',
    loadComponent: () =>
      import('./features/jobs/jobs').then((m) => m.JobsComponent),
  },
  {
    path: 'real-estate',
    loadComponent: () =>
      import('./features/listings/listings').then((m) => m.ListingsComponent),
  },
  {
    path: 'enhancement',
    loadComponent: () =>
      import('./features/enhancement/enhancement').then(
        (m) => m.EnhancementComponent
      ),
  },
  {
    path: 'export',
    loadComponent: () =>
      import('./features/export/export').then((m) => m.ExportComponent),
  },
];
