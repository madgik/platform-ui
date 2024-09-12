import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExperimentsDashboardComponent } from './experiments-dashboard.component';

describe('ExperimentsDashboardComponent', () => {
  let component: ExperimentsDashboardComponent;
  let fixture: ComponentFixture<ExperimentsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperimentsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExperimentsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
