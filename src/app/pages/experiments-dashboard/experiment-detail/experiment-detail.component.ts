import { Component, Input } from '@angular/core';
import { Experiment } from '../../../interfaces/experiments-dashboard.interface';

@Component({
  selector: 'app-experiment-details',
  templateUrl: './experiment-detail.component.html',
  styleUrls: ['./experiment-detail.component.css']
})

export class ExperimentDetailsComponent {
  @Input() selectedExperiment!: any;

  runExperiment() {
    console.log('Running experiment:', this.selectedExperiment);
  }

  editExperiment() {
    console.log('Editing experiment:', this.selectedExperiment);
  }

  deleteExperiment() {
    console.log('Deleting experiment:', this.selectedExperiment);
  }
}
