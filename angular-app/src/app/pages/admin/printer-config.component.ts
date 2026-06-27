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
  <p class="pr-sub">Choisir la méthode selon votre configuration</p>

  <!-- Choix méthode -->
  <div class="pr-card">
    <div class="pr-section-title">Méthode d'impression</div>
    <div class="pr-methods">

      <!-- Méthode 1 : RawBT (recommandée pour TSP100IIBI Bluetooth Classic) -->
      <div class="pr-method-card" [class.selected]="printer.method()==='rawbt'"
        (click)="select('rawbt')">
        <div class="pr-m-icon">📱</div>
        <div class="pr-m-name">RawBT <span class="pr-badge rec">Recommandé</span></div>
        <div class="pr-m-desc">
          App Android gratuite.<br>
          Fonctionne avec <strong>Bluetooth Classic</strong> (TSP100IIBI).<br>
          Partage avec Uber Eats sans conflit.
        </div>
      </div>

      <!-- Méthode 2 : window.print -->
      <div class="pr-method-card" [class.selected]="printer.method()==='window'"
        (click)="select('window')">
        <div class="pr-m-icon">🖥️</div>
        <div class="pr-m-name">Impression système</div>
        <div class="pr-m-desc">
          Dialogue d'impression Android.<br>
          Sélectionner l'imprimante manuellement.<br>
          Fonctionne sans app supplémentaire.
        </div>
      </div>

    </div>
  </div>

  <!-- Instructions RawBT -->
  @if (printer.method() === 'rawbt') {
    <div class="pr-card pr-info rawbt-info">
      <div class="pr-info-header">
        <span class="pr-info-icon">📲</span>
        <div>
          <div class="pr-info-title">Installation RawBT (5 min)</div>
          <div class="pr-info-sub">Application gratuite sur Google Play</div>
        </div>
      </div>
      <ol class="pr-steps">
        <li>
          Ouvrir <strong>Google Play Store</strong> sur la tablette Android
        </li>
        <li>
          Chercher <strong>"RawBT Print Service"</strong> et installer
          <br><small>Développeur : a402d — icône imprimante bleue</small>
        </li>
        <li>
          Ouvrir RawBT → <strong>Settings → Printer → Add</strong>
          → sélectionner <strong>Star Micronics TSP100</strong>
        </li>
        <li>
          Revenir sur <strong>La Perla POS</strong>
          → cliquer <strong>Tester l'impression</strong>
        </li>
        <li>
          Android demande d'ouvrir RawBT → <strong>Toujours</strong>
        </li>
      </ol>
      <div class="pr-note green">
        ✅ Uber Eats et La Perla POS peuvent utiliser la même imprimante
        sans conflit — RawBT gère la file d'attente.
      </div>
    </div>
  }

  <!-- Instructions window.print -->
  @if (printer.method() === 'window') {
    <div class="pr-card pr-info">
      <div class="pr-info-header">
        <span class="pr-info-icon">🖨️</span>
        <div>
          <div class="pr-info-title">Impression via dialogue Android</div>
        </div>
      </div>
      <ol class="pr-steps">
        <li>Cliquer <strong>Tester l'impression</strong></li>
        <li>Le dialogue d'impression Android s'ouvre</li>
        <li>Sélectionner <strong>Star TSP100</strong> dans la liste</li>
        <li>Régler le format : <strong>72mm × Auto</strong></li>
        <li>Imprimer ✅</li>
      </ol>
      <div class="pr-note orange">
        ⚠️ Nécessite de sélectionner l'imprimante à chaque session
        si elle n'est pas mémorisée par Android.
      </div>
    </div>
  }

  <!-- Test impression -->
  <div class="pr-card">
    <button class="pr-btn pr-test"
      [disabled]="printer.printing()"
      (click)="test()">
      @if (printer.printing()) { ⏳ Impression en cours... }
      @else { 🖨️ Tester l'impression }
    </button>
    @if (printer.lastError()) {
      <div class="pr-error">❌ {{ printer.lastError() }}</div>
    }
    @if (testOk()) {
      @if (printer.method() === 'rawbt') {
        <div class="pr-ok">
          📱 Intent RawBT envoyé !<br>
          <small>Si rien ne s'imprime : vérifiez que RawBT est installé
          et que l'imprimante est configurée dans RawBT Settings.</small>
        </div>
      } @else {
        <div class="pr-ok">✅ Ticket envoyé !</div>
      }
    }
  </div>
</div>
  `,
  styleUrl: './printer-config.component.scss'
})
export class PrinterConfigComponent {
  printer = inject(PrinterService);
  testOk  = signal(false);

  select(m: PrintMethod) {
    this.printer.saveMethod(m);
  }

  async test() {
    this.testOk.set(false);
    const ok = await this.printer.testPrint();
    if (ok && this.printer.method() === 'rawbt') {
      // RawBT : succès = l'intent a été envoyé, pas forcément imprimé
      this.testOk.set(true);
      setTimeout(() => this.testOk.set(false), 5000);
    } else if (ok) {
      this.testOk.set(true);
      setTimeout(() => this.testOk.set(false), 4000);
    }
  }
}
