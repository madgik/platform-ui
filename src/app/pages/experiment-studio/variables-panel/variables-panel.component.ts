import { BubbleChartComponent } from './../visualisations/bubble-chart/bubble-chart.component';
import { ErrorService } from './../../data-models-page/services/error.service';
import { ExperimentStudioService } from './../../../services/experiment-studio.service';
import { Component, signal, EventEmitter, Output, inject, Input, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AccordionComponent } from '../../shared/accordion/accordion.component';
import { MatChipsModule } from '@angular/material/chips';
import { DistributionGraphComponent } from '../distribution-graph/distribution-graph.component';
import { BubbleData } from '../../../models/experiment-studio.model';
import { DataModel } from '../../../models/data-model.interface';
import { DataModelSelectorComponent } from './data-model-selector/data-model-selector.component';
import { DatasetSelectorComponent } from './dataset-selector/dataset-selector.component';
import { SearchBarComponent } from './search-bar/search-bar.component';
import { VariableFilterSelectionComponent } from '../variable-filter-selection/variable-filter-selection.component';
import { createZoomableCirclePacking } from '../visualisations/bubble-chart/zoomable-circle-packing';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';


@Component({
  selector: 'app-variables-panel',
  standalone: true,
  templateUrl: './variables-panel.component.html',
  styleUrls: ['./variables-panel.component.css'],
  imports: [
    CommonModule,
    MatChipsModule,
    MatIconModule,
    AccordionComponent,
    BubbleChartComponent,
    DistributionGraphComponent,
    DataModelSelectorComponent,
    DatasetSelectorComponent,
    SearchBarComponent,
    VariableFilterSelectionComponent,
    LoadingSpinnerComponent
],
})
export class VariablesPanelComponent {
  @Input() defaultModel: DataModel | null = null;
  @Output() variableSelected = new EventEmitter<BubbleData>();
  @Input() dataModelHierarchy: any;
  highlightNode: any = null;

  experimentStudioService = inject(ExperimentStudioService);

  errorService = inject(ErrorService);
  accordionTitle: string = "Variables and Covariates";
  filteredVariables: WritableSignal<any[]> = signal([]);
  filteredGroups: WritableSignal<any[]> = signal([]);
  distributionData = signal<any | null>(null);
  d3Data: any;
  selectedDataModel: DataModel | null | undefined;
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

  private originalData: any;

  constructor() { }
  // From data-model-page.component.ts
  ngOnInit(): void {
    this.selectedDataModel = this.defaultModel;
    this.loadDataModels();
    // this.fetchFederationHistogram();

    // Fetch the federation-wide histogram based on the selected federation
    const federation = this.selectedDataModel;
    if (federation) {
      const algorithmName = "multiple_histograms";
      this.experimentStudioService.getAlgorithmResults(algorithmName).subscribe({
        next: (response) => {
          if (response?.result?.histogram[0]) {
            this.distributionData.set(response.result.histogram[0]); // Update histogram for federation
          } else {
            console.warn('No histogram data found for the federation:', federation.code);
          }
        },
        error: (error) => {
          console.error('Error fetching federation-wide histogram:', error);
        },
      });
    } else {
      console.warn('No federation selected during initialization.');
    }
  }

  onSearchResult(selectedName: string) {
    // console.log('Search selected:', selectedName);
    // console.log('d3data:', this.d3Data);
    const found = this.filteredVariables().find(v => v.name === selectedName);
    if (found) {
      // this.experimentStudioService.addVariableAndEnrich(found);
      this.highlightNode = found;
      this.onSelectedNodeChange(this.highlightNode);

    } else {
      console.warn('No variable "', selectedName);
      return;
    }
  }

  // onSearchResult(selectedName: string) {
  //   const node = this.filteredVariables().find(v => v.name === selectedName);
  //   if (!node) return;
  //   this.highlightNode = node;
  //   // εδώ: το ngOnChanges του BubbleChartComponent θα δει ότι highlightNode άλλαξε…
  //   // και θα καλέσει zoomToNodeFn(node)
  // }

