import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-statistic-analysis-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistic-analysis-panel.component.html',
  styleUrls: ['./statistic-analysis-panel.component.css']
})
export class StatisticAnalysisPanelComponent {
  // Placeholder data for statistical analysis
  statistics = [
    { title: 'Mean', value: 45.3 },
    { title: 'Median', value: 42.5 },
    { title: 'Standard Deviation', value: 12.7 }
  ];

  accordionState: { [key: string]: boolean } = {};

  toggleAccordion(panel: string) {
    this.accordionState[panel] = !this.accordionState[panel];
  }

  isAccordionOpen(panel: string): boolean {
    return !!this.accordionState[panel];
  }
}
