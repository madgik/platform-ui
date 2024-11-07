import { Component, Output, EventEmitter } from '@angular/core';
import { ExperimentsDashboardService } from '../../../services/experiments-dashboard.service';
import { Experiment } from '../../../interfaces/experiments-dashboard.interface';

@Component({
  selector: 'app-experiments-list',
  standalone: true,
  templateUrl: './experiment-list.component.html',
  styleUrls: ['./experiment-list.component.css']
})
export class ExperimentsListComponent {
  menuExpanded = false; // Controls the visibility of the experiment list
  experiments: Experiment[] = []; // Array of experiments

  @Output() experimentSelected = new EventEmitter<Experiment>(); // Emits the selected experiment to parent
  @Output() isAddingExperiment = new EventEmitter<void>();

  // Define the menu items with icons and optional routes
  experimentMenuItems = [
    { label: 'New Experiment', icon: 'fas fa-plus', action: 'new' },
    { label: 'Edit Experiment', icon: 'fas fa-edit', action: 'edit' },
    { label: 'Duplicate Experiment', icon: 'fas fa-clone', action: 'duplicate' },
    { label: 'Compare Experiments', icon: 'fas fa-code-compare', action: 'compare' },
    { label: 'Delete Experiment', icon: 'fas fa-trash', action: 'delete' },
    { label: 'Download PDF', icon: 'fas fa-file-pdf', action: 'download' }
  ];

  constructor(
    private experimentsService: ExperimentsDashboardService,
  ) {
    // Fetch experiments from the service
    this.experimentsService.getExperiments().subscribe((experiments: Experiment[]) => {
      this.experiments = experiments;
    });
  }

  // Emits the selected experiment to parent component
  selectExperiment(experiment: Experiment) {
    this.experimentSelected.emit(experiment);
  }

  // Toggles the experiment list menu visibility
  toggleMenu() {
    this.menuExpanded = !this.menuExpanded;
  }

  // Handles menu item clicks based on their action property
  onMenuItemClick(item: any) {
    switch (item.action) {
      case 'new':
        this.onAddExperiment();
        break;
      case 'edit':
        this.onEditExperiment();
        break;
      case 'download':
        this.onDownloadPDF();
        break;
      default:
        console.log('Unknown action');
    }
  }

  // Opens the New Experiment modal using SharedService
  onAddExperiment() {
    console.log("Creating new Experiment");
    this.isAddingExperiment.emit();
  }

  // Placeholder method for editing an experiment
  onEditExperiment() {
    console.log('Editing experiment...');
  }

  // Placeholder method for downloading a PDF
  onDownloadPDF() {
    console.log('Downloading PDF...');
  }

  // Track menu items by label to optimize rendering performance
  trackByItem(index: number, item: any): any {
    return item.label;
  }
}
