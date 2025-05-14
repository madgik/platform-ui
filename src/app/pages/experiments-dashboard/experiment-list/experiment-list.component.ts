import { Component, Output, EventEmitter, signal, output } from '@angular/core';
import { ExperimentsDashboardService } from '../../../services/experiments-dashboard.service';
import { Experiment } from '../../../models/experiments-dashboard.model';

@Component({
  selector: 'app-experiments-list',
  standalone: true,
  templateUrl: './experiment-list.component.html',
  styleUrls: ['./experiment-list.component.css']
})
export class ExperimentsListComponent {
  // @Output() experimentSelected = new EventEmitter<Experiment>(); // Emits the selected experiment to parent
  // @Output() isAddingExperiment = new EventEmitter<void>();
  experimentSelected = output<Experiment>();
  isAddingExperiment = output();
  menuExpanded = false; // Controls the visibility of the experiment list
  deleteExperiment = '';

  // Define the menu items with icons and optional routes
  experimentMenuItems = [
    { label: 'New', icon: 'fas fa-plus', action: 'new' },
    { label: 'Edit', icon: 'fas fa-edit', action: 'edit' },
    { label: 'Duplicate', icon: 'fas fa-clone', action: 'duplicate' },
    { label: 'Compare', icon: 'fas fa-code-compare', action: 'compare' },
    { label: 'Delete', icon: 'fas fa-trash', action: 'delete' },
    { label: 'Download PDF', icon: 'fas fa-file-pdf', action: 'download' }
  ];

  constructor(public experimentsService: ExperimentsDashboardService) {}

  ngOnInit() {
    this.experimentsService.getUserExperiments();
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
