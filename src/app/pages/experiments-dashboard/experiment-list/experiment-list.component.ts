import { Component, Output, EventEmitter } from '@angular/core';
import { ExperimentsService } from '../experiments-dashboard.service';
import { Experiment } from '../../../interfaces/experiments-dashboard.interface';

@Component({
  selector: 'app-experiments-list',
  templateUrl: './experiment-list.component.html',
  styleUrls: ['./experiment-list.component.css']
})
export class ExperimentsListComponent {
  menuExpanded = false;  // To control the visibility of the experiment list
  experiments: Experiment[] = []; // Use the Experiment interface

  // Example static menu items
  experimentMenuItems = [
    { label: 'New Experiment', icon: 'fas fa-plus', route: '/experiments/new' },
    { label: 'Edit Experiment', icon: 'fas fa-edit', route: '/experiments/edit' },
    { label: 'Download PDF', icon: 'fas fa-file-pdf', route: '/experiments/download' },
  ];

  @Output() experimentSelected = new EventEmitter<Experiment>(); // Emit with the Experiment type

  constructor(private experimentsService: ExperimentsService) {
    this.experimentsService.getExperiments().subscribe((experiments: Experiment[]) => {
      this.experiments = experiments;
    });
  }

  selectExperiment(experiment: Experiment) { // Explicitly type the parameter
    this.experimentSelected.emit(experiment); // Emit the selected experiment
  }

  // Method to toggle the experiment list menu
  toggleMenu() {
    this.menuExpanded = !this.menuExpanded;
  }
}
