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
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    let y = 40;

    doc.setFontSize(16);
    doc.text(`Algorithm: ${this.algorithm}`, 40, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, y);
    y += 20;

    for (const field of this.schema) {
      const key = field.key;
      const data = this.result?.[key];
      if (!data) continue;

      doc.setFontSize(12);
      doc.text(field.label || key, 40, y);
      y += 6;

      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        const headers = Object.keys(data[0]);
        const rows = data.map((r: any) => headers.map(h => r[h]));
        autoTable(doc, {
          startY: y,
          head: [headers],
          body: rows,
          margin: { left: 40, right: 40 },
          styles: { fontSize: 8 },
        });
        y = (doc as any).lastAutoTable.finalY + 15;
      } else {
        const text = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
        const lines = doc.splitTextToSize(text, 500);
        doc.text(lines, 40, y);
        y += lines.length * 10 + 10;
      }
    }

    doc.save(`${this.algorithm}_results.pdf`);
  }
}
