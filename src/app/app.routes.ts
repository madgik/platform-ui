import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { TermsGuard } from './guards/terms.guard';

export const appRoutes: Routes = [
  {
    path: 'experiments-dashboard',
    loadComponent: () => import('./pages/experiments-dashboard/experiments-dashboard.component').then(m => m.ExperimentsDashboardComponent),
    canActivate: [AuthGuard, TermsGuard],
  },
  {
    path: '',
    redirectTo: 'experiments-dashboard',
    pathMatch: 'full'
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/terms-page/terms-page.component').then(m => m.TermsPageComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'account',
    loadComponent: () => import('./pages/account-page/account-page.component').then(m => m.AccountPageComponent),
    canActivate: [AuthGuard, TermsGuard],
  },
  {
    path: 'experiment-studio',
    loadComponent: () => import('./pages/experiment-studio/experiment-studio.component').then(m => m.ExperimentStudioComponent),
    canActivate: [AuthGuard, TermsGuard],
  },
  { path: '**', redirectTo: 'experiments-dashboard' }
];
