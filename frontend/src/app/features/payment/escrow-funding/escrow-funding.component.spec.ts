import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscrowFundingComponent } from './escrow-funding.component';

describe('EscrowFundingComponent', () => {
  let component: EscrowFundingComponent;
  let fixture: ComponentFixture<EscrowFundingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscrowFundingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscrowFundingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
