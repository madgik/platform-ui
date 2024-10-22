import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-transformations-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transformations-panel.component.html',
  styleUrls: ['./transformations-panel.component.css']
})
export class TransformationsPanelComponent {
  @Output() transformationApplied = new EventEmitter<string>();

  transformations = ['Transformation 1', 'Transformation 2', 'Transformation 3'];

  applyTransformation(transformation: string) {
    this.transformationApplied.emit(transformation);
  }
}
