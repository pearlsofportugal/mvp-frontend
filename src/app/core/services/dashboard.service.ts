import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { DashboardService as GeneratedDashboardService } from '../api/generated/dashboard/dashboard.service';
import type { PartnerStatsResponse, WeeklyStatsResponse } from '../api/model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(GeneratedDashboardService);

  partnerStats(): Observable<PartnerStatsResponse> {
    return this.api.partnerStats().pipe(map((r) => r.data ?? { partners: [], total_partners: 0 }));
  }
  weeklyStats(): Observable<WeeklyStatsResponse>{
    return this.api.weeklyStats().pipe(map((r) => r.data ??{ total_weeks:0, history:[]} ))
  }
}
