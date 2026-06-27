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
  <p class="pr-sub">Configuration impression</p>

  <!-- Méthode sélectionnée -->
  <div class="pr-card">
    <div class="pr-section-title">Méthode d'impression</div>
    <div class="pr-methods">

      <!-- Méthode recommandée : Impression système (Mopria) -->
      <div class="pr-method-card" [class.selected]="printer.method()==='window'"
        (click)="select('window')">
        <div class="pr-m-icon">🖨️</div>
        <div class="pr-m-name">
          Impression système
          <span class="pr-badge rec">✅ Recommandé</span>
        </div>
        <div class="pr-m-desc">
          Via <strong>Mopria Print Service</strong> (gratuit, Google Play).<br>
          Aucun filigrane. Fonctionne avec toutes les imprimantes réseau et Bluetooth.
        </div>
      </div>

      <!-- RawBT (version payante) -->
      <div class="pr-method-card" [class.selected]="printer.method()==='rawbt'"
        (click)="select('rawbt')">
        <div class="pr-m-icon">📱</div>
        <div class="pr-m-name">RawBT <span class="pr-badge paid">Version payante ~4€</span></div>
        <div class="pr-m-desc">
          Impression directe ESC/POS via Bluetooth Classic.<br>
          Nécessite RawBT Pro (sans filigrane).
        </div>
      </div>

    </div>
  </div>

  <!-- Instructions Mopria -->
  @if (printer.method() === 'window') {
    <div class="pr-card pr-info mopria-info">
      <div class="pr-info-header">
        <span class="pr-info-icon">📲</span>
        <div>
          <div class="pr-info-title">Configuration Mopria (5 min, gratuit)</div>
          <div class="pr-info-sub">Service d'impression officiel Google</div>
        </div>
      </div>
      <ol class="pr-steps">
        <li>
          Ouvrir <strong>Google Play</strong> →
          chercher <strong>"Mopria Print Service"</strong> → Installer
        </li>
        <li>
          Aller dans <strong>Paramètres Android</strong> →
          <strong>Appareils connectés</strong> →
          <strong>Préférences de connexion</strong> →
          <strong>Impression</strong> →
          Activer <strong>Mopria Print Service</strong>
        </li>
        <li>
          Revenir sur <strong>La Perla POS</strong> →
          cliquer <strong>"Tester l'impression"</strong> ci-dessous
        </li>
        <li>
          Le dialogue d'impression Android s'ouvre →
          appuyer sur <strong>"Sélectionner une imprimante"</strong>
        </li>
        <li>
          Choisir <strong>Star Micronics TSP100</strong> dans la liste
        </li>
        <li>
          Régler : <strong>Papier = 72mm × Automatique</strong>,
          Marges = <strong>Aucune</strong>
        </li>
        <li>Imprimer ✅ — le réglage est mémorisé pour les prochaines fois</li>
      </ol>
      <div class="pr-note green">
        💡 <strong>Astuce :</strong> Après la première configuration,
        l'impression se fait en 1 clic sans dialogue.
      </div>
    </div>
  }

  <!-- Instructions RawBT Pro -->
  @if (printer.method() === 'rawbt') {
    <div class="pr-card pr-info">
      <div class="pr-info-header">
        <span class="pr-info-icon">📱</span>
        <div>
          <div class="pr-info-title">RawBT Pro</div>
          <div class="pr-info-sub">Acheter dans Google Play (~4€) pour supprimer le filigrane</div>
        </div>
      </div>
      <ol class="pr-steps">
        <li>Ouvrir RawBT → <strong>Settings → Connection → Bluetooth</strong></li>
        <li><strong>Bluetooth device</strong> → sélectionner <strong>Star TSP100</strong></li>
        <li><strong>Printer model</strong> → Star TSP100 ou ESC/POS 80mm</li>
        <li>Acheter la licence Pro dans l'app pour supprimer le filigrane</li>
        <li>Tester depuis La Perla POS ✅</li>
      </ol>
    </div>
  }

  <!-- Bouton test -->
  <div class="pr-card">
    <button class="pr-btn pr-test"
      [disabled]="printer.printing()"
      (click)="test()">
      @if (printer.printing()) { ⏳ Ouverture du dialogue... }
      @else { 🖨️ Tester l'impression }
    </button>

    @if (printer.lastError()) {
      <div class="pr-error">❌ {{ printer.lastError() }}</div>
    }
    @if (testOk()) {
      <div class="pr-ok">
        @if (printer.method() === 'window') {
          🖨️ Dialogue d'impression ouvert — sélectionner la TSP100
        } @else {
          ✅ Ticket envoyé à RawBT
        }
      </div>
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
    if (ok) {
      this.testOk.set(true);
      setTimeout(() => this.testOk.set(false), 6000);
    }
  }
}
