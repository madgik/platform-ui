import { SessionStorageService } from './../../../services/session-storage.service';
import { Component, inject, signal, computed, effect, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExperimentStudioService } from '../../../services/experiment-studio.service';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { buildFormControl } from '../../shared/utils/form-control.factory';
import { AlgorithmResultComponent } from './algorithm-result/algorithm-result.component';
import { getOutputSchema } from '../../../core/algorithm-mappers';
import { EchartsxModule } from 'echarts-for-angular';
import { AlgorithmConfig } from '../../../models/algorithm-definition.model';
import { PdfExportService } from '../../../services/export-results-pdf.service';
import { AlgorithmDescriptionModalComponent } from './algorithm-description-modal/algorithm-description-modal.component';
import { ErrorService } from '../../../services/error.service';
import { AuthService } from '../../../services/auth.service';


@Component({
  selector: 'app-algorithm-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AlgorithmResultComponent,
    EchartsxModule,
    AlgorithmDescriptionModalComponent
  ],
  templateUrl: './algorithm-panel.component.html',
  styleUrls: ['./algorithm-panel.component.css']
})

export class AlgorithmPanelComponent {
  pdfExport = inject(PdfExportService);
  private errorService = inject(ErrorService);
  private authService = inject(AuthService);
  Object = Object;
  experimentStudioService = inject(ExperimentStudioService);
  sessionStorage = inject(SessionStorageService);
  formBuilder = inject(FormBuilder);
  result = signal<any | null>(null);
  lastUsedAlgorithm = '';
  errorMsg = signal<string | null>(null);
  readonly isRunning = this.experimentStudioService.isRunning;

  savingName = false;
  lastExperimentUUID = this.experimentStudioService.currentExperimentUUID;
  lastSavedName = this.experimentStudioService.lastSavedName;

  descriptionModalOpen = false;
  descriptionDraft = '';

  readonly experimentName = this.experimentStudioService.experimentName;
  readonly experimentDescription = this.experimentStudioService.experimentDescription;
  readonly selectedAlgorithm = this.experimentStudioService.selectedAlgorithm;

  readonly lastUsedSchema = signal<any[]>([]);
  readonly availableAlgorithmCategories = computed(() => {
    const grouped = this.experimentStudioService.availableGroupedAlgorithms();
    return Object.entries(grouped).map(([name, algorithms]) => ({ name, algorithms }));
  });

  // UI toggle: show only enabled algorithms
  readonly showOnlyActive = signal(false);
  readonly hasAnyVisibleAlgorithms = computed(() => {
    return this.filteredAlgorithmCategories().some(c => c.algorithms?.length > 0);
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
      const x = this.experimentStudioService.selectedCovariates();
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
      const groups = this.experimentStudioService.availableGroupedAlgorithms();
      if (!groups) return;
      this.availableAlgorithmCategories();
    });

    effect(() => {
      const algorithm = this.selectedAlgorithm();
      const schema = this.enrichedConfigSchema();

      if (!algorithm) {
        // if no algorithm,clean form
        this.configForm = new FormGroup({});
        return;
      }

      const allConfigs = this.experimentStudioService.algorithmConfigurations();
      const stored = allConfigs?.[algorithm.name] || {};

      const group: { [key: string]: FormControl } = {};

      schema.forEach((field) => {
        // backend default
        let backendDefault =
          field.default !== undefined ? field.default : null;
        const storedValue = stored?.[field.key];

        // special treatment for alpha
        if ((backendDefault === null || backendDefault === undefined) && field.key === 'alpha') {
          backendDefault = 0.05;
        }

        // fallback value logic
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

        // label if missing
        const label =
          field.label && field.label.trim() !== ''
            ? field.label
            : this.prettifyLabel(field.key);

        const prettyField = {
          ...field,
          label,
          desc: field.desc ?? field.description ?? '',
        };

        const control = buildFormControl(prettyField, fallback);

        // extra validation: integer-only for numeric fields
        const isNumeric = prettyField.type === 'number';
        const allowsDecimal =
          prettyField.key === 'alpha' ||
          prettyField.key === 'tol' ||
          prettyField.key === 'mu';

        if (isNumeric && !allowsDecimal) {
          const integerPattern = Validators.pattern(/^-?\d+$/);
          const existingValidator = control.validator;

          control.setValidators(
            existingValidator ? [existingValidator, integerPattern] : [integerPattern]
          );

          // stop events while building form
          control.updateValueAndValidity({ emitEvent: false });
        }

        group[field.key] = control;
      });

      this.configForm = new FormGroup(group, { updateOn: 'change' });

      Object.values(this.configForm.controls).forEach(control => {
        if (control.valid) {
          control.markAsTouched({ onlySelf: true });
        }
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
      }
    });
  }


