import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workflow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow.component.html',
  styleUrls: ['./workflow.component.css']
})
export class WorkflowComponent {
  @Input() currentStep: number = 1;
  @Input() variableName: string = '';
  @Input() transformationName: string = '';
  @Input() filterName: string = '';
}
