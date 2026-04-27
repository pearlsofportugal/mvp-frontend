import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { SitesService } from '../../../../core/services/sites.service';
import type { SiteConfigRead, SiteConfigScheduleInfo, SiteConfigUpdate } from '../../../../core/api/model';

const urlOrEmptyValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const v = (control.value as string)?.trim();
  if (!v) return null;
  return /^https?:\/\/.+/.test(v) ? null : { invalidUrl: true };
};

const positiveIntegerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const v = control.value;
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? null : { min: { min: 1 } };
};

@Component({
  selector: 'app-site-schedule-form',
  imports: [ReactiveFormsModule],
  templateUrl: './site-schedule-form.html',
  styleUrl: './site-schedule-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteScheduleFormComponent {
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  site = input<SiteConfigRead | null>(null);
  saved = output<SiteConfigRead>();
  cancelled = output<void>();

  protected readonly submitting = signal(false);
  protected readonly scheduleInfo = signal<SiteConfigScheduleInfo | null>(null);
  protected readonly showAdvanced = signal(false);

  protected readonly form = new FormGroup({
    schedule_enabled: new FormControl(false, { nonNullable: true }),
    schedule_interval_minutes: new FormControl<number | null>(null, [positiveIntegerValidator]),
    schedule_start_at: new FormControl<string | null>(null),
    schedule_timezone: new FormControl('Europe/Lisbon', { nonNullable: true }),
    schedule_start_url: new FormControl<string | null>(null, [urlOrEmptyValidator]),
    schedule_max_pages: new FormControl<number | null>(null, [
      positiveIntegerValidator,
      Validators.max(500),
    ]),
  });

  protected readonly scheduleEnabled = toSignal(
    this.form.controls.schedule_enabled.valueChanges,
    { initialValue: false },
  );

  protected readonly intervalLabel = computed(() => {
    const mins = this.form.controls.schedule_interval_minutes.value;
    return this.formatInterval(mins);
  });

  protected readonly commonTimezones = [
    'UTC',
    'Europe/Lisbon',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Rome',
    'Europe/Amsterdam',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Sao_Paulo',
    'Asia/Tokyo',
    'Asia/Dubai',
    'Asia/Singapore',
    'Australia/Sydney',
    'Pacific/Auckland',
  ];

  protected readonly presetIntervals: { label: string; minutes: number }[] = [
    { label: '1h', minutes: 60 },
    { label: '6h', minutes: 360 },
    { label: '12h', minutes: 720 },
    { label: '24h', minutes: 1440 },
    { label: '2d', minutes: 2880 },
    { label: '7d', minutes: 10080 },
  ];

  constructor() {
    effect(() => {
      const s = this.site();
      if (!s) return;
      this.form.patchValue({
        schedule_enabled: s.schedule_enabled ?? false,
        schedule_interval_minutes: s.schedule_interval_minutes ?? null,
        schedule_start_at: this.toDatetimeLocal(s.schedule_start_at),
        schedule_timezone: s.schedule_timezone ?? 'Europe/Lisbon',
        schedule_start_url: s.schedule_start_url ?? null,
        schedule_max_pages: s.schedule_max_pages ?? null,
      });
      if (s.schedule_enabled && s.key) {
        this.loadScheduleInfo(s.key);
      } else {
        this.scheduleInfo.set(null);
      }
    });
  }

  protected setPreset(minutes: number): void {
    this.form.controls.schedule_interval_minutes.setValue(minutes);
    this.form.controls.schedule_interval_minutes.markAsTouched();
  }

  protected isPresetActive(minutes: number): boolean {
    return this.form.controls.schedule_interval_minutes.value === minutes;
  }

  protected formatInterval(minutes: number | null | undefined): string {
    if (!minutes) return '';
    if (minutes < 60) return `every ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (rem === 0) return hours === 1 ? 'every hour' : `every ${hours} hours`;
    return `every ${hours}h ${rem}min`;
  }

  protected formatNextRun(isoStr: string | null | undefined): string {
    if (!isoStr) return 'soon';
    const date = new Date(isoStr);
    const diffMs = date.getTime() - Date.now();
    const diffMins = Math.round(diffMs / 60_000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `in ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `in ${diffHours}h`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  protected onSubmit(): void {
    const raw = this.form.getRawValue();

    if (raw.schedule_enabled && !raw.schedule_interval_minutes) {
      this.form.controls.schedule_interval_minutes.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const site = this.site();
    if (!site) return;

    this.submitting.set(true);

    const payload: SiteConfigUpdate = {
      schedule_enabled: raw.schedule_enabled,
      schedule_interval_minutes: raw.schedule_enabled ? (raw.schedule_interval_minutes ?? null) : null,
      schedule_start_at: this.datetimeLocalToISO(raw.schedule_start_at ?? '', raw.schedule_timezone || 'Europe/Lisbon'),
      schedule_timezone: raw.schedule_timezone || 'Europe/Lisbon',
      schedule_start_url: (raw.schedule_start_url as string | null)?.trim() || null,
      schedule_max_pages: raw.schedule_max_pages ?? null,
    };

    this.sitesService
      .update(site.key, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.submitting.set(false);
          this.saved.emit(updated);
          if (raw.schedule_enabled) {
            this.loadScheduleInfo(site.key);
          } else {
            this.scheduleInfo.set(null);
          }
        },
        error: () => {
          this.submitting.set(false);
        },
      });
  }

  protected toggleEnabled(): void {
    const ctrl = this.form.controls.schedule_enabled;
    ctrl.setValue(!ctrl.value);
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  private loadScheduleInfo(key: string): void {
    this.sitesService
      .getSchedule(key)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (info) => this.scheduleInfo.set(info),
        error: () => {},
      });
  }

  private toDatetimeLocal(isoStr: string | null | undefined): string | null {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  }

  private datetimeLocalToISO(localStr: string, tz: string): string | null {
    if (!localStr) return null;
    const normalised = localStr.length === 16 ? `${localStr}:00` : localStr;
    const approxUtc = new Date(`${normalised}Z`);
    const tzFormatted = new Intl.DateTimeFormat('sv-SE', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(approxUtc);
    const tzAsUtc = new Date(`${tzFormatted.replace(' ', 'T')}Z`);
    const offsetMs = tzAsUtc.getTime() - approxUtc.getTime();
    return new Date(approxUtc.getTime() - offsetMs).toISOString();
  }
}
