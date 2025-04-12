import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComprehensiveJobPostComponent } from './comprehensive-job-post.component';

describe('ComprehensiveJobPostComponent', () => {
  let component: ComprehensiveJobPostComponent;
  let fixture: ComponentFixture<ComprehensiveJobPostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComprehensiveJobPostComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComprehensiveJobPostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
