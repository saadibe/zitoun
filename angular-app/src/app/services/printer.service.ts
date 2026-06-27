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
    (sessionStorage.getItem('printer_method') as PrintMethod) || 'passprnt'
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

    // PassPRNT : pas de size → laisse l'app gérer la largeur native
    // scale=fit → étire sur toute la largeur du papier configuré dans PassPRNT
    const url = `starpassprnt://v1/print/nopreview?`
      + `back=${back}`
      + `&popup=false`
      + `&drawer=none`
      + `&buzzer=none`
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
    const isEmporter = !d.tableNumber || d.tableNumber === 0;
    const tableLabel = isEmporter ? 'A EMPORTER' : `TABLE ${d.tableNumber}`;
    const methods: Record<string, string> = {
      especes:'Espèces', carte:'Carte bancaire', cheque:'Chèque', mixte:'Mixte'
    };
    const isFin = d.orderRef === 'FIN DE SERVICE';

    const rows = d.items.map((i, idx) => `
      <tr class="item-row">
        <td class="item-name"><b>${i.qty} x ${i.name}</b></td>
        <td class="item-price">${(i.price * i.qty).toFixed(2)} €</td>
      </tr>
      ${i.note ? `<tr><td class="item-note" colspan="2">${i.note}</td></tr>` : ''}
      ${idx < d.items.length - 1 ? `<tr class="sep-row"><td colspan="2"><hr class="item-sep"></td></tr>` : ''}
    `).join('');

    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin:0 !important; padding:0 !important; box-sizing:border-box !important; }
  html {
    width: 100% !important;
  }
  body {
    width: 100% !important;
    font-family: Arial Black, Arial, Helvetica, sans-serif;
    font-size: 9vw;
    font-weight: 900;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    padding: 1vw 0 !important;
  }
  .header {
    display: flex !important;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px !important;
    width: 100% !important;
  }
  .resto-name  { font-size: 10.5vw; font-weight: 900; }
  .ticket-type { font-size: 9vw; font-weight: 900; text-transform: uppercase; }
  .black-box {
    background: #000 !important;
    color: #fff !important;
    display: flex !important;
    justify-content: space-between;
    align-items: center;
    padding: 7px 10px !important;
    margin: 6px 0 !important;
    width: 100% !important;
    -webkit-print-color-adjust: exact;
  }
  .bb-left  { font-size: 11vw; font-weight: 900; }
  .bb-right { font-size: 10.5vw; font-weight: 900; }
  .meta { font-size: 7.5vw; margin: 1vw 0; }
  hr      { border: none !important; border-top: 2px solid #000 !important; margin: 7px 0 !important; width: 100% !important; display: block !important; }
  hr.thin     { border-top: 1px solid #999; margin: 5px 0; }
  hr.item-sep { border: none !important; border-top: 1px dashed #555 !important; margin: 2px 0 !important; width: 100% !important; display: block !important; }
  .sep-row td { padding: 0 !important; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .item-row td { padding: 6px 0 3px; vertical-align: top; }
  .item-name   { font-size: 9vw; font-weight: 900; width: 62%; word-wrap: break-word; overflow-wrap: break-word; }
  .item-price  { font-size: 9vw; font-weight: 900; text-align: right; width: 38%; }
  .item-note   { font-size: 7vw; font-weight: 700; padding: 0 0 1vw 2vw; }
  .subtotal-row td { font-size: 8.5vw; padding: 1vw 0; }
  .total-row td    { font-size: 10vw; font-weight: 900; padding: 1.5vw 0; }
  .lbl { width: 55%; }
  .amt { text-align: right; width: 45%; }
  .payment { font-size: 7.5vw; margin: 1vw 0; }
  .footer  { font-size: 7.5vw; text-align: center; margin-top: 3vw; }
</style>
</head><body>

  <div class="header">
    <span class="resto-name">${d.restaurantName}</span>
    <span class="ticket-type">${isEmporter ? 'EMPORTER' : 'SUR PLACE'}</span>
  </div>

  <div class="black-box">
    <span class="bb-left">${tableLabel}</span>
    <span class="bb-right">${isFin ? 'RECAP' : (d.orderRef ?? d.time)}</span>
  </div>

  <div class="meta">Le ${d.date} à ${d.time}</div>
  ${isFin ? '<div style="font-size:28px;font-weight:900;text-align:center;padding:6px 0">★ FIN DE SERVICE ★</div>' : ''}

  <hr>

  <table>${rows}</table>

  <hr class="thin">

  <table>
    <tr class="subtotal-row">
      <td class="lbl">Sous-total</td>
      <td class="amt">${d.total.toFixed(2)} €</td>
    </tr>
    <tr class="total-row">
      <td class="lbl">Montant payé</td>
      <td class="amt">${d.total.toFixed(2)} €</td>
    </tr>
  </table>

  ${d.paymentMethod ? `<div class="payment">Mode : ${methods[d.paymentMethod] ?? d.paymentMethod}</div>` : ''}

  <hr>
  <div class="footer">Merci pour votre commande<br><b>${d.restaurantName}</b></div>
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
      const pr = `${(i.price * i.qty).toFixed(2)} €`;
      const sp = ' '.repeat(Math.max(1, 32 - nm.length - 2 - pr.length - `x${i.qty}`.length));
      this.txt(c, `${nm} x${i.qty}${sp}${pr}\n`);
      if (i.note?.trim()) this.txt(c, `  > ${i.note.slice(0,28)}\n`);
    }

    this.txt(c, '--------------------------------\n');
    c.push(ESC, 0x21, 0x30);        // Double
    c.push(ESC, 0x61, 0x00);
    const tot = `${d.total.toFixed(2)} €`;
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
