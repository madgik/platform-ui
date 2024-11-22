import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import {DataModel} from "../interfaces/data-model.interface";

@Injectable({
  providedIn: 'root',
})
export class DataModelService {
  private apiUrl = '/services/datamodels';
  private dataModels: any[] = []; // Cache for all data models
  private dataModelsLoaded = false; // Flag to track cache loading

  constructor(private http: HttpClient) {}

  // Fetch and cache all data models
  loadAllDataModels(): Observable<any[]> {
    if (!this.dataModelsLoaded) {
      return this.http.get<any[]>(this.apiUrl).pipe(
        tap((dataModels) => {
          this.dataModels = dataModels;
          this.dataModelsLoaded = true;
        }),
        catchError((error) => {
          console.error('Error fetching data models:', error);
          return of([]);
        })
      );
    }
    return of(this.dataModels);
  }

  // Retrieve all data models, using the cache if available
  getAllReleasedDataModels(): Observable<any[]> {

    // Ensure data models are loaded before returning
    return this.loadAllDataModels().pipe(
      map(() => this.dataModels.filter(dataModel => dataModel.released === true))
    );
  }

  exportDataModel(data_model: DataModel, fileType: 'json' | 'xlsx'): void {
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
  }

  reloadDataModels(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      tap((dataModels) => {
        this.dataModels = dataModels;
        this.dataModelsLoaded = true;
      }),
      catchError((error) => {
        console.error('Error reloading data models:', error);
        return of([]);
      })
    );
  }

  // Get all data models from cache or API
  getAllDataModels(): Observable<any[]> {
    return this.loadAllDataModels();
  }



  // Get data models by federation IDs
  getDataModelsByIds(ids: string[]): Observable<any[]> {
    return this.getAllDataModels().pipe(
      map((dataModels) => dataModels.filter((model) => ids.includes(model.uuid))),
      catchError((error) => {
        console.error('Error fetching data models by IDs:', error);
        return of([]);
      })
    );
  }

  // Categorize data models into cross-sectional and longitudinal
  categorizeDataModels(dataModels: DataModel[]): {
    crossSectional: DataModel[];
    longitudinal: DataModel[];
  } {
    const crossSectional = dataModels.filter((model) => !model.longitudinal);
    const longitudinal = dataModels.filter((model) => model.longitudinal);

    return { crossSectional, longitudinal };
  }


  // Utility to find the default data model (first available)
  getDefaultDataModel(dataModels: any[]): DataModel | null {
    const { crossSectional, longitudinal } = this.categorizeDataModels(dataModels);
    return crossSectional[0] || longitudinal[0] || null;
  }

  // Convert data model to D3 hierarchy format
  convertToD3Hierarchy(data: any): any {
    const convertVariables = (variables: any[]) =>
      variables.map((v) => ({
        name: v.label,
        value: 1,
        ...v,
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

    return  {
      name: data.label,
      code: data.code,
      children: [
        ...convertVariables(data.variables || []),
        ...convertGroups(data.groups || []),
      ],
    };

  }

  //CRUD:

  deleteDataModel(dataModelId: string): Observable<any[]> {
    return this.http.delete<void>(`${this.apiUrl}/${dataModelId}`).pipe(
      switchMap(() => this.reloadDataModels()), // Reload data models after deletion
      catchError((error) => {
        console.error('Error deleting data model:', error);
        return throwError(() => error);
      })
    );
  }

  releaseDataModel(dataModelId: string): Observable<any[]> {
    return this.http.post<void>(`${this.apiUrl}/${dataModelId}/release`, {}).pipe(
      switchMap(() => this.reloadDataModels()), // Reload data models after release
      catchError((error) => {
        console.error('Error releasing data model:', error);
        return throwError(() => error);
      })
    );
  }


  createDataModelFromExcel(file: File, version: string, longitudinal: string): Observable<any[]> {
    const url = `${this.apiUrl}/import`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);
    formData.append('longitudinal', longitudinal);

    return this.http.post<void>(url, formData).pipe(
      switchMap(() => this.reloadDataModels()), // Reload data models after creation
      tap(() => console.log('Data model created successfully from Excel.')),
      catchError((error) => {
        console.error('Error creating Excel data model:', error);
        return throwError(() => error);
      })
    );
  }


  createDataModelFromJson(file: File): Observable<void> {
    const url = `${this.apiUrl}`;
    return new Observable<void>((observer) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataModelDTO = JSON.parse(reader.result as string);
          this.http.post<void>(url, dataModelDTO).subscribe({
            next: () => {
              console.log('Data model created successfully from JSON.');
              this.reloadDataModels().subscribe(() => {
                console.log('Data models reloaded after JSON creation.');
                observer.next();
                observer.complete();
              });
            },
            error: (error) => observer.error(error),
          });
        } catch (error) {
          observer.error('Error parsing JSON file: ' + error);
        }
      };
      reader.readAsText(file);
    });
  }



  updateDataModelFromJson(dataModelId: string, file: File): Observable<void> {
    const url = `${this.apiUrl}/${dataModelId}`;
    return new Observable<void>((observer) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataModelDTO = JSON.parse(reader.result as string);
          this.http.put<void>(url, dataModelDTO).subscribe({
            next: () => {
              console.log('Data model updated successfully (JSON).');
              this.reloadDataModels().subscribe(() => {
                console.log('Data models reloaded after JSON update.');
                observer.next();
                observer.complete();
              });
            },
            error: (error) => observer.error(error),
          });
        } catch (error) {
          observer.error('Error parsing JSON file: ' + error);
        }
      };
      reader.readAsText(file);
    });
  }

  updateDataModelFromExcel(dataModelId: string, file: File, version: string, longitudinal: string): Observable<any[]> {
    const url = `${this.apiUrl}/${dataModelId}/excel`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);
    formData.append('longitudinal', longitudinal);

    return this.http.put<void>(url, formData).pipe(
      switchMap(() => this.reloadDataModels()), // Reload data models after update
      tap(() => console.log('Data model updated successfully (Excel).')),
      catchError((error) => {
        console.error('Error updating data model (Excel):', error);
        return throwError(() => error);
      })
    );
  }
}
