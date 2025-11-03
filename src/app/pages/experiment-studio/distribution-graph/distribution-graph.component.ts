import { Component, signal, OnInit, Input, computed } from '@angular/core';
import { StatisticAnalysisPanelComponent } from '../statistic-analysis-panel/statistic-analysis-panel.component';
import { HistogramComponent } from '../visualisations/histogram/histogram.component';
import { ExperimentStudioService } from '../../../services/experiment-studio.service';

@Component({
  selector: 'app-distribution-graph',
  standalone: true,
  imports: [HistogramComponent],
  templateUrl: './distribution-graph.component.html',
  styleUrl: './distribution-graph.component.css'
})
export class DistributionGraphComponent {
  @Input() data: { bins: string[]; counts: number[]; variableName: string } | null = null;

  constructor() {}
}
