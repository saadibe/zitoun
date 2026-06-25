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
  <h2 class="pr-title">🖨️ Configuration Imprimante</h2>
  <p class="pr-sub">Star TSP100LAN — Connexion WiFi directe</p>

  <div class="pr-card">
    <div class="pr-section">
      <label class="pr-label">Adresse IP de l'imprimante</label>
      <div class="pr-hint">
        Appuyez sur le bouton <strong>FEED</strong> au démarrage de l'imprimante
        pour imprimer sa configuration réseau et trouver son IP.
      </div>
      <div class="pr-row">
        <input class="pr-input" type="text" [(ngModel)]="ipInput"
          placeholder="ex : 192.168.1.105" />
        <span class="pr-sep">:</span>
        <input class="pr-input pr-port" type="number" [(ngModel)]="portInput"
          placeholder="9100" />
      </div>
    </div>

    <div class="pr-section">
      <button class="pr-btn pr-save" (click)="save()">
        💾 Enregistrer
      </button>
      <button class="pr-btn pr-test" (click)="test()"
        [disabled]="testing() || !ipInput">
        @if (testing()) { ⏳ Test en cours... }
        @else { 🔌 Tester la connexion }
      </button>
    </div>

    <div class="pr-status" [class.ok]="lastResult() === 'ok'" [class.err]="lastResult() === 'err'">
      @if (lastResult() === 'ok') { ✅ Imprimante connectée — ticket test imprimé }
      @if (lastResult() === 'err') { ❌ {{ printer.lastError() }} }
    </div>
  </div>

  <div class="pr-card pr-info">
    <h3>📋 Comment connecter la TSP100LAN</h3>
    <ol>
      <li>Brancher l'imprimante au routeur WiFi via câble Ethernet <em>ou</em> configurer le WiFi avec l'utilitaire Star</li>
      <li>Allumer l'imprimante en tenant le bouton <strong>FEED</strong> → elle imprime son IP</li>
      <li>Saisir cette IP ci-dessus et cliquer <strong>Tester</strong></li>
      <li>Un ticket de test s'imprime → c'est prêt !</li>
    </ol>
    <div class="pr-note">
      ⚠️ La tablette et l'imprimante doivent être sur le <strong>même réseau WiFi</strong>.
    </div>
  </div>
</div>
  `,
  styleUrl: './printer-config.component.scss'
})
export class PrinterConfigComponent {
  printer = inject(PrinterService);

  ipInput   = this.printer.printerIp();
  portInput = this.printer.printerPort();

  testing    = signal(false);
  lastResult = signal<'ok'|'err'|''>('');

  save() {
    this.printer.saveConfig(this.ipInput.trim(), this.portInput || 9100);
    this.lastResult.set('');
    alert(`✅ IP enregistrée : ${this.ipInput}`);
  }

  async test() {
    this.printer.saveConfig(this.ipInput.trim(), this.portInput || 9100);
    this.testing.set(true);
    this.lastResult.set('');
    const ok = await this.printer.testConnection();
    this.lastResult.set(ok ? 'ok' : 'err');
    this.testing.set(false);
  }
}
