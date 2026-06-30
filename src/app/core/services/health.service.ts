import { inject, Injectable, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { SystemService } from '../api/generated/system/system.service';
import { SystemHealth } from '../api/model/systemHealth';
import { ApiResponseSystemHealth } from '../api/model';
@Service()
export class HealthService {
  private readonly api = inject(SystemService);

  checkHealth(): Observable<SystemHealth> {
    return this.api
      .healthCheckHealthGet<ApiResponseSystemHealth>()
      .pipe(map((r) => r.data!));
  }
}
