import { Component, EventEmitter, inject, output, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type NewExperimentModalData } from './../../../models/new-experiment.model';
import { ExperimentsDashboardService } from '../../../services/experiments-dashboard.service';
import { v4 as uuidv4} from 'uuid';

@Component({
  selector: 'app-new-experiment',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-experiment.component.html',
  styleUrls: ['./new-experiment.component.css']
})
export class NewExperimentComponent {
  cancel = output({});
  experimentName = "";
  description = "";
  date = new Date();
  status = "";

  private expDashboardService = inject(ExperimentsDashboardService)

  // Method to create a new experiment and close the modal afterward
  onCreateExperiment() {
      console.log('Creating new experiment...');
      this.expDashboardService.addExperiment({
        name: this.experimentName,
        description: this.description,
        dateCreated: this.date,
        status: this.status
      });
    this.cancel.emit(); // Close modal after creating the experiment
  }

  // Method to close the modal directly
  closeModal() {
    this.cancel.emit();
  }
}
