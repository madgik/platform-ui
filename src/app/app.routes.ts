import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { FederationsPageComponent } from './pages/federations-page/federations-page.component';
import { ExperimentsDashboardComponent } from './pages/experiments-dashboard/experiments-dashboard.component';
import { AccountPageComponent } from './pages/account-page/account-page.component';
import { ExperimentStudioComponent } from './pages/experiment-studio/experiment-studio.component';

export const appRoutes: Routes = [
  { path: 'home', component: LandingPageComponent },
  { path: 'federations', component: FederationsPageComponent },
  { path: 'experiments', component: ExperimentsDashboardComponent },
  { path: 'account', component: AccountPageComponent },
  { path: 'experiment-studio', component: ExperimentStudioComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' }, // Redirect to home by default
  { path: '**', redirectTo: 'home' } // Wildcard route for a 404 page (optional)
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
