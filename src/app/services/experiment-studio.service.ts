import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, filter, interval, map, of, switchMap, take, takeWhile, tap } from 'rxjs';
import { SessionStorageService } from './session-storage.service';
import { D3HierarchyNode, DataModel, EnumValue, Group, Variable } from '../models/data-model.interface';
import { mapRawAlgorithmToAlgorithmConfig } from '../core/algorithm-mappers';
import { RawAlgorithmDefinition, RawInputData } from '../models/backend-algorithms.model';
import { BackendFilter } from '../models/filters.model';
import { AlgorithmConfig } from '../models/algorithm-definition.model';


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
  private selectedDatasetsSignal = signal<string[]>([]);
  private descriptiveStatsData: any[] = [];
  lastUsedAlgorithm = signal<string | null>(null);
  selectedDatasets = computed(() => this.selectedDatasetsSignal());
  bubbleData = signal<any>(null);
  backendAlgorithms = signal<Record<string, AlgorithmConfig>>({});
  selectedDataModel = signal<DataModel | null>(null);


  constructor() {
    this.loadBackendAlgorithms().subscribe();

    // Reset filters when no filter variables OR no rules
    effect(() => {
      const vars = this.selectedFiltersSignal();
      const logic = this._filterLogic();

      const noVars = !vars || vars.length === 0;
      const noRules = !logic || !Array.isArray(logic.rules) || logic.rules.length === 0;

      if (noVars || noRules) {
        if (this._filterLogic()) {
          console.log('🧹 Auto-clearing filter logic (no filters or no rules)');
          this._filterLogic.set(null);
        }
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const selected = this.selectedDatasetsSignal();
      if (!selected) return;

      if (selected.length === 0) {
        console.warn('No datasets selected — resetting state');
        this.setVariables([]);
        this.setCovariates([]);
        this.setFilters([]);
      } else {
        console.log('Datasets changed:', selected);
        this.refreshDataModel();
      }
    }, { allowSignalWrites: true });
  }

  setSelectedDataModel(model: DataModel | null): void {
    this.selectedDataModel.set(model);
    console.log('Selected data model updated:', model?.code || '(none)');
  }

  getActiveDataModelCode(): string {
    const model = this.selectedDataModel();
    if (!model?.code || !model?.version) {
      console.warn('No active data model found.');
      return 'unknown';
    }
    return `${model.code}:${model.version}`;
  }

  refreshDataModel() {
    const selected = this.selectedDatasetsSignal();
    if (!selected || selected.length === 0) return;

    console.log('Reloading data models for:', selected);

    this.loadAllDataModels().subscribe(models => {
      const active = models.filter(m => selected.includes(m.code));
      if (!active.length) return;

      const model = active[0];
      this.selectedDataModel.set(model);

      const converted = this.convertToD3Hierarchy(model);

      // enrich variables
      const enrichedVariables = converted.allVariables.map(v => ({
        ...v,
        supportedAlgos: this.algorithmEnabled(v.type ?? 'unknown')
      }));

      // update signals
      this.bubbleData.set({
        hierarchy: converted.hierarchy,
        allVariables: enrichedVariables,
        allDatasets: model.datasets ?? [],
      });
      console.log('Data model refreshed:', model.label);
    });
  }


  setSelectedDatasets(datasets: string[]) {
    this.selectedDatasetsSignal.set(datasets);
  }

  algorithmEnabled(variableType: string): string[] {
    // create array because raw.type could be string or string[]
    const varTypes = Array.isArray(variableType) ? variableType : [variableType];

    // const covarTypes = Array.isArray(covariateType) ? covariateType : [covariateType];
    const allAlgos = Object.values(this.backendAlgorithms());

    // filter inputdata.y and add at least one of the varTypes in types list
    const result = allAlgos
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
    console.log("📦 algorithmEnabled result:", result);
    return result;

  }

  // adds variables and adds enumerations for the algorithm panel
  addVariableAndEnrich(node: any): void {
    console.log("addVariableAndEnrich called with:", node);
    const currentVars = this.selectedVariables();
    // const currentCovars = this.selectedCovariates();
    if (currentVars.some(v => v.code === node.code)) {
      console.log("Variable already exists:", node.code);

      return;
    }

    const enabledAlgos = this.algorithmEnabled(node.type);
    console.log("algorithmEnabled returned for", node.type, "->", enabledAlgos);

    const enrichedNode = {
      ...node,
      code: node.code,
      label: node.label,
      name: node.name,
      enumerations: node.enumerations,
      supportedAlgos: enabledAlgos,
    };

    // update signal
    this.selectedVariablesSignal.set([...currentVars, enrichedNode]);
    console.log("selectedVariablesSignal now:", this.selectedVariablesSignal());
  }

  setVariables(vars: D3HierarchyNode[]) {
    this.selectedVariablesSignal.set(vars);
  }


  setCovariates(covs: D3HierarchyNode[]): void {
    this.selectedCovariatesSignal.set(covs);
  }

  setFilters(filters: D3HierarchyNode[]): void {
    this.selectedFiltersSignal.set(filters);
  }

  selectedAlgorithm = signal<AlgorithmConfig | null>(
    this.sessionStorage.getItem<AlgorithmConfig>('selectedAlgorithm') ?? null
  );

  // todo: pass appropriate return types
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
    let enums = selectedY.enumerations ?? [];

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

  availableGroupedAlgorithms = computed(() => {
    const selectedY = this.selectedVariables();
    const selectedX = this.selectedCovariates();
    const allAlgos = this.backendAlgorithms();

    console.log("📊 availableGroupedAlgorithms recompute()");
    console.log("  selectedY:", selectedY.map(v => v.code));
    console.log("  selectedX:", selectedX.map(v => v.code));
    console.log("  total algos:", Object.keys(allAlgos).length);

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

    for (const [role, req] of Object.entries(algo.inputdata)) {
      if (role !== 'y' && role !== 'x') continue;

      const sel = selections[role] || [];
      // check notblank
      if (req.notblank && sel.length === 0) {
        return false;
      }
      // check if multiple
      if (!req.multiple && sel.length > 1) {
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
    return true;
  }

  buildRequestBody(algorithmName: string | null = null, yVariables: string[] | null = null, xVariables: string[] | null = null): any {
    let algoConfig: AlgorithmConfig | undefined;

    if (algorithmName) {
      algoConfig = this.backendAlgorithms()[algorithmName];
    } else {
      algoConfig = this.selectedAlgorithm() ?? undefined;
    }

    if (!algoConfig) {
      throw new Error("No algorithm config found for " + algorithmName);
    }

    // unified signals
    const variables = yVariables?.length ? yVariables : this.selectedVariables().map(v => v.code);
    const covariates = xVariables ?? this.selectedCovariates().map(c => c.code);
    const config = this.algorithmConfigurations()[algoConfig.name ?? ''] || {};

    // filters logic
    const filterLogic = this._filterLogic();
    const hasFilters = !!(filterLogic && Array.isArray(filterLogic.rules) && filterLogic.rules.length > 0);

    // special case for multiple_histograms (no filters)
    if (algorithmName === 'multiple_histograms') {
      return {
        name: `experiment_${algorithmName}`,
        algorithm: {
          name: algorithmName,
          inputdata: {
            data_model: this.getActiveDataModelCode(),
            y: yVariables ?? null,
            datasets: this.selectedDatasetsSignal(),
            filters: null, // always null for histograms
          },
          parameters: {},
          preprocessing: null,
          type: 'exareme2',
        },
      };
    }

    // generic build
    const body = {
      name: `experiment_${algoConfig.name.replace(/\s+/g, '_')}`,
      algorithm: {
        name: algoConfig.name,
        inputdata: {
          data_model: this.getActiveDataModelCode(),
          y: variables.length > 0 ? variables : null,
          x: covariates.length > 0 ? covariates : null,
          datasets: this.selectedDatasetsSignal(),
          // filters: null,
          filters: hasFilters ? filterLogic : null,
        },
        parameters: config,
        preprocessing: null,
        type: "exareme2",
      }
    };

    console.log("🧪 Final Request Body:", JSON.stringify(body, null, 2));
    return body;
  }

  setHistogramData(data: any) {
    this.histogramDataSignal.set(data);
  }

  loadAllDataModels(): Observable<any[]> {
    if (!this.dataModelsLoaded) {
      return this.http.get<any[]>(this.apiUrl).pipe(
        tap((models) => {
          console.log("📦 RAW DATA MODELS RESPONSE (/services/data-models):", models);
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

  convertToD3Hierarchy(data: DataModel): {
    hierarchy: D3HierarchyNode;
    allVariables: D3HierarchyNode[];
    allDatasets: string[];
  } {
    const convertVariables = (vars: Variable[] = []): D3HierarchyNode[] =>
      vars.map((v) => ({
        label: v.label,
        code: v.code ?? '',
        value: 1,
        type: v.type ?? 'unknown',
        description: v.description ?? '',
        enumerations: v.enumerations ?? []
      }));

    const convertGroups = (groups: Group[] = []): D3HierarchyNode[] =>
      groups.map((g) => ({
        label: g.label,
        code: g.code ?? '',
        children: [
          ...convertVariables(g.variables ?? []),
          ...convertGroups(g.groups ?? []),
        ],
      }));

    const extractFlat = (node: any, list: D3HierarchyNode[] = []): D3HierarchyNode[] => {
      if (node.children) node.children.forEach((child: any) => extractFlat(child, list));
      else if (node.label) list.push(node);
      return list;
    };

    const hierarchy: D3HierarchyNode = {
      label: data.label,
      code: data.code ?? '',
      children: [
        ...convertVariables(data.variables ?? []),
        ...convertGroups(data.groups ?? []),
      ],
    };

    const allVariables = extractFlat(hierarchy);
    return {
      hierarchy,
      allVariables,
      allDatasets: data.datasets ?? [],
    };
  }

  submitRequest(requestBody: any, cacheHandler?: (response: any) => void): Observable<any> {
    return this.http.post<any>(this.experimentUrl, requestBody).pipe(
      switchMap((res) => {
        console.log("🚀 Backend initial response:", res);
        const uuid = res?.uuid;
        if (!uuid) throw new Error('UUID not found in response');
        return this.pollForResults(`${this.experimentUrl}/${uuid}`);
      }),
      tap((response) => {
        if (cacheHandler && response?.result) {
          cacheHandler(response.result);
        }
      }),
      catchError(async (error) => {
        console.groupCollapsed('Detailed backend error');
        console.log('Full HttpErrorResponse:', error);

        try {
          const text = await error.error?.text?.() ?? error.error;
          console.log('Raw backend response text:', text);
        } catch {
          console.log('Raw backend response (non-text):', error.error);
        }

        console.groupEnd();
        throw error;
      })
    );
  }

  private transientUrl = '/services/experiments/transient';

  private isTransientAlgorithm(name: string): boolean {
    return ['multiple_histograms', 'descriptive_stats'].includes(name);
  }

  private normalizeResponse(algoName: string, resp: any): any {
    if (this.isTransientAlgorithm(algoName) && resp && !resp.result) {
      return { result: resp };
    }
    return resp;
  }

  private submitTransientRequest(requestBody: any, cacheHandler?: (result: any) => void): Observable<any> {
    return this.http.post<any>(this.transientUrl, requestBody).pipe(
      tap((resp) => {
        if (cacheHandler && resp) cacheHandler(resp);
      }),
      catchError((error) => {
        console.groupCollapsed('Transient backend error');
        console.log('Full HttpErrorResponse:', error);
        console.log('Backend message:', error?.error || error?.message);
        console.groupEnd();
        return of(null);
      })
    );
  }


  //Runs transient or standard algorithm calls.
  //Used for fetching quick results like histograms or descriptive stats.
  getAlgorithmResults(algorithmName: string, nodeCodes: string[] | null = null): Observable<any> {
    let requestBody: any;

    if (algorithmName === 'multiple_histograms') {
      requestBody = this.buildRequestBody(algorithmName, nodeCodes);

      return this.submitTransientRequest(requestBody, (result) => {
        const list = result?.histogram || [];
        // list.forEach((hist: any) => this.cacheHistogram(hist.var, hist));
      }).pipe(
        map(resp => this.normalizeResponse(algorithmName, resp))
      );
    }

    // non-transient requests
    requestBody = this.buildRequestBody(algorithmName, nodeCodes);
    console.log("Final algorithm request body:", JSON.stringify(requestBody, null, 2));
    return this.submitRequest(requestBody);
  }

  private buildDescriptiveRequestBody(variableCodes: string[]): any {
    const filters = this.filterLogic();
    const hasFilters = (filters?.rules?.length ?? 0) > 0;

    return {
      name: `experiment_descriptive_stats_${variableCodes.join('_')}`,
      algorithm: {
        name: "descriptive_stats",
        inputdata: {
          data_model: this.getActiveDataModelCode(),
          y: variableCodes,
          x: null,
          datasets: this.selectedDatasetsSignal(),
          filters: hasFilters ? filters : null,
        },
        parameters: {},
        preprocessing: null,
        type: "exareme2",
      },
    };
  }

  loadDescriptiveOverview(variableCodes: string[]): Observable<any> {
    const requestBody = this.buildDescriptiveRequestBody(variableCodes);
    console.log("Final descriptive request body:", JSON.stringify(requestBody, null, 2));

    return this.submitTransientRequest(requestBody, (result) => {
      this.setDescriptiveStatsData(result?.variable_based || []);
      console.log("Descriptive overview loaded:", result);
    }).pipe(
      tap((response) => {
        console.log("Raw descriptive overview response:", response);
      }),
      map(resp => this.normalizeResponse("descriptive_stats", resp)),
      catchError((error) => {
        console.error("Error fetching descriptive overview:", error);
        return of(null);
      })
    );
  }

  // Executes the currently selected algorithm as a full experiment.
  // Used by the "Run Experiment" button.
  runSelectedAlgorithm(): Observable<any> | null {
    const selectedAlgo = this.selectedAlgorithm();
    if (!selectedAlgo) {
      console.error('No algorithm selected.');
      return null;
    }

    const variables = this.selectedVariables().map((v) => v.code);
    const covariates = this.selectedCovariates().map((v) => v.code);
    const filters = this.filterLogic();
    const hasFilters = (filters?.rules?.length ?? 0) > 0;
    const config = this.algorithmConfigurations()[selectedAlgo.name] || {};

    const requestBody = {
      name: `experiment_${selectedAlgo.name}`,
      algorithm: {
        name: selectedAlgo.name,
        // need to update this with buildRequestBody
        inputdata: {
          data_model: this.getActiveDataModelCode(),
          datasets: this.selectedDatasetsSignal(),
          y: variables.length ? variables : null,
          x: covariates.length ? covariates : null,
          filters: hasFilters ? filters : null,
        },
        parameters: config,
        preprocessing: null,
        type: selectedAlgo.type || "exareme2"
      }
    };
    console.log("requestBody run algo: ", requestBody);
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

  // pollForResults(url: string): Observable<any> {
  //   const pollingInterval = 5000; // Poll every 2 seconds
  //   const maxRetries = 10; // Maximum number of retries

  //   let attempts = 0;

  //   return interval(pollingInterval).pipe(
  //     switchMap(() => {
  //       return this.http.get<any>(url).pipe(
  //         map((response) => {
  //           // Check the status field
  //           if (response.status === 'success') {
  //             return response; // Emit the final result
  //           }
  //           // if (response.status === 'error') {
  //           //   throw new Error('The server returned an error status.');
  //           // }
  //           if (response.status === 'error') {
  //             console.warn("Backend returned status:error — passing it downstream");
  //             return response; // <-- επιτρέπει στο component να το χειριστεί
  //           }

  //           // Continue polling if status is "pending"
  //           return null;
  //         }),
  //         catchError(async (error) => {
  //           console.groupCollapsed('❌ Detailed backend error');
  //           console.log('Full HttpErrorResponse:', error);

  //           try {
  //             const text = await error.error?.text?.() ?? error.error;
  //             console.log('Raw backend response text:', text);
  //           } catch {
  //             console.log('Raw backend response (non-text):', error.error);
  //           }

  //           console.groupEnd();
  //           throw error;
  //         })
  //       );
  //     }),
  //     takeWhile(() => attempts++ < maxRetries, true), // Stop polling after maxRetries
  //     filter((result) => result !== null), // Filter out "pending" results
  //     take(1), // Complete after receiving the first non-pending result
  //     catchError((error) => {
  //       console.error('Polling failed:', error);
  //       throw error; // Propagate the error
  //     })
  //   );
  // }


  pollForResults(url: string): Observable<any> {
    const pollingInterval = 5000;
    const maxRetries = 10;
    let attempts = 0;

    return interval(pollingInterval).pipe(
      switchMap(() =>
        this.http.get<any>(url).pipe(
          map((response) => {
            console.log("📡 Poll response:", response);
            if (response.status === 'success' || response.status === 'error') {
              return response;
            }
            return null; // pending
          }),
          catchError((error) => {
            console.groupCollapsed('Detailed backend error');
            console.log('Full HttpErrorResponse:', error);
            console.groupEnd();
            return of({ status: 'error', result: { data: 'Network or 5xx error' } }); // fallback, no exception
          })
        )
      ),
      takeWhile(() => attempts++ < maxRetries, true),
      filter((result) => result !== null),
      take(1)
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

  setDescriptiveStatsData(data: any[]): void {
    this.descriptiveStatsData = data;
  }

  getDescriptiveStatsData(): any[] {
    return this.descriptiveStatsData;
  }

  // Filters and rules
  private _filterLogic = signal<BackendFilter | null>(null);

  get filterLogic() {
    return this._filterLogic.asReadonly();
  }

  setFilterLogic(logic: BackendFilter | null) {
    this._filterLogic.set(logic);
  }

}
