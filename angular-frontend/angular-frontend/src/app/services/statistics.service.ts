import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root', // make the service available global
})
export class StatisticsService {
  private baseUrl = 'http://127.0.0.1:8000/api/statistics'; 

  constructor(private http: HttpClient) {}

  /**
   * Fetch statistics for a specific equipment ID with optional date filtering.
   * @param equipId - The equipment ID to fetch statistics for.
   * @param startDate - Optional start date for filtering (YYYY-MM-DD format).
   * @param endDate - Optional end date for filtering (YYYY-MM-DD format).
   * @returns Observable of the statistics data.
   */
  getStatistics(equipId: string, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    
    const url = `${this.baseUrl}/${equipId}/`;
    console.log('Statistics service - URL:', url);
    console.log('Statistics service - Params:', params.toString());
    
    return this.http.get<any>(url, { params });
  }


}