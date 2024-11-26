import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {DataModelsPageRoutingModule} from "./data-models-page-routing.module";
import {DataModelsPageComponent} from "./data-models-page.component";
import {DataModelFormComponent} from "./data-model-form/data-model-form.component";

@NgModule({
  imports: [
    CommonModule,
    DataModelsPageRoutingModule,
    DataModelsPageComponent,
    DataModelFormComponent,
    // Import the routing module for this page
  ],
  exports: [DataModelsPageComponent], // Export the main component
})
export class DataModelsPageModule {}
