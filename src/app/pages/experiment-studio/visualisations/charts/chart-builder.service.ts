import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { AlgorithmChartRegistry } from './chart-registry';
import { ExperimentStudioService } from '../../../../services/experiment-studio.service';
import 'echarts-gl';

function getByPath(obj: any, path: string): any {
  if (!path) return obj;
  return path.split('.').reduce((o, key) => o?.[key], obj);
}

@Injectable({ providedIn: 'root' })
export class ChartBuilderService {
  constructor(private experimentService: ExperimentStudioService) {}

  getChartsForAlgorithm(algorithm: string, result: any): EChartsOption[] {
    const config = AlgorithmChartRegistry[algorithm] || AlgorithmChartRegistry['default'];

    // raw input
    const input = getByPath(result, config.inputPath);

    // enrich with display names
    const enrichedInput = this.enrichLabels(input);

    return config.build(enrichedInput);
  }

  private enrichLabels(input: any): any {
    if (!input) return input;

    const variables = this.experimentService.selectedVariables();
    const covariates = this.experimentService.selectedCovariates();
    const filters = this.experimentService.selectedFilters();

    const replaceLabel = (raw: string) => {
      const match =
        variables.find(v => v.code === raw) ||
        covariates.find(c => c.code === raw) ||
        filters.find(f => f.code === raw);

      return match?.name || raw;
    };

    if (input?.anova_table) {
      return {
        ...input,
        anova_table: {
          ...input.anova_table,
          x_label: replaceLabel(input.anova_table.x_label),
          y_label: replaceLabel(input.anova_table.y_label),
        }
      };
    }

    if (typeof input === 'object' && !Array.isArray(input)) {
      return Object.fromEntries(
        Object.entries(input).map(([k, v]) => [k, this.enrichLabels(v)])
      );
    }

    if (Array.isArray(input)) {
      return input.map(v => this.enrichLabels(v));
    }

    return input;
  }
}
