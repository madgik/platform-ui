import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExperimentsListComponent } from './experiment-list.component';

describe('ExperimentsListComponent', () => {
  let component: ExperimentsListComponent;
  let fixture: ComponentFixture<ExperimentsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperimentsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExperimentsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
