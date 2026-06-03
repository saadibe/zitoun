import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order, MenuItem, RestaurantTable } from '../models/restaurant.models';

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}
  getMenu(): Observable<MenuItem[]> { return this.http.get<MenuItem[]>(`${this.api}/menu`); }
  getTables(): Observable<RestaurantTable[]> { return this.http.get<RestaurantTable[]>(`${this.api}/tables`); }
  updateTableStatus(id: number, status: string): Observable<RestaurantTable> {
    return this.http.patch<RestaurantTable>(`${this.api}/tables/${id}/status`, { status });
  }
  getOrders(): Observable<Order[]> { return this.http.get<Order[]>(`${this.api}/orders`); }
  getActiveOrders(): Observable<Order[]> { return this.http.get<Order[]>(`${this.api}/orders/active`); }
  createOrder(order: Partial<Order>): Observable<Order> { return this.http.post<Order>(`${this.api}/orders`, order); }
  sendToKitchen(id: number): Observable<Order> { return this.http.post<Order>(`${this.api}/orders/${id}/send-kitchen`, {}); }
  updateOrderStatus(id: number, status: string): Observable<Order> {
    return this.http.patch<Order>(`${this.api}/orders/${id}/status`, { status });
  }
}
