import {RouterModule, Routes} from '@angular/router';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { FederationsPageComponent } from './pages/federations-page/federations-page.component';
import { ExperimentsDashboardComponent } from './pages/experiments-dashboard/experiments-dashboard.component';
import { AccountPageComponent } from './pages/account-page/account-page.component';
import { ExperimentStudioComponent } from './pages/experiment-studio/experiment-studio.component';
import { IcicleChartComponent } from './pages/icicle-chart/icicle-chart.component';
import { AuthGuard } from './guards/auth.guard';
import {NgModule} from "@angular/core";
import {AuthCallbackComponent} from "./callback/authcallback.component";

export const appRoutes: Routes = [
  { path: 'home', component: LandingPageComponent },
  { path: 'federations', component: FederationsPageComponent, canActivate: [AuthGuard] },
  { path: 'experiments', component: ExperimentsDashboardComponent, canActivate: [AuthGuard] },
  { path: 'account', component: AccountPageComponent, canActivate: [AuthGuard] },
  { path: 'experiment-studio', component: ExperimentStudioComponent, canActivate: [AuthGuard] },
  { path: 'icicle', component: IcicleChartComponent, canActivate: [AuthGuard] },
  { path: 'auth-callback', component: AuthCallbackComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
