import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  imports: [],
  templateUrl: './spinner.html',
  styleUrl: './spinner.css',
})
export class Spinner {
  message = input<string>('')
  size    = input<'xs' | 'sm' | 'md' | 'lg'>('md');
  variant = input<'accent' | 'white' | 'green' | 'current'>('accent');
  shrink  = input<boolean>(true);

  protected classes = computed(() => {
    const c = ['spinner', `spinner--${this.size()}`, `spinner--${this.variant()}`];
    if (this.shrink()) c.push('spinner--shrink');
    return c.join(' ');
  });
}
