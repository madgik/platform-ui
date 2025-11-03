import { Component, inject, Input, signal } from '@angular/core';
import { AlgorithmTableRegistry, TableSpec } from './algorithm-table-registry';
import { ExperimentStudioService } from '../../../../services/experiment-studio.service';


@Component({
  selector: 'app-auto-renderer',
  standalone: true,
  imports: [],
  templateUrl: './auto-renderer.component.html',
  styleUrl: './auto-renderer.component.css'
})
export class AutoRendererComponent {
  @Input() value: any = null;
  @Input() algorithm: string | null = null;
  experimentService = inject(ExperimentStudioService);
  algorithmToRender: string = '';

  tableSpec = signal<TableSpec[] | null>(null);

  ngOnChanges() {
    if (!this.algorithm) return;

    const builder = AlgorithmTableRegistry[this.algorithm];
    if (!builder) {
      this.tableSpec.set(null);
      return;
    }

    try {
      const spec = builder(this.value);
      this.tableSpec.set(spec);
    } catch (err) {
      console.warn('[AutoRenderer] Builder failed', err);
      this.tableSpec.set(null);
    }
  }

  // helper
  formatValue(value: any): string {
    if (value === null || value === undefined) return '';

    // turn string to number if string is number
    const num = typeof value === 'string' && !isNaN(Number(value))
      ? Number(value)
      : value;

    if (typeof num !== 'number' || isNaN(num)) {
      return String(value);
    }

    // Scientific format for too small or too large numbers
    if ((Math.abs(num) < 0.001 && num !== 0) || Math.abs(num) >= 1_000_000) {
      return num.toExponential(3);
    }

    // Show up to 3 decimals
    let formatted = Number(num.toFixed(3)).toString();

    // if -0 show 0
    if (formatted === '-0') formatted = '0';

    return formatted;
  }


  getOverrideTables(): TableSpec[] | null {
    if (!this.algorithm) return null;
    const builder = AlgorithmTableRegistry[this.algorithm];

    if (!builder) return null;

    try {
      const table = builder(this.value);
      // console.log('[AutoRenderer] Generated table:', table);
      return table;
    } catch (err) {
      console.warn('[AutoRenderer] Custom table builder failed', err);
      return null;
    }
  }


  isPrimitive(val: any): boolean {
    return val === null || ['string', 'number', 'boolean'].includes(typeof val);
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  isObject(val: any): boolean {
    return val && typeof val === 'object' && !Array.isArray(val);
  }

  isFlatObject(val: any): boolean {
    if (!this.isObject(val)) return false;
    return Object.values(val).every(v => this.isPrimitive(v));
  }

  isMatrix(arr: any[]): boolean {
    return this.isArray(arr) && arr.length > 0 && this.isArray(arr[0]);
  }

  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  trackByIndex(index: number): number {
    return index;
  }

  flattenObject(obj: any, prefix = '', res: any = {}): any {
    for (const key in obj) {
      const val = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        this.flattenObject(val, fullKey, res);
      } else {
        res[fullKey] = val;
      }
    }
    return res;
  }

  shouldFlatten(val: any): boolean {
    return this.isObject(val) && !this.isFlatObject(val);
  }

  isTabularObject(val: any): boolean {
    if (!this.isObject(val)) return false;
    const keys = Object.keys(val);
    if (keys.length === 0) return false;
    const firstLength = Array.isArray(val[keys[0]]) ? val[keys[0]].length : -1;
    if (firstLength === -1) return false;
    return keys.every(k => Array.isArray(val[k]) && val[k].length === firstLength);
  }

  getTabularRows(obj: any): any[] {
    const keys = Object.keys(obj);
    const rowCount = obj[keys[0]].length;
    const rows = [];
    for (let i = 0; i < rowCount; i++) {
      const row: any = {};
      for (const key of keys) {
        row[key] = obj[key][i];
      }
      rows.push(row);
    }
    return rows;
  }
}
