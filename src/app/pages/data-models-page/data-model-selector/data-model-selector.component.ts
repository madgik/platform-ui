import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnInit } from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgForOf, NgIf} from "@angular/common";
import {DataModel} from "../../../interfaces/data-model.interface";

@Component({
  selector: 'app-data-model-selector',
  template: `
    <div>
      <label for="dataModel">Select Data Model:</label>
      <select
        class="dropdown"
        id="dataModel"
        [(ngModel)]="selectedDataModel"
        (change)="onDataModelChange()"
        aria-labelledby="dataModel"
      >
        <!-- Cross-Sectional Data Models Group -->
        <optgroup *ngIf="crossSectionalModels.length > 0" label="Cross-Sectional">
          <option
            *ngFor="let model of crossSectionalModels"
            [ngValue]="model"
          >
            {{ model.code + '_' + model.version }}
          </option>
        </optgroup>

        <!-- Longitudinal Data Models Group -->
        <optgroup *ngIf="longitudinalModels.length > 0" label="Longitudinal">
          <option
            *ngFor="let model of longitudinalModels"
            [ngValue]="model"
          >
            {{ model.code + '_' + model.version }}
          </option>
        </optgroup>
      </select>
    </div>
  `,
  styleUrls: ['./data-model-selector.component.css'],
  standalone: true,
  imports: [
    FormsModule,
    NgForOf,
    NgIf
  ]
})
export class DataModelSelectorComponent implements OnChanges, OnInit {
  @Input() crossSectionalModels: DataModel[] = [];
  @Input() longitudinalModels: DataModel[] = [];
  @Input() defaultModel: DataModel | null = null;

  @Output() dataModelChange = new EventEmitter<DataModel>();

  selectedDataModel: DataModel | null = null;

  ngOnInit(): void {
    this.selectedDataModel = this.defaultModel;
    this.onDataModelChange();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['defaultModel']) {
      this.selectedDataModel = this.defaultModel;
    }
  }

  onDataModelChange(): void {
    if (this.selectedDataModel) {
      console.log('Data Model Changed:', this.selectedDataModel);
      this.dataModelChange.emit(this.selectedDataModel);
    }
  }
}
