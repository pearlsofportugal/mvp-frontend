import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { SystemService } from '../api/generated/system/system.service';
import { SystemHealth } from '../api/model/systemHealth';
import { ApiResponseSystemHealth } from '../api/model';
@Injectable({
  providedIn: 'root',
})
export class HealthService {
  private readonly api = inject(SystemService);

  checkHealth(): Observable<SystemHealth> {
    return this.api
      .healthCheckHealthGet<ApiResponseSystemHealth>()
      .pipe(map((r) => r.data!));
  }
}
