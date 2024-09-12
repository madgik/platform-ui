import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FederationsPageComponent } from './federations-page.component';

describe('FederationsPageComponent', () => {
  let component: FederationsPageComponent;
  let fixture: ComponentFixture<FederationsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FederationsPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FederationsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
