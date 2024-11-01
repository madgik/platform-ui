import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Federation } from '../interfaces/federations.interface';
import { DataModelService } from './data-model.service';  // Ensure you import DataModelService

@Injectable({
  providedIn: 'root',
})
export class FederationService {
  private apiUrl = '/services/datacatalogue/federations';

  constructor(private http: HttpClient, private dataModelService: DataModelService) {}

  // Fetch federations and resolve data model IDs to full names
  getFederationsWithFullDataModelNames(): Observable<Federation[]> {
    return this.http.get<Federation[]>(this.apiUrl).pipe(
      switchMap((federations) => {
        // For each federation, get data models' full names
        const federationObservables = federations.map(federation =>
          this.dataModelService.getDataModelsFullNamesByIds(federation.dataModelIds).pipe(
            map((fullNames) => ({
              ...federation,
              dataModels: fullNames,  // Replace `dataModelIds` with full names
            })),
            catchError((error) => {
              console.error(`Error resolving data models for federation ${federation.code}:`, error);
              return of({ ...federation, dataModels: ['Error loading data models'] });
            })
          )
        );
        return forkJoin(federationObservables);  // Execute all observables and return updated federations
      })
    );
  }
}
