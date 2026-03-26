import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type DialogSize = 'sm' | 'md' | 'lg';

const SIZE_WIDTH: Record<DialogSize, string> = {
  sm: 'min(480px, 96vw)',
  md: 'min(700px, 96vw)',
  lg: 'min(960px, 96vw)',
};

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.html',
  styleUrl: './dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppDialogComponent {
  private readonly platformId = inject(PLATFORM_ID);

  readonly title = input<string>('');
  readonly size = input<DialogSize>('md');
  readonly open = input.required<boolean>();

  readonly closed = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  private readonly _effect = effect(() => {
    if (!isPlatformBrowser(this.platformId)) return;
    const dialog = this.dialogRef().nativeElement;
    if (this.open()) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  });

  protected get dialogWidth(): string {
    return SIZE_WIDTH[this.size()];
  }

  protected onNativeClose(): void {
    // Fired by native ESC key
    this.closed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef().nativeElement) {
      this.closed.emit();
    }
  }
}
