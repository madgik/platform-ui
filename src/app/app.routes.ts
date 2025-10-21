import {RouterModule, Routes} from '@angular/router';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { FederationsPageComponent } from './pages/federations-page/federations-page.component';
import { ExperimentsDashboardComponent } from './pages/experiments-dashboard/experiments-dashboard.component';
import { AccountPageComponent } from './pages/account-page/account-page.component';
import { ExperimentStudioComponent } from './pages/experiment-studio/experiment-studio.component';
import { AuthGuard } from './guards/auth.guard';
import {NgModule} from "@angular/core";
import {DataModelsPageComponent} from "./pages/data-models-page/data-models-page.component";


export const appRoutes: Routes = [
  { path: 'home', component: LandingPageComponent },
  {
    path: 'federations',
    component: FederationsPageComponent, // This is fine for the parent page
    loadChildren: () =>
      import('./pages/federations-page/federations-page.module').then(
        (m) => m.FederationsPageModule // Ensure you're importing the main module here
      ),
  },
  { path: 'experiments-dashboard', component: ExperimentsDashboardComponent},
  { path: 'account', component: AccountPageComponent, canActivate: [AuthGuard] },
  { path: 'experiment-studio', component: ExperimentStudioComponent},
  { path: 'data-models', component: DataModelsPageComponent,
    loadChildren: () =>
      import('./pages/data-models-page/data-models-page.module').then(
        (m) => m.DataModelsPageModule // Ensure you're importing the main module here
      ),
  },
  // { path: 'data-models', component: DataModelsPageComponent,
  //   loadChildren: () =>
  //     import('./pages/data-models-page/data-models-page.module').then(
  //       (m) => m.DataModelsPageModule // Ensure you're importing the main module here
  //     ),
  // },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
