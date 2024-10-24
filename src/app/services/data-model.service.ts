import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataModelService {
  private apiUrl = 'http://localhost:8090/services/datacatalogue/datamodels';
  private dataModels: any[] = []; // Cache for all loaded data models

  constructor(private http: HttpClient) {}

  // Load all data models from the API and cache them
  loadAllDataModels(): Observable<any[]> {
    console.log('loadAllDataModels called');

    // Check if data models are already loaded in cache
    if (this.dataModels.length > 0) {
      console.log('Returning cached data models:', this.dataModels);
      return of(this.dataModels); // Return cached data models
    }

    // Fetch data models from API
    return this.http.get<any[]>(this.apiUrl).pipe(
      map((dataModels: any[]) => {
        console.log('Data models fetched from API:', dataModels);
        this.dataModels = dataModels; // Cache the data models
        return dataModels;
      }),
      catchError((error) => {
        console.error('Error occurred while fetching data models from API:', error);
        return of([]); // Return an empty array in case of error
      })
    );
  }

  // Find a specific data model by code and version from the cached list, then convert it to D3 hierarchy format
  getDataModelByCodeAndVersion(code: string, version: string): Observable<any> {
    console.log(`getDataModelByCodeAndVersion called with code: ${code}, version: ${version}`);

    // Ensure all data models are loaded before searching
    return this.loadAllDataModels().pipe(
      map((dataModels: any[]) => {
        console.log('Looking for data model in the list of cached models...');
        // Find the data model that matches the given code and version
        const foundModel = dataModels.find(
          (model) => model.code === code && model.version === version
        );

        if (foundModel) {
          console.log('Data model found:', foundModel);
          // Convert the found data model to D3 hierarchy format
          const d3Hierarchy = this.convertToD3Hierarchy(foundModel);
          console.log('Data model converted to D3 hierarchy format:', d3Hierarchy);
          return d3Hierarchy;  // Return the converted D3 hierarchy
        } else {
          console.error(`Data model with code ${code} and version ${version} not found.`);
          throw new Error(`Data model with code ${code} and version ${version} not found.`);
        }
      }),
      catchError((error) => {
        console.error('Error occurred while finding data model:', error);
        return of(null); // Return null if not found or error occurs
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
        children: [
          ...convertVariables(g.variables || []),
          ...convertGroups(g.groups || []),
        ],
      }));

    const d3Hierarchy = {
      name: data.label,
      children: [
        ...convertVariables(data.variables || []),
        ...convertGroups(data.groups || []),
      ],
    };

    console.log('Converted D3 hierarchy:', d3Hierarchy);
    return d3Hierarchy;
  }
}
