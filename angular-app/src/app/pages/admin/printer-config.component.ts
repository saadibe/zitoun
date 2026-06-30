import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { PrinterService } from '../../services/printer.service';

interface FoundDevice { name: string; address: string; }

@Component({
  selector: 'app-printer-config',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="printer-page">
  <h2 class="pr-title">🖨️ Imprimante Star TSP100IIBI</h2>
  <p class="pr-sub">
    @if (isNative) { App installée — Bluetooth natif direct }
    @else { Navigateur — via Star PassPRNT }
  </p>

  <!-- Statut -->
  <div class="pr-card pr-status-card">
    <div class="pr-status-row">
      <span class="pr-status-dot" [class.active]="printer.connected()"></span>
      @if (printer.connected()) {
        <span>Connectée — {{ printer.btDeviceName() }} ✅</span>
      } @else {
        <span>Non connectée</span>
      }
    </div>
  </div>

  <!-- ═══ MODE NATIF (app installée) ═══ -->
  @if (isNative) {

    <div class="pr-card pr-info">
      <div class="pr-info-header">
        <span class="pr-info-icon">⚡</span>
        <div>
          <div class="pr-info-title">Impression directe — zéro aller-retour</div>
          <div class="pr-info-sub">Connexion Bluetooth Classic native, aucune app tierce</div>
        </div>
      </div>
      <ol class="pr-steps">
        <li>Allumer la TSP100IIBI et l'appairer dans <strong>Paramètres Bluetooth Android</strong> si pas déjà fait</li>
        <li>Cliquer <strong>"Rechercher l'imprimante"</strong> ci-dessous</li>
        <li>Sélectionner <strong>Star TSP100</strong> dans la liste</li>
        <li>L'adresse est mémorisée — plus besoin de refaire ça</li>
      </ol>
    </div>

    <div class="pr-card">
      <button class="pr-btn" [disabled]="scanning()" (click)="scan()">
        @if (scanning()) { 🔍 Recherche en cours... }
        @else { 🔍 Rechercher l'imprimante }
      </button>

      @if (devices().length > 0) {
        <div class="pr-devices">
          @for (d of devices(); track d.address) {
            <button class="pr-device-row" (click)="connect(d.address)">
              <span class="pr-device-icon">🖨️</span>
              <div class="pr-device-info">
                <div class="pr-device-name">{{ d.name || 'Imprimante' }}</div>
                <div class="pr-device-addr">{{ d.address }}</div>
              </div>
              <span class="pr-device-arrow">→</span>
            </button>
          }
        </div>
      }
    </div>
  }

  <!-- ═══ MODE NAVIGATEUR (PassPRNT) ═══ -->
  @if (!isNative) {
    <div class="pr-card pr-info">
      <div class="pr-info-header">
        <span class="pr-info-icon">📲</span>
        <div>
          <div class="pr-info-title">Configuration (une seule fois)</div>
          <div class="pr-info-sub">Application gratuite officielle Star Micronics</div>
        </div>
      </div>
      <ol class="pr-steps">
        <li>
          Google Play → <strong>"Star PassPRNT"</strong>
          <br><small>Développeur : STAR MICRONICS CO.,LTD.</small>
        </li>
        <li>Ouvrir PassPRNT → <strong>Bluetooth</strong> → sélectionner <strong>Star TSP100</strong></li>
        <li>Revenir ici → cliquer <strong>"Tester l'impression"</strong></li>
        <li>Android demande → choisir <strong>"Toujours ouvrir avec PassPRNT"</strong></li>
      </ol>
      <div class="pr-note">
        💡 Pour une impression instantanée sans aller-retour, installez l'app native La Perla POS.
      </div>
    </div>
  }

  <!-- Test commun -->
  <div class="pr-card">
    <button class="pr-btn" [disabled]="printer.printing()" (click)="test()">
      @if (printer.printing()) { ⏳ Envoi en cours... }
      @else { 🖨️ Tester l'impression }
    </button>
    @if (printer.lastError()) {
      <div class="pr-error">❌ {{ printer.lastError() }}</div>
    }
    @if (testOk()) {
      <div class="pr-ok">✅ Ticket de test imprimé</div>
    }
  </div>
</div>
  `,
  styleUrl: './printer-config.component.scss'
})
export class PrinterConfigComponent implements OnInit, OnDestroy {
  printer = inject(PrinterService);
  testOk  = signal(false);
  scanning = signal(false);
  devices  = signal<FoundDevice[]>([]);

  isNative = Capacitor.isNativePlatform();

  ngOnInit() {}
  ngOnDestroy() { this.printer.stopNativeScan(); }

  async scan() {
    this.devices.set([]);
    this.scanning.set(true);
    await this.printer.scanNativeDevices((found) => {
      this.devices.set(found);
    });
    // Le scan natif émet des événements ; on l'arrête après quelques secondes
    setTimeout(() => {
      this.printer.stopNativeScan();
      this.scanning.set(false);
    }, 8000);
  }

  async connect(address: string) {
    const ok = await this.printer.connectNative(address);
    if (ok) this.printer.saveMethod('native');
  }

  async test() {
    this.testOk.set(false);
    const ok = await this.printer.testPrint();
    if (ok) {
      this.testOk.set(true);
      setTimeout(() => this.testOk.set(false), 6000);
    }
  }
}
