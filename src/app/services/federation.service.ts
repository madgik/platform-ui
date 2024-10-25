import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {Federation} from "../interfaces/federations.interface";

@Injectable({
  providedIn: 'root',  // Ensure it's provided at root level
})
export class FederationService {
  private apiUrl = 'http://localhost:8090/services/datacatalogue/federations';

  constructor(private http: HttpClient) {}  // Inject HttpClient

  getFederations(): Observable<Federation[]> {
    return this.http.get<Federation[]>(this.apiUrl);  // API call
  }
}
