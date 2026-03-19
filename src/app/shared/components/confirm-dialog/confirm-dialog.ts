import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  message = input.required<string>();
  confirmLabel = input('Confirmar');
  cancelLabel = input('Cancelar');
  danger = input(false);

  confirmed = output<void>();
  cancelled = output<void>();
}
