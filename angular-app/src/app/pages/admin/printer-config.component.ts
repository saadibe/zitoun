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
  <h2 class="pr-title">🖨️ Imprimante Star TSP100IIBI</h2>
  <p class="pr-sub">Bluetooth Android — choisir la méthode</p>

  <div class="pr-card">
    <div class="pr-section-title">Méthode d'impression</div>
    <div class="pr-methods">

      <!-- PassPRNT — recommandé -->
      <div class="pr-method-card" [class.selected]="printer.method()==='passprnt'"
        (click)="select('passprnt')">
        <div class="pr-m-icon">⭐</div>
        <div>
          <div class="pr-m-name">
            Star PassPRNT
            <span class="pr-badge rec">Recommandé · Gratuit</span>
          </div>
          <div class="pr-m-desc">
            App officielle Star Micronics.<br>
            Compatible <strong>TSP100IIBI Bluetooth</strong>.<br>
            Google Play → <em>"Star PassPRNT"</em>
          </div>
        </div>
      </div>

      <!-- Impression système -->
      <div class="pr-method-card" [class.selected]="printer.method()==='window'"
        (click)="select('window')">
        <div class="pr-m-icon">🖥️</div>
        <div>
          <div class="pr-m-name">Impression système Android</div>
          <div class="pr-m-desc">
            Dialogue d'impression Android natif.<br>
            Nécessite un driver compatible installé.
          </div>
        </div>
      </div>

      <!-- RawBT -->
      <div class="pr-method-card" [class.selected]="printer.method()==='rawbt'"
        (click)="select('rawbt')">
        <div class="pr-m-icon">📱</div>
        <div>
          <div class="pr-m-name">RawBT <span class="pr-badge paid">~4€ sans filigrane</span></div>
          <div class="pr-m-desc">
            Version gratuite : filigrane sur chaque ticket.<br>
            Version Pro (~4€) : aucun filigrane.
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- Instructions PassPRNT -->
  @if (printer.method() === 'passprnt') {
    <div class="pr-card pr-info passprnt-info">
      <div class="pr-info-header">
        <span class="pr-info-icon">📲</span>
        <div>
          <div class="pr-info-title">Installation Star PassPRNT (2 min)</div>
          <div class="pr-info-sub">Application gratuite et officielle Star Micronics</div>
        </div>
      </div>
      <ol class="pr-steps">
        <li>
          Google Play → chercher <strong>"Star PassPRNT"</strong>
          <br><small>Développeur : STAR MICRONICS CO.,LTD.</small>
        </li>
        <li>Installer → ouvrir PassPRNT une fois pour l'initialiser</li>
        <li>
          Dans PassPRNT : <strong>Bluetooth</strong> →
          sélectionner <strong>Star Micronics TSP100</strong>
        </li>
        <li>
          Revenir ici → cliquer <strong>"Tester l'impression"</strong>
        </li>
        <li>
          Android demande d'ouvrir avec PassPRNT →
          choisir <strong>"Toujours"</strong>
        </li>
      </ol>
      <div class="pr-note green">
        ✅ Gratuit, officiel Star, aucun filigrane.
        TSP100IIBI Bluetooth supporté nativement.
      </div>
    </div>
  }

  <!-- Test -->
  <div class="pr-card">
    <button class="pr-btn pr-test" [disabled]="printer.printing()" (click)="test()">
      @if (printer.printing()) { ⏳ Envoi... }
      @else { 🖨️ Tester l'impression }
    </button>
    @if (printer.lastError()) {
      <div class="pr-error">❌ {{ printer.lastError() }}</div>
    }
    @if (testOk()) {
      <div class="pr-ok">
        @if (printer.method() === 'passprnt') {
          📱 Envoyé à PassPRNT — vérifier que l'imprimante imprime
        } @else if (printer.method() === 'window') {
          🖨️ Dialogue ouvert — sélectionner Star TSP100
        } @else {
          ✅ Envoyé à RawBT
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
