import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css'],
  standalone: true,
  imports: [FormsModule]
})
export class SearchBarComponent {
  @Input() variables: any[] = []; // List of variables
  @Input() groups: any[] = []; // List of groups
  @Output() selectedItem = new EventEmitter<any>();

  searchQuery: string = '';
  filteredVariables: any[] = [];
  filteredGroups: any[] = [];
  isDropdownOpen: boolean = false;

  ngOnInit() {
    this.filteredVariables = [...this.variables];
    this.filteredGroups = [...this.groups];
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.filterItems(); // Show all items initially
    }
  }

  onSearchInput(): void {
    this.filterItems();
  }

  filterItems(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredVariables = this.variables.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
    this.filteredGroups = this.groups.filter((group) =>
      group.name.toLowerCase().includes(query)
    );
  }

  selectItem(item: any): void {
    this.selectedItem.emit(item);
    this.isDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  closeDropdown(event: Event): void {
    if (!(event.target as HTMLElement).closest('.search-container')) {
      this.isDropdownOpen = false;
    }
  }
}
