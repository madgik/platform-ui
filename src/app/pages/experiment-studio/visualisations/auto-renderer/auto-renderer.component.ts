import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { AlgorithmTableRegistry, TableSpec } from './algorithm-table-registry';


@Component({
  selector: 'app-auto-renderer',
  standalone: true,
  imports: [],
  templateUrl: './auto-renderer.component.html',
  styleUrl: './auto-renderer.component.css'
})
export class AutoRendererComponent implements OnChanges {
  @Input() value: any = null;
  @Input() algorithm: string | null = null;
  algorithmToRender: string = '';

  tableSpec = signal<TableSpec[] | null>(null);
  error = signal<string | null>(null);

  private lastKey: string | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (!this.algorithm) {
      this.tableSpec.set(null);
      this.error.set(null);
      return;
    }

    const builder = AlgorithmTableRegistry[this.algorithm];
    if (!builder) {
      this.tableSpec.set(null);
      this.error.set(`No renderer for algorithm ${this.algorithm}`);
      return;
    }

    const key = `${this.algorithm}-${JSON.stringify(this.value)}`;
    if (key === this.lastKey && this.tableSpec()) return;

    try {
      const spec = builder(this.value);
      this.tableSpec.set(spec);
      this.error.set(null);
      this.lastKey = key;
    } catch (err) {
      console.warn('[AutoRenderer] Builder failed', err);
      this.tableSpec.set(null);
      this.error.set('Unable to render this result.');
    }
  }

  // Heuristic: smaller tables are rendered side by side
  isCompactTable(table: TableSpec | null | undefined): boolean {
    if (!table) return false;

    const colCount = table.columns?.length ?? 0;
    const rowCount = table.rows?.length ?? 0;

    // few columns + not a lot of rows -> compact
    if (colCount === 0) return false;

    return colCount <= 3 && rowCount <= 12;
  }

  // helper
  formatValue(value: any): string {
    if (value === null || value === undefined) return '';

    // If number type is string, turn to number
    const maybeNum =
      typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))
        ? Number(value)
        : value;

    if (typeof maybeNum !== 'number' || isNaN(maybeNum)) {
      return String(value);
    }

    const num = maybeNum;
    const abs = Math.abs(num);
    if (abs === 0) return '0';

    // scientific numbers
    if (abs < 1e-4 || abs >= 1_000_000) {
      return num.toExponential(3);
    }

    // Less decimals
    const decimals = abs < 1 ? 4 : 3;
    let fixed = num.toFixed(decimals);

    // Less zeros
    fixed = fixed
      .replace(/(\.\d*?[1-9])0+$/, '$1')
      .replace(/\.0+$/, '');

    if (fixed === '-0') fixed = '0';

    return fixed;
  }

  getOverrideTables(): TableSpec[] | null {
    if (!this.algorithm) return null;
    const builder = AlgorithmTableRegistry[this.algorithm];

    if (!builder) return null;

    try {
      const table = builder(this.value);
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
