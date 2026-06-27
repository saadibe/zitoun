export interface MenuItem {
  id: number; name: string; price: number;
  category: string; emoji: string; available: boolean;
}
export interface CartItem {
  item: MenuItem; qty: number; note: string;
  piment?: string;    // 'normal' | 'fort' | 'sans'
  withMenu?: boolean; // option menu (+menuPrice)
}
export interface OrderItem { id: number; name: string; emoji: string; price: number; quantity: number; note: string; }
export interface Order { id: number; tableNumber: number; status: string; items: OrderItem[]; total: number; createdAt: string; updatedAt?: string; paymentMethod?: string; paidAt?: string; }
export interface RestaurantTable { id: number; number: number; seats: number; status: 'FREE'|'OCCUPIED'|'RESERVED'; }
export interface RestaurantSettings {
  id: number; name: string; subtitle: string; city: string;
  icon: string; taxNumber: string; currency: string;
  tvaRate: number; theme: string; menuPrice: number;
  // Infos ticket
  address?: string;      // adresse complète
  phone?: string;        // téléphone
  email?: string;        // email
  tvaNumber?: string;    // numéro TVA intracommunautaire
  nafCode?: string;      // code NAF/APE
  legalName?: string;    // raison sociale
  ticketFooter?: string; // pied de ticket personnalisable
}
export interface Category { id: number; code: string; label: string; emoji: string; sortOrder: number; active: boolean; }
export interface HistoryEntry {
  id: string; table: number|null; date: string; time: string;
  method: string|null; total: number; status: 'paid'|'pending';
  items: { id:number; name:string; emoji:string; price:number; qty:number; note?:string }[];
}
export interface Session { user: string; role: string; token: string; refreshToken: string; expiresAt: number; }
