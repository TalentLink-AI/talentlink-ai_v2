// frontend/src/app/shared/components/button/button.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
})
export class ButtonComponent {
  @Input() type: 'primary' | 'secondary' | 'success' | 'danger' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fullWidth = false;
  @Input() buttonType: 'button' | 'submit' | 'reset' = 'button';
  @Output() clicked = new EventEmitter<Event>();

  get classes(): string {
    const sizeClass = this.size !== 'md' ? `btn-${this.size}` : '';
    const widthClass = this.fullWidth ? 'btn-block' : '';

    return `btn btn-${this.type} ${sizeClass} ${widthClass}`;
  }

  onClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }
}
