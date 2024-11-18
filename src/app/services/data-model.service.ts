import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of, throwError} from 'rxjs';
import {catchError, map, switchMap, tap} from 'rxjs/operators';

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



  // Update the cache with all data models from the API and return an Observable
  loadAllDataModels(): Observable<any[]> {

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

    // Ensure data models are loaded before returning
    return this.loadAllDataModels().pipe(
      map(() => this.dataModels.filter(dataModel => dataModel.released === true))
    );
  }


  // Retrieve all data models, using the cache if available
  getAllDataModels(): Observable<any[]> {

    // Ensure data models are loaded before returning
    return this.loadAllDataModels().pipe(
      map(() => this.dataModels)
    );
  }

  getDataModelsByIds(ids: string[]): Observable<any[]> {
    return this.getAllDataModels().pipe(
      map((dataModels: any[]): any[] => {
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
        const foundModel = dataModels.find(
          (model) => model.code === code && model.version === version
        );

        if (foundModel) {
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

  reloadDataModels(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      tap((dataModels: any[]) => {
        console.log("dataModels:", dataModels)
        this.dataModels = dataModels;
        this.dataModelsLoaded = true;
      }),
      catchError((error) => {
        console.error('Error occurred while reloading data models from API:', error);
        this.dataModels = [];
        this.dataModelsLoaded = false;
        return of([]);
      })
    );
  }



  // Convert a data model to D3 hierarchy format
  convertToD3Hierarchy(data: any): any {

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

  deleteDataModel(fullname: string): Observable<any[]> {
    return this.getDataModelByFullname(fullname).pipe(
      switchMap((data_model) =>
        this.http.delete<void>(`${this.apiUrl}/${data_model.uuid}`).pipe(
          tap(() => console.log(`Data model with uuid ${data_model.uuid} deleted successfully.`)),
          switchMap(() => this.reloadDataModels()) // Reload data models after deletion
        )
      ),
      catchError((error) => {
        console.error('Error deleting data model:', error);
        return throwError(() => error);
      })
    );
  }

  releaseDataModel(fullname: string): Observable<any[]> {
    return this.getDataModelByFullname(fullname).pipe(
      switchMap((data_model) =>
        this.http.post<void>(`${this.apiUrl}/${data_model.uuid}/release`, {}).pipe(
          tap(() => console.log(`Data model with uuid ${data_model.uuid} released successfully.`)),
          switchMap(() => this.reloadDataModels()) // Reload data models after release
        )
      ),
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
