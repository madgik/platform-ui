import { ExperimentsDashboardService } from './../../services/experiments-dashboard.service';
import { Experiment } from '../../models/experiments-dashboard.model';
import { Component, input, OnInit, output, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ExperimentDetailsComponent } from './experiment-detail/experiment-detail.component';
import { NewExperimentComponent } from './new-experiment/new-experiment.component';
import { ExperimentsListComponent } from './experiment-list/experiment-list.component';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-experiments-dashboard',
  templateUrl: './experiments-dashboard.component.html',
  styleUrls: ['./experiments-dashboard.component.css'],
  standalone: true,
  imports: [RouterModule, CommonModule, ExperimentDetailsComponent, ExperimentsListComponent, NewExperimentComponent]
})
export class ExperimentsDashboardComponent implements OnInit {
  private experiments = signal<Experiment[]>([]);
  selectedExperiment = signal<Experiment | null>(null);
  isAddingExperiment = false;
  isConfirmingDelete = false;
  experimentToDeleteId: string | null = null;

  constructor(
    private router: Router,
    private experimentsService: ExperimentsDashboardService,
  ) {}

  ngOnInit(): void {
    // Fetch experiments from the service on initialization
    this.experimentsService.getUserExperiments();
  }


  onExperimentSelected(experiment: Experiment) {
    console.log('this is the experiment object: ', experiment);
    this.selectedExperiment.set(experiment);
    console.log("hello", this.selectedExperiment());
  }

  // Method to open the New Experiment modal by updating the SharedService state
  onAddExperiment() {
    this.isAddingExperiment = true;
  }

  onCloseNewExperiment() {
    this.isAddingExperiment = false;
  }

  onDeleteRequested() {
    const experiment = this.selectedExperiment();
    if (!experiment) {
      console.error('No experiment selected for deletion');
      return;
    }
    this.experimentToDeleteId = experiment.id;
    this.isConfirmingDelete = true;
  }

  confirmDelete(expId: string) {
    if (expId) {
      this.experimentsService.deleteExperiment(expId);
      this.selectedExperiment.set(null);
      this.experimentToDeleteId = null;
      this.isConfirmingDelete = false;
    }
  }

  cancelDelete() {
    this.isConfirmingDelete = false;
    this.experimentToDeleteId = null;
  }
}
