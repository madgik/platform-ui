import { Component, Input, inject } from '@angular/core';
import { HistogramComponent } from '../../visualisations/histogram/histogram.component';
import { PdfExportService } from '../../../../services/pdf-export.service';
import { ExperimentStudioService } from '../../../../services/experiment-studio.service';
@Component({
  selector: 'app-distribution-graph',
  imports: [HistogramComponent],
  templateUrl: './distribution-graph.component.html',
  styleUrl: './distribution-graph.component.css'
})
export class DistributionGraphComponent {
  @Input() data: { bins: string[]; counts: number[]; variableName: string } | null = null;

  private pdfExportService = inject(PdfExportService);
  private expStudioService = inject(ExperimentStudioService);

  constructor() { }

  async exportToPdf(): Promise<void> {
    const element = document.getElementById('histogram-chart-container');
    if (!element || !this.data) return;

    const selectedDataModel = this.expStudioService.selectedDataModel();
    const selectedDatasets = this.expStudioService.selectedDatasets();

    await this.pdfExportService.exportDistributionPdf(element, {
      title: `Distribution of ${this.data.variableName}`,
      nodeLabel: this.data.variableName,
      modelLabel: selectedDataModel?.label || selectedDataModel?.code || '',
      datasetLabels: selectedDatasets,
      isGroupView: false
    });
  }
}
