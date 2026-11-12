import { Routes } from '@angular/router';
// const projectName = "Pearl Collector"
const projectName = "MVP Scraper"
export interface NavRoute {
  path: string;
  label: string;
}

export const NAV_ROUTES: NavRoute[] = [
  { path: '/dashboard', label: 'Painel' },
  { path: '/sites', label: 'Sites' },
  { path: '/jobs', label: 'Recolhas' },
  { path: '/real-estate', label: 'Anúncios' },
  { path: '/enhancement', label: 'Enriquecimento IA' },
  { path: '/export', label: 'Exportar' },
];

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    title: `Painel — ${projectName}`,
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
        title: `Novo site — ${projectName}`,
        loadComponent: () =>
          import('./features/sites/wizard/site-wizard').then((m) => m.SiteWizardComponent),
      },
      {
        path: ':key/edit',
        title: `Editar site — ${projectName}`,
        loadComponent: () =>
          import('./features/sites/wizard/site-wizard').then((m) => m.SiteWizardComponent),
      },
    ],
  },
  {
    path: 'jobs',
    title: `Recolhas — ${projectName}`,
    loadComponent: () =>
      import('./features/jobs/jobs').then((m) => m.JobsComponent),
  },
  {
    path: 'real-estate',
    title: `Anúncios — ${projectName}`,
    loadComponent: () =>
      import('./features/listings/listings').then((m) => m.ListingsComponent),
  },
  {
    path: 'enhancement',
    title: `Enriquecimento IA — ${projectName}`,
    loadComponent: () =>
      import('./features/enhancement/enhancement').then(
        (m) => m.EnhancementComponent
      ),
  },
  {
    path: 'export',
    title: `Exportar — ${projectName}`,
    loadComponent: () =>
      import('./features/export/export').then((m) => m.ExportComponent),
  },
];
