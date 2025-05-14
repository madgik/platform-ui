import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, filter, interval, map, of, switchMap, take, takeWhile, tap } from 'rxjs';
import { SessionStorageService } from './session-storage.service';
import { DataModel } from '../models/data-model.interface';
import { mapRawAlgorithmToAlgorithmConfig } from '../core/algorithm-mappers';
import { RawAlgorithmDefinition } from '../models/backend-algorithms.model';

export interface AlgorithmConfig {
  name: string;
  label: string;
  description: string;
  requiredVariable: string;
  covariate: string;
  category: string;
  configSchema: Array<any>;
  type: string;
}

@Injectable({ providedIn: 'root' })
export class ExperimentStudioService {
  private http = inject(HttpClient);
  private sessionStorage = inject(SessionStorageService);

  private apiUrl = '/services/data-models';
  private experimentUrl = '/services/experiments';
  private histogramDataSignal = signal<any | null>(null);

  private dataModels: any[] = [];
  private dataModelsLoaded = false;

  private selectedVariables = new BehaviorSubject<any[]>([]);
  private selectedCovariates = new BehaviorSubject<any[]>([]);
  private selectedFilters = new BehaviorSubject<any[]>([]);

  private histogramCache: Record<string, any> = {}; // Cache histograms by variable code
  private descriptiveStatsCache: Record<string, any> = {}; // Cache histograms by variable code
  variableEnumerations: Record<string, string[]> = {}; // Enum info per variable

  backendAlgorithms = signal<Record<string, AlgorithmConfig>>({});
  variables$ = this.selectedVariables.asObservable();
  covariates$ = this.selectedCovariates.asObservable();
  filters$ = this.selectedFilters.asObservable();

  constructor() {
    this.loadBackendAlgorithms().subscribe();
  }

  groupedAlgorithms = computed(() => {
    const all = Object.values(this.backendAlgorithms());
    return all.reduce((acc, algo) => {
      const category = algo.category ?? 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(algo);
      return acc;
    }, {} as Record<string, AlgorithmConfig[]>);
  });

  addVariableAndEnrich(node: any): void {
    const current = this.getVariables();
    const alreadyIncluded = current.some(v => v.code === node.code);
    if (alreadyIncluded) return;

    const updated = [...current, node];
    this.setVariables(updated);
    this.fetchAndCacheDescriptiveStats(node.code).subscribe(); // call and forget
  }

  getVariables(): any[] {
    return this.selectedVariables.getValue();
  }

  getCovariates(): any[] {
    return this.selectedCovariates.getValue();
  }

  getFilters(): any[] {
    return this.selectedFilters.getValue();
  }

  setVariables(vars: any[]): void {
    this.selectedVariables.next(vars);
  }

  setCovariates(covs: any[]): void {
    this.selectedCovariates.next(covs);
  }

  setFilters(filters: any[]): void {
    this.selectedFilters.next(filters);
  }

  cacheHistogram(variableCode: string, data: any) {
    this.histogramCache[variableCode] = data;

    if (data?.bins && Array.isArray(data.bins)) {
      const labels = data.bins.map((bin: any) => bin.label).filter((l: any) => !!l);
      if (labels.length > 0) {
        this.setVariableEnumerations(variableCode, labels);
      }
    }
  }

  getHistogram(variableCode: string): any {
    return this.histogramCache[variableCode];
  }

  setVariableEnumerations(code: string, values: string[]) {
    // this.variableEnumerations = {
    //   ...this.variableEnumerations,
    //   [code]: values,
    // };
    this.variableEnumerations = { [code]: values };
  }

  getVariableEnumerations(): Record<string, string[]> {
    return this.variableEnumerations;
  }

  selectedAlgorithm = signal<AlgorithmConfig | null>(
    this.sessionStorage.getItem<AlgorithmConfig>('selectedAlgorithm') ?? null
  );

  algorithmConfigurations = signal<{ [key: string]: Record<string, any> }>(
    this.sessionStorage.getItem('algorithmConfigurations') || {}
  );

  async setAlgorithm(algorithm: AlgorithmConfig) {
    const algo = this.backendAlgorithms()[algorithm.name];
    if (!algo) {
      console.error("Algorithm not found:", algorithm.name);
      return;
    }

    const selectedVariables = this.getVariables();
    if (selectedVariables.length !== 1) {
      console.warn("Enrichment skipped: need exactly 1 selected variable for enums.");
      this.selectedAlgorithm.set(algo);
      this.sessionStorage.setItem('selectedAlgorithm', algo);
      return;
    }

    const selectedY = selectedVariables[0];
    if (!this.variableEnumerations[selectedY.code]) {
      await this.fetchAndCacheDescriptiveStats(selectedY.code).toPromise();
    }

    let enums = this.variableEnumerations[selectedY.code] || [];

    const enrichedConfig = algo.configSchema.map((field) => {
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        return { ...field, options: [...enums] }; // avoid shared reference
      }
      return field;
    });

