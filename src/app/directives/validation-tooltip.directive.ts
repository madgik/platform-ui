import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appValidationTooltip]'
})
export class ValidationTooltipDirective {
  private tooltip: HTMLElement | null = null; // Specify tooltip as HTMLElement or null

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  // Show tooltip when the input loses focus and is invalid
  @HostListener('blur') onBlur() {
    if ((this.el.nativeElement as HTMLInputElement).required && !this.el.nativeElement.value) {
      this.showTooltip('This field is required');
    }
  }

  // Hide tooltip when the input is focused again
  @HostListener('focus') onFocus() {
    this.hideTooltip();
  }

  private showTooltip(message: string) {
    if (!this.tooltip) {
      this.tooltip = this.renderer.createElement('span');
      this.renderer.addClass(this.tooltip, 'custom-validation-tooltip');

      // Explicitly cast this.tooltip to HTMLElement to avoid the error
      (this.tooltip as HTMLElement).textContent = message;

      this.renderer.appendChild(document.body, this.tooltip);
    }

    const rect = this.el.nativeElement.getBoundingClientRect();
    this.renderer.setStyle(this.tooltip, 'top', `${rect.bottom + window.scrollY + 5}px`);
    this.renderer.setStyle(this.tooltip, 'left', `${rect.left + window.scrollX}px`);
  }

  // Hide and remove the tooltip
  private hideTooltip() {
    if (this.tooltip) {
      this.renderer.removeChild(document.body, this.tooltip);
      this.tooltip = null;
    }
  }
}
