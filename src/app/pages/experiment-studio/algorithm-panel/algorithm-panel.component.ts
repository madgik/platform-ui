import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-algorithm-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './algorithm-panel.component.html',
  styleUrls: ['./algorithm-panel.component.css']
})
export class AlgorithmPanelComponent {
  @Output() algorithmConfigured = new EventEmitter<string>();

  algorithms = ['Algorithm X', 'Algorithm Y', 'Algorithm Z'];

  configureAlgorithm(algorithm: string) {
    this.algorithmConfigured.emit(algorithm);
  }
}
