import { SessionStorageService } from './../../../services/session-storage.service';
import { Component, Output, EventEmitter, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionComponent } from '../../shared/accordion/accordion.component';
import { AlgorithmConfig, ExperimentStudioService } from '../../../services/experiment-studio.service';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { buildFormControl } from '../../shared/utils/form-control.factory';
import { AlgorithmResultComponent } from './algorithm-result/algorithm-result.component';
import { getOutputSchema } from '../../../core/algorithm-mappers';
import { EchartsxModule } from 'echarts-for-angular';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';

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

  readonly lastUsedSchema = signal<any[]>([]);
  readonly availableAlgorithmCategories = computed(() => {
    // console.log("I recalculated in algorithm panel");
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
      this.experimentService.availableGroupedAlgorithms();
      this.availableAlgorithmCategories();
      // console.log('✅ Available algorithms:', available);
    });

    effect(() => {
      const algorithm = this.selectedAlgorithm();
      const schema = this.enrichedConfigSchema();

      if (!algorithm) return;

      const stored = this.experimentService.algorithmConfigurations()[algorithm.name];
      const group: { [key: string]: FormControl } = {};

      schema.forEach((field) => {
        let backendDefault = field.default ?? null;
        const storedValue = stored?.[field.key];

        if (!backendDefault && field.key === 'alpha') {
          backendDefault = 0.05;
        }

        const value =
          stored?.[field.key] ??
          field.default ??                 // backend default
          this.uiDefaults[field.key] ??    // or sensible default
          (field.type === 'checkbox' ? false : '');

        group[field.key] = buildFormControl(field, value);

        const fallback =
          backendDefault ??
          storedValue ??
          (field.type === 'number' && field.min !== undefined ? field.min : '') ??
          (field.type === 'checkbox' ? false : '');

        // If lable is null from backend -> prettify
        const label =
          field.label && field.label.trim() !== ''
            ? field.label
            : this.prettifyLabel(field.key);

        const prettyField = { ...field, label };
        group[field.key] = buildFormControl(prettyField, fallback);
      });

      this.configForm = new FormGroup(group);
      this.formKey++;

      // console.log('[Reactive Config] algorithm:', algorithm.name);
      // console.log('[Reactive Config] enriched schema:', schema);
      // console.log('[Reactive Config] variables:', this.experimentService.getVariables());
    });
    effect(() => {
      const res = this.result();
      const schema = this.outputSchema();

      if (!res || !schema.length) return;

      const missing = schema.filter(field => !(field.key in res));
      if (missing.length > 0) {
        console.warn('[🟡 Validation] Missing fields from result:', missing.map(f => f.key));
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

    // Δούλευε πάντα πάνω σε shallow copy
    let schema = (algorithm.configSchema || []).map(f => ({ ...f }));

    // ✅ Inject "alt_hypothesis" για όλα τα t-test αν λείπει
    if (algorithm.name.startsWith('ttest_') && !schema.some(f => f.key === 'alt_hypothesis')) {
      schema = [
        {
          key: 'alt_hypothesis',
          type: 'select',
          label: 'Alternative Hypothesis',
          options: ['two-sided', 'less', 'greater'],
          default: 'two-sided',
          description:
            'The alternative hypothesis to the null (two-sided, less, greater).',
        },
        ...schema
      ];
    }

    // select with placeholder options y or x, use enums from variable
    const enumsByCode = this.experimentService.getVariableEnumerations();

    const selectedY = this.experimentService.selectedVariables();
    const selectedX = this.experimentService.selectedCovariates();

    const yOne = selectedY.length === 1 ? selectedY[0] : null;
    const xOne = selectedX.length === 1 ? selectedX[0] : null;

    schema = schema.map(field => {
      if (field.type !== 'select') return field;

      // 1) Ρητό placeholder από backend (['y'] ή ['x'])
      if (Array.isArray(field.options) && field.options.length === 1) {
        const tag = field.options[0];
        if (tag === 'y' && yOne) {
          return { ...field, options: [...(enumsByCode[yOne.code] ?? [])] };
        }
        if (tag === 'x' && xOne) {
          return { ...field, options: [...(enumsByCode[xOne.code] ?? [])] };
        }
      }

      // 2) Άδειο options: για select fields πάμε default -> από Y (όπως positive_class)
      if (!field.options || field.options.length === 0) {
        if (yOne) {
          return { ...field, options: [...(enumsByCode[yOne.code] ?? [])] };
        }
      }

      return field;
    });

    return schema;
  });

  readonly outputSchema = computed(() =>
    getOutputSchema(this.selectedAlgorithm()?.name ?? '') ?? []
  );

  readonly experimentInfo = computed(() => {
    const algo = this.experimentService.selectedAlgorithm();
    return {
      experimentName: `Experiment for ${algo?.label ?? algo?.name ?? 'N/A'}`,
      datasets: ["CHUV", "EDSD", "PPMI"], // κάν' το dynamic όταν θελήσεις
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
  }

  onClickRunExp() {
    const algo = this.experimentService.selectedAlgorithm();

    if (!algo) {
      console.error('No algorithm selected in service.');
      return;
    }

    this.experimentService.lastUsedAlgorithm.set(algo.name);
    this.isRunning.set(true);

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
      const schema = getOutputSchema(algo?.name ?? '') ?? [];
      console.log("algo.name: ", algo.name);
      this.result.set({
        ...res?.result ?? { message: "No result returned" },
        // _algorithm: algo.name
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
    console.log("I called this!");

    return this.experimentService.isAlgorithmAvailable(algorithm);
  }

  toggleInfoPanel() {
    this.infoPanelOpen = !this.infoPanelOpen;
  }

  showTooltip(algorithm: any, event: MouseEvent) {
    this.tooltipVisible = true;
    this.tooltipData = algorithm;
    this.tooltipPosition = { x: event.clientX + 15, y: event.clientY + 15 };
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

  // Helper functions

  getOptionsForField(fieldKey: string): { value: string; label: string }[] {
    const algorithm = this.selectedAlgorithm();
    if (!algorithm) return [];

    const schemaField = this.enrichedConfigSchema().find((f) => f.key === fieldKey);
    if (!schemaField || schemaField.type !== 'select') return [];

    const selectedVars = this.experimentService.selectedVariables();
    const selectedCovars = this.experimentService.selectedCovariates();

    // static choices e.g. two-sided/less/greater
    if (
      Array.isArray(schemaField.options) &&
      schemaField.options.length > 0 &&
      !(schemaField.options.length === 1 && ['x', 'y'].includes(schemaField.options[0]))
    ) {
      return schemaField.options.map((opt: string) => ({ value: opt, label: opt }));
    }

    // y variable enumerations
    if (Array.isArray(schemaField.options) && schemaField.options[0] === 'y') {
      if (selectedVars.length === 1) {
        const onlyVar = selectedVars[0];
        const enumValues = this.experimentService.variableEnumerations[onlyVar.code] || [];
        return enumValues.map((e) => ({ value: e, label: e }));
      }
    }

    // x variable enumerations for groupA and groupB (t-test specific)
    if (['groupA', 'groupB'].includes(fieldKey)) {
      if (selectedCovars.length === 1) {
        const onlyCov = selectedCovars[0];
        const enumValues = this.experimentService.variableEnumerations[onlyCov.code] || [];
        return enumValues.map((e) => ({ value: e, label: e }));
      }
    }

    // Fallback behaviour
    if (selectedVars.length === 1) {
      const onlyVar = selectedVars[0];
      const enumValues = this.experimentService.variableEnumerations[onlyVar.code] || [];
      console.log('🎯 getOptionsForField', {
        fieldKey,
        onlyVarCode: onlyVar.code,
        enums: this.experimentService.variableEnumerations
      });
      return enumValues.map((e) => ({ value: e, label: e }));
    }
    return [];
  }

  getOptionValue(opt: any): string {
    return typeof opt === 'string' ? opt : opt.value;
  }

  getOptionLabel(opt: any): string {
    return typeof opt === 'string' ? opt : opt.label ?? opt.value;
  }
}
