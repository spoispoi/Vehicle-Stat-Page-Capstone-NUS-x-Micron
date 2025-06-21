import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ToolService {
  private apiUrl = 'http://127.0.0.1:8000/api/tools/';

  constructor(private http: HttpClient) {}

  getTools(startDate?: string, endDate?: string): Observable<any[]> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    
    return this.http.get<any[]>(this.apiUrl, { params });
  }

  getTool(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}${id}/`);
 
 }

 deleteTool(id: number): Observable<any> {
  return this.http.delete(`${this.apiUrl}${id}/`);
}
}

