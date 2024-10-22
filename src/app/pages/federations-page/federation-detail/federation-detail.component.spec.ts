import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FederationDetailComponent } from './federation-detail.component';

describe('FederationDetailComponent', () => {
  let component: FederationDetailComponent;
  let fixture: ComponentFixture<FederationDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FederationDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FederationDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
