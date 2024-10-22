import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatisticAnalysisPanelComponent } from './statistic-analysis-panel.component';

describe('StatisticAnalysisPanelComponent', () => {
  let component: StatisticAnalysisPanelComponent;
  let fixture: ComponentFixture<StatisticAnalysisPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatisticAnalysisPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatisticAnalysisPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
