import { Injectable, inject } from '@angular/core';
import { Observable, Subject, map } from 'rxjs';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { JobsService as GeneratedJobsService } from '../api/generated/jobs/jobs.service';
import { type JobCreate, type JobRead, type JobListRead, JobStatus } from '../api/model';
import { environment } from '../../../environments/environment';
import { createSseObservable } from './sse.utl';

@Injectable({
  providedIn: 'root',
})
export class JobsService {
  private readonly api = inject(GeneratedJobsService);
  private readonly basePath = '/api/v1/jobs';

  getAll(): Observable<JobListRead[]> {
    return this.api.listJobs().pipe(map((r) => r.data ?? []));
  }

  getById(id: string): Observable<JobRead> {
    return this.api.getJob(id).pipe(map((r) => r.data!));
  }

  create(data: JobCreate): Observable<JobRead> {
    return this.api.createJob(data).pipe(map((r) => r.data!));
  }

  cancel(id: string): Observable<JobRead> {
    return this.api.cancelJob(id).pipe(map((r) => r.data!));
  }

  remove(id: string): Observable<void> {
    return this.api.deleteJob(id).pipe(map(() => void 0));
  }
  streamJobProgress(jobId: string): Observable<JobRead> {
    const url = `${environment.apiUrl}${this.basePath}/${jobId}/stream`;

    return createSseObservable<JobRead>(url, {
      apiKey: environment.apiKey ?? '',

      isTerminal: (data) => {
        return (
          data.status === JobStatus.completed ||
          data.status === JobStatus.failed ||
          data.status === JobStatus.cancelled
        );
      },

      maxRetries: 5,
      baseRetryDelayMs: 500,
      maxRetryDelayMs: 10_000,

      idleTimeoutMs: 60_000,
      dedup: true,
    });
  }
}
