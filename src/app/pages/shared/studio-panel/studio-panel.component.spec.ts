import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudioPanelComponent } from './studio-panel.component';

describe('StudioPanelComponent', () => {
  let component: StudioPanelComponent;
  let fixture: ComponentFixture<StudioPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudioPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudioPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
