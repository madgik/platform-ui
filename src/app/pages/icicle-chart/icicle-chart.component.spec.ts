import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IcicleChartComponent } from './icicle-chart.component';

describe('IcicleChartComponent', () => {
  let component: IcicleChartComponent;
  let fixture: ComponentFixture<IcicleChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IcicleChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IcicleChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
