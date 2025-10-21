import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, filter, interval, map, of, switchMap, take, takeWhile, tap } from 'rxjs';
import { SessionStorageService } from './session-storage.service';
import { DataModel } from '../models/data-model.interface';
import { mapRawAlgorithmToAlgorithmConfig } from '../core/algorithm-mappers';
import { RawAlgorithmDefinition, RawInputData } from '../models/backend-algorithms.model';


// move to appropriate model/interface file
export interface AlgorithmConfig {
  name: string;
  label: string;
  description: string;
  requiredVariable: string[];
  covariate: string[];
  category: string;
  configSchema: Array<any>;
  type: string;
  inputdata?: RawInputData;
  isDisabled: boolean;
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

  private selectedVariablesSignal = signal<any[]>([]);
  private selectedCovariatesSignal = signal<any[]>([]);
  private selectedFiltersSignal = signal<any[]>([]);

  readonly selectedVariables = computed(() => this.selectedVariablesSignal());
  readonly selectedCovariates = computed(() => this.selectedCovariatesSignal());
  readonly selectedFilters = computed(() => this.selectedFiltersSignal());


  private histogramCache: Record<string, any> = {}; // Cache histograms by variable code
  private descriptiveStatsCache: Record<string, any> = {}; // Cache histograms by variable code
  variableEnumerations: Record<string, string[]> = {}; // Enum info per variable

  public selectedDataModel: DataModel | null = null;
  lastUsedAlgorithm = signal<string | null>(null);

  backendAlgorithms = signal<Record<string, AlgorithmConfig>>({});

  constructor() {
    this.loadBackendAlgorithms().subscribe();
  }

  algorithmEnabled(variableType: string): string[] {
    // φτιάχνουμε array γιατί raw.type μπορεί να είναι string ή string[]
    const varTypes = Array.isArray(variableType) ? variableType : [variableType];

    // const covarTypes = Array.isArray(covariateType) ? covariateType : [covariateType];
    const allAlgos = Object.values(this.backendAlgorithms());

    // φιλτράρουμε όσους έχουν inputdata.y και περιλαμβάνουν τουλάχιστον έναν
    // από τους varTypes στη λίστα types
    return allAlgos
      .filter(algo => {
        const yReq = algo.inputdata?.y;
        const xReq = algo.inputdata?.x;

        if (!yReq || !Array.isArray(yReq.types)) {
          return false;
        }

        const varIsNominal = varTypes.includes("nominal");

        if (varIsNominal && yReq.stattypes?.includes("nominal")) {
          return true;
        }

        const yExists = varTypes.some(t => yReq.types.includes(t));

        if (!yExists) {
          return false;
        }

        if (xReq && Array.isArray(xReq.types)) {
          if (varTypes.length === 0) {
            return false;
          }

          const xExists = varTypes.some(t => xReq.types.includes(t));
          if (!xExists) {
            return false;
          }
        }

        if (varIsNominal && xReq?.stattypes?.includes("nominal")) {
          return true;
        }
        return true;
      })
      .map(algo => algo.name);
  }

  // adds variables and adds enumerations for the algorithm panel
  addVariableAndEnrich(node: any): void {
    // console.log('[addVariableAndEnrich] node.type:', node.type);
    const currentVars = this.selectedVariables();
    // const currentCovars = this.selectedCovariates();
    if (currentVars.some(v => v.code === node.code)) {
      return;
    }

    const enabledAlgos = this.algorithmEnabled(node.type);

    const enrichedNode = {
      ...node,
      code: node.code,
      label: node.label,
      name: node.name,
      supportedAlgos: enabledAlgos,
    };

    // update signal
    this.selectedVariablesSignal.set([...currentVars, enrichedNode]);

    // make sure enums are there
    this.fetchAndCacheDescriptiveStats(node.code).subscribe();
  }

  setVariables(vars: any[]): void {
    this.selectedVariablesSignal.set(vars);
  }

  setCovariates(covs: any[]): void {
    this.selectedCovariatesSignal.set(covs);
  }

