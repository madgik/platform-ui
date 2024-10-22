import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExperimentStudioComponent } from './experiment-studio.component';

describe('ExperimentStudioComponent', () => {
  let component: ExperimentStudioComponent;
  let fixture: ComponentFixture<ExperimentStudioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperimentStudioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExperimentStudioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
