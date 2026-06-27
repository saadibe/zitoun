import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { ApiService } from '../../services/api.service';
import { RestaurantSettings } from '../../models';

@Component({
  selector: 'app-settings-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="st-page">
  <h2 class="st-title">🏪 Informations Restaurant</h2>
  <p class="st-sub">Ces informations apparaissent sur tous les tickets imprimés</p>

  <div class="st-card">
    <div class="st-section">Identité</div>
    <div class="st-row">
      <label>Nom affiché sur ticket</label>
      <input [(ngModel)]="form.name" placeholder="La Perla">
    </div>
    <div class="st-row">
      <label>Raison sociale / Enseigne</label>
      <input [(ngModel)]="form.legalName" placeholder="LA GRILLADE — La Perla">
    </div>
    <div class="st-row">
      <label>Sous-titre</label>
      <input [(ngModel)]="form.subtitle" placeholder="Saveurs Authentiques de Tunisie">
    </div>
  </div>

  <div class="st-card">
    <div class="st-section">Adresse & Contact</div>
    <div class="st-row">
      <label>Adresse complète</label>
      <input [(ngModel)]="form.address" placeholder="4 rue Simone Veil, 95870 Bezons">
    </div>
    <div class="st-row">
      <label>Téléphone</label>
      <input [(ngModel)]="form.phone" placeholder="0960411470" type="tel">
    </div>
    <div class="st-row">
      <label>Email</label>
      <input [(ngModel)]="form.email" placeholder="contact@laperla.fr" type="email">
    </div>
  </div>

  <div class="st-card">
    <div class="st-section">Informations légales</div>
    <div class="st-row">
      <label>SIRET / Matricule fiscal</label>
      <input [(ngModel)]="form.taxNumber" placeholder="92522756300010">
    </div>
    <div class="st-row">
      <label>N° TVA intracommunautaire</label>
      <input [(ngModel)]="form.tvaNumber" placeholder="FR56925227563">
    </div>
    <div class="st-row">
      <label>Code NAF / APE</label>
      <input [(ngModel)]="form.nafCode" placeholder="5610C">
    </div>
    <div class="st-row">
      <label>Taux TVA (%)</label>
      <input [(ngModel)]="form.tvaRate" type="number" min="0" max="100" placeholder="10">
    </div>
  </div>

  <div class="st-card">
    <div class="st-section">Ticket</div>
    <div class="st-row">
      <label>Message pied de ticket</label>
      <input [(ngModel)]="form.ticketFooter" placeholder="Merci de votre visite">
    </div>
    <div class="st-row">
      <label>Devise</label>
      <select [(ngModel)]="form.currency">
        <option value="€">€ Euro</option>
        <option value="DT">DT Dinar Tunisien</option>
        <option value="$">$ Dollar</option>
        <option value="£">£ Livre</option>
      </select>
    </div>
    <div class="st-row">
      <label>Supplément menu (€)</label>
      <input [(ngModel)]="form.menuPrice" type="number" min="0" step="0.5" placeholder="2.00">
    </div>
  </div>

  <div class="st-actions">
    <button class="st-btn st-save" (click)="save()" [disabled]="saving()">
      @if (saving()) { ⏳ Enregistrement... }
      @else { 💾 Enregistrer }
    </button>
    @if (saved()) {
      <div class="st-ok">✅ Paramètres enregistrés</div>
    }
    @if (error()) {
      <div class="st-err">❌ {{ error() }}</div>
    }
  </div>
</div>
  `,
  styleUrl: './settings-ticket.component.scss'
})
export class SettingsTicketComponent implements OnInit {
  settingsSvc = inject(SettingsService);
  api         = inject(ApiService);

  saving = signal(false);
  saved  = signal(false);
  error  = signal('');

  form: Partial<RestaurantSettings> = {};

  ngOnInit() {
    this.form = { ...this.settingsSvc.settings() };
  }

  save() {
    this.saving.set(true);
    this.error.set('');
    this.api.updateSettings(this.form as RestaurantSettings).subscribe({
      next: (s) => {
        this.settingsSvc.settings.set(s);
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set('Erreur sauvegarde : ' + (e.message || 'réessayer'));
      }
    });
  }
}
