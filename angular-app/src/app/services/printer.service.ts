import { Injectable, signal } from '@angular/core';

export interface PrinterConfig {
  ip: string;
  port: number;
}

export interface TicketData {
  tableNumber: number | null;
  items: { name: string; emoji: string; qty: number; price: number; note?: string }[];
  total: number;
  paymentMethod?: string | null;
  date: string;
  time: string;
  restaurantName: string;
  restaurantSubtitle: string;
  orderRef?: string;
}

@Injectable({ providedIn: 'root' })
export class PrinterService {

  // IP configurée par l'utilisateur — persistée dans sessionStorage (pas localStorage)
  printerIp   = signal<string>(sessionStorage.getItem('printer_ip')   || '');
  printerPort = signal<number>(+(sessionStorage.getItem('printer_port') || '9100'));
  connected   = signal<boolean>(false);
  printing    = signal<boolean>(false);
  lastError   = signal<string>('');

  saveConfig(ip: string, port: number = 9100) {
    this.printerIp.set(ip);
    this.printerPort.set(port);
    sessionStorage.setItem('printer_ip', ip);
    sessionStorage.setItem('printer_port', String(port));
  }

  // ── Test de connexion ─────────────────────────────
  async testConnection(): Promise<boolean> {
    const ip = this.printerIp();
    if (!ip) { this.lastError.set('Aucune IP configurée'); return false; }

    try {
      const xml = this.buildXml([{ text: '\n--- TEST CONNEXION ---\nLa Perla POS\n✓ Imprimante connectée\n\n\n', cut: true }]);
      await this.sendToStar(xml);
      this.connected.set(true);
      this.lastError.set('');
      return true;
    } catch (e: any) {
      this.connected.set(false);
      this.lastError.set(e.message || 'Connexion échouée');
      return false;
    }
  }

  // ── Impression ticket caisse ──────────────────────
  async printTicket(data: TicketData): Promise<boolean> {
    const ip = this.printerIp();
    if (!ip) {
      this.lastError.set('Imprimante non configurée — allez dans Admin > Imprimante');
      return false;
    }

    this.printing.set(true);
    this.lastError.set('');

    try {
      const xml = this.buildTicketXml(data);
      await this.sendToStar(xml);
      this.printing.set(false);
      return true;
    } catch (e: any) {
      this.printing.set(false);
      this.lastError.set(e.message || 'Erreur impression');
      return false;
    }
  }

  // ── Construction XML Star WebPRNT ─────────────────
  private buildTicketXml(d: TicketData): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
    const timeStr = now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });

    const tableLabel = !d.tableNumber || d.tableNumber === 0
      ? '🥡 À EMPORTER'
      : `TABLE ${d.tableNumber}`;

    const methodLabel: Record<string, string> = {
      especes: 'ESPÈCES', carte: 'CARTE BANCAIRE',
      cheque: 'CHÈQUE', mixte: 'PAIEMENT MIXTE'
    };

    let lines: string[] = [];

    // ── En-tête ──────────────────────────────────────
    lines.push(`\x1b!${String.fromCharCode(0x30)}`); // double hauteur
    lines.push(`${d.restaurantName}\n`);
    lines.push(`\x1b!${String.fromCharCode(0x00)}`); // normal
    lines.push(`${d.restaurantSubtitle}\n`);
    lines.push(`${'─'.repeat(32)}\n`);
    lines.push(`${dateStr}  ${timeStr}\n`);
    lines.push(`${tableLabel}\n`);
    if (d.orderRef) lines.push(`Réf: ${d.orderRef}\n`);
    lines.push(`${'─'.repeat(32)}\n`);

    // ── Articles ─────────────────────────────────────
    d.items.forEach(item => {
      const name = item.name.length > 18 ? item.name.slice(0, 17) + '…' : item.name;
      const price = (item.price * item.qty).toFixed(2);
      const spaces = 32 - (name.length + 1 + price.length + 3);
      const pad = ' '.repeat(Math.max(1, spaces));
      lines.push(`${name}${pad}${price} DT\n`);
      if (item.note && item.note.trim()) {
        lines.push(`  > ${item.note.slice(0, 28)}\n`);
      }
    });

    // ── Total ────────────────────────────────────────
    lines.push(`${'─'.repeat(32)}\n`);
    const totalStr = d.total.toFixed(2);
    const totalPad = ' '.repeat(32 - 'TOTAL :'.length - totalStr.length - 3);
    lines.push(`\x1b!${String.fromCharCode(0x30)}`); // double
    lines.push(`TOTAL :${totalPad}${totalStr} DT\n`);
    lines.push(`\x1b!${String.fromCharCode(0x00)}`); // normal

    if (d.paymentMethod) {
      lines.push(`Mode: ${methodLabel[d.paymentMethod] || d.paymentMethod.toUpperCase()}\n`);
    }

    // ── Pied ─────────────────────────────────────────
    lines.push(`${'─'.repeat(32)}\n`);
    lines.push(`   Merci de votre visite !\n`);
    lines.push(`   Saveurs Authentiques de Tunisie\n`);
    lines.push(`\n\n\n`);

    return this.buildXml([{ text: lines.join(''), cut: true }]);
  }

  // ── XML Star WebPRNT ─────────────────────────────
  private buildXml(commands: { text: string; cut?: boolean }[]): string {
    let body = '';
    commands.forEach(cmd => {
      // Alignement centre pour l'en-tête
      body += `<text align="center">`;
      body += this.escapeXml(cmd.text);
      body += `</text>`;
      if (cmd.cut) {
        body += `<cut type="partial"/>`;
      }
    });
    return `<?xml version="1.0" encoding="utf-8"?>
<StarWebPRNT>
  <Initialize/>
  <Align>Center</Align>
  ${body}
</StarWebPRNT>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Envoi HTTP vers l'imprimante ──────────────────
  private async sendToStar(xml: string): Promise<void> {
    const ip   = this.printerIp();
    const url  = `http://${ip}/StarWebPRNT/SendMessage`;

    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      body:    xml,
      signal:  AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Imprimante erreur HTTP ${response.status}`);
    }
  }
}
