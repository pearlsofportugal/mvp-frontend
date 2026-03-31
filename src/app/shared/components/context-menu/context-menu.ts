import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, HostListener, inject, output, PLATFORM_ID, signal } from '@angular/core';

@Component({
  selector: 'app-context-menu',
  imports: [],
  templateUrl: './context-menu.html',
  styleUrl: './context-menu.css',
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
  private closeTimer: any;

  toggle(event: MouseEvent): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open(event);
    }
  }

  private open(event: MouseEvent): void {
    const btn = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuPos.set({
      top: btn.bottom + 4,
      right: this.isBrowser ? window.innerWidth - btn.right : 0
    });
    this.isOpen.set(true);
    this.opened.emit();
    if (this.isBrowser) {
      window.addEventListener('scroll', this.scrollHandler, { passive: true, capture: true });
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
    if (this.isBrowser) {
      window.removeEventListener('scroll', this.scrollHandler, { capture: true });
    }
  }

  closeDelayed(): void {
    this.closeTimer = setTimeout(() => this.close(), 150);
  }

  cancelClose(): void {
    clearTimeout(this.closeTimer);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.el.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      window.removeEventListener('scroll', this.scrollHandler, { capture: true });
    }
    clearTimeout(this.closeTimer);
  }
}
