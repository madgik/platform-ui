import { Component, EventEmitter, inject, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';
import { ExperimentsDashboardService } from '../../../services/experiments-dashboard.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-new-experiment',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-experiment.component.html',
  styleUrls: ['./new-experiment.component.css'],
})
export class NewExperimentComponent {
  @Output() cancel = new EventEmitter<void>();
  @Output() createExperiment = new EventEmitter<any>();

  constructor(private router: Router) {}

  experimentName = '';
  description = '';
  date = new Date(); // .toISOString().split('T')[0] Today's date in YYYY-MM-DD format
  status = 'In Progress';

  private expDashboardService = inject(ExperimentsDashboardService);

  onCreateExperiment() {
    const newExperiment = {
      name: this.experimentName,
      description: this.description,
      dateCreated: this.date,
      status: this.status,
    };

    // console.log('Creating new experiment:', newExperiment);
    this.expDashboardService.addExperiment(newExperiment);
    this.createExperiment.emit(newExperiment); // Emit created experiment
    this.router.navigate(['/experiment-studio'], { state: { data: newExperiment } });
  }

  closeModal() {
    this.cancel.emit();
  }
}


