import { Component } from '@angular/core';
import { Experiment } from '../../interfaces/experiments-dashboard.interface'; // Import the Experiment interface
import { Router, RouterModule } from '@angular/router';
import { ExperimentsService } from './experiments-dashboard.service'; // Service for fetching experiments
import { CommonModule } from '@angular/common';
import { ExperimentDetailsComponent } from './experiment-detail/experiment-detail.component';
import { ExperimentsDashboardModule } from './experiments-dashboard.module';

@Component({
  selector: 'app-experiments-dashboard',
  templateUrl: './experiments-dashboard.component.html',
  styleUrls: ['./experiments-dashboard.component.css'],
  standalone: true,
  imports: [RouterModule, CommonModule, ExperimentsDashboardModule]
})
export class ExperimentsDashboardComponent {
  selectedExperiment: Experiment | null = null;  // To store the selected experiment
  experiments: Experiment[] = [];  // Array to hold experiment data

  constructor(private router: Router, private experimentsService: ExperimentsService) {}

  ngOnInit(): void {
    // Fetch experiments from the service on initialization
    this.experimentsService.getExperiments().subscribe((data: Experiment[]) => {
      this.experiments = data;
    });
  }

  // This method is called when the child component emits the 'experimentSelected' event
  onExperimentSelected(experiment: Experiment) {
    this.selectedExperiment = experiment;
  }

  // Method to handle new experiment creation
  createNewExperiment() {
    this.router.navigate(['/experiments/new']);
  }

}
