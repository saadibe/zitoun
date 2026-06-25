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

// ── Méthode d'impression sélectionnée ─────────────────────────────
export type PrintMethod = 'bluetooth' | 'none';

@Injectable({ providedIn: 'root' })
export class PrinterService {

  method      = signal<PrintMethod>(
    (sessionStorage.getItem('printer_method') as PrintMethod) || 'bluetooth'
  );
  btDeviceName = signal<string>(sessionStorage.getItem('printer_bt_name') || 'Star Micronics');
  connected   = signal<boolean>(false);
  printing    = signal<boolean>(false);
  lastError   = signal<string>('');

  // Référence au device BT Web Bluetooth API
  private btDevice: any = null;
  private btChar:   any = null;   // BLE characteristic (si BLE)

  saveConfig(method: PrintMethod, btName: string) {
    this.method.set(method);
    this.btDeviceName.set(btName);
    sessionStorage.setItem('printer_method', method);
    sessionStorage.setItem('printer_bt_name', btName);
  }

  // ── Vérification support navigateur ──────────────────────────────
  get bluetoothSupported(): boolean {
    return !!(navigator as any).bluetooth;
  }

  // ── Connexion Bluetooth (Web Bluetooth API) ───────────────────────
  // Fonctionne sur Chrome/Edge Android (pas Safari iOS)
  async connectBluetooth(): Promise<boolean> {
    if (!this.bluetoothSupported) {
      this.lastError.set('Web Bluetooth non supporté sur ce navigateur. Utilisez Chrome sur Android.');
      return false;
    }

    try {
      const bt = (navigator as any).bluetooth;

      // Star TSP100IIBI utilise le service SPP (Serial Port Profile) via BLE
      // UUID standard Star Micronics BLE : 00001101-0000-1000-8000-00805f9b34fb
      this.btDevice = await bt.requestDevice({
        filters: [
          { namePrefix: 'Star' },
          { namePrefix: 'TSP100' },
          { namePrefix: 'mPOP' },
        ],
        optionalServices: [
          '00001101-0000-1000-8000-00805f9b34fb',  // SPP classique
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',  // Star BLE service
        ]
      });

      this.btDeviceName.set(this.btDevice.name || 'Star Micronics');
      sessionStorage.setItem('printer_bt_name', this.btDevice.name || '');

      const server  = await this.btDevice.gatt.connect();
      let service: any;

      // Essai service BLE Star
      try {
        service   = await server.getPrimaryService('49535343-fe7d-4ae5-8fa9-9fafd205e455');
        this.btChar = await service.getCharacteristic('49535343-1e4d-4bd9-ba61-23c647249616');
      } catch {
        // Fallback SPP
        service   = await server.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
        this.btChar = await service.getCharacteristic('00001101-0000-1000-8000-00805f9b34fb');
      }

      this.connected.set(true);
      this.lastError.set('');
      return true;

    } catch (e: any) {
      this.connected.set(false);
      this.lastError.set(e.message || 'Connexion Bluetooth échouée');
      return false;
    }
  }

