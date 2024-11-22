import { Component, Input, Output, EventEmitter } from '@angular/core';
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-node-info',
  template: `
    <div class="node-info">
      <button class="toggle-node-info-button" (click)="toggleVisibility()">
        {{ visible ? 'Hide Node Info' : 'Show Node Info' }}
      </button>

      <div *ngIf="visible">
        <h3>{{ hasChildren ? 'Group Information' : 'Variable Information' }}</h3>

        <p><strong>Code:</strong> {{ selectedNode.code || 'N/A' }}</p>
        <p><strong>Name:</strong> {{ selectedNode.name || 'N/A' }}</p>

        <div *ngIf="hasChildren; else variableDetails">
          <p><strong>Number of Variables:</strong> {{ countLeafNodes() }}</p>
        </div>

        <ng-template #variableDetails>
          <p *ngIf="fieldExists('description')">
            <strong>Description:</strong> {{ selectedNode.description }}
          </p>
          <p *ngIf="fieldExists('sql_type')">
            <strong>SQL Type:</strong> {{ selectedNode.sql_type }}
          </p>
          <p *ngIf="fieldExists('isCategorical')">
            <strong>Is Categorical:</strong>
            {{ selectedNode.isCategorical ? 'Yes' : 'No' }}
          </p>
          <p *ngIf="fieldExists('units')">
            <strong>Units:</strong> {{ selectedNode.units }}
          </p>
          <p *ngIf="fieldExists('minValue')">
            <strong>Min Value:</strong> {{ selectedNode.minValue }}
          </p>
          <p *ngIf="fieldExists('maxValue')">
            <strong>Max Value:</strong> {{ selectedNode.maxValue }}
          </p>
        </ng-template>
      </div>
    </div>
  `,
  styleUrls: ['./node-info.component.css'],
  standalone: true,
  imports: [
    NgIf
  ]
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
