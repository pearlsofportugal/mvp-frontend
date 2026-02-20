import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private idCounter = 0;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: Toast['type'] = 'info'): void {
    const id = ++this.idCounter;
    const toast: Toast = { id, message, type };
    
    this.toasts.update(toasts => [...toasts, toast]);

    setTimeout(() => {
      this.remove(id);
    }, 4000);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  remove(id: number): void {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }
}
