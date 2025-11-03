import {RouterModule, Routes} from '@angular/router';
import { ExperimentsDashboardComponent } from './pages/experiments-dashboard/experiments-dashboard.component';
import { AccountPageComponent } from './pages/account-page/account-page.component';
import { ExperimentStudioComponent } from './pages/experiment-studio/experiment-studio.component';
import { AuthGuard } from './guards/auth.guard';
import { NgModule } from "@angular/core";

export const appRoutes: Routes = [
  // { path: 'home', component: LandingPageComponent },

  // {
  //   path: 'federations',
  //   component: FederationsPageComponent,
  //   canActivate: [AuthGuard],
  //   loadChildren: () =>
  //     import('./pages/federations-page/federations-page.module').then(m => m.FederationsPageModule),
  // },
  // {
  //   path: 'experiments-dashboard',
  //   component: ExperimentsDashboardComponent,
  //   canActivate: [AuthGuard],
  // },
    {
    path: '',
    redirectTo: 'experiment-studio',
    pathMatch: 'full'
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
  { path: '**', redirectTo: 'experiment-studio' }
  // {
  //   path: 'data-models',
  //   component: DataModelsPageComponent,
  //   canActivate: [AuthGuard],
  //   loadChildren: () =>
  //     import('./pages/data-models-page/data-models-page.module').then(m => m.DataModelsPageModule),
  // },

  // { path: '', redirectTo: 'home', pathMatch: 'full' },
  // { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
