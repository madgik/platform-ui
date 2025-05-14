import { Filter } from './../../../../../node_modules/http-proxy-middleware/dist/types.d';
import { Component, ElementRef, AfterViewInit, Input, EventEmitter, Output } from '@angular/core';

declare var $: any; // Allow jQuery
// Refactoring todo: check again type guarding, optimise type checking strategies

const operatorOptions = {
  real: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between'],
  integer: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between'],
  nominal: ['equal', 'not_equal', 'in', 'not_in']
};

const typeMapping = {
  real: "double",
  integer: "integer",
  nominal: "string"
};

@Component({
  standalone: true,
  selector: 'app-filter-config-modal',
  templateUrl: './filter-config-modal.component.html',
  styleUrls: ['./filter-config-modal.component.css']
})
export class FilterConfigModalComponent implements AfterViewInit {
  @Input() filters: any[] = [];
  @Input() availableVariables: any[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() filtersChange = new EventEmitter<any[]>();

  constructor(private el: ElementRef) { }


  ngAfterViewInit(): void {
    if (!$.fn.queryBuilder) {
      console.error("QueryBuilder is not loaded!");
      return;
    }

    const queryBuilder = $('#query-builder');
    console.log("this.filters list: ", this.filters);

    queryBuilder.queryBuilder({
      allow_empty: true,
      filters: this.filters.map(v => ({
        id: v.name,
        label: v.name,
        type: typeMapping[v.type as keyof typeof typeMapping] || "string"
      }))
    });


    // Attach change event listener for dynamic operator updates
    queryBuilder.on('change', '.rule-filter-container select', (event: Event) => {
      const selectedVariable = $(event.target).val();
      const variableType: string = this.getVariableType(selectedVariable);

      if (variableType) {
        this.updateOperators(event.target as HTMLElement, variableType);
      }
    });
  }

  getVariableType(variableId: string): string {
    const variable = this.filters.find((v: any) => v.name === variableId);
    return variable ? variable.type : '';
  }

  updateOperators(selectElement: HTMLElement, type: string): void {
    const ruleContainer = $(selectElement).closest('.rule-container');
    const operatorSelect = ruleContainer.find('.rule-operator-container select');

    operatorSelect.empty();

    const allowedOperators = operatorOptions[type as keyof typeof operatorOptions] || [];

    allowedOperators.forEach(op => {
      operatorSelect.append(new Option(op, op));
    });
  }


  initializeQueryBuilder(): void {
    const queryBuilder = $(this.el.nativeElement).find('#query-builder');

    if (!queryBuilder.length) {
      console.error('QueryBuilder element not found!');
      return;
    }

    queryBuilder.queryBuilder({
      plugins: ['bt-tooltip-errors'],
      filters: this.filters.map(variable => ({
        id: variable.name,
        label: variable.name,
        type: variable.type
      })),
      allow_empty: true
    });
  }


  openModal(): void {
    $('#filter-config-modal').modal('show'); // Ensure modal opens
  }

  saveFilters(): void {
    const queryBuilder = $(this.el.nativeElement).find('#query-builder');
    const filtersJson = queryBuilder.queryBuilder('getRules');

    if (!filtersJson) {
      console.error('Invalid filters detected!');
      return;
    }

    console.log('Saved Filters:', filtersJson);
    this.filtersChange.emit(filtersJson); // Send filters to parent
  }

  close() {
    this.closeModal.emit();
  }
}
