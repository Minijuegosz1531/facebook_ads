import { Routes } from '@angular/router';

import { DashboardLayout } from './layout/dashboard-layout';

/**
 * Route table. Feature pages are lazy-loaded with `loadComponent` so each route
 * ships in its own chunk (code-splitting). The DashboardLayout wraps them via a
 * child router-outlet.
 */
export const routes: Routes = [
  {
    path: '',
    component: DashboardLayout,
    children: [
      { path: '', redirectTo: 'campaigns', pathMatch: 'full' },
      {
        path: 'campaigns',
        loadComponent: () =>
          import('./features/campaigns/pages/campaigns-page').then((m) => m.CampaignsPage),
      },
      {
        path: 'campaigns/new',
        loadComponent: () =>
          import('./features/campaigns/pages/new-campaign-page').then((m) => m.NewCampaignPage),
      },
      {
        path: 'campaigns/:id',
        loadComponent: () =>
          import('./features/campaigns/pages/campaign-detail-page').then(
            (m) => m.CampaignDetailPage,
          ),
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/clients/pages/clients-page').then((m) => m.ClientsPage),
      },
    ],
  },
];
