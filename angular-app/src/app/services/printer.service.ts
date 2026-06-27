import { Injectable, signal } from '@angular/core';

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

// ── Méthode d'impression ───────────────────────────────────────────
// 'window'  : window.print() via CSS thermique (marche partout)
// 'rawbt'   : app RawBT Android (Bluetooth Classic natif)
// 'bluetooth': Web Bluetooth BLE (TSP100III BLE uniquement)
export type PrintMethod = 'window' | 'rawbt' | 'passprnt' | 'bluetooth';

@Injectable({ providedIn: 'root' })
export class PrinterService {

  method   = signal<PrintMethod>(
    (sessionStorage.getItem('printer_method') as PrintMethod) || 'window'
  );
  connected   = signal<boolean>(false);
  printing    = signal<boolean>(false);
  lastError   = signal<string>('');
  btDeviceName = signal<string>('');

  // BLE
  private btDevice: any = null;
  private btChar:   any = null;

  saveMethod(m: PrintMethod) {
    this.method.set(m);
    sessionStorage.setItem('printer_method', m);
  }

  // ── Impression principale ──────────────────────────────────────
  async printTicket(data: TicketData): Promise<boolean> {
    this.printing.set(true);
    this.lastError.set('');
    try {
      switch (this.method()) {
        case 'rawbt':     await this.printViaRawBT(data);      break;
        case 'passprnt':  await this.printViaPassPRNT(data);   break;
        case 'bluetooth': await this.printViaBLE(data);        break;
        default:                this.printViaWindow(data);     break;
      }
      this.printing.set(false);
      return true;
    } catch (e: any) {
      this.printing.set(false);
      this.lastError.set(e.message || 'Erreur impression');
      return false;
    }
  }

  async testPrint(): Promise<boolean> {
    return this.printTicket({
      tableNumber: null,
      restaurantName: 'La Perla',
      restaurantSubtitle: 'Test impression',
      total: 12.50,
      date: new Date().toLocaleDateString('fr-FR'),
      time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
      items: [
        { name: 'Chapati Thon', emoji: '🥙', qty: 1, price: 6.0, note: 'Fort' },
        { name: 'Citronnade',   emoji: '🍋', qty: 1, price: 3.5 },
        { name: 'Menu',         emoji: '🍽️', qty: 1, price: 2.0 },
      ],
      paymentMethod: 'especes',
    });
  }

