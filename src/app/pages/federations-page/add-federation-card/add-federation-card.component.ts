import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-add-federation-card',
  template: `
    <div class="federation-card add-new-card" (click)="onAddNew()">
      <div class="add-card-content">
        <div class="add-icon">+</div>
        <h3>Add New Federation</h3>
      </div>
    </div>
  `,
  styleUrls: ['./add-federation-card.component.css'],
  standalone: true
})
export class AddFederationCardComponent {
  @Output() addNew = new EventEmitter<void>();

  onAddNew() {
    this.addNew.emit();
  }
}
