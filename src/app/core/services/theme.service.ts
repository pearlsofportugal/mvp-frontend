import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly isDark = signal(this.getInitialDark());

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.classList.toggle('dark', this.isDark());
        localStorage.setItem('theme', this.isDark() ? 'dark' : 'light');
      }
    });
  }

  toggle(): void {
    this.isDark.update((v) => !v);
  }

  private getInitialDark(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }
}
