import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
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
