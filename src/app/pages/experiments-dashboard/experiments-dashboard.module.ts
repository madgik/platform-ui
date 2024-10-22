import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { ExperimentsDashboardComponent } from './experiments-dashboard.component';
import { ExperimentsListComponent } from './experiment-list/experiment-list.component';
import { ExperimentDetailsComponent } from './experiment-detail/experiment-detail.component';
import { ExperimentsService } from './experiments-dashboard.service';// Shared service

const routes: Routes = [
  { path: '', component: ExperimentsDashboardComponent }
];

@NgModule({
  declarations: [
    ExperimentsListComponent,
    ExperimentDetailsComponent
  ],
  imports: [
    CommonModule,
    ExperimentsDashboardComponent, // Components are tightly coupled
    RouterModule.forChild(routes), // Feature-specific routing
  ],
  providers: [ExperimentsService], // Shared service for these components
  exports: [
    ExperimentDetailsComponent,
    ExperimentsListComponent
  ]
})
export class ExperimentsDashboardModule {}
