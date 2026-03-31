import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  imports: [],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css',
})
export class StatusBadge {
  status = input.required<string>();
  label = input<string>();
  reference = input<string>();
  variant = input<'badge' | 'export'>('badge'); // 'badge' é o default

  protected badgeClass = computed(() => {
    if (this.variant() === 'export') {
      return `export-status-badge export-status--${this.status()}`;
    }
    return `badge badge-${this.status()}`;
  });
}
