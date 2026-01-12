import { Component, Input, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-accordion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.css'],
})
export class AccordionComponent implements OnInit, OnChanges {
  @Input() accordionTitle: string = '';
  @Input() fontSize: string = '1.2rem';
  @Input() startOpen: boolean = false;
  @Input() openByDefault: boolean = false;

  isOpen = signal(false);

  private userToggled = false;

  ngOnInit() {
    const initial = this.startOpen ?? this.openByDefault;
    this.isOpen.set(!!initial);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['startOpen'] || changes['openByDefault']) &&
      !this.userToggled
    ) {
      const val = this.startOpen ?? this.openByDefault;
      this.isOpen.set(!!val);
    }
  }

  toggleAccordion() {
    this.userToggled = true;
    this.isOpen.update((open) => !open);
  }
}
