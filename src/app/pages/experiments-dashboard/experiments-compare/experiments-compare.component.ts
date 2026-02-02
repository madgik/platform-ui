import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Experiment } from '../../../models/experiments-dashboard.model';
import { ExperimentsDashboardService } from '../../../services/experiments-dashboard.service';
import { AlgorithmResultComponent } from '../../experiment-studio/algorithm-panel/algorithm-result/algorithm-result.component';
import { getOutputSchema } from '../../../core/algorithm-mappers';
import { ExperimentLabelService } from '../../../services/experiment-label.service';
import { EnumMaps } from '../../../core/algorithm-result-enum-mapper';

interface CompareResultState {
  loading: boolean;
  error: string | null;
  result: any | null;
}

interface CompareItem {
  exp: Experiment;
  state: CompareResultState;
}

interface CompareRow {
  index: number;
  items: CompareItem[];
}

@Component({
  selector: 'app-experiments-compare',
  standalone: true,
  imports: [CommonModule, FormsModule, AlgorithmResultComponent],
  templateUrl: './experiments-compare.component.html',
  styleUrls: ['./experiments-compare.component.css'],
})
export class ExperimentsCompareComponent {
  experiments = input<Experiment[]>([]);

  // Layout (2 or 3)
  readonly layoutCols = signal<2 | 3>(2);
  selectedLayout: 2 | 3 = 2;

  // Results map: expId -> state
  private resultMap = signal<Record<string, CompareResultState>>({});

  // Row expand: rowIndex -> expanded?
  private rowExpandedMap = signal<Record<number, boolean>>({});

  // Config collapse per exp
  private configExpandedMap = signal<Record<string, boolean>>({});

  // Labels: code -> label
  private codeToLabelSignal = signal<Record<string, string>>({});
  private enumMapsByDomain = signal<Record<string, EnumMaps>>({});

  readonly experimentsWithState = computed<CompareItem[]>(() => {
    const exps = this.experiments();
    const map = this.resultMap();
    return exps.map((exp) => ({
      exp,
      state: map[exp.id] ?? { loading: false, error: null, result: null },
    }));
  });

  readonly experimentRows = computed<CompareRow[]>(() => {
    const cols = this.layoutCols();
    const items = this.experimentsWithState();
    const rows: CompareRow[] = [];

    for (let i = 0; i < items.length; i += cols) {
      rows.push({
        index: rows.length,
        items: items.slice(i, i + cols),
      });
    }
    return rows;
  });

  constructor(
    private dashboardService: ExperimentsDashboardService,
    private labelService: ExperimentLabelService
  ) {
    effect(
      () => {
        const exps = this.experiments();
        const currentMap = this.resultMap();

        // load results for missing
        exps.forEach((exp) => {
          if (!currentMap[exp.id]) this.loadResult(exp.id);
        });

        // same domain assumption -> load labels once
        const domain = exps[0]?.domain ?? null;
        this.loadLabels(domain);
        this.loadEnumMaps(domain);
      },
      { allowSignalWrites: true }
    );
  }

  private async loadLabels(domain: string | null) {
    if (!domain) {
      this.codeToLabelSignal.set({});
      return;
    }

    // if already loaded, don't redo
    if (Object.keys(this.codeToLabelSignal()).length > 0) return;

    const map = await this.labelService.getLabelMap(domain);
    this.codeToLabelSignal.set(map);
  }

  private async loadEnumMaps(domain: string | null) {
    if (!domain) return;

    const cached = this.enumMapsByDomain()[domain];
    if (cached) return;

    const maps = await this.labelService.getEnumMaps(domain);
    this.enumMapsByDomain.update((current) => ({ ...current, [domain]: maps }));
  }


  onLayoutChange(value: number) {
    const cols: 2 | 3 = value === 3 ? 3 : 2;
    this.selectedLayout = cols;
    this.layoutCols.set(cols);
  }

  isRowExpanded(index: number): boolean {
    return this.rowExpandedMap()[index] ?? true; // default expanded
  }

  toggleRow(index: number) {
    this.rowExpandedMap.update((map) => ({
      ...map,
      [index]: !(map[index] ?? true),
    }));
  }

  isConfigExpanded(expId: string): boolean {
    return this.configExpandedMap()[expId] ?? false; // default collapsed
  }

  toggleConfig(expId: string) {
    this.configExpandedMap.update((m) => ({
      ...m,
      [expId]: !(m[expId] ?? false),
    }));
  }

  private loadResult(uuid: string) {
    this.resultMap.update((map) => ({
      ...map,
      [uuid]: { loading: true, error: null, result: null },
    }));

    this.dashboardService.getExperimentResult(uuid).subscribe({
      next: (res) => {
        this.resultMap.update((map) => ({
          ...map,
          [uuid]: {
            loading: false,
            error: null,
            result: res?.result ?? res,
          },
        }));
      },
      error: (err) => {
        console.error('Error loading experiment result for compare', err);
        this.resultMap.update((map) => ({
          ...map,
          [uuid]: {
            loading: false,
            error: 'Failed to load results.',
            result: null,
          },
        }));
      },
    });
  }

  getOutputSchemaFor(exp: Experiment) {
    return getOutputSchema(exp.algorithmName) ?? [];
  }

  private withLabels(codes: string[] | undefined | null) {
    const map = this.codeToLabelSignal();
    return (codes ?? []).map((code) => ({ code, label: map[code] ?? code }));
  }

  getVariablesWithLabels(exp: Experiment) {
    return this.withLabels((exp as any).variables);
  }

  getCovariatesWithLabels(exp: Experiment) {
    return this.withLabels((exp as any).covariates);
  }

  getFiltersWithLabels(exp: Experiment) {
    return this.withLabels((exp as any).filters);
  }

  getEnumMapsFor(exp: Experiment): EnumMaps {
    const domain = exp?.domain ?? '';
    return this.enumMapsByDomain()[domain] ?? {};
  }

  getLabelMapFor(exp: Experiment): Record<string, string> {
    return this.codeToLabelSignal();
  }

  getYVarFor(exp: Experiment): string | null {
    const vars = (exp as any)?.variables;
    if (Array.isArray(vars)) return vars[0] ?? null;
    return null;
  }

  getXVarFor(exp: Experiment): string | null {
    const vars = (exp as any)?.covariates;
    if (Array.isArray(vars)) return vars[0] ?? null;
    return null;
  }

  humanizeName(exp: Experiment | undefined | null): string {
    const name = exp?.name;
    if (!name) return 'Untitled Investigation';
    let human = name.replace(/_/g, ' ');
    if (/experiment|study|run|test/i.test(human)) {
      const algo = exp?.algorithmName || '';
      human = human.replace(/(experiment|study|run|test)\s*(\d+)?\s*(.*)?/i, (match, type, num, rest) => {
        const numPart = num ? `#${num}` : '';
        const algoPart = algo ? algo.replace(/_/g, ' ').toUpperCase() : (rest ? rest.toUpperCase() : '');
        const sep = numPart && algoPart ? ': ' : '';
        return `${numPart}${sep}${algoPart}`.trim() || human;
      });
    }
    return human.charAt(0).toUpperCase() + human.slice(1);
  }
}
