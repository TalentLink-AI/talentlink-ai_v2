import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscrowPaymentComponent } from './escrow-payment.component';

describe('EscrowPaymentComponent', () => {
  let component: EscrowPaymentComponent;
  let fixture: ComponentFixture<EscrowPaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscrowPaymentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscrowPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
