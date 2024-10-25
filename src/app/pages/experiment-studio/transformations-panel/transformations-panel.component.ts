import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionComponent } from '../../../shared/accordion/accordion.component';

@Component({
  selector: 'app-transformations-panel',
  standalone: true,
  imports: [CommonModule, AccordionComponent],
  templateUrl: './transformations-panel.component.html',
  styleUrls: ['./transformations-panel.component.css']
})
export class TransformationsPanelComponent {
  accordionTitle: string = 'Transformations';

  @Output() transformationApplied = new EventEmitter<string>();

  transformations = ['Transformation 1', 'Transformation 2', 'Transformation 3'];

  applyTransformation(transformation: string) {
    this.transformationApplied.emit(transformation);
  }
}
