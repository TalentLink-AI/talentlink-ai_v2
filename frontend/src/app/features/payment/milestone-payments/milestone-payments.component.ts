// frontend/src/app/features/payments/milestone-payments/milestone-payments.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PaymentService,
  MilestonePayment,
} from '../../../services/payment.service';
import { AuthService } from '@auth0/auth0-angular';
import { UserService } from '../../../services/user.service';
import { LoggerService } from '../../../core/services/logger.service';
import { switchMap, filter } from 'rxjs/operators';

@Component({
  selector: 'app-milestone-payments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './milestone-payments.component.html',
  styleUrls: ['./milestone-payments.component.scss'],
})
export class MilestonePaymentsComponent implements OnInit {
  @Input() contractId!: string;

  milestones: MilestonePayment[] = [];
  escrowBalance: number = 0;
  loading = false;
  actionInProgress = false;
  error: string | null = null;
  success: string | null = null;
  isClient = false;
  isTalent = false;

  constructor(
    private paymentService: PaymentService,
    private auth: AuthService,
    private userService: UserService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    // Check user role
    this.auth.user$
      .pipe(
        filter((user) => !!user),
        switchMap(() => this.userService.getCurrentUser())
      )
      .subscribe({
        next: (userData) => {
          this.isClient = userData.user.role === 'client';
          this.isTalent = userData.user.role === 'talent';

          // Load milestone data
          this.loadMilestones();
        },
        error: (error) => {
          this.logger.error('Error determining user role:', error);
          this.error = 'Failed to load user information';
        },
      });
  }

  loadMilestones(): void {
    if (!this.contractId) {
      this.error = 'Contract ID is missing';
      return;
    }

    this.loading = true;
    this.error = null;

    // Load milestones
    this.paymentService.getContractMilestones(this.contractId).subscribe({
      next: (milestones) => {
        this.milestones = milestones;
        this.loading = false;

        // Also load escrow balance if there are milestones and user is a client
        if (this.milestones.length > 0 && this.isClient) {
          this.loadEscrowBalance();
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Failed to load milestone data';
        this.logger.error('Error loading milestones:', error);
      },
    });
  }

  loadEscrowBalance(): void {
    // This would require the escrow ID, which should be available in the contract
    // For now, we'll just use a placeholder
    this.escrowBalance = 5000; // Example value
  }

  updateMilestoneStatus(
    milestoneId: string,
    newStatus: 'inProgress' | 'completed'
  ): void {
    this.actionInProgress = true;
    this.error = null;
    this.success = null;

    this.paymentService
      .updateMilestoneStatus(this.contractId, milestoneId, newStatus)
      .subscribe({
        next: (updatedMilestone) => {
          // Update the milestone in our list
          this.milestones = this.milestones.map((m) =>
            m.id === milestoneId ? { ...m, status: updatedMilestone.status } : m
          );

          this.actionInProgress = false;
          this.success = `Milestone marked as ${newStatus}`;

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.success = null;
          }, 3000);
        },
        error: (error) => {
          this.actionInProgress = false;
          this.error = `Failed to update milestone status: ${error.message}`;
          this.logger.error('Error updating milestone status:', error);
        },
      });
  }

  releaseMilestonePayment(milestoneId: string): void {
    if (!this.isClient) {
      this.error = 'Only clients can release milestone payments';
      return;
    }

    // Confirm with the user before proceeding
    if (
      !confirm(
        'Are you sure you want to release payment for this milestone? This action cannot be undone.'
      )
    ) {
      return;
    }

    this.actionInProgress = true;
    this.error = null;
    this.success = null;

    this.paymentService
      .releaseMilestonePayment(this.contractId, milestoneId)
      .subscribe({
        next: (updatedMilestone) => {
          // Update the milestone in our list
          this.milestones = this.milestones.map((m) =>
            m.id === milestoneId ? { ...m, status: updatedMilestone.status } : m
          );

          this.actionInProgress = false;
          this.success = 'Payment released successfully';

          // Reload escrow balance if client
          if (this.isClient) {
            this.loadEscrowBalance();
          }

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.success = null;
          }, 3000);
        },
        error: (error) => {
          this.actionInProgress = false;
          this.error = `Failed to release payment: ${error.message}`;
          this.logger.error('Error releasing milestone payment:', error);
        },
      });
  }

  // Helper method to get milestone status text for display
  getMilestoneStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'inProgress':
        return 'In Progress';
      case 'completed':
        return 'Awaiting Payment';
      case 'paid':
        return 'Paid';
      default:
        return status;
    }
  }

  // Helper method to get class name based on milestone status
  getMilestoneStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'inProgress':
        return 'status-in-progress';
      case 'completed':
        return 'status-completed';
      case 'paid':
        return 'status-paid';
      default:
        return '';
    }
  }

  // Format currency amount
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}
