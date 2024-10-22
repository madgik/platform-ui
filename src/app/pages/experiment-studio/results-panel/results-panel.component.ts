import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-results-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results-panel.component.html',
  styleUrls: ['./results-panel.component.css']
})
export class ResultsPanelComponent {
  accordionState: { [key: string]: boolean } = {};

  toggleAccordion(panel: string) {
    this.accordionState[panel] = !this.accordionState[panel];
  }

  isAccordionOpen(panel: string): boolean {
    return !!this.accordionState[panel];
  }
}
