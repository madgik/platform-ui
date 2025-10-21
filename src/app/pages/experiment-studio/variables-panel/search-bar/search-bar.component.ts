import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  ElementRef,
  HostListener,
  SimpleChanges,
  OnChanges
} from '@angular/core';
import { FormsModule } from "@angular/forms";
import { NgForOf, NgIf } from "@angular/common";

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    NgForOf
  ],
  styleUrls: ['./search-bar.component.css']
})
export class SearchBarComponent implements OnInit, OnChanges {
  @Input() dataModelHierarchy: any;
  @Output() searchResultSelected = new EventEmitter<string>();

  searchQuery: string = '';
  variables: { name: string; type: string; path: string }[] = [];
  groups: { name: string; path: string }[] = [];
  filteredItems: any[] = [];
  searchSuggestionsVisible = false;
  isSearchExpanded = false;
  filterType: string = 'variables'; // Default filter type
  variableTypeFilter: string = ''; // Additional variable type filter
  variableTypes: string[] = []; // List of available variable types

  constructor(private eRef: ElementRef) { }

  ngOnInit(): void {
    if (this.dataModelHierarchy) {
      this.extractVariablesAndGroups(this.dataModelHierarchy);
    } else {
      console.warn("⚠️ No data model hierarchy provided!");
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataModelHierarchy']?.currentValue) {

      // Ensure variables and groups are cleared before reloading
      this.variables = [];
      this.groups = [];
      this.variableTypes = [];

      // Extract variables and groups
      this.extractVariablesAndGroups(this.dataModelHierarchy);

    } else {
      console.warn("⚠️ No changes detected in `dataModelHierarchy`");
    }
  }

  expandSearch(event: MouseEvent): void {
    event.stopPropagation();
    this.isSearchExpanded = true;
  }

  closeSearch(): void {
    this.isSearchExpanded = false;
    this.searchQuery = '';
    this.searchSuggestionsVisible = false;
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: Event): void {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.closeSearch();
    }
  }

  /**
   * Extracts variables and groups from the data model hierarchy.
   */
  // extractVariablesAndGroups(hierarchy: any): void {
  //   console.log("📌 Extracting Variables and Groups...");

  //   const traverse = (node: any, path: string) => {
  //     if (!node) return;

  //     const currentPath = path ? `${path} > ${node.name}` : node.name;

  //     if (node.hasOwnProperty('variableCount')) {
  //       console.log(`📂 Found Group: ${node.name}`);
  //       this.groups.push({ name: node.name, path: currentPath });

  //       if (node.children) {
  //         node.children.forEach((child: any) => traverse(child, currentPath));
  //       }
  //     } else if (node.hasOwnProperty('type')) {
  //       console.log(`🔢 Found Variable: ${node.name} (Type: ${node.type})`);
  //       this.variables.push({ name: node.name, type: node.type, path: currentPath });

  //       if (!this.variableTypes.includes(node.type)) {
  //         this.variableTypes.push(node.type);
  //       }
  //     } else {
  //       console.warn(`⚠️ Unknown Node Type:`, node);
  //     }
  //   };

  //   traverse(hierarchy, '');

  //   console.log("✅ Extracted Variables:", this.variables);
  //   console.log("✅ Extracted Groups:", this.groups);
  // }

  extractVariablesAndGroups(hierarchy: any): void {
    this.variables = [];
    this.groups = [];
    this.variableTypes = [];

    const traverse = (node: any, path: string) => {
      if (!node) return;
      const currentPath = path ? `${path} > ${node.name}` : node.name;

      // Όλα όσα έχουν children τα θεωρώ ομάδες
      if (Array.isArray(node.children) && node.children.length > 0) {
        this.groups.push({ name: node.name, path: currentPath });
        node.children.forEach((child: any) => traverse(child, currentPath));

        // Αν δεν έχουν children αλλά έχουν type, τα θεωρώ μεταβλητές
      } else if (typeof node.type === 'string' || Array.isArray(node.type)) {
        this.variables.push({
          name: node.name,
          type: node.type as string,
          path: currentPath
        });
        if (!this.variableTypes.includes(node.type as string)) {
          this.variableTypes.push(node.type as string);
        }
      }
    };

    traverse(hierarchy, '');
  }


  /**
   * Handles the search query input.
   */
  handleSearch(query: string): void {
    this.searchQuery = query.toLowerCase();
    // this.applyFilter(this.filterType);
    // console.log("🔎 Searching for:", this.searchQuery);
    // console.log("🔍 Filtered Items:", this.filteredItems);
    this.searchSuggestionsVisible = this.filteredItems.length > 0;
  }

  /**
   * Applies the filter for either variables or groups.
   */
  applyFilter(type: string): void {
    if (type === 'variables') {
      this.filteredItems = this.variables.filter(
        (v) =>
          v.name.toLowerCase().includes(this.searchQuery) &&
          (this.variableTypeFilter ? v.type === this.variableTypeFilter : true)
      );
    } else if (type === 'groups') {
      this.filteredItems = this.groups.filter((g) =>
        g.name.toLowerCase().includes(this.searchQuery)
      );
    }

    // console.log("✅ Filtered Items After Applying Filter:", this.filteredItems);
  }

  /**
   * Applies the variable type filter.
   */
  applyVariableTypeFilter(type: string): void {
    console.log(`📌 Applying Variable Type Filter: ${type}`);
    this.variableTypeFilter = type;
    this.applyFilter(this.filterType);
  }

  /**
   * Handles clicking on a search suggestion.
   */
  onItemClick(item: any): void {
    // console.log("✅ Selected Item:", item);
    this.searchQuery = item.name || item;
    this.searchSuggestionsVisible = false;
    this.searchResultSelected.emit(this.searchQuery);
  }

  /**
   * Generates tooltip text for search results.
   */
  generateTooltip(item: any): string {
    if ('type' in item) {
      return `Path: ${item.path}\nType: ${item.type}`;
    }
    return `Path: ${item.path}`;
  }

  /**
   * Handles focus event on the search bar.
   */
  onSearchFocus(): void {
    this.searchSuggestionsVisible = true;
    this.handleSearch(this.searchQuery);
  }
}
