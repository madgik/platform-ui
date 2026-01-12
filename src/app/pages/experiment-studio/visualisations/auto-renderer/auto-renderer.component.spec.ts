import { AutoRendererComponent } from './auto-renderer.component';
import { AlgorithmTableRegistry } from './algorithm-table-registry';

describe('AutoRendererComponent', () => {
  it('renders tables for known algorithms', () => {
    const cmp = new AutoRendererComponent();
    cmp.algorithm = 'kmeans';
    cmp.value = { centers: [[1, 2], [3, 4]] };

    cmp.ngOnChanges({});

    const tables = cmp.tableSpec();
    expect(tables).toBeTruthy();
    expect(tables?.[0].columns.length).toBe(2);
  });

  it('sets error when builder is missing', () => {
    const cmp = new AutoRendererComponent();
    cmp.algorithm = 'does-not-exist';
    cmp.value = {};

    cmp.ngOnChanges({});

    expect(cmp.tableSpec()).toBeNull();
    expect(cmp.error()).toContain('No renderer');
  });

  it('caches identical inputs to avoid redundant work', () => {
    const cmp = new AutoRendererComponent();
    cmp.algorithm = 'kmeans';
    cmp.value = { centers: [[1, 2]] };

    const spy = spyOn(AlgorithmTableRegistry, 'kmeans').and.callThrough();

    cmp.ngOnChanges({});
    cmp.ngOnChanges({});

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
