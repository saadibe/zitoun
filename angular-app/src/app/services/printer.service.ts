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
  currency?: string;     // devise : €, DT, $...
  // Infos légales
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  tvaNumber?: string;
  nafCode?: string;
  legalName?: string;
  ticketFooter?: string;
  tvaRate?: number;
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

    // Minifier le HTML pour réduire la taille de l'URL
    const mini = html
      .replace(/\s*\n\s*/g, ' ')   // supprimer les sauts de ligne
      .replace(/\s{2,}/g, ' ')       // supprimer les espaces multiples
      .replace(/> </g, '><')          // supprimer espaces entre balises
      .trim();

    const back  = encodeURIComponent(window.location.href);
    const htmlE = encodeURIComponent(mini);

    const url = 'starpassprnt://v1/print/nopreview?'
      + 'back=' + back
      + '&popup=false'
      + '&drawer=none'
      + '&buzzer=none'
      + '&html=' + htmlE;

    // Ouvrir via <a> — déclenche l'intent Android puis revient via back=
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('id', 'passprnt-link');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      const el = document.getElementById('passprnt-link');
      if (el) document.body.removeChild(el);
    }, 400);

    // Court délai pour laisser l'intent partir, sans bloquer l'UI plus que nécessaire
    await new Promise(r => setTimeout(r, 300));
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
    const tableLabel  = isEmporter ? 'A EMPORTER' : 'TABLE ' + d.tableNumber;
    const isFin       = d.orderRef === 'FIN DE SERVICE';
    const tva         = !!(d.tvaRate && d.tvaRate > 0);
    const totalTTC    = d.total;
    const totalHT     = tva ? totalTTC / (1 + (d.tvaRate||0) / 100) : totalTTC;
    const montantTVA  = tva ? totalTTC - totalHT : 0;

    const M: Record<string,string> = {
      especes:'Espèces', carte:'Carte Bleue', cheque:'Chèque', mixte:'Mixte'
    };

    // Construire le HTML par concaténation (pas de backticks imbriqués)
    const H = (tag: string, cls: string, txt: string) =>
      '<' + tag + (cls ? ' class="' + cls + '"' : '') + '>' + txt + '</' + tag + '>';

    // Articles
    let rowsHtml = '';
    d.items.forEach((i, idx) => {
      const priceStr = i.price > 0
        ? (i.price * i.qty).toFixed(2) + ' &euro;'
        : '';
      const unitStr  = i.price > 0 ? i.price.toFixed(2) : '0.00';
      const tvaLetter = tva ? ' B' : '';
      rowsHtml += '<tr>';
      rowsHtml += '<td class="art-qty">' + i.qty + '</td>';
      rowsHtml += '<td class="art-name"><b>' + i.qty + ' ' + i.name + '</b>';
      if (i.note) rowsHtml += '<br><span class="art-note">' + i.note + '</span>';
      rowsHtml += '</td>';
      rowsHtml += '<td class="art-pu">' + (i.price > 0 ? unitStr : '') + '</td>';
      rowsHtml += '<td class="art-total">' + (i.price > 0 ? (i.price * i.qty).toFixed(2) + tvaLetter : '') + '</td>';
      rowsHtml += '</tr>';
      if (idx < d.items.length - 1) {
        rowsHtml += '<tr><td colspan="4" style="padding:1px 0"><hr style="border:none;border-top:1px dashed #999;margin:2px 0"></td></tr>';
      }
    });

    // Infos en-tête
    let header = '';
    header += H('div', 'h-legal', d.legalName || d.restaurantName);
    if (d.legalName && d.legalName !== d.restaurantName) {
      header += H('div', 'h-sub', d.restaurantName);
    }
    if (d.address)    header += H('div', 'h-info', d.address);
    if (d.phone)      header += H('div', 'h-info', 'Tel &nbsp;: ' + d.phone);
    if (d.email)      header += H('div', 'h-info', 'Email : ' + d.email);
    if (d.taxNumber)  header += H('div', 'h-info', 'Siret : ' + d.taxNumber);
    const tvaLine = (d.tvaNumber || '') + (d.nafCode ? ' - Naf : ' + d.nafCode : '');
    if (tvaLine.trim()) header += H('div', 'h-info', 'Tva : ' + tvaLine);

    // TOTAL TTC block
    let totalBlock = '';
    totalBlock += '<div class="total-row">';
    totalBlock += '<span class="total-lbl">TOTAL TTC</span>';
    totalBlock += '<span class="total-amt">' + totalTTC.toFixed(2) + '</span>';
    totalBlock += '</div>';
    if (tva) {
      totalBlock += H('div', 'tva-line', 'Dont TVA &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' + montantTVA.toFixed(2));
      totalBlock += H('div', 'tva-line', 'Total HT &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : ' + totalHT.toFixed(2));
      totalBlock += H('div', 'tva-detail', 'B @' + (d.tvaRate||0) + ',00% ' + totalHT.toFixed(2) + ' HT ' + montantTVA.toFixed(2) + ' TVA ' + totalTTC.toFixed(2) + ' TTC');
    }

    // Pied de ticket
    let footer = '';
    if (d.paymentMethod) {
      footer += '<div class="pay-row">';
      footer += '<span>' + (M[d.paymentMethod] || d.paymentMethod) + '</span>';
      footer += '<span>' + totalTTC.toFixed(2) + ' &euro;</span>';
      footer += '</div><hr>';
    }
    footer += H('div', 'footer-legal', d.date + ' - ' + d.time);
    if (d.orderRef && !isFin) {
      footer += H('div', 'footer-legal', 'Document : ' + d.orderRef);
    }
    footer += '<hr>';
    footer += H('div', 'footer-msg', d.ticketFooter || 'Merci de votre visite');

    // Taille de base : 6vw pour TOUT le ticket (identique à la photo)
    // Seul TOTAL TTC est plus grand (9vw) comme sur le ticket Uber/Clyo
    const F = '6vw';   // taille standard
    const FG = '9vw';  // taille TOTAL TTC
    const css = [
      '* { margin:0 !important; padding:0 !important; box-sizing:border-box !important; }',
      'html, body { width:100% !important; font-family: Arial, Helvetica, sans-serif; font-size:' + F + '; font-weight:700; color:#000; -webkit-print-color-adjust:exact; padding:2vw 1vw !important; }',
      // En-tête : même taille que le reste sauf la raison sociale (légèrement plus grande)
      '.h-legal  { font-size:7vw; font-weight:900; text-align:center; text-transform:uppercase; }',
      '.h-sub    { font-size:' + F + '; font-weight:700; text-align:center; }',
      '.h-info   { font-size:' + F + '; font-weight:700; text-align:center; line-height:1.5; }',
      'hr        { border:none !important; border-top:1.5px solid #000 !important; margin:2vw 0 !important; width:100% !important; display:block !important; }',
      'hr.dbl    { border-top:3px double #000 !important; }',
      '.meta-row { display:flex; justify-content:space-between; font-size:' + F + '; font-weight:700; margin:1vw 0 !important; }',
      '.meta-line{ font-size:' + F + '; font-weight:700; margin:0.5vw 0 !important; }',
      'table     { width:100%; border-collapse:collapse; table-layout:fixed; }',
      '.art-name { width:55%; font-size:' + F + '; font-weight:700; vertical-align:top; padding:1.5vw 1vw !important; word-wrap:break-word; }',
      '.art-pu   { width:18%; font-size:' + F + '; font-weight:700; text-align:right; vertical-align:top; padding:1.5vw 0 !important; }',
      '.art-total{ width:27%; font-size:' + F + '; font-weight:700; text-align:right; vertical-align:top; padding:1.5vw 0 !important; }',
      '.art-note { font-size:' + F + '; font-weight:700; font-style:italic; padding-left:2vw !important; }',
      // TOTAL TTC : plus grand et gras (comme sur la photo)
      '.total-row{ display:flex; justify-content:space-between; align-items:baseline; margin:2vw 0 !important; }',
      '.total-lbl{ font-size:' + FG + '; font-weight:900; }',
      '.total-amt{ font-size:' + FG + '; font-weight:900; }',
      // TVA : même taille standard
      '.tva-line { font-size:' + F + '; font-weight:700; margin:0.5vw 0 !important; }',
      '.tva-detail{ font-size:' + F + '; font-weight:700; margin:0.5vw 0 !important; }',
      // Mode paiement : même taille
      '.pay-row  { display:flex; justify-content:space-between; font-size:' + F + '; font-weight:700; padding:1.5vw 0 !important; }',
      '.footer-legal{ font-size:' + F + '; font-weight:700; text-align:center; margin:0.5vw 0 !important; }',
      '.footer-msg  { font-size:' + F + '; font-weight:900; text-align:center; margin:2vw 0 1vw !important; }'
    ].join(' ');

    return '<!DOCTYPE html><html><head>'
      + '<meta charset="UTF-8">'
      + '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">'
      + '<style>' + css + '</style>'
      + '</head><body>'
      + header
      + '<hr class="dbl">'
      + '<div class="meta-row">'
      + '<span>' + (isEmporter ? 'A Emporter' : 'Sur place') + '</span>'
      + (isFin ? '<span>FIN DE SERVICE</span>' : '')
      + '</div>'
      + '<div class="meta-line">Nombre De Clients : 1</div>'
      + '<hr>'
      + '<table>' + rowsHtml + '</table>'
      + '<hr class="dbl">'
      + totalBlock
      + '<hr>'
      + footer
      + '<br><br><br>'
      + '</body></html>';
  }


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
