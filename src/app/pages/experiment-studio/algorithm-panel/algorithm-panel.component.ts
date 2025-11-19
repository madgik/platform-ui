import { SessionStorageService } from './../../../services/session-storage.service';
import { Component, Output, EventEmitter, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionComponent } from '../../shared/accordion/accordion.component';
import { ExperimentStudioService } from '../../../services/experiment-studio.service';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { buildFormControl } from '../../shared/utils/form-control.factory';
import { AlgorithmResultComponent } from './algorithm-result/algorithm-result.component';
import { getOutputSchema } from '../../../core/algorithm-mappers';
import { EchartsxModule } from 'echarts-for-angular';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';
import { AlgorithmConfig } from '../../../models/algorithm-definition.model';

@Component({
  selector: 'app-algorithm-panel',
  standalone: true,
  imports: [
    CommonModule,
    AccordionComponent,
    FormsModule,
    ReactiveFormsModule,
    AlgorithmResultComponent,
    EchartsxModule,
    SpinnerComponent
  ],
  templateUrl: './algorithm-panel.component.html',
  styleUrls: ['./algorithm-panel.component.css']
})

export class AlgorithmPanelComponent {
  @Output() algorithmConfigured = new EventEmitter<string>();
  Object = Object;
  experimentService = inject(ExperimentStudioService);
  sessionStorage = inject(SessionStorageService);
  formBuilder = inject(FormBuilder);
  result = signal<any | null>(null);
  lastUsedAlgorithm = '';
  isRunning = signal(false);
  errorMsg = signal<string | null>(null);


  readonly lastUsedSchema = signal<any[]>([]);
  readonly availableAlgorithmCategories = computed(() => {
    const grouped = this.experimentService.availableGroupedAlgorithms();
    return Object.entries(grouped).map(([name, algorithms]) => ({ name, algorithms }));
  });

  prettifyLabel(label: string): string {
    if (!label) return '';
    return label
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  prettyFieldLabel(field: any): string {
    let base = field.label ?? field.key;
    if ((field.key === 'groupA' || field.key === 'groupB')) {
      const x = this.experimentService.selectedCovariates();
      if (x.length === 1) {
        const cov = x[0];
        const covName = cov?.label || cov?.name || cov?.code;
        if (covName) base = `${base} (${covName})`;
      }
    }
    return base;
  }

  // sensible defaults
  private readonly uiDefaults: Record<string, any> = {
    alpha: 0.05,
    alt_hypothesis: 'two-sided',
    mu: 0.0,
    n_splits: 5,
    k: 4,
    tol: 0.01,
  };

  constructor() {
    effect(() => {
      const groups = this.experimentService.availableGroupedAlgorithms();
      if (!groups) return;
      this.availableAlgorithmCategories();
    });

    effect(() => {
      const algorithm = this.selectedAlgorithm();
      const schema = this.enrichedConfigSchema();

      if (!algorithm) return;

      const stored = this.experimentService.algorithmConfigurations()[algorithm.name];
      const group: { [key: string]: FormControl } = {};

      schema.forEach((field) => {
        let backendDefault = field.default !== undefined ? field.default : null;
        const storedValue = stored?.[field.key];

        if (!backendDefault && field.key === 'alpha') {
          backendDefault = 0.05;
        }

        const value =
          stored?.[field.key] ??
          field.default ??                 // backend default
          this.uiDefaults[field.key] ??    // or sensible default
          (field.type === 'checkbox' ? false : '');

        const fallback =
          storedValue !== undefined
            ? storedValue
            : field.default !== undefined && field.default !== null
              ? field.default
              : backendDefault !== undefined && backendDefault !== null
                ? backendDefault
                : this.uiDefaults[field.key] !== undefined
                  ? this.uiDefaults[field.key]
                  : field.type === 'checkbox'
                    ? false
                    : '';


        // If lable is null from backend -> prettify
        const label =
          field.label && field.label.trim() !== ''
            ? field.label
            : this.prettifyLabel(field.key);

        // Preserve label, inject desc if present
        const prettyField = {
          ...field,
          label,
          desc: field.desc ?? field.description ?? '',
        };
        group[field.key] = buildFormControl(prettyField, fallback);

      });

      this.configForm = new FormGroup(group, { updateOn: 'change' });

      Object.values(this.configForm.controls).forEach(control => {
        // If default is in place, turn it green
        if (control.valid) control.markAsTouched({ onlySelf: true });
      });
      this.formKey++;
    });
    effect(() => {
      const res = this.result();
      const schema = this.outputSchema();

      if (!res || !schema.length) return;

      const missing = schema.filter(field => !(field.key in res));
      if (missing.length > 0) {
        console.warn('[Validation] Missing fields from result:', missing.map(f => f.key));
      } else {
        // console.log('[Validation] All schema fields present in result');
      }
    });
  }

  accordionTitle = 'Algorithm Selection & Configuration';

  configForm: FormGroup = new FormGroup({});
  formKey = 0;

  selectedAlgorithm = signal<AlgorithmConfig | null>(
    this.sessionStorage.getItem('selectedAlgorithm') ?? null
  );

  enrichedConfigSchema = computed(() => {
    const algorithm = this.selectedAlgorithm();
    if (!algorithm) return [];

    // Basic algorithm schema (shallow copy)
    const schema = (algorithm.configSchema ?? []).map(f => ({ ...f }));

    const yVar = this.experimentService.selectedVariables()[0];
    const xVar = this.experimentService.selectedCovariates()[0];

    return schema.map(field => {
      let options = field.options ?? [];

      // Placeholder substitution for enums
      if (Array.isArray(options) && options.length === 1) {
        const placeholder = options[0];

        if (placeholder === 'y' && yVar?.enumerations?.length) {
          options = [...yVar.enumerations];
        } else if (placeholder === 'x' && xVar?.enumerations?.length) {
          options = [...xVar.enumerations];
        }
      }

      // Fallback for empty select fields
      if (
        field.type === 'select' &&
        (!options || options.length === 0) &&
        yVar?.enumerations?.length
      ) {
        options = [...yVar.enumerations];
      }

      // Normalize label and desc
      const label = field.label?.trim() || this.prettifyLabel(field.key);
      const desc = field.desc ?? field.description ?? '';

      // Return enriched field
      return { ...field, label, desc, options };
    });
  });

  readonly outputSchema = computed(() =>
    getOutputSchema(this.selectedAlgorithm()?.name ?? '') ?? []
  );

  readonly experimentInfo = computed(() => {
    const algo = this.experimentService.selectedAlgorithm();
    return {
      experimentName: `Experiment for ${algo?.label ?? algo?.name ?? 'N/A'}`,
      datasets: this.experimentService.selectedDatasets(),
      variables: this.experimentService.selectedVariables(),
      covariates: this.experimentService.selectedCovariates(),
      filters: this.experimentService.selectedFilters(),
      algorithmConfigs: (algo && this.experimentService.algorithmConfigurations()[algo.name]) || {},
    };
  });

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  prettifyKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }


