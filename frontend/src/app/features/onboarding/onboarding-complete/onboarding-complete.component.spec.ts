import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnboardingCompleteComponent } from './onboarding-complete.component';

describe('OnboardingCompleteComponent', () => {
  let component: OnboardingCompleteComponent;
  let fixture: ComponentFixture<OnboardingCompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingCompleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnboardingCompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
