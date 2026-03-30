import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select-dropdown',
  templateUrl: './select-dropdown.html',
  styleUrl: './select-dropdown.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'open.set(false)',
    '(document:keydown.escape)': 'open.set(false)',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectDropdownComponent),
      multi: true,
    },
  ],
})
export class SelectDropdownComponent implements ControlValueAccessor {
  options = input<SelectOption[]>([]);
  placeholder = input('Select…');

  protected readonly value = signal('');
  protected readonly open = signal(false);
  protected readonly opensUp = signal(false);
  private readonly isDisabled = signal(false);
  private readonly el = inject(ElementRef<HTMLElement>);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly selectedLabel = computed(() => {
    const v = this.value();
    if (!v) return this.placeholder();
    return this.options().find(o => o.value === v)?.label ?? v;
  });

  protected readonly hasValue = computed(() => !!this.value());

protected toggle(): void {
  if (this.isDisabled()) return;

  const opening = !this.open();

  if (opening) {
    const rect = this.el.nativeElement.getBoundingClientRect();

    const spaceBelow = typeof window !== 'undefined' ? window.innerHeight - rect.bottom : 0;
    const spaceAbove = typeof window !== 'undefined' ? rect.top : 0;

    this.opensUp.set(spaceAbove > spaceBelow && spaceBelow < 240);
  }

  this.open.set(opening);
}

  protected select(val: string): void {
    this.value.set(val);
    this.onChange(val);
    this.onTouched();
    this.open.set(false);
  }

  writeValue(val: string): void {
    this.value.set(val ?? '');
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
}
