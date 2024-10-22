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

  onSelectVariable(variable: string) {
    this.variableSelected.emit(variable);
  }
}
