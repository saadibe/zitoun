import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrinterService, PrintMethod } from '../../services/printer.service';

@Component({
  selector: 'app-printer-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="printer-page">
  <h2 class="pr-title">🖨️ Imprimante Star TSP100</h2>
  <p class="pr-sub">Bluetooth Android</p>

  <!-- Alerte Mopria -->
  <div class="pr-alert">
    ℹ️ <strong>Mopria ne fonctionne pas en Bluetooth</strong> — il faut installer
    le driver Star Micronics Android.
  </div>

  <div class="pr-card pr-info star-info">
    <div class="pr-info-header">
      <span class="pr-info-icon">⭐</span>
      <div>
        <div class="pr-info-title">Driver Star Micronics (gratuit)</div>
        <div class="pr-info-sub">Plugin officiel — fonctionne avec Bluetooth Classic</div>
      </div>
    </div>
    <ol class="pr-steps">
      <li>
        Google Play → chercher
        <strong>"Star Micronics Printer Driver"</strong>
        (développeur : Star Micronics Co.) → Installer
      </li>
      <li>
        Paramètres Android →
        <strong>Appareils connectés → Impression</strong>
        → activer <strong>Star Micronics</strong>
      </li>
      <li>
        Le driver va détecter automatiquement la
        <strong>TSP100 via Bluetooth</strong>
      </li>
      <li>
        Revenir sur <strong>La Perla POS</strong> →
        cliquer <strong>Tester l'impression</strong>
      </li>
      <li>
        Dans le dialogue → sélectionner
        <strong>Star TSP100</strong> → format <strong>72mm</strong>
      </li>
    </ol>
    <div class="pr-note green">
      ✅ Gratuit, officiel Star, aucun filigrane.
      Compatible TSP100IIBI Bluetooth.
    </div>
  </div>

  <!-- Plan B : RawBT Pro -->
  <div class="pr-card pr-info">
    <div class="pr-info-header">
      <span class="pr-info-icon">💡</span>
      <div>
        <div class="pr-info-title">Alternative : RawBT Pro (~4€)</div>
        <div class="pr-info-sub">Si le driver Star ne fonctionne pas</div>
      </div>
    </div>
    <div style="font-size:13px;color:var(--ink3);line-height:1.5">
      Sélectionner <strong>RawBT</strong> ci-dessous → acheter la licence Pro
      dans l'app pour supprimer le filigrane → impression directe sans dialogue.
    </div>
  </div>

  <!-- Méthode -->
  <div class="pr-card">
    <div class="pr-section-title">Méthode active</div>
    <div class="pr-methods">
      <div class="pr-method-card" [class.selected]="printer.method()==='window'"
        (click)="select('window')">
        <div class="pr-m-icon">⭐</div>
        <div>
          <div class="pr-m-name">Driver Star <span class="pr-badge rec">Recommandé</span></div>
          <div class="pr-m-desc">Via le service d'impression Android</div>
        </div>
      </div>
      <div class="pr-method-card" [class.selected]="printer.method()==='rawbt'"
        (click)="select('rawbt')">
        <div class="pr-m-icon">📱</div>
        <div>
          <div class="pr-m-name">RawBT <span class="pr-badge paid">~4€</span></div>
          <div class="pr-m-desc">Impression directe ESC/POS Bluetooth</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Test -->
  <div class="pr-card">
    <button class="pr-btn pr-test" [disabled]="printer.printing()" (click)="test()">
      @if (printer.printing()) { ⏳ Impression... }
      @else { 🖨️ Tester l'impression }
    </button>
    @if (printer.lastError()) {
      <div class="pr-error">❌ {{ printer.lastError() }}</div>
    }
    @if (testOk()) {
      <div class="pr-ok">🖨️ Dialogue ouvert — sélectionner Star TSP100</div>
    }
  </div>
</div>
  `,
  styleUrl: './printer-config.component.scss'
})
export class PrinterConfigComponent {
  printer = inject(PrinterService);
  testOk  = signal(false);

  select(m: PrintMethod) { this.printer.saveMethod(m); }

  async test() {
    this.testOk.set(false);
    const ok = await this.printer.testPrint();
    if (ok) {
      this.testOk.set(true);
      setTimeout(() => this.testOk.set(false), 6000);
    }
  }
}
