import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'landing-page', pathMatch: 'full' },
  { path: 'landing-page', loadChildren: () => import('./pages/landing-page/landing-page.module').then(m => m.LandingPageModule) },  // Use loadComponent for lazy loading
  { path: 'federations-page', loadChildren: () => import('./pages/federations-page/federations-page.module').then(m => m.FederationsPageModule) },
  { path: 'experiments-dashboard', loadChildren: () => import('./pages/experiments-dashboard/experiments-dashboard.module').then(m => m.ExperimentsDashboardModule)},
  { path: 'account', loadChildren: () => import('./pages/account-page/account-page.module').then(m => m.AccountPageModule) }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
