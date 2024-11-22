import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionComponent } from '../../shared/accordion/accordion.component';

@Component({
  selector: 'app-variables-panel',
  standalone: true,
  imports: [CommonModule, AccordionComponent],
  templateUrl: './variables-panel.component.html',
  styleUrls: ['./variables-panel.component.css']
})
export class VariablesPanelComponent {
  accordionTitle = "Variable Selection"
  @Output() variableSelected = new EventEmitter<string>();

  variables = ['Variable A', 'Variable B', 'Variable C'];

  selectVariable(variable: string) {
    this.variableSelected.emit(variable);
  }

}
