import { Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExperimentStudioService } from './../../../../services/experiment-studio.service';

@Component({
  selector: 'app-algorithm-description-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './algorithm-description-modal.component.html',
  styleUrls: ['./algorithm-description-modal.component.css'],
})
export class AlgorithmDescriptionModalComponent {
  private readonly expStudio = inject(ExperimentStudioService);

  @Output() saveDescription = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  readonly editingExistingExperiment = this.expStudio.editingExistingExperiment;
  readonly experimentDescription = this.expStudio.experimentDescription;

  saveDescriptionClick() {
    this.saveDescription.emit(this.experimentDescription());
  }

  closeDescriptionModal() {
    this.cancel.emit();
  }

  onExperimentDescriptionChange(value: string) {
    this.expStudio.setExperimentDescription(value);
  }
}
