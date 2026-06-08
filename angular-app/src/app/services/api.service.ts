import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { MenuItem, Order, RestaurantTable, RestaurantSettings, Category } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` });
  }

  // ── Menu ──────────────────────────────────────────
  getMenu()                          { return this.http.get<MenuItem[]>(`${this.base}/menu`); }
  createMenuItem(item: Partial<MenuItem>) { return this.http.post<MenuItem>(`${this.base}/menu`, item, { headers: this.headers() }); }
  updateMenuItem(id: number, item: Partial<MenuItem>) { return this.http.put<MenuItem>(`${this.base}/menu/${id}`, item, { headers: this.headers() }); }
  deleteMenuItem(id: number)         { return this.http.delete(`${this.base}/menu/${id}`, { headers: this.headers() }); }

  // ── Orders ────────────────────────────────────────
  getActiveOrders()                  { return this.http.get<Order[]>(`${this.base}/orders/active`, { headers: this.headers() }); }
  createOrder(payload: any)          { return this.http.post<Order>(`${this.base}/orders`, payload, { headers: this.headers() }); }
  sendToKitchen(id: number)          { return this.http.post<Order>(`${this.base}/orders/${id}/send-kitchen`, {}, { headers: this.headers() }); }
  updateOrderStatus(id: number, status: string) { return this.http.patch<Order>(`${this.base}/orders/${id}/status`, { status }, { headers: this.headers() }); }

  // ── Tables ────────────────────────────────────────
  getTables()                        { return this.http.get<RestaurantTable[]>(`${this.base}/tables`); }
  createTable(t: any)                { return this.http.post<RestaurantTable>(`${this.base}/tables`, t, { headers: this.headers() }); }
  deleteTable(id: number)            { return this.http.delete(`${this.base}/tables/${id}`, { headers: this.headers() }); }

  // ── Settings ──────────────────────────────────────
  getSettings()                      { return this.http.get<RestaurantSettings>(`${this.base}/settings`); }
  updateSettings(s: RestaurantSettings) { return this.http.put<RestaurantSettings>(`${this.base}/settings`, s, { headers: this.headers() }); }
  getCategories()                    { return this.http.get<Category[]>(`${this.base}/settings/categories`); }
  createCategory(c: Partial<Category>) { return this.http.post<Category>(`${this.base}/settings/categories`, c, { headers: this.headers() }); }
  deleteCategory(id: number)         { return this.http.delete(`${this.base}/settings/categories/${id}`, { headers: this.headers() }); }

  // ── Auth / Users ──────────────────────────────────
  getUsers()                         { return this.http.get<any[]>(`${this.base}/auth/users`, { headers: this.headers() }); }
  createUser(u: any)                 { return this.http.post<any>(`${this.base}/auth/users`, u, { headers: this.headers() }); }
  deleteUser(id: number)             { return this.http.delete(`${this.base}/auth/users/${id}`, { headers: this.headers() }); }
}
