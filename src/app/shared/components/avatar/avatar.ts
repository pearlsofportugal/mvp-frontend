import { Component, computed, input } from '@angular/core';
const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#16a34a', '#0891b2', '#dc2626', '#d97706',
];
@Component({
  selector: 'app-avatar',
  imports: [],
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
})
export class Avatar {
 name = input<string>('');

  readonly initial = computed(() =>
    this.name() ? this.name().charAt(0).toUpperCase() : ''
  );

  readonly color = computed(() => {
    const name = this.name();
    if (!name) return '#ccc';

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  });
}
