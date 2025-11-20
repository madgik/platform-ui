import { Component, input, output } from '@angular/core';
import { Experiment } from '../../../models/experiments-dashboard.model';

@Component({
  selector: 'app-experiment-details',
  standalone: true,
  templateUrl: './experiment-detail.component.html',
  styleUrls: ['./experiment-detail.component.css']
})

export class ExperimentDetailsComponent {
  selectedExperiment = input.required<Experiment | null>();
  deleteExperiment = output<string>();

  get experimentId() {
    return this.selectedExperiment()?.id ?? 'No ID';
  }

  runExperiment() {
    // console.log('Running experiment:', this.selectedExperiment);
  }

  editExperiment() {
    // console.log('Editing experiment:', this.selectedExperiment);
  }

  onDelete(experimentId: string | undefined) {
    if (experimentId) {
      this.deleteExperiment.emit(experimentId);
      // console.log('Deleting experiment:', this.selectedExperiment()?.id);
    }
  }
}
