import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnInit } from '@angular/core';
import {FormsModule} from "@angular/forms";
import {DataModel} from "../../../interfaces/data-model.interface";

@Component({
  selector: 'app-data-model-selector',
  templateUrl: './data-model-selector.component.html',
  styleUrls: ['./data-model-selector.component.css'],
  standalone: true,
  imports: [
    FormsModule,
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
    if (changes['defaultModel'] && changes['defaultModel'].currentValue !== this.defaultModel) {
      this.selectedDataModel = this.defaultModel;
    }
    if (changes['crossSectionalModels'] || changes['longitudinalModels']) {
      // Reset selected data model if inputs change
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