    const enrichedAlgo = { ...algo, configSchema: enrichedConfig };
    this.selectedAlgorithm.set(enrichedAlgo);
    this.sessionStorage.setItem('selectedAlgorithm', enrichedAlgo);
  }

  loadBackendAlgorithms(): Observable<Record<string, AlgorithmConfig>> {
    return this.http.get<RawAlgorithmDefinition[]>('/services/algorithms').pipe(
      map((rawAlgorithms) => {
        const mapped: Record<string, AlgorithmConfig> = {};

        rawAlgorithms.forEach((raw) => {
          const algo = mapRawAlgorithmToAlgorithmConfig(raw);
          mapped[algo.name] = algo;
        });

        this.backendAlgorithms.set(mapped);
        return mapped;
      }),
      catchError((error) => {
        console.error('Failed to fetch backend algorithms:', error);
        return of({});
      })
    );
  }

  isAlgorithmAvailable(name: string): boolean {
    const algo = this.backendAlgorithms()[name];
    return !!algo && this.getVariables().length > 0;
  }

  buildRequestBody(algorithmName: string | null = null, yVariables: string[] | null = null, xVariables: string[] | null = null): any {
    let selectedAlgo = this.selectedAlgorithm() ?? (algorithmName ? this.backendAlgorithms()[algorithmName] : undefined);
    console.log("algorithmName: ", algorithmName);

    const variables = yVariables ?? this.getVariables().map((v) => v.code);
    const covariates = xVariables ?? this.getCovariates().map((c) => c.code);
    const filters = this.getFilters();
    const config = this.algorithmConfigurations()[selectedAlgo?.name ?? ''] || {};

    return {
      name: `experiment_${selectedAlgo?.name.replace(/\s+/g, '_')}`,
      algorithm: {
        name: algorithmName,
        inputdata: {
          y: variables.length > 0 ? variables : null,
          x: covariates.length > 0 ? covariates : null,
          data_model: "dementia:0.1",
          datasets: ["edsd", "ppmi", "desd-synthdata"],
          filters: filters.length ? filters : null,
        },
        parameters: config,
        preprocessing: null,
        type: "exareme2",
      },
    };
  }

  getHistogramData() {
    return this.histogramDataSignal();
  }

  setHistogramData(data: any) {
    this.histogramDataSignal.set(data);
  }

  loadAllDataModels(): Observable<any[]> {
    if (!this.dataModelsLoaded) {
      return this.http.get<any[]>(this.apiUrl).pipe(
        tap((models) => {
          this.dataModels = models;
          this.dataModelsLoaded = true;
        }),
        catchError((err) => {
          console.error('Error fetching data models:', err);
          return of([]);
        })
      );
    }
    return of(this.dataModels);
  }

  getAllDataModels(): Observable<any[]> {
    return this.loadAllDataModels();
  }

  convertToD3Hierarchy(data: any): { hierarchy: any; allVariables: any[]; allDatasets: any[] } {
    const convertVariables = (vars: any[]) =>
      vars.map((v) => ({ name: v.label, code: v.code, value: 1, type: v.type }));

    const convertGroups = (groups: any) =>
      groups.map((g: any) => ({
        name: g.label,
        code: g.code,
        children: [...convertVariables(g.variables || []), ...convertGroups(g.groups || [])]
      }));

    const extractFlat = (node: any, list: any[] = []): any[] => {
      if (node.children) node.children.forEach((child: any) => extractFlat(child, list));
      else if (node.name) list.push(node);
      return list;
    };

    const hierarchy = {
      name: data.label,
      children: [...convertVariables(data.variables || []), ...convertGroups(data.groups || [])]
    };

    return {
      hierarchy,
      allVariables: extractFlat(hierarchy),
      allDatasets: data.datasets || []
    };
  }


  submitRequest(requestBody: any, cacheHandler?: (response: any) => void): Observable<any> {
    console.log("REQUEST BODY", JSON.stringify(requestBody, null, 2));

    return this.http.post<any>(this.experimentUrl, requestBody).pipe(
      switchMap((res) => {
        const uuid = res?.uuid;
        if (!uuid) throw new Error('UUID not found in response');
        return this.pollForResults(`${this.experimentUrl}/${uuid}`);
      }),
      tap((response) => {
        if (cacheHandler && response?.result) {
          cacheHandler(response.result);
        }
      }),
      catchError((err) => {
        console.error(`Error running algorithm ${requestBody.algorithm?.name}:`, err);
        return of(null);
      })
    );
  }

  getAlgorithmResults(algorithmName: string, nodeCode: any | null = null): Observable<any> {
    const requestBody = this.buildRequestBody(algorithmName, nodeCode);
    const cacheHandler = (result: any) => {
      if (algorithmName === "multiple_histograms") {
        const list = result?.histogram || [];
        list.forEach((hist: any) => {
          this.cacheHistogram(hist.var, hist);
        });
      }
    };
    return this.submitRequest(requestBody, cacheHandler);
  }

  extractAndSetEnumsFromDescriptiveStats(variableCode: string, result: any) {
    const labelCountMap: Record<string, number> = {};

    for (let countsOfEnum of result.variable_based) {
      let counts = countsOfEnum.data.counts;
      if (!counts) continue;

      for (const label in counts) {
        const count = counts[label];
        if (!labelCountMap[label]) labelCountMap[label] = 0;
        labelCountMap[label] += count;
      }
    }

    const labels = Object.entries(labelCountMap)
      .filter(([_, count]) => count > 0)
      .map(([label]) => label);

    if (labels.length > 0) {
      this.setVariableEnumerations(variableCode, labels);
    }
  }

  fetchAndCacheDescriptiveStats(variableCode: string): Observable<any> {
    if (this.descriptiveStatsCache[variableCode]) {
      this.extractAndSetEnumsFromDescriptiveStats(variableCode, this.descriptiveStatsCache[variableCode]);
      return of(this.descriptiveStatsCache[variableCode]);
    }

    const requestBody = this.buildRequestBody("descriptive_stats");

    const cacheHandler = (result: any) => {
      this.descriptiveStatsCache[variableCode] = result;

      const labelCountMap: Record<string, number> = {};

      for (let countsOfEnum of result.variable_based) {
        let counts = countsOfEnum.data.counts;
        if (!counts) continue;

        for (const label in counts) {
          const count = counts[label];
          if (!labelCountMap[label]) {
            labelCountMap[label] = 0;
          }
          labelCountMap[label] += count;
        }
      }

      const labels = Object.entries(labelCountMap)
        .filter(([_, count]) => count > 0)
        .map(([label]) => label);

      if (labels.length > 0) {
        this.setVariableEnumerations(variableCode, labels);
      }
    };
    return this.submitRequest(requestBody, cacheHandler);
  }

  runSelectedAlgorithm(): Observable<any> | null {
    const selectedAlgo = this.selectedAlgorithm();
    if (!selectedAlgo) {
      console.error('No algorithm selected.');
      return null;
    }

    const variables = this.getVariables().map((v) => v.code);
    const covariates = this.getCovariates().map((v) => v.code);
    const filters = this.getFilters();
    const config = this.algorithmConfigurations()[selectedAlgo.name] || {};

    const requestBody = {
      name: `experiment_${selectedAlgo.name}`,
      algorithm: {
        name: selectedAlgo.name,
        inputdata: {
          data_model: "dementia:0.1",
          datasets: ["edsd", "ppmi", "desd-synthdata"],
          y: variables.length ? variables : null,
          x: covariates.length ? covariates : null,
          filters: filters.length ? filters : null,
        },
        parameters: config,
        preprocessing: null,
        type: selectedAlgo.type || "exareme2"
      }
    };

    console.log("[RUN REQUEST]", requestBody);
    return this.submitRequest(requestBody);
  }

  processHistogramResults(response: any) {
    if (response?.result?.histogram) {
      const histograms = response.result.histogram.map((hist: any) => ({
        bins: hist.bins,
        counts: hist.counts,
        variable: hist.var
      }));
      this.setHistogramData(histograms);
    }
  }

  pollForResults(url: string): Observable<any> {
    const pollingInterval = 5000; // Poll every 2 seconds
    const maxRetries = 10; // Maximum number of retries

    let attempts = 0;

    return interval(pollingInterval).pipe(
      switchMap(() => {
        console.log(`Polling backend for results: ${url}`);
        return this.http.get<any>(url).pipe(
          map((response) => {
            console.log("Polling Response:", response);
            // Check the status field
            if (response.status === 'success') {
              return response; // Emit the final result
            }
            if (response.status === 'error') {
              throw new Error('The server returned an error status.');
            }
            // Continue polling if status is "pending"
            return null;
          }),
          catchError((error) => {
            console.error('Error during polling:', error);
            throw error; // Propagate the error
          })
        );
      }),
      takeWhile(() => attempts++ < maxRetries, true), // Stop polling after maxRetries
      filter((result) => result !== null), // Filter out "pending" results
      take(1), // Complete after receiving the first non-pending result
      catchError((error) => {
        console.error('Polling failed:', error);
        throw error; // Propagate the error
      })
    );
  }

  categorizeDataModels(dataModels: DataModel[]): {
    crossSectional: DataModel[];
    longitudinal: DataModel[];
  } {
    return {
      crossSectional: dataModels.filter((m) => !m.longitudinal),
      longitudinal: dataModels.filter((m) => m.longitudinal)
    };
  }

  enrichVariableNode(node: any): any {
    const hist = this.getHistogram(node.code);
    if (!hist) return node;

    const enriched = {
      ...node,
      histogram: hist,
      binLabels: hist.bins?.map((b: any) => b.label).filter(Boolean) || []
    };
    return enriched;
  }

  private descriptiveStatsData: any[] = [];

  setDescriptiveStatsData(data: any[]): void {
    this.descriptiveStatsData = data;
  }

  getDescriptiveStatsData(): any[] {
    return this.descriptiveStatsData;
  }
}


