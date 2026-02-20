import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ScrapeJob, ScrapeJobCreate } from '../models/scrape-job.model';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root',
})
export class JobsService extends BaseApiService {
  private readonly path = '/api/v1/jobs';

  getAll(): Observable<ScrapeJob[]> {
    return this.get<ScrapeJob[]>(this.path);
  }

  getById(id: string): Observable<ScrapeJob> {
    return this.get<ScrapeJob>(this.buildRoute(`${this.path}/:id`, { id }));
  }

  create(data: ScrapeJobCreate): Observable<ScrapeJob> {
    return this.post<ScrapeJob>(this.path, data);
  }

  cancel(id: string): Observable<ScrapeJob> {
    return this.post<ScrapeJob>(this.buildRoute(`${this.path}/:id/cancel`, { id }), {});
  }

  remove(id: string): Observable<void> {
    return this.delete(this.buildRoute(`${this.path}/:id`, { id }));
  }
}
