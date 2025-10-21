import { ChartBuilderService } from './../../visualisations/charts/chart-builder.service';
import { Component, Input, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AutoRendererComponent } from '../../visualisations/auto-renderer/auto-renderer.component';
import { ChartRendererComponent } from '../../visualisations/charts/charts-renderer/charts-renderer.component';
import { EChartsOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';

@Component({
  selector: 'app-algorithm-result',
  standalone: true,
  imports: [CommonModule,
    AutoRendererComponent,
    ChartRendererComponent,
    NgxEchartsModule],
  templateUrl: './algorithm-result.component.html',
  styleUrls: ['./algorithm-result.component.css']
})
export class AlgorithmResultComponent {
  @Input() result: any = null;
  @Input() schema: any[] = [];
  @Input() algorithm!: string;

  constructor(private chartBuilder: ChartBuilderService) { }

  ngOnChanges() {
    // console.log('[AlgorithmResult] input algorithm =', this.algorithm);
  }

  isRenderable = computed(() => {
    return !!this.result && !!this.algorithm;
  });

  chartOptions = computed<EChartsOption[]>(() =>
    this.chartBuilder.getChartsForAlgorithm(
      this.algorithm,
      this.result
    )
  );

  renderedCharts = computed(() => {
    if (!this.result || !this.algorithm) return [];
    return this.chartBuilder.getChartsForAlgorithm(this.algorithm, this.result);
  });

  getMatrixRows(data: any): any[][] {
    if (!Array.isArray(data)) return [];

    if (data[0]?.values) {
      return data.map((r: any) => r.values);
    }

    if (Array.isArray(data[0])) {
      return data;
    }

    return [];
  }

  expandedPanels = signal<Set<string>>(new Set());

  getObjectKeys(obj: Record<string, any>): string[] {
    return obj ? Object.keys(obj) : [];
  }

  getKeys(obj: any): string[] {
    return obj && typeof obj === 'object' ? Object.keys(obj) : [];
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  togglePanel(key: string) {
    const current = this.expandedPanels();
    const updated = new Set(current);
    updated.has(key) ? updated.delete(key) : updated.add(key);
    this.expandedPanels.set(updated);
  }

  isExpanded(key: string): boolean {
    return this.expandedPanels().has(key);
  }

  exportToPDF() {
    const doc = new jsPDF();
    let y = 10;

    for (const field of this.schema) {
      const key = field.key;
      const type = field.type;
      const data = this.result?.[key];

      doc.setFontSize(12);
      doc.text(key, 10, y);
      y += 6;

      if (type === 'table' && Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        const rows = data.map((row: any) => headers.map(h => row[h]));
        const table = autoTable(doc, {
          startY: y,
          head: [headers],
          body: rows,
        });
        y = (table as any)?.finalY + 10;
      } else {
        const content =
          typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
        const lines = doc.splitTextToSize(content, 180);
        doc.setFontSize(10);
        doc.text(lines, 10, y);
        y += lines.length * 4 + 10;
      }
    }

    doc.save('algorithm-results.pdf');
  }

}
