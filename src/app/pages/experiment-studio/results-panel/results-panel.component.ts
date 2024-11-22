import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionComponent } from '../../shared/accordion/accordion.component';

@Component({
  selector: 'app-results-panel',
  standalone: true,
  imports: [CommonModule, AccordionComponent],
  templateUrl: './results-panel.component.html',
  styleUrls: ['./results-panel.component.css']
})
export class ResultsPanelComponent {
  accordionTitle = "Results"
}
