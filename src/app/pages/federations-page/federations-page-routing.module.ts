import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FederationsPageComponent } from './federations-page.component';

const routes: Routes = [
  { path: '', component: FederationsPageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FederationsPageRoutingModule { }
