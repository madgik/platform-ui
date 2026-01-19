import { BubbleChartComponent } from './../visualisations/bubble-chart/bubble-chart.component';
import { ErrorService } from '../../../services/error.service';
import { ExperimentStudioService } from '../../../services/experiment-studio.service';
import { Component, signal, inject, Input, WritableSignal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { DataModel } from '../../../models/data-model.interface';
import { DataModelSelectorComponent } from './data-model-selector/data-model-selector.component';
import { DatasetSelectorComponent } from './dataset-selector/dataset-selector.component';
import { SearchBarComponent } from './search-bar/search-bar.component';
import { VariableFilterSelectionComponent } from './variable-filter-selection/variable-filter-selection.component';
import { DistributionGraphComponent } from './distribution-graph/distribution-graph.component';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';
import { catchError, map, of, Subject, switchMap, takeUntil } from 'rxjs';

@Component({
  selector: 'app-variables-panel',
  standalone: true,
  templateUrl: './variables-panel.component.html',
  styleUrls: ['./variables-panel.component.css'],
  imports: [
    CommonModule,
    MatChipsModule,
    MatIconModule,
    BubbleChartComponent,
    DistributionGraphComponent,
    DataModelSelectorComponent,
    DatasetSelectorComponent,
    SearchBarComponent,
    VariableFilterSelectionComponent,
    SpinnerComponent,
  ],
})
export class VariablesPanelComponent implements OnDestroy {
  @Input() defaultModel: DataModel | null = null;
  @Input() dataModelHierarchy: any;
  highlightNode: any = null;

  experimentStudioService = inject(ExperimentStudioService);

  errorService = inject(ErrorService);
  filteredVariables: WritableSignal<any[]> = signal([]);
  filteredGroups: WritableSignal<any[]> = signal([]);
  distributionData = signal<any | null>(null);
  groupSummary = signal<{
    pathNodes: Array<{ code: string; label: string }>;
    groupCount: number;
    groupNodes: Array<{ code: string; label: string }>;
  } | null>(null);
  d3Data: any;
  selectedDataModel = this.experimentStudioService.selectedDataModel;
  selectedNode: any;
  crossSectionalModels: DataModel[] = [];
  longitudinalModels: DataModel[] = [];
  availableDatasets: { code: string; label: string }[] = [];
  error: string | null = null;
  filteredData: any; // Filtered variables and groups
  searchQuery = ''; // Search input
  dataWithName: any;
  groupVariables: any[] = [];
  isLoadingHistogram = signal(false);
  errorMessage = signal<string | null>(null);
  refreshKey = signal(0);
  private destroy$ = new Subject<void>();
  private histogramRequest$ = new Subject<{ codes: string[]; label?: string }>();

  constructor() {
    this.setupHistogramPipeline();
  }

  ngOnInit(): void {
    this.selectedDataModel.set(this.defaultModel);
    this.loadDataModels();
  }

  onSearchResult(selectedName: string) {
    const found = this.filteredVariables().find(v => v.label === selectedName);
    if (found) {
      this.highlightNode = found;
      this.onSelectedNodeChange(this.highlightNode);

    } else {
      console.warn('No variable "', selectedName);
      return;
    }
  }

  onSearchSelected(code: string) {
    const foundVar = this.filteredVariables().find(v => v.code === code);
    if (foundVar) {
      this.highlightNode = foundVar;              // zoom + highlight leaf
      this.onSelectedNodeChange(foundVar);        // histogram for leaf
      return;
    }

    const foundGroup = this.findNodeByCode(this.d3Data, code);
    if (foundGroup) {
      this.highlightNode = { code };
      this.onSelectedNodeChange(foundGroup);
      return;
    }

    console.warn('[Search] No node found for code:', code);
  }

  private findNodeByCode(node: any, code: string): any | null {
    if (!node) return null;
    if (node.code === code) return node;
    for (const child of node.children ?? []) {
      const found = this.findNodeByCode(child, code);
      if (found) return found;
    }
    return null;
  }

  onVariableClicked(variable: any): void {
    if (!variable?.code) {
      console.warn('Invalid variable clicked:', variable);
      return;
    }
    this.highlightNode = variable;
    this.onSelectedNodeChange(variable);
  }

  get selectedVariables(): any[] {
    return this.experimentStudioService.selectedVariables();
  }

  get selectedCovariates(): any[] {
    return this.experimentStudioService.selectedCovariates();
  }

  get selectedFilters(): any[] {
    return this.experimentStudioService.selectedFilters();
  }

  findParentNode(currentNode: any, targetNode: any, parent: any = null): any {
    if (currentNode === targetNode) return parent;
    for (const child of currentNode.children || []) {
      const foundParent = this.findParentNode(child, targetNode, currentNode);
      if (foundParent) return foundParent;
    }
    return null;
  }

  // Recursively find a node by name
  findNodeByName(node: any, name: string): any {
    if (node.label === name) return node;
    for (const child of node.children || []) {
      const found = this.findNodeByName(child, name);
      if (found) return found;
    }
    return null;
  }

  onVariableChange(updatedVariables: any[]): void {
    this.experimentStudioService.setVariables(updatedVariables);
  }

  onCovariateChange(updatedCovariates: any[]): void {
    this.experimentStudioService.setCovariates(updatedCovariates);
  }

  onFilterChange(updatedFilters: any[]): void {
    this.experimentStudioService.setFilters(updatedFilters);
  }

  loadDataModels(): void {
    this.experimentStudioService.getAllDataModels()
      .pipe(takeUntil(this.destroy$))
      .subscribe((dataModels) => {
        this.handleDataModelResponse(dataModels);
      });
  }

  handleDataModelResponse(dataModels: DataModel[]): void {
    const { crossSectional, longitudinal } = this.experimentStudioService.categorizeDataModels(dataModels);
    this.crossSectionalModels = crossSectional;
    this.longitudinalModels = longitudinal;

    if (dataModels.length > 0) {
      this.selectedDataModel.set(crossSectional[0] || longitudinal[0] || null);
      this.experimentStudioService.selectedDataModel.set(this.selectedDataModel() ?? null);

      if (this.selectedDataModel()) {
        this.loadVisualizationData();
        if (this.d3Data) {
          this.onSelectedNodeChange(this.d3Data);
        }
      }
    }
  }

  loadVisualizationData(): void {
    const model = this.selectedDataModel();
    if (!model) return; // exit early

    const { hierarchy, allVariables } =
      this.experimentStudioService.convertToD3Hierarchy(model);

    this.d3Data = hierarchy;
    this.filteredVariables.set(allVariables);
    this.filteredGroups.set(this.d3Data.children.filter((item: any) => item.children));
    // TODO: Refactor dataset sourcing via Exaflow so datasets/labels come from a single canonical source.
    const datasetVariable = allVariables.find(
      (variable: any) => String(variable?.code ?? '').toLowerCase() === 'dataset'
    );
    const datasetEnums = datasetVariable?.enumerations ?? [];
    const datasetSource: any = (model as any).datasets;
    const allowedCodes = new Set<string>(
      Array.isArray(datasetSource)
        ? datasetSource
            .map((item: any) => String(item?.code ?? item ?? ''))
            .filter((code: string) => code)
        : []
    );
    this.availableDatasets = datasetEnums
      .filter((dataset: any) => {
        const code = String(dataset?.code ?? '');
        return allowedCodes.size === 0 || allowedCodes.has(code);
      })
      .map((dataset: any) => ({
        code: String(dataset?.code ?? ''),
        label: String(dataset?.label ?? dataset?.name ?? dataset?.code ?? ''),
      }));
  }

  fetchFederationHistogram(): void {
    const federation = this.selectedDataModel();
    if (!federation) {
      console.warn('No federation selected.');
      return;
    }

    const federationGroups = this.d3Data.children || [];
    const groupCodes = federationGroups.map((g: any) => g.code);

    const algorithmName = "multiple_histograms";

    this.queueHistogramRequest(groupCodes, 'Federation');
  }

  // end of services functions
  onSelectedDataModelChange(selectedDataModel: DataModel | null): void {
    if (!selectedDataModel) return;
    // update service signal
    this.experimentStudioService.selectedDataModel.set(selectedDataModel);

    // clean up selections
    this.experimentStudioService.setVariables([]);
    this.experimentStudioService.setCovariates([]);
    this.experimentStudioService.setFilters([]);

    this.filteredVariables.set([]);
    this.filteredGroups.set([]);
    this.distributionData.set(null);
    this.groupSummary.set(null);

    // reload new model data
    this.loadVisualizationData();
    if (this.d3Data) {
      this.onSelectedNodeChange(this.d3Data);
    }
  }

  // search bar functions
  onSearchQueryChange(query: string): void {
    this.searchQuery = query.toLowerCase();
    this.filterData();
  }

  filterData(): void {
    const filterNodes = (node: any) => {
      if (node.label.toLowerCase().includes(this.searchQuery)) {
        return { ...node };
      }
      if (node.children) {
        const filteredChildren = node.children.map(filterNodes).filter(Boolean);
        if (filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
      }
      return null;
    };
    this.filteredData = filterNodes(this.d3Data) || { name: 'No Results', children: [] };
  }

  getAllLeafNodes(node: any): any[] {
    if (!node.children || node.children.length === 0) {
      return [];
    }

    const leaves: any[] = [];

    function collectLeaves(n: any) {
      if (!n.children || n.children.length === 0) {
        leaves.push(n);
      } else {
        n.children.forEach(collectLeaves);
      }
    }
    collectLeaves(node);
    return leaves;
  }

  onSelectedNodeChange(node: any): void {
    this.selectedNode = { ...node };
    this.errorMessage.set(null);
    this.distributionData.set(null); // clear previous histogram
    this.groupSummary.set(null);

    if (!node) {
      this.isLoadingHistogram.set(false);
      this.errorMessage.set('No variable selected.');
      return;
    }

    if (node.children && node.children.length > 0) {
      const groupNodes = this.getGroupNodes(node);
      const pathNodes = this.getPathNodes(node);
      this.isLoadingHistogram.set(false);
      this.groupSummary.set({
        pathNodes,
        groupCount: groupNodes.length,
        groupNodes,
      });
      return;
    }

    const codes = [node.code];
    this.queueHistogramRequest(codes, node.label);
  }

  addGroupVariables(): void {
    if (!this.groupVariables.length) return;

    const existingCodes = new Set(this.selectedVariables.map(v => v.code));
    const newVariables = this.groupVariables.filter((v: any) => !existingCodes.has(v.code));

    newVariables.forEach((variable: any) => {
      this.experimentStudioService.addVariableAndEnrich(variable);
    });

    // Update signal if it needs to refresh manually
    this.onVariableChange([...this.selectedVariables, ...newVariables]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupHistogramPipeline(): void {
    this.histogramRequest$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(({ codes, label }) => {
          const algoName = 'multiple_histograms';
          return this.experimentStudioService
            .getAlgorithmResults(algoName, codes)
            .pipe(
              catchError((error) => {
                this.isLoadingHistogram.set(false);
                console.error('Error fetching histogram:', error);
                this.errorMessage.set('Error loading histogram. Please try again.');
                return of(null);
              }),
              map((response) => ({ response, label, codes }))
            );
        })
      )
      .subscribe(({ response, label, codes }) => {
        this.isLoadingHistogram.set(false);

        if (!response) return;

        const histList = response?.result?.histogram ?? response?.histogram ?? [];
        const firstHist = histList[0];

        if (firstHist) {
          const variableCode = firstHist?.variable ?? codes?.[0];
          const variableNode = variableCode ? this.findNodeByCode(this.d3Data, variableCode) : null;
          const enrichedHistogram = this.mapBinsToEnumLabels(firstHist, variableNode?.enumerations);

          const dataWithName = {
            ...enrichedHistogram,
            variableName: label ?? variableNode?.label ?? enrichedHistogram.variable ?? enrichedHistogram.variableName
          };
          this.distributionData.set(dataWithName);
          this.errorMessage.set(null);
        } else {
          this.errorMessage.set('No histogram data found for this selection.');
        }
      });
  }

  private queueHistogramRequest(codes: string[], label?: string) {
    this.isLoadingHistogram.set(true);
    this.errorMessage.set(null);
    this.distributionData.set(null);
    this.histogramRequest$.next({ codes, label });
  }

  private getPathNodes(node: any): Array<{ code: string; label: string }> {
    const code = node?.code;
    if (!code) {
      const fallbackLabel = String(node?.label ?? '');
      return fallbackLabel ? [{ code: String(code ?? ''), label: fallbackLabel }] : [];
    }
    const pathNodes: Array<{ code: string; label: string }> = [];
    const found = this.collectPathNodes(this.d3Data, code, pathNodes);
    if (!found) {
      return [{ code: String(code), label: String(node?.label ?? code) }];
    }
    return pathNodes;
  }

  private collectPathNodes(
    current: any,
    code: string,
    path: Array<{ code: string; label: string }>
  ): boolean {
    if (!current) return false;
    const label = String(current?.label ?? current?.name ?? current?.code ?? '');
    const currentCode = String(current?.code ?? '');
    if (label) {
      path.push({ code: currentCode, label });
    }
    if (current?.code === code) return true;
    for (const child of current.children ?? []) {
      if (this.collectPathNodes(child, code, path)) return true;
    }
    path.pop();
    return false;
  }

  private getGroupNodes(node: any): Array<{ code: string; label: string }> {
    const children = Array.isArray(node?.children) ? node.children : [];
    const groups = children.filter((child: any) => child?.children && child.children.length > 0);
    const items = groups.length > 0 ? groups : children;
    return items
      .map((child: any) => ({
        code: String(child?.code ?? ''),
        label: String(child?.label ?? child?.name ?? child?.code ?? ''),
      }))
      .filter((child: { code: string; label: string }) => child.label && child.code);
  }

  onGroupSummaryClick(node: { code: string }): void {
    if (!node?.code) return;
    const target = this.findNodeByCode(this.d3Data, node.code);
    if (!target) return;
    this.highlightNode = target;
    this.onSelectedNodeChange(target);
  }

  /**
   * Replace histogram bin codes with enumeration labels when available.
   */
  private mapBinsToEnumLabels(hist: any, enumerations?: Array<{ code?: any; label?: string; name?: string }>) {
    if (!hist || !Array.isArray(hist.bins) || !enumerations || !enumerations.length) return hist;

    const codeToLabel = new Map(
      enumerations.map((e) => [String(e.code ?? e.label ?? ''), e.label ?? e.name ?? String(e.code ?? '')])
    );

    let mapped = 0;
    const binsWithLabels = hist.bins.map((b: any) => {
      const label = codeToLabel.get(String(b));
      if (label) {
        mapped += 1;
        return label;
      }
      return b;
    });

    if (!mapped) return hist;
    return { ...hist, bins: binsWithLabels };
  }

}
