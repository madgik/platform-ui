import { SessionStorageService } from './../../../services/session-storage.service';
import { Component, Output, EventEmitter, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionComponent } from '../../shared/accordion/accordion.component';
import { AlgorithmConfig, ExperimentStudioService } from '../../../services/experiment-studio.service';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { buildFormControl } from '../../shared/utils/form-control.factory';

@Component({
  selector: 'app-algorithm-panel',
  standalone: true,
  imports: [
    CommonModule,
    AccordionComponent,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './algorithm-panel.component.html',
  styleUrls: ['./algorithm-panel.component.css']
})
export class AlgorithmPanelComponent {
  Object = Object;
  experimentService = inject(ExperimentStudioService);
  sessionStorage = inject(SessionStorageService);
  formBuilder = inject(FormBuilder);
  result = signal<any | null>(null);

  accordionTitle = 'Algorithm Selection & Configuration';
  @Output() algorithmConfigured = new EventEmitter<string>();

  configForm: FormGroup = new FormGroup({});
  formKey = 0;

  selectedAlgorithm = signal<AlgorithmConfig | null>(
    this.sessionStorage.getItem('selectedAlgorithm') ?? null
  );

  enrichedConfigSchema = computed(() => {
    const algorithm = this.selectedAlgorithm();
    if (!algorithm) return [];

    return (algorithm.configSchema || []).map((field) => {
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        const selectedVars = this.experimentService.getVariables();
        if (selectedVars.length === 1) {
          const onlyVar = selectedVars[0];
          const currentEnums = this.experimentService.getVariableEnumerations();
          const enumOptions = currentEnums[onlyVar.code] ?? [];

          return { ...field, options: enumOptions };
        }
      }
      return field;
    });
  });

  constructor() {
    effect(() => {
      const algorithm = this.selectedAlgorithm();
      const schema = this.enrichedConfigSchema();

      if (!algorithm) return;

      const stored = this.experimentService.algorithmConfigurations()[algorithm.name];
      const group: { [key: string]: FormControl } = {};

      schema.forEach((field) => {
        const value = stored?.[field.key] ?? (field.type === 'checkbox' ? false : '');
        group[field.key] = buildFormControl(field, value);
      });

      this.configForm = new FormGroup(group);
      this.formKey++;

      // console.log('[Reactive Config] algorithm:', algorithm.name);
      // console.log('[Reactive Config] enriched schema:', schema);
      // console.log('[Reactive Config] variables:', this.experimentService.getVariables());
    });
  }

  get selectedVariables() {
    return this.experimentService.getVariables();
  }

  get selectedCovariates() {
    return this.experimentService.getCovariates();
  }

  openCategories: string[] = [];
  infoPanelOpen = false;
  tooltipVisible = false;
  tooltipPosition = { x: 0, y: 0 };
  tooltipData: any = null;

  algorithmCategories = computed(() => {
    const grouped: Record<string, AlgorithmConfig[]> = {};
    Object.values(this.experimentService.backendAlgorithms()).forEach((algo: any) => {
      const category = algo.category || 'Other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(algo);
    });
    return Object.entries(grouped).map(([name, algorithms]) => ({ name, algorithms }));
  });

  selectAlgorithm(algorithm: AlgorithmConfig) {
    this.experimentService.setAlgorithm(algorithm);
    this.selectedAlgorithm.set(algorithm);
    this.algorithmConfigured.emit(algorithm.name);
  }

  onClickRunExp() {
    const result$ = this.experimentService.runSelectedAlgorithm();
    if (!result$) return;

    result$.subscribe(res => {
      console.log('[Algorithm Result]', res);
      this.result.set(res?.result ?? { message: "No result returned" });
      this.selectedAlgorithm.set(null); // Clear algorithm after run
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
    if (!schemaField) return [];

    // schemaField has predefined static options
    // if (
    //   Array.isArray(schemaField.options) &&
    //   schemaField.options.length > 0 &&
    //   !(schemaField.options.length === 1 && schemaField.options[0] === 'y')
    // ) {
    //   return schemaField.options.map((opt: string) => ({
    //     value: opt,
    //     label: opt
    //   }));
    // }

    // Αν είναι select field αλλά δεν έχει static options — πάμε να ψάξουμε δυναμικά από τη μεταβλητή
    if (schemaField.type === "select") {
      const selectedVars = this.experimentService.getVariables();
      if (selectedVars.length !== 1) return [];

      const onlyVar = selectedVars[0];
      const enumValues = this.experimentService.variableEnumerations[onlyVar.code] || [];
      // console.log("enumValues: ", enumValues);
      return enumValues.map((e) => ({
        value: e,
        label: e
      }));
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
