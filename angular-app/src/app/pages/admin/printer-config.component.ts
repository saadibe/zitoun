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
  <p class="pr-sub">Bluetooth Android — Chrome requis</p>

  <!-- Alerte iOS -->
  @if (isIos) {
    <div class="pr-alert ios">
      ⚠️ <strong>Safari iOS ne supporte pas Web Bluetooth.</strong><br>
      Sur iPad, utilisez <strong>Star Mobile Connect</strong> (App Store).
    </div>
  }

  @if (!isIos) {

    <!-- Statut + actions principales -->
    <div class="pr-card">
      <div class="pr-status-bar" [class.connected]="printer.connected()">
        <span class="pr-dot"></span>
        @if (printer.connected()) {
          ✅ Connectée : <strong>{{ printer.btDeviceName() }}</strong>
        } @else {
          ⚪ Non connectée
        }
      </div>

      <div class="pr-btns">
        <!-- Connecter -->
        @if (!printer.connected()) {
          <button class="pr-btn pr-connect" (click)="connect()" [disabled]="connecting()">
            @if (connecting()) { ⏳ Connexion... } @else { 📡 Connecter l'imprimante }
          </button>
        }

        <!-- Connectée : Imprimer test + Libérer -->
        @if (printer.connected()) {
          <button class="pr-btn pr-test"
            [disabled]="printer.printing()" (click)="test()">
            @if (printer.printing()) { ⏳ Impression... } @else { 🖨️ Ticket test }
          </button>
          <button class="pr-btn pr-release" (click)="release()">
            🔓 Libérer pour Uber Eats
          </button>
        }
      </div>

      @if (printer.lastError()) {
        <div class="pr-error">❌ {{ printer.lastError() }}</div>
      }

      @if (released()) {
        <div class="pr-ok">✅ Imprimante libérée — Uber Eats peut l'utiliser</div>
      }
    </div>

    <!-- Partage avec Uber Eats -->
    <div class="pr-card pr-uber">
      <h3>🔄 Partage avec Uber Eats</h3>
      <p>Les deux apps utilisent la même imprimante en alternance :</p>
      <div class="pr-steps">
        <div class="pr-step">
          <span class="pr-step-num">1</span>
          <span>Pour imprimer depuis <strong>La Perla POS</strong> → cliquer <em>Connecter</em></span>
        </div>
        <div class="pr-step">
          <span class="pr-step-num">2</span>
          <span>Après impression → cliquer <em>Libérer pour Uber Eats</em></span>
        </div>
        <div class="pr-step">
          <span class="pr-step-num">3</span>
          <span>Uber Eats reprend automatiquement le contrôle</span>
        </div>
      </div>
      <div class="pr-note">
        💡 <strong>Astuce :</strong> Si Uber Eats a la connexion et que tu veux imprimer,
        ferme l'app Uber (swipe) puis clique Connecter ici.
      </div>
    </div>

    <!-- Instructions -->
    <div class="pr-card pr-info">
      <h3>📋 Première connexion</h3>
      <ol>
        <li>Allumer l'imprimante Star TSP100</li>
        <li>Ouvrir <strong>La Perla POS dans Chrome</strong> sur Android</li>
        <li>Cliquer <strong>"Connecter l'imprimante"</strong></li>
        <li>Sélectionner <strong>Star Micronics TSP100</strong></li>
        <li>Imprimer un ticket test ✅</li>
      </ol>
    </div>
  }
</div>
  `,
  styleUrl: './printer-config.component.scss'
})
export class PrinterConfigComponent {
  printer    = inject(PrinterService);
  connecting = signal(false);
  released   = signal(false);

  get isIos(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  async connect() {
    this.connecting.set(true);
    this.released.set(false);
    await this.printer.connectBluetooth();
    this.connecting.set(false);
  }

  async test() {
    await this.printer.testPrint();
  }

  release() {
    this.printer.disconnect();
    this.released.set(true);
    setTimeout(() => this.released.set(false), 3000);
  }
}
