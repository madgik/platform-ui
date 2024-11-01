import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataModelService {
  private apiUrl = '/services/datacatalogue/datamodels';
  private dataModels: any[] = []; // Cache for all loaded data models
  private dataModelsLoaded: boolean = false; // Flag to track if data models are loaded

  constructor(private http: HttpClient) {
    this.loadAllDataModels().subscribe();
  }

  // Update the cache with all data models from the API and return an Observable
  loadAllDataModels(): Observable<any[]> {
    console.log('loadAllDataModels called');

    // Only fetch data models if not already loaded
    if (!this.dataModelsLoaded) {
      return this.http.get<any[]>(this.apiUrl).pipe(
        tap((dataModels: any[]) => {
          console.log('Data models fetched from API:', dataModels);
          this.dataModels = dataModels; // Cache the data models
          this.dataModelsLoaded = true; // Mark data models as loaded
        }),
        catchError((error) => {
          console.error('Error occurred while fetching data models from API:', error);
          this.dataModels = []; // Clear cache if an error occurs
          this.dataModelsLoaded = false;
          return of([]);
        })
      );
    }

    // Return cached data if already loaded
    return of(this.dataModels);
  }

  // Retrieve all data models, using the cache if available
  getAllDataModels(): Observable<any[]> {
    console.log('getAllDataModels called');

    // Ensure data models are loaded before returning
    return this.loadAllDataModels().pipe(
      map(() => this.dataModels)
    );
  }

  // Method to get data models by IDs, using the cache if available
  getDataModelsFullNamesByIds(ids: string[]): Observable<string[]> {
    return this.getAllDataModels().pipe(
      map((dataModels: any[]): string[] => {
        console.log('Mapping data models to full names');
        return ids.map(id => {
          const dataModel = dataModels.find(model => model.uuid === id);
          return dataModel ? `${dataModel.code}_${dataModel.version}` : 'Unknown Data Model';
        });
      }),
      catchError(error => {
        console.error('Error loading data models:', error);
        return of(ids.map(() => 'Error Loading Data Model'));
      })
    );
  }

  // Find a specific data model by code and version from the cached list, then convert it to D3 hierarchy format
  getDataModelByCodeAndVersion(code: string, version: string): Observable<any> {
    console.log(`getDataModelByCodeAndVersion called with code: ${code}, version: ${version}`);

    return this.getAllDataModels().pipe(
      map((dataModels: any[]) => {
        console.log('Searching for data model in cached models...');
        const foundModel = dataModels.find(
          (model) => model.code === code && model.version === version
        );

        if (foundModel) {
          console.log('Data model found:', foundModel);
          const d3Hierarchy = this.convertToD3Hierarchy(foundModel);
          console.log('Data model converted to D3 hierarchy format:', d3Hierarchy);
          return d3Hierarchy;
        } else {
          console.error(`Data model with code ${code} and version ${version} not found.`);
          throw new Error(`Data model with code ${code} and version ${version} not found.`);
        }
      }),
      catchError((error) => {
        console.error('Error occurred while finding data model:', error);
        return of(null);
      })
    );
  }

  // Convert a data model to D3 hierarchy format
  convertToD3Hierarchy(data: any): any {
    console.log('Converting data model to D3 hierarchy format:', data);

    const convertVariables = (variables: any) =>
      variables.map((v: any) => ({
        name: v.label,
        value: 1,
        code: v.code,
        description: v.description,
        sql_type: v.sql_type,
        isCategorical: v.isCategorical,
        units: v.units,
        minValue: v.minValue,
        maxValue: v.maxValue,
      }));

    const convertGroups = (groups: any) =>
      groups.map((g: any) => ({
        name: g.label,
        code: g.code,
        children: [
          ...convertVariables(g.variables || []),
          ...convertGroups(g.groups || []),
        ],
      }));

    const d3Hierarchy = {
      name: data.label,
      code: data.code,
      children: [
        ...convertVariables(data.variables || []),
        ...convertGroups(data.groups || []),
      ],
    };

    console.log('Converted D3 hierarchy:', d3Hierarchy);
    return d3Hierarchy;
  }
}
