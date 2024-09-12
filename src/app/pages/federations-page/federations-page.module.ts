import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FederationsPageComponent } from './federations-page.component';
import { FederationDetailComponent } from './federation-detail/federation-detail.component';
import { RouterModule } from '@angular/router'; // If you have routing

@NgModule({
  declarations: [
    FederationsPageComponent,
    FederationDetailComponent, // Declare any child components
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: FederationsPageComponent }
    ])
  ]
})
export class FederationsPageModule {}
