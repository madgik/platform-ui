import {RouterModule, Routes} from '@angular/router';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { FederationsPageComponent } from './pages/federations-page/federations-page.component';
import { ExperimentsDashboardComponent } from './pages/experiments-dashboard/experiments-dashboard.component';
import { AccountPageComponent } from './pages/account-page/account-page.component';
import { ExperimentStudioComponent } from './pages/experiment-studio/experiment-studio.component';
import { AuthGuard } from './guards/auth.guard';
import {NgModule} from "@angular/core";
import {AuthCallbackComponent} from "./callback/authcallback.component";
import {VisualizationWrapperComponent} from "./pages/visualization-wrapper/visualization-wrapper.component";
import {AddFederationPageComponent} from "./pages/federations-page/add-federation/add-federation-page.component";
import {
  UpdateFederationComponent
} from "./pages/federations-page/update-federation/update-federation.component";
import {DataModelComponent} from "./pages/visualization-wrapper/data-model/data-model.component";

export const appRoutes: Routes = [
  { path: 'home', component: LandingPageComponent },
  { path: 'federations', component: FederationsPageComponent},
  { path: 'experiments', component: ExperimentsDashboardComponent},
  { path: 'account', component: AccountPageComponent, canActivate: [AuthGuard] },
  { path: 'experiment-studio', component: ExperimentStudioComponent},
  { path: 'visualization', component: VisualizationWrapperComponent},
  { path: 'add-federation', component: AddFederationPageComponent, canActivate: [AuthGuard] },
  { path: 'update-federation', component: UpdateFederationComponent, canActivate: [AuthGuard] },
  { path: 'data-model', component: DataModelComponent, canActivate: [AuthGuard] },
  { path: 'auth-callback', component: AuthCallbackComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
