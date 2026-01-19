import {RouterModule, Routes} from '@angular/router';
import { ExperimentsDashboardComponent } from './pages/experiments-dashboard/experiments-dashboard.component';
import { AccountPageComponent } from './pages/account-page/account-page.component';
import { ExperimentStudioComponent } from './pages/experiment-studio/experiment-studio.component';
import { AuthGuard } from './guards/auth.guard';
import { TermsGuard } from './guards/terms.guard';
import { NgModule } from "@angular/core";
import { TermsPageComponent } from './pages/terms-page/terms-page.component';

export const appRoutes: Routes = [
  {
    path: 'experiments-dashboard',
    component: ExperimentsDashboardComponent,
    canActivate: [AuthGuard, TermsGuard],
  },
  {
    path: '',
    redirectTo: 'experiment-studio',
    pathMatch: 'full'
  },
  {
    path: 'terms',
    component: TermsPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'account',
    component: AccountPageComponent,
    canActivate: [AuthGuard, TermsGuard],
  },
  {
    path: 'experiment-studio',
    component: ExperimentStudioComponent,
    canActivate: [AuthGuard, TermsGuard],
  },
  { path: '**', redirectTo: 'experiment-studio' }
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
