import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { FederationsPageComponent } from './federations-page.component'; // Could be standalone, but managed by a module

const routes: Routes = [
  { path: '', component: FederationsPageComponent }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes) // Child routing inside the feature module
  ]
})
export class FederationsModule { }
