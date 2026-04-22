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

import { SitesService } from '../../../../../core/services/sites.service';
import type { SiteConfigRead, SiteConfigScheduleInfo, SiteConfigUpdate } from '../../../../../core/api/model';

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
  selector: 'app-step-schedule',
  imports: [ReactiveFormsModule],
  templateUrl: './step-schedule.html',
  styleUrl: './step-schedule.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepScheduleComponent {
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  site = input<SiteConfigRead | null>(null);
  back = output<void>();
  skip = output<void>();
  next = output<void>();
  siteUpdated = output<SiteConfigRead>();

  protected readonly submitting = signal(false);
  protected readonly scheduleInfo = signal<SiteConfigScheduleInfo | null>(null);

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
    if (!site) {
      this.next.emit();
      return;
    }

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
          this.siteUpdated.emit(updated);
          if (raw.schedule_enabled) {
            this.loadScheduleInfo(site.key);
          } else {
            this.scheduleInfo.set(null);
          }
          this.next.emit();
        },
        error: () => {
          this.submitting.set(false);
        },
      });
  }

  protected onBack(): void {
    this.back.emit();
  }

  protected onSkip(): void {
    this.skip.emit();
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

  /**
   * Convert a naive datetime-local string (e.g. "2026-04-21T17:11") interpreted as wall-clock
   * time in `tz` into a full ISO-8601 string with UTC offset.
   *
   * Without this, the bare string "2026-04-21T17:11" would be sent to the backend which
   * may treat it as UTC, causing a +1h shift for users in UTC+1 (Europe/Lisbon).
   */
  private datetimeLocalToISO(localStr: string, tz: string): string | null {
    if (!localStr) return null;
    // Normalise to "YYYY-MM-DDTHH:mm:ss"
    const normalised = localStr.length === 16 ? `${localStr}:00` : localStr;
    // Treat the naïve string as UTC to get an approximate epoch
    const approxUtc = new Date(`${normalised}Z`);
    // Format that epoch in the target timezone to see what wall-clock time it shows there
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
    // 'sv-SE' gives "YYYY-MM-DD HH:mm:ss" — parse it back as UTC to measure the offset
    const tzAsUtc = new Date(`${tzFormatted.replace(' ', 'T')}Z`);
    // diff = (TZ wall-clock as UTC) − approxUtc = the UTC offset in ms
    const offsetMs = tzAsUtc.getTime() - approxUtc.getTime();
    // Subtract the offset to get the true UTC instant, then return as ISO
    return new Date(approxUtc.getTime() - offsetMs).toISOString();
  }
}
