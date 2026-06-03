export interface MenuItem {
  id: number; name: string; price: number;
  category: 'ENTREE'|'PLAT'|'DESSERT'|'BOISSON'; emoji: string; available: boolean;
}
export interface OrderItem { menuItem: MenuItem; quantity: number; note?: string; }
export interface Order {
  id?: number; tableNumber: number; items: OrderItem[];
  status: 'PENDING'|'SENT'|'PREPARING'|'READY'|'SERVED'|'CANCELLED';
  createdAt?: string; total?: number; serverName?: string;
}
export interface RestaurantTable {
  id: number; number: number; seats: number;
  status: 'FREE'|'OCCUPIED'|'RESERVED'; currentOrderId?: number;
}
