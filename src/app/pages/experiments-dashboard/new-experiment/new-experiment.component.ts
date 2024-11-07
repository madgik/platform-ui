import { Component, EventEmitter, Output } from '@angular/core';
import { SharedService } from '../../../services/shared.service';

@Component({
  selector: 'app-new-experiment',
  standalone: true,
  templateUrl: './new-experiment.component.html',
  styleUrls: ['./new-experiment.component.css']
})
export class NewExperimentComponent {
  @Output() cancel = new EventEmitter<void>();

  // Method to create a new experiment and close the modal afterward
  onCreateExperiment() {
    console.log('Creating new experiment...');
    this.cancel.emit(); // Close modal after creating the experiment
  }

  // Method to close the modal directly
  closeModal() {
    this.cancel.emit();
  }
}
