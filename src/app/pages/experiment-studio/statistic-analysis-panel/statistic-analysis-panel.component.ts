import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionComponent } from '../../shared/accordion/accordion.component';

@Component({
  selector: 'app-statistic-analysis-panel',
  standalone: true,
  imports: [CommonModule, AccordionComponent],
  templateUrl: './statistic-analysis-panel.component.html',
  styleUrls: ['./statistic-analysis-panel.component.css']
})
export class StatisticAnalysisPanelComponent {
  accordionTitle = "Descriptive Statistics"

  // Placeholder data for statistical analysis
  statistics = [
    { title: 'Mean', value: 45.3 },
    { title: 'Median', value: 42.5 },
    { title: 'Standard Deviation', value: 12.7 }
  ];
}
