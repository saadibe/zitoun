import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrinterService } from '../../services/printer.service';

@Component({
  selector: 'app-printer-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="printer-page">
  <h2 class="pr-title">🖨️ Imprimante Star TSP100</h2>
  <p class="pr-sub">Connexion Bluetooth — Chrome Android requis</p>

  <!-- Alerte iOS -->
  @if (isIos) {
    <div class="pr-alert ios">
      ⚠️ <strong>Safari iOS ne supporte pas Web Bluetooth.</strong><br>
      Sur iPad/iPhone, utilisez l'app <strong>Star Mobile Connect</strong>
      disponible sur l'App Store, puis imprimez depuis cette app.
    </div>
  }

  <!-- Chrome OK -->
  @if (!isIos) {
    <div class="pr-card">
      <!-- Statut connexion -->
      <div class="pr-status-bar" [class.connected]="printer.connected()">
        <span class="pr-dot"></span>
        @if (printer.connected()) {
          ✅ Connectée : <strong>{{ printer.btDeviceName() }}</strong>
        } @else {
          ⚪ Non connectée
        }
      </div>

      <!-- Bouton connexion -->
      <button class="pr-btn pr-connect" (click)="connect()"
        [disabled]="connecting()">
        @if (connecting()) { ⏳ Connexion en cours... }
        @else if (printer.connected()) { 🔄 Reconnecter }
        @else { 📡 Connecter l'imprimante Bluetooth }
      </button>

      <!-- Test impression -->
      <button class="pr-btn pr-test"
        [disabled]="!printer.connected() || printer.printing()"
        (click)="test()">
        @if (printer.printing()) { ⏳ Impression... }
        @else { 🖨️ Imprimer ticket test }
      </button>

      <!-- Erreur -->
      @if (printer.lastError()) {
        <div class="pr-error">❌ {{ printer.lastError() }}</div>
      }
    </div>
  }

  <!-- Instructions -->
  <div class="pr-card pr-info">
    <h3>📋 Comment connecter la TSP100 Bluetooth</h3>
    <ol>
      <li>Allumer l'imprimante Star TSP100</li>
      <li>Activer le Bluetooth sur la tablette Android</li>
      <li>Ouvrir <strong>La Perla POS</strong> dans <strong>Chrome</strong> (pas Firefox ni Samsung Internet)</li>
      <li>Cliquer <strong>"Connecter l'imprimante"</strong> ci-dessus</li>
      <li>Sélectionner <strong>Star Micronics TSP100</strong> dans la liste</li>
      <li>Cliquer <strong>"Imprimer ticket test"</strong> pour vérifier</li>
    </ol>
    <div class="pr-note">
      💡 La connexion BT est <strong>mémorisée</strong> pendant la session.
      Si l'app est fermée, il faudra reconnecter.
    </div>

    @if (isIos) {
      <div class="pr-note ios-note">
        🍎 <strong>iPad / iPhone :</strong> Téléchargez
        <strong>Star Mobile Connect</strong> sur l'App Store.
        Ouvrez-le, connectez l'imprimante, puis imprimez via le menu Partager.
      </div>
    }
  </div>
</div>
  `,
  styleUrl: './printer-config.component.scss'
})
export class PrinterConfigComponent {
  printer    = inject(PrinterService);
  connecting = signal(false);

  get isIos(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  async connect() {
    this.connecting.set(true);
    await this.printer.connectBluetooth();
    this.connecting.set(false);
  }

  async test() {
    await this.printer.testPrint();
  }
}
