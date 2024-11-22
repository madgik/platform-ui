import {Component, Input, Output, EventEmitter, HostListener} from '@angular/core';
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-action-menu',
  template: `
    <div class="action-menu" role="menu" aria-label="Action Menu">
      <!-- Three-dots button to open/close the menu -->
      <button
        class="three-dots-button"
        aria-haspopup="true"
        [attr.aria-expanded]="menuVisible"
        aria-controls="options-menu"
        aria-label="Open actions menu"
        (click)="toggleMenu()"
      >
        &#8942;
      </button>

      <!-- Menu backdrop (only visible when menu is open) -->
      <div *ngIf="menuVisible" class="menu-backdrop" (click)="toggleMenu()"></div>

      <!-- Options menu for actions -->
      <div *ngIf="menuVisible" class="options-menu" role="menu" id="options-menu">
        <button (click)="emitAction('add')" role="menuitem">Add Data Model</button>
        <button
          *ngIf="!isSelectedDataModelReleased"
          (click)="emitAction('update')"
          role="menuitem"
        >
          Update Data Model
        </button>
        <button
          *ngIf="!isSelectedDataModelReleased"
          (click)="emitAction('delete')"
          role="menuitem"
        >
          Delete Data Model
        </button>
        <button
          *ngIf="!isSelectedDataModelReleased"
          (click)="emitAction('release')"
          role="menuitem"
        >
          Release Data Model
        </button>
      </div>
    </div>

  `,
  styleUrls: ['./action-menu.component.css'],
  standalone: true,
  imports: [
    NgIf
  ]
})
export class ActionMenuComponent {
  @Input() isSelectedDataModelReleased: boolean = false; // Determines menu options
  @Output() action = new EventEmitter<string>(); // Emits actions to parent
  @Output() menuVisibleChange = new EventEmitter<boolean>();

  menuVisible: boolean = false;
  toggleMenu(): void {
    this.menuVisible = !this.menuVisible;
    this.emitMenuVisibilityChange();
  }

  private emitMenuVisibilityChange(): void {
    this.menuVisibleChange.emit(this.menuVisible);
  }

  emitAction(actionType: string): void {
    this.action.emit(actionType);
    this.menuVisible = false;
    this.menuVisibleChange.emit(this.menuVisible);
  }


  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    if (this.menuVisible) {
      this.toggleMenu();
    }
  }
}
