import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FilterConfigModalComponent } from '../../shared/filter-config-modal/filter-config-modal.component';
import { CommonModule } from '@angular/common';
import { ExperimentStudioService } from '../../../services/experiment-studio.service';

@Component({
  selector: 'app-variable-filter-selection',
  standalone: true,
  templateUrl: './variable-filter-selection.component.html',
  styleUrls: ['./variable-filter-selection.component.css'],
  imports: [CommonModule, FilterConfigModalComponent]
})
export class VariableFilterSelectionComponent implements OnInit {
  @Input() selectedNode: any; // Selected node from the bubble chart
  // @Input() variables: any[] = []; // Selected variables
  // @Input() covariates: any[] = []; // Selected covariates
  // @Input() filters: any[] = []; // Selected filters
  // @Output() variablesChange = new EventEmitter<any[]>();
  // @Output() covariatesChange = new EventEmitter<any[]>();
  @Output() filtersChange = new EventEmitter<any[]>();
  @Input() availableVariables: any[] = [];
  variables: any[] = [];
  covariates: any[] = [];
  filters: any[] = [];
  isFilterConfigOpen = false;

  constructor(private expStudioService: ExperimentStudioService) { }

  ngOnInit(): void {
    this.expStudioService.variables$.subscribe((variables) => {
      console.log("Received updated variables:", variables);
      this.variables = variables;
    });

    this.expStudioService.covariates$.subscribe((covariates) => {
      console.log("Received updated covariates:", covariates);
      this.covariates = covariates;
    });

    this.expStudioService.filters$.subscribe((filters) => {
      console.log("Received updated filters:", filters);
      this.filters = filters;
    });
  }

  addItem(listName: 'variables' | 'covariates' | 'filters'): void {
    if (!this.selectedNode) return;

    const list = this[listName];
    const isDuplicate = list.some((item) => item.code === this.selectedNode.code);
    if (!isDuplicate) {
      const updated = [...list, { ...this.selectedNode }];
      this[listName] = updated;

      if (listName === 'variables') {
        this.expStudioService.addVariableAndEnrich(this.selectedNode);
      } else {
        this.updateService(listName, updated);
      }
    }
  }

  addVariable(): void {
    this.addItem('variables');
  }

  addCovariate(): void {
    this.addItem('covariates');
  }

  addFilter(): void {
    this.addItem('filters');
  }

  removeItem(item: any, listName: string): void {
    switch (listName) {
      case 'variables':
        this.variables = this.variables.filter((v) => v.name !== item.name);
        this.updateService('variables', [...this.variables]);
        break;
      case 'covariates':
        this.covariates = this.covariates.filter((c) => c.name !== item.name);
        this.updateService('covariates', [...this.covariates]);
        break;
      case 'filters':
        this.filters = this.filters.filter((f) => f.name !== item.name);
        this.availableVariables = [...this.filters]; // αν το χρησιμοποιείς κάπου
        this.updateFilters([...this.filters]);
        this.updateService('filters', [...this.filters]);
        break;
      default:
        console.error(`Unknown list: ${listName}`);
    }
  }

  clearList(listName: string): void {
    switch (listName) {
      case 'variables':
        this.variables = [];
        this.updateService('variables', []);
        break;
      case 'covariates':
        this.covariates = [];
        this.updateService('covariates', []);
        break;
      case 'filters':
        this.filters = [];
        this.availableVariables = [];
        this.updateService('filters', []);
        break;
      default:
        console.error(`Unknown list: ${listName}`);
    }
  }

  openFilterConfig(): void {
    this.isFilterConfigOpen = true;
  }

  closeFilterConfig(): void {
    this.isFilterConfigOpen = false;
  }


  // Check for redundant code
  updateFilters(updatedFilters: any[]): void {
    this.filters = updatedFilters;
    this.availableVariables = updatedFilters;
    this.updateService('filters', updatedFilters);
  }

  onFiltersChange(updatedFilters: any[]): void {
    console.log("Called on Filters Change");
    if (Array.isArray(updatedFilters)) {
      this.filters = [...updatedFilters];
      this.availableVariables = [...updatedFilters];
      console.log('Filters updated from modal:', this.availableVariables);
      this.filtersChange.emit(this.filters); // μόνο αν χρησιμοποιείται
      this.updateService('filters', this.filters);
    } else {
      console.error('Invalid filters received from modal:', updatedFilters);
    }
  }

  onModalClose(): void {
    // Close the modal when the close event is triggered
    this.isFilterConfigOpen = false;
  }

  // Helper service for VariabeHandlingService
  updateService(listName: string, updatedList: any[]): void {
    switch (listName) {
      case 'variables':
        this.expStudioService.setVariables(updatedList);
        break;
      case 'covariates':
        this.expStudioService.setCovariates(updatedList);
        break;
      case 'filters':
        this.expStudioService.setFilters(updatedList);
        break;
    }
  }
}
