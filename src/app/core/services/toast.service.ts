// src/app/core/services/toast.service.ts
//
// MELHORIA: ToastService com:
//   - Limite de toasts simultâneos (máx 5) — evita "pilha de erros" quando
//     o polling falha repetidamente (ex: backend offline + polling a cada 3s)
//   - Duração configurável por tipo (erros ficam mais tempo — 6s vs 4s)
//   - Dismiss manual via remove(id)
//   - Deduplicação: não mostra o mesmo toast duas vezes seguidas
//     (útil quando o mesmo erro dispara várias vezes em polling)
//
// ANTES: timeout fixo de 4s, sem limite, sem deduplicação.
// Os toasts acumulavam-se indefinidamente em cenários de erro contínuo.

import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

const MAX_TOASTS = 5;

const DEFAULT_DURATIONS: Record<Toast['type'], number> = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6000, // erros ficam mais tempo — o utilizador precisa de ler
};

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private idCounter = 0;
  private lastMessage = '';  // para deduplicação
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: Toast['type'] = 'info', duration?: number): void {
    // Deduplicação — não empilhar o mesmo toast
    if (message === this.lastMessage) return;
    this.lastMessage = message;

    // Limitar número máximo de toasts simultâneos — remove o mais antigo
    const current = this.toasts();
    if (current.length >= MAX_TOASTS) {
      this.remove(current[0].id);
    }

    const id = ++this.idCounter;
    const resolvedDuration = duration ?? DEFAULT_DURATIONS[type];

    const toast: Toast = { id, message, type, duration: resolvedDuration };
    this.toasts.update((toasts) => [...toasts, toast]);

    setTimeout(() => {
      this.remove(id);
      // Resetar deduplicação quando o toast desaparece
      // (permite mostrar a mesma mensagem depois de um período de silêncio)
      if (this.lastMessage === message) {
        this.lastMessage = '';
      }
    }, resolvedDuration);
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

  warning(message: string): void {
    this.show(message, 'warning');
  }

  remove(id: number): void {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  /** Remove todos os toasts (útil em logout ou navegação) */
  clear(): void {
    this.toasts.set([]);
    this.lastMessage = '';
  }
}