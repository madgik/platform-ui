import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionComponent } from '../../shared/accordion/accordion.component';

@Component({
  selector: 'app-filters-panel',
  standalone: true,
  imports: [CommonModule, AccordionComponent],
  templateUrl: './filters-panel.component.html',
  styleUrls: ['./filters-panel.component.css']
})
export class FiltersPanelComponent {
  accordionTitle = "Filters"
  @Output() filterApplied = new EventEmitter<string>();

  filters = ['Filter A', 'Filter B', 'Filter C'];

  applyFilter(filter: string) {
    this.filterApplied.emit(filter);
  }

  accordionState: { [key: string]: boolean } = {};

  toggleAccordion(panel: string) {
    this.accordionState[panel] = !this.accordionState[panel];
  }

  isAccordionOpen(panel: string): boolean {
    return !!this.accordionState[panel];
  }
}
