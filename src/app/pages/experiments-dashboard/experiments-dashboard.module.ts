import { ExperimentsDashboardComponent } from './experiments-dashboard.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExperimentDetailComponent } from './experiment-detail/experiment-detail.component';
import { ExperimentListComponent } from './experiment-list/experiment-list.component';
import { RouterModule } from '@angular/router'; // If you have routing

@NgModule({
  declarations: [
    ExperimentsDashboardComponent,
    ExperimentDetailComponent,
    ExperimentListComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: ExperimentsDashboardComponent }
    ])
  ]
})
export class ExperimentsDashboardModule {}
