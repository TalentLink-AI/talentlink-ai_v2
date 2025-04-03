import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeBasedPaymentComponent } from './time-based-payment.component';

describe('TimeBasedPaymentComponent', () => {
  let component: TimeBasedPaymentComponent;
  let fixture: ComponentFixture<TimeBasedPaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeBasedPaymentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeBasedPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
