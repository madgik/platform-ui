import { Component, Output, EventEmitter, computed, signal, Input } from '@angular/core';
import { ExperimentsDashboardService } from '../../../services/experiments-dashboard.service';
import { Experiment } from '../../../models/experiments-dashboard.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExperimentSearchComponent } from '../experiment-search/experiment-search.component';
import { Router } from '@angular/router';
import { ExperimentFilters } from '../experiment-search/experiment-filter.model';

@Component({
  selector: 'app-experiments-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ExperimentSearchComponent],
  templateUrl: './experiment-list.component.html',
  styleUrls: ['./experiment-list.component.css'],
})
export class ExperimentsListComponent {
  @Output() experimentSelected = new EventEmitter<Experiment>();
  @Output() deleteRequested = new EventEmitter<string>();
  @Output() editRequested = new EventEmitter<string>();

  @Input() selectedExperimentId: string | null = null;
  @Input() currentUserEmail: string | null = null;
  @Input() compareIds: string[] = [];
  @Input() compareMode: boolean = false;

  constructor(
    public experimentsService: ExperimentsDashboardService,
    private router: Router
  ) { }

  // toggle
  readonly onlyMine = signal(true);

  // pagination
  readonly pageSize = 5;
  readonly currentPage = signal(1);

  // share toast
  readonly copyToastVisible = signal<boolean>(false);
  readonly copyToastMessage = signal<string>('Link copied to clipboard');
  readonly lastSharedExperimentId = signal<string | null>(null);

  // filters (single source of truth)
  readonly filters = signal<ExperimentFilters>({
    query: '',
    datePreset: 'any',
    algorithm: null,
    author: null,
    variable: null,
    status: 'any',
    shared: 'any',
  });

  readonly filteredExperiments = computed(() => {
    const f = this.filters();
    const q = (f.query || '').toLowerCase().trim();
    const list = this.experimentsService.experiments();

    let filtered = list;

    if (this.onlyMine() && this.currentUserEmail) {
      filtered = filtered.filter(exp => exp.authorEmail === this.currentUserEmail);
    }

    // date preset
    if (f.datePreset !== 'any') {
      const now = new Date();
      const from = new Date(now);

      if (f.datePreset === 'today') from.setHours(0, 0, 0, 0);
      if (f.datePreset === '7d') from.setDate(now.getDate() - 7);
      if (f.datePreset === '30d') from.setDate(now.getDate() - 30);

      filtered = filtered.filter(exp => {
        const d = exp.dateCreated ? new Date(exp.dateCreated) : null;
        return d ? d >= from && d <= now : false;
      });
    }

    // algorithm filter
    if (f.algorithm) {
      const a = f.algorithm.toLowerCase();
      filtered = filtered.filter(exp => (exp.algorithmName ?? '').toLowerCase().includes(a));
    }

    // author filter
    if (f.author) {
      const a = f.author.toLowerCase();
      filtered = filtered.filter(exp => (exp.authorEmail ?? '').toLowerCase().includes(a));
    }

    // status filter (optional now, but supported)
    if (f.status !== 'any') {
      filtered = filtered.filter(exp => exp.status === f.status);
    }

    // shared filter (optional now, but supported)
    if (f.shared !== 'any') {
      const wantShared = f.shared === 'shared';
      filtered = filtered.filter(exp => !!exp.isShared === wantShared);
    }

    // free text query
    if (q) {
      filtered = filtered.filter(exp => {
        const haystack = [
          exp.name,
          exp.description,
          exp.authorEmail,
          (exp as any).authorName,
          exp.algorithmName,
        ].filter(Boolean).join(' ').toLowerCase();

        return haystack.includes(q);
      });
    }

    return filtered;
  });

  patchFilters(patch: Partial<ExperimentFilters>) {
    this.filters.update(f => ({ ...f, ...patch }));
    this.currentPage.set(1);
  }

  // compare helper
  isInCompare(id: string): boolean {
    return this.compareIds.includes(id);
  }

  toggleOnlyMine() {
    this.onlyMine.update(v => !v);
    this.currentPage.set(1);
  }

  // ---- share logic (unchanged) ----
  private showCopyToast(message: string, expId: string) {
    this.copyToastMessage.set(message);
    this.copyToastVisible.set(true);
    this.lastSharedExperimentId.set(expId);

    setTimeout(() => {
      this.copyToastVisible.set(false);
      this.lastSharedExperimentId.set(null);
    }, 2400);
  }

  private buildShareUrl(expId: string): string {
    const tree = this.router.createUrlTree(
      ['/experiments-dashboard'],
      { queryParams: { experiment: expId } }
    );

    const relative = this.router.serializeUrl(tree);
    const origin = window.location.origin;

    return origin + relative;
  }

  onShareClicked(exp: Experiment, event: MouseEvent) {
    event.stopPropagation();

    const newShared = !exp.isShared;

    this.experimentsService
      .toggleExperimentShare(exp.id, newShared)
      .subscribe({
        next: () => {
          if (newShared) {
            const url = this.buildShareUrl(exp.id);

            if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(url).then(
                () => this.showCopyToast('Link copied to clipboard', exp.id),
                (err) => {
                  console.warn('Failed to copy share URL:', err);
                  this.showCopyToast('Could not copy link — check console.', exp.id);
                }
              );
            } else {
              console.warn('Clipboard API not available, share URL:', url);
              this.showCopyToast('Clipboard not available — check console log.', exp.id);
            }
          } else {
            this.showCopyToast('Experiment is no longer shared', exp.id);
          }
        },
        error: (err) => {
          console.error('Failed to toggle share:', err);
          this.showCopyToast('Failed to update share state', exp.id);
        },
      });
  }

  // counts
  readonly totalExperiments = computed(() => this.experimentsService.experiments().length);
  readonly visibleExperiments = computed(() => this.filteredExperiments().length);

  // pages
  readonly totalPages = computed(() => {
    const total = this.filteredExperiments().length;
    if (!total) return 1;
    return Math.ceil(total / this.pageSize);
  });

  readonly pagedExperiments = computed<Experiment[]>(() => {
    const list = this.filteredExperiments();
    const page = this.currentPage();
    const size = this.pageSize;

    const start = (page - 1) * size;
    const end = start + size;

    return list.slice(start, end);
  });

  // pagination helpers
  goToPage(page: number) {
    const max = this.totalPages();
    if (page < 1) page = 1;
    if (page > max) page = max;
    this.currentPage.set(page);
  }

  nextPage() {
    this.goToPage(this.currentPage() + 1);
  }

  prevPage() {
    this.goToPage(this.currentPage() - 1);
  }

  // selection / delete (unchanged)
  selectExperiment(exp: Experiment) {
    this.experimentSelected.emit(exp);
  }

  onEditRequested(id: string) {
    this.editRequested.emit(id);
  }

  onDeleteRequested(id: string) {
    this.deleteRequested.emit(id);
  }
}
