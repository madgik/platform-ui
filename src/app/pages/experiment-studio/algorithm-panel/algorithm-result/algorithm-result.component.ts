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

}
