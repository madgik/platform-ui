import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Federation } from '../interfaces/federations.interface';
import { DataModelService } from './data-model.service';

@Injectable({
  providedIn: 'root',
})
export class FederationService {
  private apiUrl = '/services/federations';

  constructor(private http: HttpClient, private dataModelService: DataModelService) {}


  // Fetch federations and resolve data model IDs to full names
  getFederationsWithFullDataModelNames(): Observable<Federation[]> {
    return this.http.get<Federation[]>(this.apiUrl).pipe(
      switchMap((federations) => {
        const federationObservables = federations.map(federation =>
          this.dataModelService.getDataModelsFullNamesByIds(federation.dataModelIds).pipe(
            map((fullNames) => ({
              ...federation,
              dataModels: fullNames,
            })),
            catchError((error) => {
              console.error(`Error resolving data models for federation ${federation.code}:`, error);
              return of({ ...federation, dataModels: ['Error loading data models'] });
            })
          )
        );
        return forkJoin(federationObservables);
      })
    );
  }

  // Create a new federation
  createFederation(federation: Federation): Observable<Federation> {
    return this.http.post<Federation>(this.apiUrl, federation).pipe(
      catchError((error) => {
        console.error('Error creating federation:', error);
        throw error;
      })
    );
  }

  updateFederation(code: string, federation: Federation): Observable<Federation> {
    const url = `${this.apiUrl}/${code}`; // Construct the URL with the federation code
    return this.http.put<Federation>(url, federation).pipe(
      catchError((error) => {
        console.error('Error updating federation:', error);
        throw error;
      })
    );
  }

  deleteFederation(code: string): void {
    this.http.delete<void>(`${this.apiUrl}/${code}`).subscribe({
      next: () => console.log(`Federation with code ${code} deleted successfully.`),
      error: (error) => console.error('Error deleting federation:', error)
    });
  }
}
