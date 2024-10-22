import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlgorithmPanelComponent } from './algorithm-panel.component';

describe('AlgorithmPanelComponent', () => {
  let component: AlgorithmPanelComponent;
  let fixture: ComponentFixture<AlgorithmPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlgorithmPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlgorithmPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
