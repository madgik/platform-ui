import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransformationsPanelComponent } from './transformations-panel.component';

describe('TransformationsPanelComponent', () => {
  let component: TransformationsPanelComponent;
  let fixture: ComponentFixture<TransformationsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransformationsPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransformationsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
