import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { SettingsService } from '../../services/settings.service';
import { HistoryEntry } from '../../models';

@Component({ selector:'app-historique', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./historique.component.html', styleUrl:'./historique.component.scss' })
export class HistoriqueComponent {
  selected = signal<HistoryEntry | null>(null);
  newTotal = '';
  newQty   = '';
  readonly methodIcons: {[key:string]:string} = { especes:'💵', carte:'💳', cheque:'📝', mixte:'🔀' };
  readonly roleIcons: {[key:string]:string} = { ADMIN:'⚙️', SERVEUR:'📋', CUISINE:'🍳', CAISSE:'💰' };

  constructor(public cart: CartService, public settings: SettingsService) {}

  getPreview(entry: HistoryEntry): string {
    const p = entry.items.slice(0,3).map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(', ');
    return entry.items.length > 3 ? p + '...' : p;
  }

  open(entry: HistoryEntry) {
    this.selected.set({ ...entry, items: [...entry.items] });
    this.newTotal = '';
    this.newQty   = '';
  }

  close() { this.selected.set(null); }

  printFacture(noDetail: boolean) {
    const h = this.selected()!;
    if (this.newTotal) h.total = parseFloat(this.newTotal) || h.total;
    const qty = noDetail
      ? (this.newQty ? parseInt(this.newQty) : h.items.reduce((s,i) => s+i.qty, 0))
      : 0;
    this.doPrint(h, noDetail, qty);
  }

  private doPrint(h: HistoryEntry, noDetail: boolean, customQty: number) {
    const s = this.settings.settings();
    const tvaCoef = s.tvaRate / 100;
    const dec = s.currency === 'DT' ? 3 : 2;
    const fmt = (n: number) => `${n.toFixed(dec)} ${s.currency}`;
    const tva = s.tvaRate > 0 ? (h.total * tvaCoef / (1+tvaCoef)).toFixed(dec) : null;
    const ht  = s.tvaRate > 0 ? (h.total / (1+tvaCoef)).toFixed(dec) : null;

    let rows = '';
    if (noDetail) {
      rows = `<div class="rc-row"><span>${customQty} repas</span><span>${fmt(h.total)}</span></div>`;
    } else {
      h.items.forEach(i => {
        rows += `<div class="rc-row"><span>${i.emoji} ${i.name} ×${i.qty}</span><span>${fmt(i.price*i.qty)}</span></div>`;
      });
    }

    const tableInfo = h.table ? `Table ${h.table} · ` : '';
    const w = window.open('', '_blank', 'width=420,height=700');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Facture</title>
    <style>
      body{font-family:"Courier New",monospace;max-width:300px;margin:0 auto;padding:16px 12px;color:#111}
      .rc-name{text-align:center;font-size:17px;font-weight:bold;text-transform:uppercase;letter-spacing:2px}
      .rc-tag,.rc-meta{font-size:10px;color:#888;text-align:center;margin:2px 0}
      hr{border:none;border-top:1px dashed #bbb;margin:8px 0}
      .rc-row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}
      .rc-total{display:flex;justify-content:space-between;font-size:15px;font-weight:bold;padding:5px 0;border-top:2px solid #333}
      .rc-footer{text-align:center;font-size:10px;color:#999;margin-top:12px}
      @media print{body{padding:4px}}
    </style></head><body>
    <div class="rc-name">${s.name}</div>
    ${s.subtitle ? `<div class="rc-tag">${s.subtitle}${s.city?' · '+s.city:''}</div>` : ''}
    <hr>
    <div class="rc-meta">${h.date} ${h.time}</div>
    <div class="rc-meta">${tableInfo}Facture ${h.id}</div>
    <hr>${rows}<hr>
    ${tva ? `<div class="rc-row"><span>HT</span><span>${ht} ${s.currency}</span></div>
             <div class="rc-row"><span>TVA (${s.tvaRate}%)</span><span>${tva} ${s.currency}</span></div><hr>` : ''}
    <div class="rc-total"><span>TOTAL</span><span>${fmt(h.total)}</span></div>
    <div class="rc-footer">Merci de votre visite 🙏<br><b>${s.name}</b>${s.city?'<br>'+s.city:''}${s.taxNumber?'<br>'+s.taxNumber:''}</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  clearHistory() {
    if (confirm("Effacer tout l'historique ?")) this.cart.history.set([]);
  }
}