  setFilters(filters: any[]): void {
    this.selectedFiltersSignal.set(filters);
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

    const selectedVariables = this.selectedVariables();
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
        // console.log("✅ Mapped Algorithms with configSchema:", JSON.stringify(mapped));
        return mapped;
      }),
      catchError((error) => {
        console.error('Failed to fetch backend algorithms:', error);
        return of({});
      })
    );
  }

  availableGroupedAlgorithms = computed(() => {
    const selectedY = this.selectedVariables();
    const selectedX = this.selectedCovariates();

    return Object.values(this.backendAlgorithms()).reduce((acc, algo) => {
      const cat = algo.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({
        ...algo,
        isDisabled: !this.isAlgorithmAvailable(algo.name)
      });
      return acc;
    }, {} as Record<string, AlgorithmConfig[]>);
  });

  isAlgorithmAvailable(name: string): boolean {
    const algo = this.backendAlgorithms()[name];

    if (!algo?.inputdata) return false;

    const selections: Record<string, any[]> = {
      y: this.selectedVariables(),
      x: this.selectedCovariates(),
      filters: this.selectedFilters()
    };
    // console.log("selections", selections);

    for (const [role, req] of Object.entries(algo.inputdata)) {
      if (role !== 'y' && role !== 'x') continue;

      const sel = selections[role] || [];
      // console.log("HOOLA", { name, role, req, sel});
      // check notblank
      if (req.notblank && sel.length === 0) {
        // console.log("Algo name", algo.name);
        // console.log("req.notblank", req.notblank);
        // console.log("sel.length", sel.length);

        return false;
      }

      // check if multiple
      if (!req.multiple && sel.length > 1) {
        // console.log("req.multiple", req.multiple);
        return false;
      }

      const selTypes = sel.map(v => v.type === 'nominal' ? 'text' : v.type);

      if (req.types?.length) {
        const badType = selTypes.find(t => !req.types.includes(t));
        if (badType) {
          console.warn(`✘ fail type: ${badType} not in [${req.types.join(', ')}]`);
          return false;
        }
      }
    }
    // console.log("Passed all the checks!");
    return true;
  }


  buildRequestBody(algorithmName: string | null = null, yVariables: string[] | null = null, xVariables: string[] | null = null): any {
    // let selectedAlgo = this.selectedAlgorithm() ?? (algorithmName ? this.backendAlgorithms()[algorithmName] : undefined);
    let algoConfig: AlgorithmConfig | undefined;
    if (algorithmName) {
      algoConfig = this.backendAlgorithms()[algorithmName];
    } else {
      algoConfig = this.selectedAlgorithm() ?? undefined;
    }

    if (!algoConfig) {
      throw new Error("No algorithm config found for " + algorithmName);
    }

    // const variables = yVariables ?? this.selectedVariables().map((v) => v.code);
    const variables = yVariables && yVariables.length ? yVariables : this.selectedVariables().map((v) => v.code);

    const covariates = xVariables ?? this.selectedCovariates().map((c) => c.code);
    const filters = this.selectedFilters();
    const config = this.algorithmConfigurations()[algoConfig.name ?? ''] || {};



    // return {
    //   name: `experiment_${algoConfig.name.replace(/\s+/g, '_')}`,
    //   algorithm: {
    //     name: algoConfig.name,
    //     inputdata: {
    //       y: variables.length > 0 ? variables : null,
    //       x: covariates.length > 0 ? covariates : null,
    //       data_model: "dementia:0.1",
    //       datasets: ["edsd", "ppmi", "desd-synthdata"],
    //       filters: filters.length ? filters : null,
    //     },
    //     parameters: config,
    //     preprocessing: null,
    //     type: "exareme2",
    //   },
    // };

    const requestBody = {
      name: `experiment_${algoConfig.name.replace(/\s+/g, '_')}`,
      algorithm: {
        name: algoConfig.name,
        inputdata: {
          data_model: "dementia:0.1",
          y: variables.length > 0 ? variables : null,
          x: covariates.length > 0 ? covariates : null,
          // data_model: this.selectedDataModel?.code ?? 'unknown',
          datasets: ["edsd", "ppmi", "desd-synthdata"],
          filters: filters.length ? filters : null,
        },
        parameters: config,
        preprocessing: null,
        type: "exareme2",
      }
    };

    console.log("🧪 Final Request Body", JSON.stringify({
      y: variables,
      datasets: ["edsd", "ppmi", "desd-synthdata"],
      full: requestBody
    }, null, 2));

    return requestBody;

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
    // console.log("REQUEST BODY", JSON.stringify(requestBody, null, 2));

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

  // getAlgorithmResults(algorithmName: string, nodeCode: any | null = null): Observable<any> {
  //   const requestBody = this.buildRequestBody(algorithmName, nodeCode);
  //     console.log("🚀 API CALL to /algorithm_results with:", {
  //       algorithmName,
  //       inputdata: nodeCode
  //     });
  //   const cacheHandler = (result: any) => {
  //     if (algorithmName === "multiple_histograms") {
  //       const list = result?.histogram || [];
  //       list.forEach((hist: any) => {
  //         this.cacheHistogram(hist.var, hist);
  //       });
  //     }
  //   };
  //   return this.submitRequest(requestBody, cacheHandler);
  // }

  getAlgorithmResults(algorithmName: string, nodeCodes: string[] | null = null): Observable<any> {
    let requestBody;

  // 🧩 Ειδική περίπτωση για descriptive_stats
    if (algorithmName === "descriptive_stats") {
      requestBody = {
        name: `experiment_descriptive_stats`,
        algorithm: {
          name: "descriptive_stats",
          inputdata: {
            data_model: "dementia:0.1",
            y: nodeCodes ?? [],   // μπορεί να είναι πολλές
            x: null,              // ✅ explicit null
            datasets: ["edsd", "ppmi", "desd-synthdata"],
            filters: null
          },
          parameters: {},
          preprocessing: null,
          type: "exareme2"
        }
      };
    } else {
      // 🔁 Όλοι οι άλλοι αλγόριθμοι πάνε κανονικά
      requestBody = this.buildRequestBody(algorithmName, nodeCodes);
    }

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

      if (!countsOfEnum.data || typeof countsOfEnum.data.counts !== 'object') {
        console.warn('Skipping enum counts for', countsOfEnum);
        continue;
      }

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

  // fetchAndCacheDescriptiveStats(variableCode: string): Observable<any> {
  //   if (this.descriptiveStatsCache[variableCode]) {
  //     this.extractAndSetEnumsFromDescriptiveStats(variableCode, this.descriptiveStatsCache[variableCode]);
  //     return of(this.descriptiveStatsCache[variableCode]);
  //   }

  //   const requestBody = this.buildRequestBody("descriptive_stats");

  //   const cacheHandler = (result: any) => {
  //     this.descriptiveStatsCache[variableCode] = result;

  //     const labelCountMap: Record<string, number> = {};

  //     for (let countsOfEnum of result.variable_based) {
  //       let counts = countsOfEnum.data.counts;
  //       if (!counts) continue;

  //       for (const label in counts) {
  //         const count = counts[label];
  //         if (!labelCountMap[label]) {
  //           labelCountMap[label] = 0;
  //         }
  //         labelCountMap[label] += count;
  //       }
  //     }

  //     const labels = Object.entries(labelCountMap)
  //       .filter(([_, count]) => count > 0)
  //       .map(([label]) => label);

  //     if (labels.length > 0) {
  //       this.setVariableEnumerations(variableCode, labels);
  //     }
  //   };
  //   return this.submitRequest(requestBody, cacheHandler);
  // }
fetchAndCacheDescriptiveStats(variableCode: string): Observable<any> {
  // ✅ Αν υπάρχει ήδη cache, εξάγουμε enums και επιστρέφουμε
  if (this.descriptiveStatsCache[variableCode]) {
    this.extractAndSetEnumsFromDescriptiveStats(
      variableCode,
      this.descriptiveStatsCache[variableCode]
    );
    return of(this.descriptiveStatsCache[variableCode]);
  }

  // ✅ Βρίσκουμε τη μεταβλητή που ζητάμε (ώστε να μη στείλουμε λάθος request)
  const selectedVar = this.selectedVariables().find(v => v.code === variableCode);
  if (!selectedVar) {
    console.warn(`[DescriptiveStats] No variable found for code: ${variableCode}`);
    return of(null);
  }

  // ✅ Κατασκευάζουμε custom request για descriptive_stats
  const requestBody = {
    name: `experiment_descriptive_stats_${variableCode}`,
    algorithm: {
      name: "descriptive_stats",
      inputdata: {
        data_model: "dementia:0.1",
        y: [variableCode], // 👉 πάντα array
        x: null,
        datasets: ["edsd", "ppmi", "desd-synthdata"],
        filters: null,
      },
      parameters: {},
      preprocessing: null,
      type: "exareme2",
    },
  };

  const cacheHandler = (result: any) => {
    if (!result) return;

    // ✅ Αποθηκεύουμε στο cache
    this.descriptiveStatsCache[variableCode] = result;

    // ✅ Ασφαλής εξαγωγή enums (χωρίς να κρασάρει αν λείπουν data)
    const labelCountMap: Record<string, number> = {};

    if (Array.isArray(result.variable_based)) {
      for (const countsOfEnum of result.variable_based) {
        const counts = countsOfEnum?.data?.counts;
        if (!counts || typeof counts !== "object") continue;

        for (const label in counts) {
          const count = counts[label];
          if (!labelCountMap[label]) labelCountMap[label] = 0;
          labelCountMap[label] += count;
        }
      }
    }

    const labels = Object.entries(labelCountMap)
      .filter(([_, count]) => count > 0)
      .map(([label]) => label);

    // if (labels.length > 0) {
    //   this.setVariableEnumerations(variableCode, labels);
    // }
    if (labels.length > 0) {
      this.setVariableEnumerations(variableCode, labels);
      console.log(`✅ ENUMS set for ${variableCode}:`, labels);
    } else {
      console.warn(`⚠️ No enums extracted for ${variableCode}`, result);
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

    const variables = this.selectedVariables().map((v) => v.code);
    const covariates = this.selectedCovariates().map((v) => v.code);
    const filters = this.selectedFilters();
    const config = this.algorithmConfigurations()[selectedAlgo.name] || {};

    const requestBody = {
      name: `experiment_${selectedAlgo.name}`,
      algorithm: {
        name: selectedAlgo.name,
        // need to update this with buildRequestBody
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

    // console.log("RUN REQUEST", requestBody);
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
        // console.log(`Polling backend for results: ${url}`);
        return this.http.get<any>(url).pipe(
          map((response) => {
            // console.log("Polling Response:", response);
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

  // todo: need this?
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


