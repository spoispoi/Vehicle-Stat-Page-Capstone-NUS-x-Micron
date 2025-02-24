import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ToolService {
  private apiUrl = 'http://127.0.0.1:8000/api/tools/';

  constructor(private http: HttpClient) {}

  getTools(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getTool(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}${id}/`);
 
 }

 deleteTool(id: number): Observable<any> {
  return this.http.delete(`${this.apiUrl}${id}/`);
}
}

