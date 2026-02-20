// src/app/core/services/base-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, PaginatedData } from '../models/api-response.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BaseApiService {
  protected readonly baseUrl = environment.apiUrl;
  constructor(protected http: HttpClient) {}

  protected get<T>(path: string, params?: Record<string, any>): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(this.buildUrl(path), { params: this.buildParams(params) })
      .pipe(map((res) => res.data));
  }

  protected post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(this.buildUrl(path), body)
      .pipe(map((res) => res.data));
  }

  protected put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(this.buildUrl(path), body)
      .pipe(map((res) => res.data));
  }

  protected patch<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(this.buildUrl(path), body)
      .pipe(map((res) => res.data));
  }

  // params adicionado para suportar query strings como permanent=true
  protected delete<T = null>(path: string, params?: Record<string, any>): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(this.buildUrl(path), { params: this.buildParams(params) })
      .pipe(map((res) => res.data));
  }

  // Agora consistente com os outros — também retorna só `data`
  protected getPaginated<T>(
    path: string,
    params?: Record<string, any>
  ): Observable<PaginatedData<T>> {
    return this.http
      .get<ApiResponse<PaginatedData<T>>>(this.buildUrl(path), { params: this.buildParams(params) })
      .pipe(map((res) => res.data));
  }


  protected buildRoute(path: string, routeParams: Record<string, string | number>): string {
    return Object.entries(routeParams).reduce((url, [key, value]) => {
      if (value === null || value === undefined) {
        throw new Error(`Route param ':${key}' is required but got ${value}`);
      }
      return url.replace(new RegExp(`:${key}\\b`, 'g'), encodeURIComponent(String(value)));
    }, path);
  }

  private buildUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private buildParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }
}