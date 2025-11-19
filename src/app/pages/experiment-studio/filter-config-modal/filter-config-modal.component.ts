import { Component, Output, EventEmitter, OnInit, effect, signal, computed, Input, SimpleChanges, OnChanges } from '@angular/core';
import { QueryBuilderConfig, QueryBuilderModule } from '@kerwin612/ngx-query-builder';
import { ExperimentStudioService } from '../../../services/experiment-studio.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnumValue } from '../../../models/data-model.interface';

type SupportedType = 'real' | 'integer' | 'nominal';

@Component({
  standalone: true,
  selector: 'app-filter-config-modal',
  imports: [CommonModule, FormsModule, QueryBuilderModule],
  templateUrl: './filter-config-modal.component.html',
  styleUrls: ['./filter-config-modal.component.css'],
})
export class FilterConfigModalComponent implements OnInit, OnChanges {
  @Input() filterLogic: any | null = null;
  @Output() closeModal = new EventEmitter<void>();

  // Variables to be filtered
  filters = signal<any[]>([]);

  // query builder
  filterLogicModel = signal<{ condition: string; rules: any[] }>({ condition: 'AND', rules: [] });

  // Config for QueryBuilder object
  config = signal<QueryBuilderConfig>({ fields: {} });

  // Operator sets per variable type
  private operatorOptions: Record<SupportedType, string[]> = {
    real: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between'],
    integer: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between'],
    nominal: ['equal', 'not_equal', 'in', 'not_in'],
  };

  Object = Object;

  configKey = computed(() => Object.keys(this.config().fields || {}).join('-'));

  constructor(private expStudio: ExperimentStudioService) {
    effect(() => {
      const available = this.expStudio.selectedFilters();

      // If no filter variables cleans up UI and service
      if (!available || available.length === 0) {
        this.filters.set([]);
        this.config.set({ fields: {} });
        this.filterLogicModel.set({ condition: 'AND', rules: [] }); // reset UI state
        this.expStudio.setFilterLogic(null);                         // reset service
        return;
      }

      // If variables exist build config
      const builtConfig = this.buildFieldsConfig(available);
      this.filters.set(available);
      this.config.set({
        fields: builtConfig,
        allowEmptyRulesets: true,
      });

      console.log('Built filter config from backend variables:', builtConfig);
    }, { allowSignalWrites: true });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filterLogic']) {
      const incoming = changes['filterLogic'].currentValue;
      if (incoming && Array.isArray(incoming.rules)) {
        this.filterLogicModel.set(structuredClone(incoming));
      } else {
        this.filterLogicModel.set({ condition: 'AND', rules: [] });
      }
    }
  }

  ngOnInit() {
  }

  // Turns enums to options
  private toOptions(values: EnumValue[] | string[]): { name: string; value: any }[] {
    if (!values || values.length === 0) return [];
    if (typeof values[0] === 'string') {
      return (values as string[]).map(v => ({ name: v, value: v }));
    }
    return (values as EnumValue[]).map(v => ({ name: v.label, value: v.code }));
  }

  // Creates for Query Builder
  private buildFieldsConfig(filters: any[]): Record<string, any> {
    const fields: Record<string, any> = {};
    if (!filters?.length) return fields;

    for (const f of filters) {
      const ops = this.operatorOptions[f.type as SupportedType] ?? ['equal', 'not_equal'];
      const enums = f.type === 'nominal' ? f.enumerations ?? [] : undefined;

      fields[f.code] = {
        name: f.label ?? f.name ?? f.code,
        type: (f.type === 'real' || f.type === 'integer') ? 'number' : 'category',
        operators: ops,
        options:
          f.type === 'nominal' && enums?.length
            ? this.toOptions(enums)
            : undefined,
      };
    }
    return fields;
  }

  private formatFiltersForBackend(rawLogic: { condition: string; rules: any[] }): any {
    if (!rawLogic || !Array.isArray(rawLogic.rules) || rawLogic.rules.length === 0) {
      return null;
    }

    const normalizeRule = (r: any): any => {
      // Group
      if (r?.condition && Array.isArray(r.rules)) {
        return {
          condition: String(r.condition).toUpperCase(), // <— ΚΕΦΑΛΑΙΑ
          rules: r.rules.map(normalizeRule),
        };
      }

      // Leaf
      const fieldKey = r.field ?? r.id;
      const op = r.operator;
      let val = r.value;

      if ((op === 'in' || op === 'not_in') && !Array.isArray(val)) val = [val];

      return {
        id: fieldKey,
        field: fieldKey,
        type: this.detectType(fieldKey),       // 'string' | 'integer' | 'real'
        input: this.detectInput(fieldKey),     // 'number' | 'select' | 'text'
        operator: op,
        value: val,
        entity: undefined,
      };
    };

    // Root to upper case
    const formatted = {
      condition: String(rawLogic.condition || 'AND').toUpperCase(),
      rules: rawLogic.rules.map(normalizeRule),
      valid: true,
    };

    console.log('Backend filter ready:', formatted);
    return formatted;
  }

  // turns internal UI types to backend types
  private detectType(field: string): 'string' | 'integer' | 'real' {
    const f = this.filters().find(v => v.code === field);
    if (!f) return 'real';
    if (f.type === 'integer') return 'integer';
    if (f.type === 'real') return 'real';
    // nominal/text -> backend "string"
    return 'string';
  }

  private detectInput(field: string): 'text' | 'number' | 'select' {
    const f = this.filters().find(v => v.code === field);
    if (!f) return 'text';
    if (f.type === 'integer' || f.type === 'real') return 'number';
    if (f.type === 'nominal') return 'select';
    return 'text';
  }

  // Saves logic in service
  saveFilters() {
    const raw = this.filterLogicModel();
    const formatted = this.formatFiltersForBackend(raw);

    const toStore =
      formatted && Array.isArray(formatted.rules) && formatted.rules.length > 0
        ? formatted
        : null;

    this.expStudio.setFilterLogic(toStore);
    this.closeModal.emit();
  }


  // Closes modal
  close() {
    this.saveFilters();
    this.closeModal.emit();
  }
}
