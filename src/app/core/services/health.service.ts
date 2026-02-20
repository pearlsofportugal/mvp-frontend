import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HealthStatus } from '../models/health.model';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root',
})
export class HealthService extends BaseApiService {
  checkHealth(): Observable<HealthStatus> {
    return this.get<HealthStatus>('/health');
  }
}
