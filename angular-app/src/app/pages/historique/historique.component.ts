import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { HistoryEntry } from '../../models';

@Component({ selector:'app-historique', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./historique.component.html', styleUrl:'./historique.component.scss' })
export class HistoriqueComponent implements OnInit {
  selected   = signal<HistoryEntry | null>(null);
  newTotal   = '';
  newQty     = '';
  showEnc    = false;
  payMethod  = 'especes';
  received   = 0;
  change: number | null = null;

  readonly methodIcons: {[k:string]:string} = {
    especes:'💵', carte:'💳', cheque:'📝', mixte:'🔀'
  };
  payMethods = [
    { key:'especes', icon:'💵', label:'Espèces' },
    { key:'carte',   icon:'💳', label:'Carte'   },
    { key:'cheque',  icon:'📝', label:'Chèque'  },
    { key:'mixte',   icon:'🔀', label:'Mixte'   },
  ];

  constructor(
    public cart: CartService,
    public settings: SettingsService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    // Charger l'historique depuis la base
    this.cart.setToken(this.auth.token);
    this.cart.loadHistoryFromApi();
  }

  get pending() { return this.cart.history().filter(e => e.status === 'pending'); }
  get paid()    { return this.cart.history().filter(e => e.status === 'paid'); }

  getPreview(entry: HistoryEntry): string {
    const p = entry.items.slice(0,3).map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(', ');
    return entry.items.length > 3 ? p + '...' : p;
  }

  open(entry: HistoryEntry) {
    this.selected.set({ ...entry, items: [...entry.items] });
    this.newTotal = ''; this.newQty = ''; this.showEnc = false;
  }

  close() { this.selected.set(null); }

  openEncForEntry() {
    this.showEnc = true; this.payMethod = 'especes';
    this.received = 0; this.change = null;
  }

  encTotal(): number {
    const h = this.selected();
    if (!h) return 0;
    return this.newTotal ? parseFloat(this.newTotal) || h.total : h.total;
  }

  calcChange() {
    this.change = this.received >= this.encTotal() ? this.received - this.encTotal() : null;
  }

  confirmerEnc() {
    const h = this.selected();
    if (!h) return;
    if (this.payMethod === 'especes' && this.received < this.encTotal()) {
      alert(`⚠ Montant insuffisant. Total : ${this.settings.fmt(this.encTotal())}`);
      return;
    }
    if (this.newTotal) {
      const t = parseFloat(this.newTotal);
      if (t > 0) h.total = t;
    }
    this.cart.updateHistory(h.id, { method: this.payMethod, status: 'paid', total: h.total });
    this.showEnc = false;
    this.close();
  }

  printFacture(noDetail: boolean) {
    const h = this.selected()!;
    if (this.newTotal) h.total = parseFloat(this.newTotal) || h.total;
    const qty = noDetail
      ? (this.newQty ? parseInt(this.newQty) : h.items.reduce((s,i)=>s+i.qty,0))
      : 0;
    this.doPrint(h, noDetail, qty);
  }

  private doPrint(h: HistoryEntry, noDetail: boolean, customQty: number) {
    const s  = this.settings.settings();
    const dec = s.currency === 'DT' ? 3 : 2;
    const fmt = (n: number) => `${n.toFixed(dec)} ${s.currency}`;
    const tvaCoef = s.tvaRate / 100;
    const tva = s.tvaRate > 0 ? (h.total * tvaCoef / (1+tvaCoef)).toFixed(dec) : null;
    const ht  = s.tvaRate > 0 ? (h.total / (1+tvaCoef)).toFixed(dec) : null;

    let rows = '';
    if (noDetail) {
      rows = `<div class="r"><span>${customQty} repas</span><span>${fmt(h.total)}</span></div>`;
    } else {
      h.items.forEach(i => {
        rows += `<div class="r"><span>${i.emoji} ${i.name} ×${i.qty}` +
          (i.note ? ` <em>${i.note}</em>` : '') +
          `</span><span>${fmt(i.price * i.qty)}</span></div>`;
      });
    }

    const tableInfo = h.table ? `Table ${h.table} · ` : '🥡 Emporter · ';
    const w = window.open('', '_blank', 'width=420,height=700');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Facture</title>
    <style>
      body{font-family:"Courier New",monospace;max-width:300px;margin:0 auto;padding:16px 12px}
      .name{text-align:center;font-size:17px;font-weight:bold;text-transform:uppercase;letter-spacing:2px}
      .tag,.meta{font-size:10px;color:#888;text-align:center;margin:2px 0}
      hr{border:none;border-top:1px dashed #bbb;margin:8px 0}
      .r{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}
      .total{display:flex;justify-content:space-between;font-size:15px;font-weight:bold;padding:5px 0;border-top:2px solid #333}
      .footer{text-align:center;font-size:10px;color:#999;margin-top:12px}
      em{font-size:10px;color:#666;font-style:italic}
      @media print{body{padding:4px}}
    </style></head><body>
    <div class="name">${s.name}</div>
    ${s.subtitle ? `<div class="tag">${s.subtitle}${s.city?' · '+s.city:''}</div>` : ''}
    <hr>
    <div class="meta">${h.date} ${h.time}</div>
    <div class="meta">${tableInfo}Facture ${h.id}</div>
    <hr>${rows}<hr>
    ${tva ? `<div class="r"><span>HT</span><span>${ht} ${s.currency}</span></div>
             <div class="r"><span>TVA (${s.tvaRate}%)</span><span>${tva} ${s.currency}</span></div><hr>` : ''}
    <div class="total"><span>TOTAL</span><span>${fmt(h.total)}</span></div>
    ${h.method ? `<div class="meta">${this.methodIcons[h.method]||''} ${h.method.toUpperCase()}</div>` : ''}
    <div class="footer">Merci de votre visite 🙏<br><b>${s.name}</b>
      ${s.city ? '<br>'+s.city : ''}
      ${s.taxNumber ? '<br>'+s.taxNumber : ''}
    </div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  clearHistory() {
    if (confirm("Effacer tout l'historique ?")) this.cart.clearHistory();
  }
}
