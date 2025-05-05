import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root', // make the service available global
})
export class StatisticsService {
  private baseUrl = 'http://127.0.0.1:8000/api/statistics'; 

  constructor(private http: HttpClient) {}

  /**
   * Fetch statistics for a specific equipment ID.
   * @param equipId - The equipment ID to fetch statistics for.
   * @returns Observable of the statistics data.
   */
  getStatistics(equipId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${equipId}/`);
  }


}