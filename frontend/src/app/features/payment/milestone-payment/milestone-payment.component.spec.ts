import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MilestonePaymentComponent } from './milestone-payment.component';

describe('MilestonePaymentComponent', () => {
  let component: MilestonePaymentComponent;
  let fixture: ComponentFixture<MilestonePaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MilestonePaymentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MilestonePaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
