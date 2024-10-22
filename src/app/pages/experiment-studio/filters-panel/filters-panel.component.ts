import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-filters-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filters-panel.component.html',
  styleUrls: ['./filters-panel.component.css']
})
export class FiltersPanelComponent {
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
