import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionComponent } from '../../../shared/accordion/accordion.component';

@Component({
  selector: 'app-algorithm-panel',
  standalone: true,
  imports: [CommonModule, AccordionComponent],
  templateUrl: './algorithm-panel.component.html',
  styleUrls: ['./algorithm-panel.component.css']
})
export class AlgorithmPanelComponent {
  accordionTitle = "Algorithm Selection & Configuration"
  @Output() algorithmConfigured = new EventEmitter<string>();

  algorithms = ['Algorithm X', 'Algorithm Y', 'Algorithm Z'];

  configureAlgorithm(algorithm: string) {
    this.algorithmConfigured.emit(algorithm);
  }

  accordionState: { [key: string]: boolean } = {};

  toggleAccordion(panel: string) {
    this.accordionState[panel] = !this.accordionState[panel];
  }

  isAccordionOpen(panel: string): boolean {
    return !!this.accordionState[panel];
  }
}
