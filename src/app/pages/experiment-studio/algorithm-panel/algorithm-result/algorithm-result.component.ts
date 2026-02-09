import { ChartBuilderService } from './../../visualisations/charts/chart-builder.service';
import { Component, input, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutoRendererComponent } from '../../visualisations/auto-renderer/auto-renderer.component';
import { ChartRendererComponent } from '../../visualisations/charts/charts-renderer/charts-renderer.component';
import { EChartsOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';
import { EnumMaps, LabelMap, mapAlgorithmResultEnums } from '../../../../core/algorithm-result-enum-mapper';

@Component({
    selector: 'app-algorithm-result',
    imports: [CommonModule,
        AutoRendererComponent,
        ChartRendererComponent,
        NgxEchartsModule],
    templateUrl: './algorithm-result.component.html',
    styleUrls: ['./algorithm-result.component.css']
})
export class AlgorithmResultComponent {
  result = input<any>(null);
  schema = input<any[]>([]);
  algorithm = input.required<string>();
  enumMaps = input<EnumMaps | null>(null);
  yVar = input<string | null>(null);
  xVar = input<string | null>(null);
  labelMap = input<LabelMap | null>(null);

  constructor(private chartBuilder: ChartBuilderService) { }

  errorMessage = computed(() => {
    if (!this.result()) return null;
    if (this.result()?.status === 'error') {
      return this.result()?.error || this.result()?.message || 'An error occurred.';
    }
    return this.result()?.error ?? null;
  });

  isRenderable = computed(() => {
    return !!this.result() && !!this.algorithm() && !this.errorMessage();
  });

  mappedResult = computed(() =>
    this.errorMessage()
      ? this.result()
      : mapAlgorithmResultEnums(this.algorithm(), this.result(), this.enumMaps(), {
        y: this.yVar(),
        x: this.xVar(),
      }, this.labelMap())
  );

  chartOptions = computed<EChartsOption[]>(() =>
    this.errorMessage()
      ? []
      : this.chartBuilder.getChartsForAlgorithm(
        this.algorithm(),
        this.mappedResult()
      )
  );

  renderedCharts = computed(() => {
    if (!this.result() || !this.algorithm() || this.errorMessage()) return [];
    return this.chartBuilder.getChartsForAlgorithm(this.algorithm(), this.mappedResult());
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
