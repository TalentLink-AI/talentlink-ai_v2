import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MilestoneDetailComponent } from './milestone-detail.component';

describe('MilestoneDetailComponent', () => {
  let component: MilestoneDetailComponent;
  let fixture: ComponentFixture<MilestoneDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MilestoneDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MilestoneDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
