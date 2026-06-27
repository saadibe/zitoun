import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrinterService } from '../../services/printer.service';

@Component({
  selector: 'app-printer-config',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="printer-page">
  <h2 class="pr-title">🖨️ Imprimante Star TSP100IIBI</h2>
  <p class="pr-sub">Via Star PassPRNT — Bluetooth Android</p>

  <!-- Statut -->
  <div class="pr-card pr-status-card">
    <div class="pr-status-row">
      <span class="pr-status-dot" [class.active]="testOk()"></span>
      <span>{{ testOk() ? 'Imprimante connectée ✅' : 'En attente de test' }}</span>
    </div>
  </div>

  <!-- Instructions -->
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
      ✅ Gratuit · Officiel Star · Aucun filigrane · TSP100IIBI Bluetooth
    </div>
  </div>

  <!-- Test -->
  <div class="pr-card">
    <button class="pr-btn" [disabled]="printer.printing()" (click)="test()">
      @if (printer.printing()) { ⏳ Envoi en cours... }
      @else { 🖨️ Tester l'impression }
    </button>
    @if (printer.lastError()) {
      <div class="pr-error">❌ {{ printer.lastError() }}</div>
    }
    @if (testOk()) {
      <div class="pr-ok">📱 Ticket envoyé à PassPRNT ✅</div>
    }
  </div>
</div>
  `,
  styleUrl: './printer-config.component.scss'
})
export class PrinterConfigComponent {
  printer = inject(PrinterService);
  testOk  = signal(false);



  async test() {
    this.testOk.set(false);
    const ok = await this.printer.testPrint();
    if (ok) {
      this.testOk.set(true);
      setTimeout(() => this.testOk.set(false), 6000);
    }
  }
}
