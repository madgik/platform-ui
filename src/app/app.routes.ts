import {RouterModule, Routes} from '@angular/router';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { FederationsPageComponent } from './pages/federations-page/federations-page.component';
import { ExperimentsDashboardComponent } from './pages/experiments-dashboard/experiments-dashboard.component';
import { AccountPageComponent } from './pages/account-page/account-page.component';
import { ExperimentStudioComponent } from './pages/experiment-studio/experiment-studio.component';
import { AuthGuard } from './guards/auth.guard';
import {NgModule} from "@angular/core";
import {AuthCallbackComponent} from "./callback/authcallback.component";
import {VisualizationComponent} from "./pages/visualization/visualization.component";
import {AddFederationPageComponent} from "./pages/federations-page/add-federation/add-federation-page.component";
import {AddDataModelPageComponent} from "./pages/visualization/add-data-model/add-data-model-page.component";

export const appRoutes: Routes = [
  { path: 'home', component: LandingPageComponent },
  { path: 'federations', component: FederationsPageComponent},
  { path: 'experiments', component: ExperimentsDashboardComponent},
  { path: 'account', component: AccountPageComponent, canActivate: [AuthGuard] },
  { path: 'experiment-studio', component: ExperimentStudioComponent},
  { path: 'visualization', component: VisualizationComponent},
  { path: 'add-federation', component: AddFederationPageComponent},
  { path: 'add-data-model', component: AddDataModelPageComponent},
  { path: 'auth-callback', component: AuthCallbackComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
