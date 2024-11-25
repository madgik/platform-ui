import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-add-federation-card',
  templateUrl: './add-federation-card.component.html',
  styleUrls: ['./add-federation-card.component.css'],
  standalone: true
})
export class AddFederationCardComponent {
  @Output() addNew = new EventEmitter<void>();

  onAddNew() {
    this.addNew.emit();
  }
}
