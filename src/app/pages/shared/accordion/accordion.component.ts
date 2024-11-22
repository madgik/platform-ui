import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-accordion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.css']
})
export class AccordionComponent {
  @Input() accordionTitle: string = '';
  @Input() openByDefault: boolean = false;
  @Input() padding: string = '20px';
  @Input() fontSize: string = '1.2rem';

  isOpen: boolean = this.openByDefault;

  toggleAccordion() {
    this.isOpen = !this.isOpen;
  }
}
