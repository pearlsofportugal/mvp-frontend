import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: 'textarea[appAutoResize]',
  host: {
    style: 'resize: none; overflow: hidden;',
    '(input)': 'resize()',
  },
})
export class AutoResizeTextareaDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLTextAreaElement>);

  ngAfterViewInit(): void {
    // defer so Angular's [value] binding has written to the DOM first
    setTimeout(() => this.resize());
  }

  resize(): void {
    const el = this.el.nativeElement;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }
}
