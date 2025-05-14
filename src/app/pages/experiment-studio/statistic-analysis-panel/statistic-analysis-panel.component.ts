import { Component, EventEmitter, Input, Output, OnInit, SimpleChanges, OnChanges } from '@angular/core';
import { ExperimentStudioService } from '../../../services/experiment-studio.service';

@Component({
  selector: 'app-statistic-analysis-panel',
  standalone: true,
  templateUrl: './statistic-analysis-panel.component.html',
  styleUrls: ['./statistic-analysis-panel.component.css']
})
export class StatisticAnalysisPanelComponent implements OnInit, OnChanges {
  @Input() processedData: any[] = [];
  @Input() variables: any[] = [];
  @Input() covariates: any[] = [];
  @Input() filters: any[] = [];
  @Output() close = new EventEmitter<void>();

  openAccordions: { [key: string]: boolean } = {};
  result: {} = {};
  isLoading = true;

  constructor(private expStudioService: ExperimentStudioService) { }

  ngOnInit(): void {
    this.fetchDescriptiveStatistics();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processedData']) {
      console.log("Updated processedData:", this.processedData);
      this.isLoading = this.processedData.length === 0; // Show loading only if empty
    }
  }

  /** Fetches descriptive statistics dynamically */
  fetchDescriptiveStatistics(): void {
    this.isLoading = true;

    // Fetch selected items
    let variables = this.expStudioService.getVariables();
    let covariates = this.expStudioService.getCovariates();
    let filters = this.expStudioService.getFilters();

    // Create a Set for quick lookup
    const filterCodes = new Set(filters.map(filter => filter.code));

    // Ensure unique variables and covariates
    const uniqueVariables = Array.from(new Map(variables.map(v => [v.code, v])).values());
    const uniqueCovariates = Array.from(new Map(covariates.map(c => [c.code, c])).values());

    // Filter out any variable/covariate that exists in filters (keep only filtered version)
    const filteredVariables = uniqueVariables.filter(v => !filterCodes.has(v.code));
    const filteredCovariates = uniqueCovariates.filter(c => !filterCodes.has(c.code));

    // Now combine them (filtered variables & covariates + filters)
    const items = [...filteredVariables, ...filteredCovariates, ...filters];

    // Ensure we have items to process
    if (!items.length) {
      console.error("No variables, covariates, or filters available for statistics.");
      this.isLoading = false;
      return;
    }

    console.log("Final filtered list for statistics:", items);

    // Pass only the codes of selected variables
    const variableCodes = items.map(item => item.code);

    this.expStudioService.getAlgorithmResults("descriptive_stats", variableCodes).subscribe(
      (response) => {
        console.log("Received response:", response?.result?.variable_based);
        if (response?.result?.variable_based) {
          this.processDescriptiveStatsResults(response);
        }
        this.isLoading = false;
      },
      (error) => {
        console.error("Error fetching statistics:", error);
        this.isLoading = false;
      }
    );
  }

  processDescriptiveStatsResults(response: any) {
    if (response?.result?.variable_based) {
      const variableList = this.expStudioService.getVariables();

      // Map results into a structured format
      const groupedStats = response.result.variable_based
        .filter((variableData: any) => variableData.dataset === "all datasets") // Focus on "all datasets"
        .reduce((acc: any, variableData: any) => {
          // Find the corresponding variable name using the code
          const matchedVariable = variableList.find(varItem => varItem.code === variableData.variable);
          const variableName = matchedVariable ? matchedVariable.name : variableData.variable;

          // Ensure valid stats object
          const statsData = variableData.data || {};
          console.log('Processing dataset stats:', JSON.stringify(statsData));

          // Ensure the variable exists in accumulator
          if (!acc[variableName]) {
            acc[variableName] = {
              name: variableName,
              data: [],
            };
          }

          // Create dataset stats object
          const datasetStats = {
            dataset: variableData.dataset,
            stats: {
              num_datapoints: statsData.num_dtps ?? 0,
              num_missing: statsData.num_na ?? 0,
              total: statsData.num_total ?? 0,
              mean: statsData.mean ?? null,
              std_dev: statsData.std ?? null,
              min: statsData.min ?? null,
              q1: statsData.q1 ?? null,
              median: statsData.q2 ?? null,
              q3: statsData.q3 ?? null,
              max: statsData.max ?? null
            }
          };

          // Append dataset stats
          acc[variableName].data.push(datasetStats);

          return acc;
        }, {});

      // Convert grouped object into an array for template rendering
      this.processedData = Object.values(groupedStats);

      console.log("Final processed data:", JSON.stringify(this.processedData));
    } else {
      console.warn("No descriptive statistics data found in the response.");
    }
  }

  /** Detects variable type based on response */
  detectVariableType(data: any[]): string {
    if (!data.length) return "unknown";
    const firstEntry = data[0];

    if (firstEntry.data.mean !== undefined && firstEntry.data.std !== undefined) {
      return "real";
    } else if (firstEntry.data.num_dtps !== undefined && firstEntry.data.num_na !== undefined) {
      return "integer";
    } else {
      return "nominal";
    }
  }

  /** Accordion logic */
  isAccordionOpen(variableName: string): boolean {
    return !!this.openAccordions[variableName];
  }

  toggleAccordion(variableName: string): void {
    this.openAccordions[variableName] = !this.openAccordions[variableName];
  }

  expandAll(): void {
    this.processedData.forEach(variable => {
      this.openAccordions[variable.name] = true;
    });
  }

  collapseAll(): void {
    this.processedData.forEach(variable => {
      this.openAccordions[variable.name] = false;
    });
  }

  closeModal(): void {
    this.close.emit();
  }
}
