import { RouterModule, Routes } from '@angular/router';
import { ExperimentsDashboardComponent } from './pages/experiments-dashboard/experiments-dashboard.component';
import { AccountPageComponent } from './pages/account-page/account-page.component';
import { ExperimentStudioComponent } from './pages/experiment-studio/experiment-studio.component';
import { AuthGuard } from './guards/auth.guard';
import { NgModule } from "@angular/core";

export const appRoutes: Routes = [
  {
    path: 'experiments-dashboard',
    component: ExperimentsDashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'account',
    component: AccountPageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'experiment-studio',
    component: ExperimentStudioComponent,
    canActivate: [AuthGuard],
  },
  { path: '', redirectTo: 'experiments-dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'experiments-dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
