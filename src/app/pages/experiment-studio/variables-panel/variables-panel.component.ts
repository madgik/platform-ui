import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-variables-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './variables-panel.component.html',
  styleUrls: ['./variables-panel.component.css']
})
export class VariablesPanelComponent {
  @Output() variableSelected = new EventEmitter<string>();

  variables = ['Variable A', 'Variable B', 'Variable C'];

  selectVariable(variable: string) {
    this.variableSelected.emit(variable);
  }

  accordionState: { [key: string]: boolean } = {};

  toggleAccordion(panel: string) {
    this.accordionState[panel] = !this.accordionState[panel];
  }

  isAccordionOpen(panel: string): boolean {
    return !!this.accordionState[panel];
  }
}
