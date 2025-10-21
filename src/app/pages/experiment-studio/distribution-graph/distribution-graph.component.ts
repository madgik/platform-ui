import { Component, signal, OnInit, Input, computed } from '@angular/core';
import { StatisticAnalysisPanelComponent } from '../statistic-analysis-panel/statistic-analysis-panel.component';
import { HistogramComponent } from '../visualisations/histogram/histogram.component';
import { ExperimentStudioService } from '../../../services/experiment-studio.service';

@Component({
  selector: 'app-distribution-graph',
  standalone: true,
  imports: [StatisticAnalysisPanelComponent, HistogramComponent],
  templateUrl: './distribution-graph.component.html',
  styleUrl: './distribution-graph.component.css'
})
export class DistributionGraphComponent {
  @Input() data: { bins: string[]; counts: number[]; variableName: string } | null = null;
  isStatisticalAnalysisOpen = signal(false);
  processedData: any[] = [];

  constructor(
    private expStudioService: ExperimentStudioService,
  ) {}

  isButtonDisabled = computed(() =>
    this.expStudioService.selectedVariables().length === 0 &&
    this.expStudioService.selectedCovariates().length === 0 &&
    this.expStudioService.selectedFilters().length === 0
  );

  openStatisticalAnalysis(): void {
    this.isStatisticalAnalysisOpen.set(true);
  }

  closeStatisticalAnalysis(): void {
    this.isStatisticalAnalysisOpen.set(false);
  }
}
