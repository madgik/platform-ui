import { Component, Input, Output, EventEmitter } from '@angular/core';
import {NgClass, NgForOf, NgIf} from "@angular/common";

@Component({
    selector: 'app-filter',
    template: `
        <div class="filter-links">
      <span
              *ngFor="let filter of filters; let i = index"
              [ngClass]="{'active-filter': filter === selectedFilter}"
              (click)="onFilterSelect(filter)"
      >
        {{ filter }}
          <span *ngIf="i < filters.length - 1"> | </span>
      </span>
        </div>
    `,
    styleUrls: ['./filter.component.css'],
    imports: [
        NgForOf,
        NgClass,
        NgIf
    ],
    standalone: true
})
export class FilterComponent {
    @Input() filters: string[] = [];
    @Input() selectedFilter = '';
    @Output() filterChange = new EventEmitter<string>();

    onFilterSelect(filter: string) {
        this.filterChange.emit(filter);
    }
}