  configForm: FormGroup = new FormGroup({});
  formKey = 0;

  enrichedConfigSchema = computed(() => {
    const algorithm = this.selectedAlgorithm();
    if (!algorithm) return [];

    // Basic algorithm schema (shallow copy)
    const schema = (algorithm.configSchema ?? []).map(f => ({ ...f }));

    const yVar = this.experimentStudioService.selectedVariables()[0];
    const xVar = this.experimentStudioService.selectedCovariates()[0];

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

  onExperimentNameChange(value: string) {
    this.experimentStudioService.setExperimentName(value);
  }

  openDescriptionModal() {
    this.descriptionDraft = this.experimentStudioService.experimentDescription() ?? '';
    this.descriptionModalOpen = true;
  }

  closeDescriptionModal() {
    this.descriptionModalOpen = false;
  }

  onDescriptionDraftChange(value: string) {
    this.descriptionDraft = value ?? '';
  }

  saveDescriptionFromModal(desc: string) {
    this.experimentStudioService.setExperimentDescription(desc);

    const uuid = this.experimentStudioService.getCurrentExperimentUUID();
    if (uuid) {
      this.experimentStudioService.patchExperimentDescription(uuid, desc).subscribe({
        next: () => { },
        error: (e) => console.error('Patch description failed', e),
      });
    }

    this.closeDescriptionModal();
  }


  readonly filteredAlgorithmCategories = computed(() => {
    const grouped = this.experimentStudioService.availableGroupedAlgorithms();
    const onlyActive = this.showOnlyActive();

    const entries = Object.entries(grouped ?? {}).map(([name, algorithms]) => {
      const filtered = onlyActive
        ? algorithms.filter(a => !a.isDisabled)
        : algorithms;

      return { name, algorithms: filtered };
    });

    return onlyActive ? entries.filter(c => c.algorithms.length > 0) : entries;
  });

  readonly algoCounts = computed(() => {
    const grouped = this.experimentStudioService.availableGroupedAlgorithms();
    const all = Object.values(grouped ?? {}).flat();
    const active = all.filter(a => !a.isDisabled);
    return { all: all.length, active: active.length };
  });

  toggleActiveOnly() {
    this.showOnlyActive.update(v => !v);
  }

  saveExperimentName() {
    const newName = this.experimentStudioService.experimentName();
    const uuid = this.lastExperimentUUID();

    if (!uuid) {
      console.warn('No experiment UUID available – run the experiment at least once.');
      return;
    }

    if (!newName?.trim()) return;

    this.savingName = true;

    this.experimentStudioService.updateExperimentName(uuid, newName)
      .subscribe({
        next: () => {
          this.experimentStudioService.setLastSavedName(newName);
          this.savingName = false;
          this.showSaveToast();
        },
        error: (err) => {
          console.error('Failed to update name:', err);
          this.savingName = false;
        }
      });
  }

  showSaveToast() {
    alert('Experiment name updated!');
  }

  readonly experimentInfo = computed(() => {
    const selected = this.experimentStudioService.selectedAlgorithm();
    const lastRunName =
      this.experimentStudioService.lastUsedAlgorithm() || this.lastUsedAlgorithm;

    const algoName = selected?.name || lastRunName || null;

    const algoCatalog = this.experimentStudioService.backendAlgorithms();
    const algoMeta = algoName ? algoCatalog[algoName] : null;

    const displayLabel = selected?.label || algoMeta?.label || algoName || 'N/A';
    const defaultName = `Experiment for ${displayLabel}`;

    const allConfigs = this.experimentStudioService.algorithmConfigurations();
    const configs =
      (algoName && allConfigs[algoName]) || {};

    return {
      experimentName: this.experimentStudioService.getExperimentNameOrDefault(defaultName),
      datasets: this.experimentStudioService.selectedDatasets(),
      variables: this.experimentStudioService.selectedVariables(),
      covariates: this.experimentStudioService.selectedCovariates(),
      filters: this.experimentStudioService.selectedFilters(),
      algorithmConfigs: configs,
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
    return this.experimentStudioService.selectedVariables();
  }

  get selectedCovariates() {
    return this.experimentStudioService.selectedCovariates();
  }

  openCategories: string[] = [];
  infoPanelOpen = false;
  tooltipVisible = false;
  tooltipPosition = { x: 0, y: 0 };
  tooltipData: any = null;

  selectAlgorithm(algorithm: AlgorithmConfig) {
    // Use service method so it enriches configSchema and persists to sessionStorage
    this.experimentStudioService.setAlgorithm(algorithm);
    this.errorMsg.set(null);
  }

  onAlgorithmClick(algorithm: AlgorithmConfig) {
    if (algorithm.isDisabled) {
      console.log(
        '[AlgorithmPanel] click on disabled algorithm blocked:',
        algorithm.name
      );
      return;
    }

    this.selectAlgorithm(algorithm);
  }

  onClickRunExp() {
    this.errorMsg.set(null);
    this.errorService.clearError();

    // algorithm does not run if form is invalid
    if (this.configForm && this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      console.warn('[AlgorithmPanel] Run blocked – configForm invalid');
      return;
    }

    const algo = this.experimentStudioService.selectedAlgorithm();
    this.experimentStudioService.setRunning(true);

    if (!algo) {
      console.error('No algorithm selected in service.');
      this.errorService.setError('Please choose an algorithm before running.');
      this.experimentStudioService.setRunning(false);
      return;
    }

    this.experimentStudioService.lastUsedAlgorithm.set(algo.name);
    this.errorMsg.set(null);

    const configValues = this.configForm.getRawValue();
    this.updateAlgorithmConfiguration(algo.name, '', configValues); // or:
    this.experimentStudioService.algorithmConfigurations.set({
      ...this.experimentStudioService.algorithmConfigurations(),
      [algo.name]: configValues
    });

    const result$ = this.experimentStudioService.runSelectedAlgorithm();
    if (!result$) {
      this.errorService.setError('Unable to start the run. Check your selections.');
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
        this.errorService.setError(msg);
        this.experimentStudioService.setRunning(false);
        return;
      }

      const algoLabel = algo.label ?? algo.name ?? 'N/A';
      const defaultName = `Experiment for ${algoLabel}`;

      const finalName = this.experimentStudioService.getExperimentNameOrDefault(defaultName);

      // sync name after first run
      this.experimentStudioService.setExperimentName(finalName);
      this.experimentStudioService.setLastSavedName(finalName);

      const schema = getOutputSchema(algo?.name ?? '') ?? [];
      this.result.set({
        ...res?.result ?? { message: "No result returned" },
      });
      this.lastUsedAlgorithm = algo.name;
      this.lastUsedSchema.set(schema);
      this.selectedAlgorithm.set(null);
      this.experimentStudioService.setRunning(false);
    });

  }

  isRunButtonDisabled(): boolean {
    const algo = this.selectedAlgorithm();

    // if no algorithm -> disabled
    if (!algo) return true;

    // if experiment running -> disabled
    if (this.isRunning()) return true;

    // shouldn't run through here. safety
    if (
      algo.name === 'multiple_histograms' ||
      algo.name === 'descriptive_stats'
    ) {
      return true;
    }

    if (this.configForm && Object.keys(this.configForm.controls).length > 0) {
      return this.configForm.invalid;
    }

    return false;
  }

  updateAlgorithmConfiguration(algorithmName: string | undefined, key: string, value: any) {
    if (!algorithmName) return;

    const config = this.experimentStudioService.algorithmConfigurations();

    if (!config[algorithmName]) {
      config[algorithmName] = {};
    }

    config[algorithmName][key] = value;
    this.experimentStudioService.algorithmConfigurations.set({ ...config });
  }

  isAlgorithmAvailable(algorithm: string): boolean {
    return this.experimentStudioService.isAlgorithmAvailable(algorithm);
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

  onExportResult(section: HTMLElement) {
    const result = this.result();
    if (!section || !result) {
      console.warn('No result or element to export');
      return;
    }

    const info = this.experimentInfo();
    const algoKey =
      this.lastUsedAlgorithm ||
      this.experimentStudioService.lastUsedAlgorithm() ||
      this.experimentStudioService.selectedAlgorithm()?.name ||
      'experiment';

    const algoLabel =
      this.experimentStudioService.selectedAlgorithm()?.label ||
      this.experimentStudioService.selectedAlgorithm()?.name ||
      algoKey;

    const currentUser = this.authService.currentUser;
    const createdBy =
      currentUser?.fullname || currentUser?.username || currentUser?.email || null;

    const filename =
      this.experimentStudioService.getExperimentNameOrDefault(
        `results_${algoKey}`
      );

    this.pdfExport.exportExperimentPdf({
      filename,
      details: {
        experimentName: info.experimentName,
        createdBy,
        createdAt: new Date(),
        algorithm: algoLabel,
        params: info.algorithmConfigs,
        preprocessing: 'none',
        domain: this.experimentStudioService.selectedDataModel()?.code ?? null,
        datasets: info.datasets ?? [],
        variables: (info.variables ?? []).map((v: any) => v.label || v.name || v.code),
        covariates: (info.covariates ?? []).map((c: any) => c.label || c.name || c.code),
        filters: (info.filters ?? []).map((f: any) => f.label || f.name || f.code),
      },
      algorithmKey: algoKey,
      result,
      chartContainer: section,
    });
  }
}
