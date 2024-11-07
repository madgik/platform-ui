import { Component, Input, ViewChild } from '@angular/core';
import { Experiment } from '../../interfaces/experiments-dashboard.interface';
import { Router, RouterModule } from '@angular/router';
import { ExperimentsDashboardService } from '../../services/experiments-dashboard.service';
import { CommonModule } from '@angular/common';
import { ExperimentDetailsComponent } from './experiment-detail/experiment-detail.component';
import { NewExperimentComponent } from './new-experiment/new-experiment.component';
import { ExperimentsListComponent } from './experiment-list/experiment-list.component';

@Component({
  selector: 'app-experiments-dashboard',
  templateUrl: './experiments-dashboard.component.html',
  styleUrls: ['./experiments-dashboard.component.css'],
  standalone: true,
  imports: [RouterModule, CommonModule, ExperimentDetailsComponent, ExperimentsListComponent, NewExperimentComponent]
})
export class ExperimentsDashboardComponent {
  selectedExperiment: Experiment | null = null;
  experiments: Experiment[] = [];
  isAddingExperiment = false;

  constructor(
    private router: Router,
    private experimentsService: ExperimentsDashboardService,
  ) {}

  ngOnInit(): void {
    // Fetch experiments from the service on initialization
    this.experimentsService.getExperiments().subscribe((data: Experiment[]) => {
      this.experiments = data;
    });
  }

  onExperimentSelected(experiment: Experiment) {
    this.selectedExperiment = experiment;
  }

  // Method to open the New Experiment modal by updating the SharedService state
  onAddExperiment() {
    this.isAddingExperiment = true;
  }

  onCloseNewExperiment() {
    this.isAddingExperiment = false;
  }
}
