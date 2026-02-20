import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SiteConfig, SiteConfigCreate } from '../models/site-config.model';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root',
})
export class SitesService extends BaseApiService{
  private readonly path = '/api/v1/sites';

  list(): Observable<SiteConfig[]> {
    return this.get<SiteConfig[]>(this.path);
  }
  getByKey(key: string): Observable<SiteConfig> {
    return this.get<SiteConfig>(`${this.path}/${key}`);
  }

  create(payload: Partial<SiteConfig>): Observable<SiteConfig> {
    return this.post<SiteConfig>(this.path, payload);
  }

  update(key: string, payload: Partial<SiteConfig>): Observable<SiteConfig> {
    return this.patch<SiteConfig>(`${this.path}/${key}`, payload);
  }

  remove(key: string, permanent = false): Observable<null> {
    return this.delete<null>(`${this.path}/${key}`, { permanent });
  }
}
