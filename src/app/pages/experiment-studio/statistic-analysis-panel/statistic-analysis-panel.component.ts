import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  SimpleChanges,
  OnChanges,
  inject
} from '@angular/core';
import { ExperimentStudioService } from '../../../services/experiment-studio.service';
import { ChartBuilderService } from '../visualisations/charts/chart-builder.service';
import { ChartRendererComponent } from '../visualisations/charts/charts-renderer/charts-renderer.component';
import { EChartsOption } from 'echarts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ViewChildren, QueryList } from '@angular/core';
import html2canvas from 'html2canvas';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';


type TabKey = 'Variables' | 'Model' | 'Boxplots';
type MetricKey =
  | 'num_dtps' | 'num_na' | 'num_total'
  | 'mean' | 'std' | 'min' | 'q1' | 'q2' | 'q3' | 'max';

interface ModelTableBlock {
  variableName: string;
  datasets: string[]; // π.χ. ["synth_ep_wk2","synth_ep_wk1","all datasets"]
  rows: Array<{ metric: MetricKey; values: Record<string, number | string | null> }>;
}

@Component({
  selector: 'app-statistic-analysis-panel',
  standalone: true,
  imports: [ChartRendererComponent, SpinnerComponent],
  templateUrl: './statistic-analysis-panel.component.html',
  styleUrls: ['./statistic-analysis-panel.component.css']
})
export class StatisticAnalysisPanelComponent implements OnInit, OnChanges {
  @Input() processedData: any[] = [];
  @Input() variables: any[] = [];
  @Input() covariates: any[] = [];
  @Input() filters: any[] = [];
  @Output() close = new EventEmitter<void>();
  @ViewChildren(ChartRendererComponent)
  chartRenderers!: QueryList<ChartRendererComponent>;
  isExporting = false;

  private expStudioService = inject(ExperimentStudioService);
  private chartBuilder = inject(ChartBuilderService);

  openAccordions: Record<string, boolean> = {};
  isLoading = true;

  activeTab: TabKey = 'Variables';
  showBoxPlots = false;

  nonNominalVariables: Array<{ code: string; name?: string; label?: string; type?: string }> = [];
  chartsForBoxPlot: EChartsOption[][] = [];
  activeBoxPlotIndex = 0;
  modelTables: ModelTableBlock[] = [];

  modelData: Array<{
    name: string;
    columns: string[];
    rows: Array<{ metric: string; values: Record<string, string> }>;
  }> = [];

