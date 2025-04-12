import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileComponent } from '../../profile/profile.component';

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [CommonModule, ProfileComponent],
  styleUrls: ['./dashboard.component.scss'],
})
export class UserDashboardComponent {
  activeTab: string = 'jobs';

  setTab(tab: string) {
    this.activeTab = tab;
  }
}
