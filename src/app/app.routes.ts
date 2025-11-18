import {RouterModule, Routes} from '@angular/router';
import { AccountPageComponent } from './pages/account-page/account-page.component';
import { ExperimentStudioComponent } from './pages/experiment-studio/experiment-studio.component';
import { AuthGuard } from './guards/auth.guard';
import { NgModule } from "@angular/core";

export const appRoutes: Routes = [
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
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
