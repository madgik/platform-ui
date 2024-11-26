import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-node-info',
  templateUrl: './node-info.component.html',
  styleUrls: ['./node-info.component.css'],
  standalone: true,
})
export class NodeInfoComponent {
  @Input() selectedNode: any | null = null;
  @Output() visibilityChange = new EventEmitter<boolean>();

  visible: boolean = true;

  get hasChildren(): boolean {
    return this.selectedNode?.children && this.selectedNode.children.length > 0;
  }

  toggleVisibility(): void {
    this.visible = !this.visible;
    this.visibilityChange.emit(this.visible); // Notify parent about the change
  }

  /**
   * Recursively counts the number of leaf nodes for the selected node.
   * A leaf node is defined as a node without children.
   * Assumes selectedNode has children when this is called.
   * @returns The number of leaf nodes.
   */
  countLeafNodes(): number {
    const countLeaves = (node: any): number => {
      if (!node.children || node.children.length === 0) {
        return 1; // Leaf node
      }
      return node.children.reduce((leafCount: number, child: any) => leafCount + countLeaves(child), 0);
    };


    return countLeaves(this.selectedNode);
  }

  /**
   * Checks if a given field exists in the selectedNode.
   * @param field The field name to check.
   * @returns true if the field exists and is not undefined, false otherwise.
   */
  fieldExists(field: string): boolean {
    return this.selectedNode && field in this.selectedNode && this.selectedNode[field] !== undefined;
  }
}