  // ════════════════════════════════════════════════════
  // MÉTHODE 1 — window.print() avec CSS thermique
  // Fonctionne sur toutes les tablettes Android/iOS
  // L'imprimante doit être sélectionnée dans le dialogue d'impression Android
  // ════════════════════════════════════════════════════
  private printViaWindow(d: TicketData): void {
    const html = this.buildHtmlTicket(d);
    const w = window.open('', '_blank', 'width=320,height=600');
    if (!w) { throw new Error('Popup bloquée — autorisez les popups pour ce site'); }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 300);
  }

  // ════════════════════════════════════════════════════
  // MÉTHODE PassPRNT — App officielle Star Micronics (gratuit)
  // Scheme exact : starpassprnt://v1/print/nopreview
  // Doc : star-m.jp/products/s_print/sdk/passprnt/manual/android
  // ════════════════════════════════════════════════════
  private async printViaPassPRNT(d: TicketData): Promise<void> {
    const html  = this.buildHtmlTicket(d);
    const back  = encodeURIComponent(window.location.href);
    const htmlE = encodeURIComponent(html);

    // Format officiel Star PassPRNT Android
    // size=2 → 72mm (taille standard ticket thermique)
    const url = `starpassprnt://v1/print/nopreview?`
      + `back=${back}`
      + `&size=2`
      + `&html=${htmlE}`;

    // Ouvrir via <a> — méthode recommandée par Star dans leur doc JS
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('id', 'passprnt-link');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      const el = document.getElementById('passprnt-link');
      if (el) document.body.removeChild(el);
    }, 1500);

    await new Promise(r => setTimeout(r, 1500));
  }

  // ════════════════════════════════════════════════════
  // MÉTHODE 2 — RawBT (app Android gratuite)
  // RawBT reçoit les données ESC/POS via Intent Android
  // ════════════════════════════════════════════════════
  private async printViaRawBT(d: TicketData): Promise<void> {
    const escpos = this.buildEscPosBase64(d);
    const url = `rawbt://base64/${escpos}`;

    // Vérifier que RawBT est installé en essayant d'ouvrir l'intent
    // Si l'app n'est pas installée, Android affiche "App introuvable"
    return new Promise((resolve, reject) => {
      const a = document.createElement('a');
      a.setAttribute('href', url);
      document.body.appendChild(a);

      // Détecter si la page perd le focus (= RawBT s'est ouvert)
      let opened = false;
      const onBlur = () => { opened = true; };
      window.addEventListener('blur', onBlur);

      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        window.removeEventListener('blur', onBlur);
        if (opened) {
          resolve();
        } else {
          // La page n'a pas perdu le focus = RawBT ne s'est pas ouvert
          // Peut-être pas installé ou intent refusé
          // On résout quand même (Chrome peut bloquer blur)
          resolve();
        }
      }, 1200);
    });
  }

  // ════════════════════════════════════════════════════
  // MÉTHODE 3 — Web Bluetooth BLE
  // Uniquement pour imprimantes BLE (pas Bluetooth Classic)
  // TSP100IIBI = Bluetooth Classic → méthode 2 recommandée
  // ════════════════════════════════════════════════════
  async connectBluetooth(): Promise<boolean> {
    const bt = (navigator as any).bluetooth;
    if (!bt) {
      this.lastError.set('Web Bluetooth non supporté — utilisez Chrome Android');
      return false;
    }
    try {
      // UUIDs Star TSP100 BLE
      this.btDevice = await bt.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',   // Star BLE UART
          '0000180f-0000-1000-8000-00805f9b34fb',   // Battery
        ]
      });
      this.btDeviceName.set(this.btDevice.name || 'Imprimante');
      const server  = await this.btDevice.gatt.connect();
      const service = await server.getPrimaryService('49535343-fe7d-4ae5-8fa9-9fafd205e455');
      this.btChar   = await service.getCharacteristic('49535343-1e4d-4bd9-ba61-23c647249616');
      this.connected.set(true);
      this.lastError.set('');
      return true;
    } catch (e: any) {
      this.connected.set(false);
      this.lastError.set(e.message || 'Connexion BLE échouée');
      return false;
    }
  }

  private async printViaBLE(d: TicketData): Promise<void> {
    if (!this.btChar || !this.btDevice?.gatt?.connected) {
      const ok = await this.connectBluetooth();
      if (!ok) throw new Error(this.lastError());
    }
    const bytes = this.buildEscPosBytes(d);
    const CHUNK = 512;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      await this.btChar.writeValueWithoutResponse(bytes.slice(i, i + CHUNK));
      await new Promise(r => setTimeout(r, 20));
    }
  }

  disconnect() {
    try { if (this.btDevice?.gatt?.connected) this.btDevice.gatt.disconnect(); } catch {}
    this.btDevice = null; this.btChar = null;
    this.connected.set(false);
  }

  // ════════════════════════════════════════════════════
  // Génération ticket HTML (pour window.print)
  // ════════════════════════════════════════════════════
  private buildHtmlTicket(d: TicketData): string {
    const table = (!d.tableNumber || d.tableNumber === 0) ? '🥡 À Emporter' : `Table ${d.tableNumber}`;
    const methods: Record<string, string> = {
      especes:'Espèces', carte:'Carte', cheque:'Chèque', mixte:'Mixte'
    };

    const rows = d.items.map(i => `
      <tr>
        <td class="left">${i.name}${i.note ? `<br><small>${i.note}</small>` : ''}</td>
        <td class="center">×${i.qty}</td>
        <td class="right">${(i.price * i.qty).toFixed(2)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    width: 72mm;
    margin: 0 auto;
    padding: 4mm 2mm;
  }
  .center { text-align: center; }
  .right  { text-align: right; }
  .left   { text-align: left; }
  .name {
    font-size: 16px; font-weight: bold;
    text-align: center; text-transform: uppercase;
    letter-spacing: 2px; margin-bottom: 2px;
  }
  .sub  { font-size: 10px; text-align: center; color: #555; margin-bottom: 4px; }
  .meta { font-size: 10px; text-align: center; margin: 2px 0; }
  .table-lbl {
    font-size: 14px; font-weight: bold;
    text-align: center; margin: 4px 0;
  }
  hr { border: none; border-top: 1px dashed #999; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 1px; vertical-align: top; }
  td.left   { width: 60%; }
  td.center { width: 12%; text-align: center; }
  td.right  { width: 28%; text-align: right; font-weight: bold; }
  small { font-size: 10px; color: #666; font-style: italic; }
  .total-row td {
    font-size: 15px; font-weight: bold;
    border-top: 2px solid #333;
    padding-top: 4px;
  }
  .method { font-size: 10px; text-align: center; margin-top: 3px; }
  .footer { font-size: 10px; text-align: center; margin-top: 8px; color: #666; }
  @media print {
    @page { size: 72mm auto; margin: 0; }
    body { padding: 2mm 1mm; }
  }
</style>
</head><body>
  <div class="name">${d.restaurantName}</div>
  <div class="sub">${d.restaurantSubtitle}</div>
  <hr>
  <div class="meta">${d.date} — ${d.time}</div>
  <div class="table-lbl">${table}</div>
  ${d.orderRef ? `<div class="meta">Réf: ${d.orderRef}</div>` : ''}
  <hr>
  <table>
    ${rows}
    <tr class="total-row">
      <td class="left" colspan="2">TOTAL</td>
      <td class="right">${d.total.toFixed(2)} DT</td>
    </tr>
  </table>
  ${d.paymentMethod ? `<div class="method">${methods[d.paymentMethod] ?? d.paymentMethod.toUpperCase()}</div>` : ''}
  <hr>
  <div class="footer">Merci de votre visite 🙏<br><b>${d.restaurantName}</b></div>
  <br><br><br>
</body></html>`;
  }

  // ════════════════════════════════════════════════════
  // Génération ESC/POS bytes (pour BLE et RawBT)
  // ════════════════════════════════════════════════════
  private buildEscPosBytes(d: TicketData): Uint8Array {
    const c: number[] = [];
    const ESC = 0x1B, GS = 0x1D;
    const table = (!d.tableNumber || d.tableNumber === 0) ? 'A EMPORTER' : `TABLE ${d.tableNumber}`;

    c.push(ESC, 0x40);              // Init
    c.push(ESC, 0x61, 0x01);        // Centre
    c.push(ESC, 0x21, 0x10);        // Double hauteur
    this.txt(c, d.restaurantName + '\n');
    c.push(ESC, 0x21, 0x00);        // Normal
    this.txt(c, d.restaurantSubtitle + '\n');
    this.txt(c, '--------------------------------\n');
    c.push(ESC, 0x61, 0x00);        // Gauche
    this.txt(c, `${d.date}  ${d.time}\n`);
    c.push(ESC, 0x21, 0x10);
    c.push(ESC, 0x61, 0x01);
    this.txt(c, table + '\n');
    c.push(ESC, 0x21, 0x00);
    c.push(ESC, 0x61, 0x00);
    this.txt(c, '--------------------------------\n');

    for (const i of d.items) {
      const nm = i.name.length > 18 ? i.name.slice(0,17)+'.' : i.name;
      const pr = `${(i.price * i.qty).toFixed(2)} DT`;
      const sp = ' '.repeat(Math.max(1, 32 - nm.length - 2 - pr.length - `x${i.qty}`.length));
      this.txt(c, `${nm} x${i.qty}${sp}${pr}\n`);
      if (i.note?.trim()) this.txt(c, `  > ${i.note.slice(0,28)}\n`);
    }

    this.txt(c, '--------------------------------\n');
    c.push(ESC, 0x21, 0x30);        // Double
    c.push(ESC, 0x61, 0x00);
    const tot = `${d.total.toFixed(2)} DT`;
    this.txt(c, `TOTAL:${' '.repeat(Math.max(1,16-tot.length))}${tot}\n`);
    c.push(ESC, 0x21, 0x00);

    c.push(ESC, 0x61, 0x01);
    this.txt(c, '\nMerci de votre visite !\n\n\n');
    c.push(GS, 0x56, 0x42, 0x00);   // Coupe partielle
    return new Uint8Array(c);
  }

  private buildEscPosBase64(d: TicketData): string {
    const bytes = this.buildEscPosBytes(d);
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
  }

  private txt(c: number[], s: string) {
    for (const ch of s) {
      const code = ch.charCodeAt(0);
      c.push(code < 256 ? code : 0x3F);
    }
  }
}
