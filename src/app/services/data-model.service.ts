import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataModelService {
  private apiUrl = '/services/datamodels';
  private dataModels: any[] = []; // Cache for all loaded data models
  private dataModelsLoaded: boolean = false; // Flag to track if data models are loaded

  constructor(private http: HttpClient) {
    this.loadAllDataModels().subscribe();
  }

  deleteDataModel(fullname: string): void {
    this.getDataModelByFullname(fullname).subscribe({
      next: (data_model) => {
        console.log("Data model to be deleted has uuid:", data_model.uuid);

        // Make the DELETE request and subscribe to it
        this.http.delete<void>(`${this.apiUrl}/${data_model.uuid}`).subscribe({
          next: () => console.log(`Data model with uuid ${data_model.uuid} deleted successfully.`),
          error: (error) => console.error('Error deleting data model:', error)
        });
      },
      error: (error) => console.error('Error finding data model for deletion:', error),
    });
  }

  releaseDataModel(fullname: string): void {
    this.getDataModelByFullname(fullname).subscribe({
      next: (data_model) => {
        console.log("Data model to be released has uuid:", data_model.uuid);

        // Make the POST request to release the data model
        this.http.post<void>(`${this.apiUrl}/${data_model.uuid}/release`, {}).subscribe({
          next: () => console.log(`Data model with uuid ${data_model.uuid} released successfully.`),
          error: (error) => console.error('Error releasing data model:', error)
        });
      },
      error: (error) => console.error('Error finding data model for release:', error),
    });
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
  getAllReleasedDataModels(): Observable<any[]> {
    console.log('getAllDataModels called');

    // Ensure data models are loaded before returning
    return this.loadAllDataModels().pipe(
      map(() => this.dataModels.filter(dataModel => dataModel.released === true))
    );
  }


  // Retrieve all data models, using the cache if available
  getAllDataModels(): Observable<any[]> {
    console.log('getAllDataModels called');

    // Ensure data models are loaded before returning
    return this.loadAllDataModels().pipe(
      map(() => this.dataModels)
    );
  }

  getDataModelsByIds(ids: string[]): Observable<any[]> {
    return this.getAllDataModels().pipe(
      map((dataModels: any[]): any[] => {
        console.log('Filtering data models by IDs');
        return dataModels.filter(model => ids.includes(model.uuid));
      }),
      catchError(error => {
        console.error('Error loading data models by IDs:', error);
        return of([]); // Return an empty array on error
      })
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
  getDataModelByFullname(fullname: string): Observable<any> {
    const lastUnderscoreIndex = fullname.lastIndexOf('_');
    const code = fullname.substring(0, lastUnderscoreIndex);
    const version = fullname.substring(lastUnderscoreIndex + 1);

    console.log(`getDataModelByFullname called with code: ${code}, version: ${version}`);

    return this.getAllDataModels().pipe(
      map((dataModels: any[]) => {
        console.log('Searching for data model in cached models...');
        const foundModel = dataModels.find(
          (model) => model.code === code && model.version === version
        );

        if (foundModel) {
          console.log('Data model found:', foundModel);
          return foundModel
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


  createDataModelFromExcel(file:File, version:string, longitudinal:string){
    const url = `${this.apiUrl}/import`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);
    formData.append('longitudinal', longitudinal);

    this.http.post(url, formData).subscribe();
  }

  createDataModelFromJson(file:File){
    const url = `${this.apiUrl}`;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataModelDTO = JSON.parse(reader.result as string);
        this.http.post(url, dataModelDTO).subscribe();
      } catch (error) {
        console.error('Error parsing JSON file:', error);
      }
    };
    reader.readAsText(file);
  }

  updateDataModelFromExcel(dataModelId:string, file:File, version:string, longitudinal:string){
    const url = `${this.apiUrl}/${dataModelId}/excel`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);
    formData.append('longitudinal', longitudinal);

    this.http.put(url, formData).subscribe();
  }

  updateDataModelFromJson(dataModelId:string, file:File){
    const url = `${this.apiUrl}/${dataModelId}`;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataModelDTO = JSON.parse(reader.result as string);
        this.http.put(url, dataModelDTO).subscribe();
      } catch (error) {
        console.error('Error parsing JSON file:', error);
      }
    };
    reader.readAsText(file);
  }

  exportDataModel(fullname: string, fileType: 'json' | 'xlsx'): void {
    this.getDataModelByFullname(fullname).subscribe({
      next: (data_model) => {
        const url = fileType === 'json'
          ? `${this.apiUrl}/${data_model.uuid}`
          : `${this.apiUrl}/${data_model.uuid}/export`;

        if (fileType === 'json') {
          // JSON case: specify responseType as 'json' and handle the JSON data
          this.http.get<any>(url, { responseType: 'json' }).subscribe(
            (response) => {
              // Beautify the JSON by adding indentation with 2 spaces
              const beautifiedJson = JSON.stringify(response, null, 2);
              const blob = new Blob([beautifiedJson], { type: 'application/json' });
              const link = document.createElement('a');
              link.href = window.URL.createObjectURL(blob);
              link.download = `${data_model.code}_${data_model.version}.json`;
              link.click();
            },
            (error) => {
              console.error('Error exporting JSON data model:', error);
            }
          );
        } else {
          // XLSX case: specify responseType as 'blob' and handle the binary data
          this.http.get(url, { responseType: 'blob' }).subscribe(
            (response) => {
              const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              const link = document.createElement('a');
              link.href = window.URL.createObjectURL(blob);
              link.download = `${data_model.code}_${data_model.version}.xlsx`;
              link.click();
            },
            (error) => {
              console.error('Error exporting XLSX data model:', error);
            }
          );
        }
      },
      error: (error) => console.error('Error finding data model for export:', error),
    });
  }


  // Convert a data model to D3 hierarchy format
  convertToD3Hierarchy(data: any): any {
    console.log('Converting data model to D3 hierarchy format:', data);

    const convertVariables = (variables: any) =>
      variables.map((v: any) => ({
        name: v.label,
        value: 1,
        code: v.code,
        label: v.label,
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
