import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Federation } from '../../../interfaces/federations.interface';

@Component({
  selector: 'app-federation-card',
  templateUrl: './federation-card.component.html',
  styleUrls: ['./federation-card.component.css'],
  standalone: true
})
export class FederationCardComponent {
  @Input() federation!: Federation;
  @Input() isAdmin = false;
  @Output() updateFederation = new EventEmitter<string>();
  @Output() deleteFederation = new EventEmitter<string>();
  @Output() visualizeDataModel = new EventEmitter<string>();

  viewDataModel() {
    this.visualizeDataModel.emit(this.federation.code);
  }

  update() {
    this.updateFederation.emit(this.federation.code);
  }

  delete() {
    this.deleteFederation.emit(this.federation.code);
  }
}
