import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }}">
          {{ toast.message }}
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .toast {
      padding: 0.75rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      animation: slideIn 0.3s ease;
      max-width: 400px;
    }

    .toast-success {
      background: #065f46;
      color: #6ee7b7;
      border: 1px solid #059669;
    }

    .toast-error {
      background: #7f1d1d;
      color: #fca5a5;
      border: 1px solid #dc2626;
    }

    .toast-info {
      background: #1e3a5f;
      color: #93c5fd;
      border: 1px solid #2563eb;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);
}
