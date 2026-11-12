import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Estado de erro reutilizável para quando um pedido falha.
 * Mostra uma mensagem clara e (opcionalmente) um botão "Tentar novamente".
 */
@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.html',
  styleUrl: './error-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  title = input('Não foi possível carregar os dados');
  message = input('Verifica a ligação ao servidor e tenta novamente.');
  retryLabel = input('Tentar novamente');
  /** Esconde o botão quando não há nada a repetir. */
  retryable = input(true);

  retry = output<void>();
}
