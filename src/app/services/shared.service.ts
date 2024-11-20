import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private modalVisibility = signal(false); // Manages the visibility of the modal

  // Method to open the modal
  showModal() {
    this.modalVisibility.set(true);
  }

  // Method to close the modal
  closeModal() {
    this.modalVisibility.set(false);
  }

  // Returns the observable for modal visibility
  isModalVisible() {
    return this.modalVisibility.asReadonly();
  }
}
