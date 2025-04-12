import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

//Services
import { UserService } from '../../../services/user.service';
//Components
import { ProfileComponent } from '../../profile/profile.component';
import { JobListingComponent } from '../../jobs/job-listing/job-listing.component';

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [CommonModule, ProfileComponent, JobListingComponent],
  styleUrls: ['./dashboard.component.scss'],
})
export class UserDashboardComponent {
  activeTab: string = 'jobs';
  userRole: any;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.userService.getUserRoles().subscribe((roles) => {
      console.log('User roles:', roles);
      if (roles.includes('client')) {
        this.userRole = 'client';
      } else if (roles.includes('talent')) {
        this.userRole = 'talent';
      } else {
        this.userRole = 'guest'; // fallback
      }
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }
}