  get selectedVariables() {
    return this.experimentService.selectedVariables();
  }

  get selectedCovariates() {
    return this.experimentService.selectedCovariates();
  }

  openCategories: string[] = [];
  infoPanelOpen = false;
  tooltipVisible = false;
  tooltipPosition = { x: 0, y: 0 };
  tooltipData: any = null;

  selectAlgorithm(algorithm: AlgorithmConfig) {
    this.experimentService.selectedAlgorithm.set(algorithm);
    this.selectedAlgorithm.set(algorithm);
    this.algorithmConfigured.emit(algorithm.name);
    this.errorMsg.set(null);
  }

  onClickRunExp() {
    this.errorMsg.set(null);
    const algo = this.experimentService.selectedAlgorithm();

    if (!algo) {
      console.error('No algorithm selected in service.');
      return;
    }

    this.experimentService.lastUsedAlgorithm.set(algo.name);
    this.isRunning.set(true);
    this.errorMsg.set(null);

    const configValues = this.configForm.getRawValue();
    this.updateAlgorithmConfiguration(algo.name, '', configValues); // or:
    this.experimentService.algorithmConfigurations.set({
      ...this.experimentService.algorithmConfigurations(),
      [algo.name]: configValues
    });

    const result$ = this.experimentService.runSelectedAlgorithm();
    if (!result$) {
      this.isRunning.set(false);
      return;
    }

    result$.subscribe(res => {
      const status = res?.status;
      const payload = res?.result ?? {};
      if (status === 'error') {
        // backend error message
        const msg =
          payload?.data ||
          payload?.message ||
          'The server returned an error for this run.';
        this.errorMsg.set(msg);
        this.isRunning.set(false);
        return;
      }
      const schema = getOutputSchema(algo?.name ?? '') ?? [];
      console.log("algo.name: ", algo.name);
      this.result.set({
        ...res?.result ?? { message: "No result returned" },
      });
      this.lastUsedAlgorithm = algo.name;
      this.lastUsedSchema.set(schema);
      this.selectedAlgorithm.set(null);
      this.isRunning.set(false);
    });

  }

  updateAlgorithmConfiguration(algorithmName: string | undefined, key: string, value: any) {
    if (!algorithmName) return;

    const config = this.experimentService.algorithmConfigurations();

    if (!config[algorithmName]) {
      config[algorithmName] = {};
    }

    config[algorithmName][key] = value;
    this.experimentService.algorithmConfigurations.set({ ...config });
  }

  isAlgorithmAvailable(algorithm: string): boolean {
    return this.experimentService.isAlgorithmAvailable(algorithm);
  }

  toggleInfoPanel() {
    this.infoPanelOpen = !this.infoPanelOpen;
  }

  showTooltip(algorithm: any, event: MouseEvent) {
    event.stopPropagation();
    this.tooltipVisible = true;
    this.tooltipData = algorithm;
    this.tooltipPosition = { x: event.clientX + 15, y: event.clientY + 15 };

    if (algorithm.isDisabled) {
      this.tooltipData = {
        ...algorithm,
        description: `${algorithm.description || 'No description available.'}<br><span class='unavailable-warning'> This algorithm is currently unavailable for the selected variables.</span><br>`,
      };
    }
  }

  hideTooltip() {
    this.tooltipVisible = false;
  }

  isCategoryOpen(category: string): boolean {
    return this.openCategories.includes(category);
  }

  toggleCategory(category: string): void {
    if (this.isCategoryOpen(category)) {
      this.openCategories = this.openCategories.filter((cat) => cat !== category);
    } else {
      this.openCategories.push(category);
    }
  }
}
