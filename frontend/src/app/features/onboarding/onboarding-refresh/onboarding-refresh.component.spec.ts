import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnboardingRefreshComponent } from './onboarding-refresh.component';

describe('OnboardingRefreshComponent', () => {
  let component: OnboardingRefreshComponent;
  let fixture: ComponentFixture<OnboardingRefreshComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingRefreshComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnboardingRefreshComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