  // ── Test impression ───────────────────────────────────────────────
  async testPrint(): Promise<boolean> {
    const testData: TicketData = {
      tableNumber: null,
      restaurantName: 'La Perla',
      restaurantSubtitle: 'Saveurs Authentiques de Tunisie',
      total: 0,
      date: new Date().toLocaleDateString('fr-FR'),
      time: new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }),
      items: [{ name: 'TEST CONNEXION', emoji: '✓', qty: 1, price: 0 }]
    };
    return this.printTicket(testData);
  }

  // ── Impression ticket ─────────────────────────────────────────────
  async printTicket(data: TicketData): Promise<boolean> {
    this.printing.set(true);
    this.lastError.set('');

    try {
      const bytes = this.buildEscPosBytes(data);

      if (this.method() === 'bluetooth') {
        await this.sendViaBluetooth(bytes);
      }

      this.printing.set(false);
      return true;
    } catch (e: any) {
      this.printing.set(false);
      this.lastError.set(e.message || 'Erreur impression');
      return false;
    }
  }

  // ── Envoi Bluetooth ───────────────────────────────────────────────
  private async sendViaBluetooth(data: Uint8Array): Promise<void> {
    // Reconnecter si nécessaire
    if (!this.btChar || (this.btDevice && !this.btDevice.gatt?.connected)) {
      const ok = await this.connectBluetooth();
      if (!ok) throw new Error(this.lastError() || 'Imprimante non connectée');
    }

    // Envoyer par chunks de 512 bytes (limite BLE)
    const CHUNK = 512;
    for (let i = 0; i < data.length; i += CHUNK) {
      const chunk = data.slice(i, i + CHUNK);
      await this.btChar.writeValueWithoutResponse(chunk);
      // Petite pause entre chunks
      await new Promise(r => setTimeout(r, 20));
    }
  }

  // ── Construction ESC/POS ──────────────────────────────────────────
  private buildEscPosBytes(d: TicketData): Uint8Array {
    const cmds: number[] = [];

    const ESC = 0x1B, GS = 0x1D;

    // Init
    cmds.push(ESC, 0x40);                       // Initialize
    cmds.push(ESC, 0x61, 0x01);                 // Align center

    // Double hauteur pour le nom
    cmds.push(ESC, 0x21, 0x10);                 // Double height
    this.addText(cmds, d.restaurantName + '\n');
    cmds.push(ESC, 0x21, 0x00);                 // Normal
    this.addText(cmds, d.restaurantSubtitle + '\n');
    this.addText(cmds, this.line() + '\n');

    // Date et table
    cmds.push(ESC, 0x61, 0x00);                 // Align left
    const table = (!d.tableNumber || d.tableNumber === 0) ? 'A EMPORTER' : `TABLE ${d.tableNumber}`;
    this.addText(cmds, `${d.date}  ${d.time}\n`);

    cmds.push(ESC, 0x21, 0x10);                 // Double height
    this.addText(cmds, table + '\n');
    cmds.push(ESC, 0x21, 0x00);                 // Normal

    if (d.orderRef) this.addText(cmds, `Ref: ${d.orderRef}\n`);
    this.addText(cmds, this.line() + '\n');

    // Articles
    for (const item of d.items) {
      const name  = item.name.length > 20 ? item.name.slice(0, 19) + '.' : item.name;
      const qty   = `x${item.qty}`;
      const price = `${(item.price * item.qty).toFixed(2)} DT`;
      const pad   = 32 - name.length - qty.length - price.length - 2;
      this.addText(cmds, `${name} ${qty}${' '.repeat(Math.max(1, pad))}${price}\n`);
      if (item.note?.trim()) {
        this.addText(cmds, `  > ${item.note.slice(0, 28)}\n`);
      }
    }

    this.addText(cmds, this.line() + '\n');

    // Total
    cmds.push(ESC, 0x61, 0x00);
    cmds.push(ESC, 0x21, 0x30);                 // Double width + height
    const totalStr = `${d.total.toFixed(2)} DT`;
    const totalPad = ' '.repeat(Math.max(1, 32 - 'TOTAL:'.length - totalStr.length));
    this.addText(cmds, `TOTAL:${totalPad}${totalStr}\n`);
    cmds.push(ESC, 0x21, 0x00);

    // Mode paiement
    if (d.paymentMethod) {
      const modes: Record<string, string> = {
        especes: 'ESPECES', carte: 'CARTE', cheque: 'CHEQUE', mixte: 'MIXTE'
      };
      cmds.push(ESC, 0x61, 0x00);
      this.addText(cmds, `Mode: ${modes[d.paymentMethod] ?? d.paymentMethod.toUpperCase()}\n`);
    }

    // Pied
    this.addText(cmds, this.line() + '\n');
    cmds.push(ESC, 0x61, 0x01);                 // Center
    this.addText(cmds, 'Merci de votre visite !\n');
    this.addText(cmds, 'Saveurs Authentiques de Tunisie\n');
    this.addText(cmds, '\n\n\n');

    // Coupe partielle
    cmds.push(GS, 0x56, 0x42, 0x00);            // Partial cut

    return new Uint8Array(cmds);
  }

  private addText(cmds: number[], text: string) {
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      // Garder seulement ASCII + latin-1 (ESC/POS standard)
      cmds.push(code < 256 ? code : 0x3F);      // '?' pour caractères non supportés
    }
  }

  private line(len = 32): string { return '─'.repeat(len); }
}
