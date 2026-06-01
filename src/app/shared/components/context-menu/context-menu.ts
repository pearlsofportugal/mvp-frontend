import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, inject, OnDestroy, output, PLATFORM_ID, signal } from '@angular/core';

@Component({
  selector: 'app-context-menu',
  imports: [],
  templateUrl: './context-menu.html',
  styleUrl: './context-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenu {
  opened = output<void>();
  closed = output<void>();

  isOpen = signal(false);
  menuPos = signal({ top: 0, right: 0 });

  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private scrollHandler = () => this.close();
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.isBrowser) {
        window.removeEventListener('scroll', this.scrollHandler, { capture: true });
        document.removeEventListener('click', this.clickHandler, { capture: true });
      }
      clearTimeout(this.closeTimer);
    });
  }

  private clickHandler = (e: MouseEvent) => {
    if (!this.el.nativeElement.contains(e.target)) this.close();
  };

  toggle(event: MouseEvent): void {
    this.isOpen() ? this.close() : this.open(event);
  }

  private open(event: MouseEvent): void {
    const btn = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuPos.set({
      top: btn.bottom + 4,
      right: this.isBrowser ? document.documentElement.clientWidth - btn.right : 0
    });
    this.isOpen.set(true);
    this.opened.emit();
    if (this.isBrowser) {
      window.addEventListener('scroll', this.scrollHandler, { passive: true, capture: true });
      document.addEventListener('click', this.clickHandler, { capture: true });
    }
  }

  close(): void {
    clearTimeout(this.closeTimer);
    this.isOpen.set(false);
    this.closed.emit();
    if (this.isBrowser) {
      window.removeEventListener('scroll', this.scrollHandler, { capture: true });
      document.removeEventListener('click', this.clickHandler, { capture: true });
    }
  }

  closeDelayed(): void {
    this.closeTimer = setTimeout(() => this.close(), 150);
  }

  cancelClose(): void {
    clearTimeout(this.closeTimer);
  }
}