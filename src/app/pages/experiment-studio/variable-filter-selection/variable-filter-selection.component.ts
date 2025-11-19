import { filter } from 'rxjs/operators';
import { Component, Input, Output, EventEmitter, OnInit, effect } from '@angular/core';
import { FilterConfigModalComponent } from '../filter-config-modal/filter-config-modal.component';
import { CommonModule } from '@angular/common';
import { ExperimentStudioService } from '../../../services/experiment-studio.service';
import { CdkDragDrop, DragDropModule, transferArrayItem } from '@angular/cdk/drag-drop'
import { D3HierarchyNode } from '../../../models/data-model.interface';


@Component({
  selector: 'app-variable-filter-selection',
  standalone: true,
  templateUrl: './variable-filter-selection.component.html',
  styleUrls: ['./variable-filter-selection.component.css'],
  imports: [CommonModule, FilterConfigModalComponent, DragDropModule]
})
export class VariableFilterSelectionComponent implements OnInit {
  @Input() selectedNode: any; // Selected node from the bubble chart
  @Input() groupVariables: any[] = [];
  @Output() filtersChange = new EventEmitter<any[]>();
  @Output() variableClicked = new EventEmitter<any>();

  filterLogic: any;
  variables: any[] = [];
  covariates: any[] = [];
  filters: any[] = [];
  isFilterConfigOpen = false;

  constructor(private expStudioService: ExperimentStudioService) {
    effect(() => {
      // activates availableGroupedAlgorithms to recalculate available algorithms
      this.expStudioService.availableGroupedAlgorithms();
    });

    effect(() => {
      this.variables = this.expStudioService.selectedVariables();
    });

    effect(() => {
      this.covariates = this.expStudioService.selectedCovariates();
    });

    effect(() => {
      this.filters = this.expStudioService.selectedFilters();
    });
  }

  ngOnInit(): void {

  }

  onVariableClick(node: D3HierarchyNode): void {
    this.variableClicked.emit(node);
  }


  private getLeafNodes(node: any): any[] {
    const leaves: any[] = [];

    function collectLeaves(n: any) {
      if (!n.children || n.children.length === 0) {
        leaves.push(n);
      } else {
        n.children.forEach(collectLeaves);
      }
    }

    collectLeaves(node);
    return leaves;
  }

  get hasSelectedDatasets(): boolean {
    return (this.expStudioService.selectedDatasets() || []).length > 0;
  }

  addItem(listName: 'variables' | 'covariates' | 'filters'): void {
    const datasets = this.expStudioService.selectedDatasets();
    if (!datasets || datasets.length === 0) {
      alert('Please select at least one dataset before adding variables.');
      return;
    }
    if (!this.selectedNode) return;

    // Select all leaves from selected node
    const itemsToAdd = this.selectedNode.children ? this.getLeafNodes(this.selectedNode) : [this.selectedNode];

    const list = this[listName];
    const updated = [
      ...list,
      ...itemsToAdd.filter(item => !list.some(existing => existing.code === item.code))
    ];

    this[listName] = updated;

    if (listName === 'variables') {
      itemsToAdd.forEach(item => this.expStudioService.addVariableAndEnrich(item));
    } else {
      this.updateService(listName, updated);
    }
  }


  drop(event: CdkDragDrop<any[]>, listName: 'variables' | 'covariates' | 'filters') {
    if (event.previousContainer === event.container) return;

    const item = event.previousContainer.data[event.previousIndex];
    const targetList = event.container.data;
    if (targetList.some(v => v.code === item.code)) {
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    const updated = event.container.data;

    switch (listName) {
      case 'variables':
        this.variables = updated;
        this.expStudioService.setVariables(this.variables);
        break;
      case 'covariates':
        this.covariates = updated;
        this.expStudioService.setCovariates(this.covariates);
        break;
      case 'filters':
        this.filters = updated;
        this.expStudioService.setFilters(this.filters);
        break;
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
        this.variables = this.variables.filter((v) => v.label !== item.label);
        this.updateService('variables', [...this.variables]);
        break;
      case 'covariates':
        this.covariates = this.covariates.filter((c) => c.label !== item.label);
        this.updateService('covariates', [...this.covariates]);
        break;
      case 'filters':
        this.filters = this.filters.filter((f) => f.label !== item.label);
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
        this.updateService('filters', []);
        break;
      default:
        console.error(`Unknown list: ${listName}`);
    }
  }

  openFilterConfig(): void {
    const saved = this.expStudioService.filterLogic();
    this.filterLogic = saved ? structuredClone(saved) : { condition: 'AND', rules: [] };
    this.isFilterConfigOpen = true;
  }

  closeFilterConfig(): void {
    this.isFilterConfigOpen = false;
  }


  // Check for redundant code
  updateFilters(updatedFilters: any[]): void {
    this.filters = updatedFilters;
    this.updateService('filters', updatedFilters);
  }

  onFiltersChange(updatedFilters: any[]): void {
    console.log("Called on Filters Change");
    if (Array.isArray(updatedFilters)) {
      this.filters = [...updatedFilters];
      this.filtersChange.emit(this.filters); // this emits an event if a filter exists
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
