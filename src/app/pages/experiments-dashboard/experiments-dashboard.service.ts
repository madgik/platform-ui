import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
   providedIn: 'root'
})
export class ExperimentsService {
  private experiments = [
    { id: 1, name: 'Experiment 1', description: 'Details for Experiment 1' },
    { id: 2, name: 'Experiment 2', description: 'Details for Experiment 2' },
  ];

  getExperiments(): Observable<any[]> {
    return of(this.experiments);
  }

  getExperimentDetails(id: number): Observable<any> {
    return of(this.experiments.find(exp => exp.id === id));
  }
}