  selectSearchResult(selected: string): void {

    // const targetNode = this.findNodeByName(this.originalData, selected);

    // if (!targetNode) {
    //   console.warn('No node found for the given search query.');
    //   return;
    // }

    // if (targetNode.children && targetNode.children.length > 0) {
    //   // If node has children, make it the new root
    //   this.BubbleChartComponent.renderChart();
    // } else {
    //   // If node has no children, make the parent the root and highlight the node
    //   const parentNode = this.findParentNode(this.originalData, targetNode);

    //   if (parentNode) {
    //     this.renderChart(); // Highlight the selected node
    //   } else {
    //   }
    // }
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

  /** Recursively find a node by name */
  findNodeByName(node: any, name: string): any {
    if (node.name === name) return node;
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

  //TODO: Move to service - unused
  fetchDistributionData(variable: any): void {
    // Fetch distribution data for a selected variable
    const algorithmName = "multiple_histograms";
    this.experimentStudioService
      .getAlgorithmResults(algorithmName)
      .subscribe((data) => {
        this.dataWithName = data;
        this.dataWithName["variableName"] = variable.name;
        this.distributionData.set(data);
      });
  }

  loadDataModels(): void {
    this.experimentStudioService.getAllDataModels().subscribe((dataModels) => {
      this.handleDataModelResponse(dataModels);
    });
  }

  handleDataModelResponse(dataModels: DataModel[]): void {
    const { crossSectional, longitudinal } = this.experimentStudioService.categorizeDataModels(dataModels);
    this.crossSectionalModels = crossSectional;
    this.longitudinalModels = longitudinal;

    if (dataModels.length > 0) {
      // console.log("✅ Data models detected. Proceeding...");
      this.selectedDataModel = crossSectional[0] || longitudinal[0] || null;
      this.selectedDataModel = crossSectional[0] || longitudinal[0] || null;
      this.experimentStudioService.selectedDataModel = this.selectedDataModel;

      if (this.selectedDataModel) {
        const algorithmName = "multiple_histograms";
        this.loadVisualizationData();
        setTimeout(() => {
          this.fetchFederationHistogram();
        });

        this.experimentStudioService.getAlgorithmResults(algorithmName).subscribe({
          next: (response) => {
            // console.log('📊 Histogram Response:', response);
            if (response?.result?.histogram?.[0]) {
              this.distributionData.set(response.result.histogram[0]);
            } else {
              console.warn("No histogram data found for federation.");
            }
          },
          error: (err) => {
            console.error("Histogram fetch error:", err);
          }
        });
      }
    }

  }

  loadVisualizationData(): void {
    if (this.selectedDataModel) {
      const { hierarchy, allVariables, allDatasets } = this.experimentStudioService.convertToD3Hierarchy(this.selectedDataModel);

      this.d3Data = hierarchy;
      this.filteredVariables.set(allVariables); // Flat list of variables
      this.filteredGroups.set(
        this.d3Data.children.filter((item: any) => item.children) // Groups
      );
      this.availableDatasets = allDatasets.map((dataset: any) => ({
        code: dataset.code,
        label: dataset.label,
      })); // Set datasets for selector
    }
  }

  fetchFederationHistogram(): void {
    // console.log("📤 Selected data model:", this.selectedDataModel);

    const federation = this.selectedDataModel;
    if (!federation) {
      console.warn('No federation selected.');
      return;
    }

    const federationGroups = this.d3Data.children || [];
    const groupCodes = federationGroups.map((g: any) => g.code);

    // console.log("📤 federationGroups:", federationGroups);
    // console.log("📤 Step 1 - Group Codes extracted:", groupCodes);

    const algorithmName = "multiple_histograms";

    this.experimentStudioService.getAlgorithmResults(algorithmName, groupCodes).subscribe({
      next: (response) => {
        if (response?.result?.histogram?.[0]) {
          this.distributionData.set(response.result.histogram[0]);
        } else {
          console.warn('No histogram data found for federation:', federation.code);
        }
      },
      error: (error) => {
        console.error('Error fetching federation-wide histogram:', error);
      },
    });
  }

  // end of services functions
  onSelectedDataModelChange(selectedDataModel: DataModel | null): void {
    this.selectedDataModel = selectedDataModel;
    this.loadVisualizationData(); // Reload the visualization
  }

  onDatasetsSelected(selectedDatasets: string[]): void {
    // console.log("Selected Datasets:", selectedDatasets);
    // Handle the selected datasets here
  }

  // search bar functions
  onSearchQueryChange(query: string): void {
    this.searchQuery = query.toLowerCase();
    this.filterData();
  }

  filterData(): void {
    const filterNodes = (node: any) => {
      if (node.name.toLowerCase().includes(this.searchQuery)) {
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

  onSelectedItem(item: any): void {
    // console.log('Selected Item:', item);
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
    this.selectedNode = node;
    this.isLoadingHistogram.set(true);


    if (node.children) {
      // 💡 Πάρε μόνο τα leafs του group
      this.groupVariables = this.getAllLeafNodes(node);


      const childIds = this.groupVariables.map((child: any) => child.code);
      const algorithmName = "multiple_histograms";

      this.experimentStudioService.getAlgorithmResults(algorithmName, childIds).subscribe({
        next: (response) => {
          if (response?.result?.histogram[0]) {
            this.distributionData.set(response.result.histogram[0]);
          } else {
            console.warn('No histogram data found for the group:', node.code);
          }
        },
        error: (error) => {
          console.error('Error fetching group histogram data:', error);
        },
      });
      return;
    }

    this.groupVariables = [];
    this.experimentStudioService.getAlgorithmResults("multiple_histograms", [node.code]).subscribe({
      next: (response) => {
        this.isLoadingHistogram.set(false);
        const hist = response?.result?.histogram?.[0];
        if (hist) {
          const dataWithName = { ...hist, variableName: node.name };
          this.distributionData.set(dataWithName);
        } else {
          console.warn("No histogram returned for variable:", node.code);
        }
      },
      error: (err) => {
        this.isLoadingHistogram.set(false);
        console.error("Error fetching histogram for variable:", node.code, err);
      }
    });
  }

  addGroupVariables(): void {
    if (!this.groupVariables.length) return;

    const existingCodes = new Set(this.selectedVariables.map(v => v.code));
    const newVariables = this.groupVariables.filter((v: any) => !existingCodes.has(v.code));

    newVariables.forEach((variable: any) => {
      this.experimentStudioService.addVariableAndEnrich(variable);
    });

    // Ενημέρωσε το signal (προαιρετικά αν χρειαστεί refresh χειροκίνητα)
    this.onVariableChange([...this.selectedVariables, ...newVariables]);
  }

  // unused
  private fetchHistogramForNode(node: any): void {
    const algorithmName = "multiple_histograms";

    const leafCodes = this.getAllLeafNodes(node).map((leaf: any) => leaf.code);
    if (!leafCodes.length) {
      console.warn("🚫 No leaf codes found for node:", node);
      return;
    }

    this.experimentStudioService.getAlgorithmResults(algorithmName, leafCodes).subscribe({
      next: (response) => {
        if (response?.result?.histogram?.length) {
          this.distributionData.set(response.result.histogram);
        } else {
          console.warn("⚠️ Empty histogram for node:", node.code);
        }
      },
      error: (error) => {
        console.error("❌ Histogram fetch error for node:", node.code, error);
      }
    });
  }

}
