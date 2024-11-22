import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FederationsPageComponent } from './federations-page.component';
import { FederationsPageRoutingModule } from './federations-page-routing.module';
import { FederationFormComponent } from './federation-form/federation-form.component';

@NgModule({
  imports: [
    CommonModule,
    FederationsPageRoutingModule,
    FederationsPageComponent,
    FederationFormComponent,
    // Import the routing module for this page
  ],
  exports: [FederationsPageComponent], // Export the main component
})
export class FederationsPageModule {}
