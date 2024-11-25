import {Component, Input, Output, EventEmitter, HostListener} from '@angular/core';

@Component({
  selector: 'app-action-menu',
  templateUrl: './action-menu.component.html',
  styleUrls: ['./action-menu.component.css'],
  standalone: true,
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
