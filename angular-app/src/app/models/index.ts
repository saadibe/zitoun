export interface MenuItem {
  id: number; name: string; price: number;
  category: string; emoji: string; available: boolean;
  isComposite?: boolean;
  options?: CompositeOption[];
}

export interface CompositeOption {
  id: number;
  label: string;        // ex: "Piment"
  type: 'single' | 'multi';  // choix unique ou multiple
  required: boolean;
  choices: CompositeChoice[];
}

export interface CompositeChoice {
  id: number;
  label: string;        // ex: "Normal", "Fort", "Sans piment"
  priceAdjust: number;  // 0 = inclus, >0 = supplément
}

export interface CartItem {
  item: MenuItem;
  qty: number;
  note: string;
  selectedOptions?: SelectedOption[];  // options choisies
}

export interface SelectedOption {
  optionId: number;
  optionLabel: string;
  choiceId: number;
  choiceLabel: string;
  priceAdjust: number;
}

export interface OrderItem {
  id: number; name: string; emoji: string;
  price: number; quantity: number; note: string;
}

export interface Order {
  id: number; tableNumber: number; status: string;
  items: OrderItem[]; total: number; createdAt: string;
}

export interface RestaurantTable {
  id: number; number: number; seats: number;
  status: 'FREE' | 'OCCUPIED' | 'RESERVED' | 'PENDING_PAYMENT';
}

export interface RestaurantSettings {
  id: number; name: string; subtitle: string; city: string;
  icon: string; taxNumber: string; currency: string; tvaRate: number; theme: string;
}

export interface Category {
  id: number; code: string; label: string; emoji: string;
  sortOrder: number; active: boolean;
}

export interface HistoryEntry {
  id: string;
  table: number | null;
  date: string; time: string;
  method: string | null;  // null = pas encore encaissé
  total: number;
  status: 'paid' | 'pending';  // encaissé ou en attente
  orderId?: number;  // référence vers la commande backend
  items: { id: number; name: string; emoji: string; price: number; qty: number; options?: string }[];
}

export interface Session {
  user: string; role: string; token: string;
  refreshToken: string; expiresAt: number;
}
