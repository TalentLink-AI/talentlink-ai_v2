import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MilestonePaymentsComponent } from './milestone-payments.component';

describe('MilestonePaymentsComponent', () => {
  let component: MilestonePaymentsComponent;
  let fixture: ComponentFixture<MilestonePaymentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MilestonePaymentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MilestonePaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
