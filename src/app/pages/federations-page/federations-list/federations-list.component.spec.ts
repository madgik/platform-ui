import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FederationsListComponent } from './federations-list.component';

describe('FederationsListComponent', () => {
  let component: FederationsListComponent;
  let fixture: ComponentFixture<FederationsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FederationsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FederationsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