  ngOnInit(): void {
    this.fetchDescriptiveStatistics();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processedData']) {
      this.isLoading = this.processedData.length === 0;
    }
  }

  setTab(tab: TabKey) {
    this.activeTab = tab;
  }

  private computeShowBoxPlots(): void {
    const selectedVars = this.expStudioService.selectedVariables();
    this.nonNominalVariables = selectedVars.filter(
      (v) => v?.type && v.type !== 'nominal' && v.type !== 'text'
    );
    this.showBoxPlots = this.nonNominalVariables.length > 0;
  }

  private buildBoxPlotCharts(response: any) {
    this.chartsForBoxPlot = this.nonNominalVariables.map((v) => {
      const perVarResp = {
        ...response,
        result: {
          ...response.result,
          variable_based: (response?.result?.variable_based ?? []).filter(
            (r: any) => r.variable === v.code
          )
        }
      };
      return this.chartBuilder.getChartsForAlgorithm('descriptive_stats', perVarResp);
    });
    this.activeBoxPlotIndex = 0;
  }

  fetchDescriptiveStatistics(): void {
    this.isLoading = true;

    const variables = this.expStudioService.selectedVariables();
    const covariates = this.expStudioService.selectedCovariates();
    const filters = this.expStudioService.selectedFilters();

    const filterCodes = new Set(filters.map(f => f.code));
    const uniqueVariables = Array.from(new Map(variables.map(v => [v.code, v])).values());
    const uniqueCovariates = Array.from(new Map(covariates.map(c => [c.code, c])).values());
    const items = [...uniqueVariables.filter(v => !filterCodes.has(v.code)),
    ...uniqueCovariates.filter(c => !filterCodes.has(c.code)),
    ...filters];

    if (!items.length) { this.isLoading = false; return; }

    const variableCodes = items.map(i => i.code);

    this.expStudioService.loadDescriptiveOverview(variableCodes).subscribe({
      next: (response) => {
        const res = response?.result ?? response ?? {};
        const variable_based = res.variable_based ?? [];
        const model_based = res.model_based ?? [];

        const dsFromPayload = Array.from(
          new Set((variable_based ?? []).map((x: any) => String(x.dataset)))
        ) as string[];

        const allLast: string[] = dsFromPayload
          .filter((d: string) => d && d !== 'all datasets')
          .concat('all datasets');

        // Variables tab
        const varList = this.expStudioService.selectedVariables();
        this.processedData = this.pivotByDataset(variable_based, varList, allLast);

        // Model tab
        this.modelData = this.pivotByDataset(model_based, varList, allLast);

        // Box Plots
        this.computeShowBoxPlots();
        if (this.showBoxPlots) this.buildBoxPlotCharts(response);

        this.isLoading = false;
      },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
  }

  processDescriptiveStatsResults(response: any) {
    if (!response?.result?.variable_based) {
      this.processedData = [];
      return;
    }

    const variableList = this.expStudioService.selectedVariables();

    const grouped = response.result.variable_based.reduce((acc: any, v: any) => {
      const match = variableList.find((vv) => vv.code === v.variable);
      const name = match ? (match.name ?? match.label ?? match.code) : v.variable;
      const d = v.data || {};

      if (!acc[name]) acc[name] = { name, data: [] };

      acc[name].data.push({
        dataset: v.dataset ?? 'all datasets',
        stats: {
          num_datapoints: d.num_dtps ?? 0,
          num_missing: d.num_na ?? 0,
          total: d.num_total ?? 0,
          mean: d.mean ?? null,
          std_dev: d.std ?? null,
          min: d.min ?? null,
          q1: d.q1 ?? null,
          median: d.q2 ?? null,
          q3: d.q3 ?? null,
          max: d.max ?? null,
        }
      });

      return acc;
    }, {});

    // sort: datasets -> “all datasets” last
    Object.values(grouped).forEach((g: any) => {
      g.data.sort((a: any, b: any) => {
        const A = a.dataset === 'all datasets' ? 'zzzz' : a.dataset.toLowerCase();
        const B = b.dataset === 'all datasets' ? 'zzzz' : b.dataset.toLowerCase();
        return A.localeCompare(B);
      });
    });

    this.processedData = Object.values(grouped);
  }

  METRIC_LABEL: Record<MetricKey, string> = {
    num_dtps: 'Datapoints',
    num_na: 'Missing',
    num_total: 'Total',
    mean: 'Mean',
    std: 'Standard Deviation',
    min: 'Min',
    q1: 'Q1',
    q2: 'Median',
    q3: 'Q3',
    max: 'Max',
  };

  // helper: metrics + label
  METRIC_ORDER: Array<{ key: string; label: string }> = [
    { key: 'num_datapoints', label: 'Datapoints' },
    { key: 'num_missing', label: 'Missing' },
    { key: 'num_total', label: 'Total' },
    { key: 'mean', label: 'Mean' },
    { key: 'std', label: 'Standard Deviation' },
    { key: 'min', label: 'Min' },
    { key: 'q1', label: 'Q1' },
    { key: 'q2', label: 'Median' },
    { key: 'q3', label: 'Q3' },
    { key: 'max', label: 'Max' },
  ];

  // 2-decimals formatter
  private fmt(v: any): string {
    if (v === null || v === undefined) return 'N/A';
    if (typeof v === 'number') return v.toFixed(2);

    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : String(v);
  }

  // pivot variable_based or model_based
  private pivotByDataset(
    items: any[],
    variableList: any[],
    datasetOrder: string[]
  ) {
    // group per variable
    const byVar: Record<string, any[]> = {};
    for (const it of items || []) {
      const arr = byVar[it.variable] || (byVar[it.variable] = []);
      arr.push(it);
    }

    // Change -> [{ name, columns, rows:[{metric, values:Record<dataset,string>}] }]
    const result: Array<{
      name: string;
      columns: string[];
      rows: Array<{ metric: string; values: Record<string, string> }>;
    }> = [];

    for (const [varCode, arr] of Object.entries(byVar)) {
      const matched = variableList.find(v => v.code === varCode);
      const varName = matched?.name ?? matched?.label ?? varCode;

      const byDataset: Record<string, any> = {};
      for (const entry of arr) byDataset[entry.dataset] = entry.data || {};

      const rows = this.METRIC_ORDER.map(m => {
        const values: Record<string, string> = {};
        for (const ds of datasetOrder) {
          const raw =
            m.key === 'num_datapoints' ? byDataset[ds]?.num_dtps :
              m.key === 'num_missing' ? byDataset[ds]?.num_na :
                m.key === 'num_total' ? byDataset[ds]?.num_total :
                  m.key === 'std' ? byDataset[ds]?.std :
                    m.key === 'q2' ? byDataset[ds]?.q2 :
                      byDataset[ds]?.[m.key];

          values[ds] = this.fmt(raw);
        }
        return { metric: m.label, values };
      });

      result.push({ name: varName, columns: datasetOrder, rows });
    }

    return result;
  }

  async exportAllDescriptiveToPDF(): Promise<void> {
    this.isExporting = true;
    document.body.classList.add('pdf-exporting');

    await new Promise(res => setTimeout(res, 50));

    const doc = new jsPDF();
    let yOffset = 10;

    try {
      const addSection = (title: string, data: any[]) => {
        if (!data?.length) return;
        doc.setFontSize(14);
        doc.text(title, 10, yOffset);
        yOffset += 8;
        data.forEach((v: any) => {
          doc.setFontSize(12);
          doc.text(v.name, 10, yOffset);
          yOffset += 6;
          const head = [['Metric', ...v.columns]];
          const body = v.rows.map((r: any) => [
            r.metric,
            ...v.columns.map((ds: any) => r.values[ds])
          ]);
          autoTable(doc, {
            startY: yOffset,
            head,
            body,
            styles: { fontSize: 9 },
            margin: { left: 10, right: 10 },
          });
          const last = (doc as any).lastAutoTable?.finalY ?? yOffset;
          yOffset = last + 10;
          if (yOffset > 270) { doc.addPage(); yOffset = 20; }
        });
      };

      // --- Variables + Model
      addSection('Variables', this.processedData || []);
      addSection('Model', this.modelData || []);

      // --- Boxplots
      if (this.showBoxPlots && this.nonNominalVariables?.length) {
        doc.addPage();
        yOffset = 20;
        doc.setFontSize(14);
        doc.text('Box Plot Charts', 10, yOffset);
        yOffset += 10;

        const hiddenCharts = document.querySelectorAll(
          '.hidden-charts-for-export app-chart-renderer'
        ) as NodeListOf<HTMLElement>;

        for (let i = 0; i < hiddenCharts.length; i++) {
          const label =
            this.nonNominalVariables[i]?.name ||
            this.nonNominalVariables[i]?.label ||
            `Variable ${i + 1}`;
          const chartEl = hiddenCharts[i];
          if (!chartEl) continue;

          try {
            const canvas = await html2canvas(chartEl, {
              backgroundColor: '#ffffff',
              scale:1,
              useCORS: true,
              logging: false,
            });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 180;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            doc.setFontSize(11);
            doc.text(label, 15, yOffset);
            yOffset += 6;

            if (yOffset + imgHeight > 270) {
              doc.addPage();
              yOffset = 20;
            }
            doc.addImage(imgData, 'PNG', 15, yOffset, imgWidth, imgHeight);
            yOffset += imgHeight + 12;
          } catch (err) {
            console.warn(`Failed to render chart for ${label}`, err);
            doc.text(`${label} — (chart not ready)`, 15, yOffset);
            yOffset += 10;
          }
        }
      }

      doc.save('descriptive_statistics.pdf');
      // } catch (err) {
      //   console.error('PDF export failed:', err);
      // } finally {
      //   // Remove once the WHOLE export is finished
      //   document.body.classList.remove('pdf-exporting');
      //   this.isExporting = false;
      // }
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      document.body.classList.remove('pdf-exporting');
      this.isExporting = false;
    }
  }


  private sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }

  toggleAccordion(name: string): void {
    this.openAccordions[name] = !this.openAccordions[name];
  }

  isAccordionOpen(name: string): boolean {
    return !!this.openAccordions[name];
  }

  expandAll(): void {
    const data = this.activeTab === 'Variables' ? this.processedData : this.modelData;
    if (!data?.length) return;
    data.forEach((v: any) => (this.openAccordions[v.name] = true));
  }

  collapseAll(): void {
    const data = this.activeTab === 'Variables' ? this.processedData : this.modelData;
    if (!data?.length) return;
    data.forEach((v: any) => (this.openAccordions[v.name] = false));
  }

  closeModal(): void {
    this.close.emit();
  }
}
