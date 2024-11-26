import { Component, Input, Output, EventEmitter } from '@angular/core';
import {NgClass} from "@angular/common";

@Component({
    selector: 'app-filter',
    templateUrl: './filter.component.html',
    styleUrls: ['./filter.component.css'],
    imports: [
        NgClass,
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
