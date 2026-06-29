import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrinterConfigComponent } from './printer-config.component';
import { SettingsTicketComponent } from './settings-ticket.component';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SettingsService } from '../../services/settings.service';
import { MenuItem, RestaurantSettings } from '../../models';

@Component({ selector:'app-admin', standalone:true, imports:[CommonModule,FormsModule,PrinterConfigComponent,SettingsTicketComponent],
  templateUrl:'./admin.component.html', styleUrl:'./admin.component.scss' })
export class AdminComponent implements OnInit {
  menu   = signal<MenuItem[]>([]);
  users  = signal<any[]>([]);
  saved  = false;
  tab    = 'settings';
  s!: RestaurantSettings;
  currencies = ['DT','€','$','MAD','DA'];
  tvaOptions = [0,7,10,13,19,20];
  newArt  = { name:'', price:0, category:'ENTREE', emoji:'🍽️', available:true };
  newCat  = { code:'', label:'', emoji:'🍽️' };
  newUser = { username:'', password:'', role:'SERVEUR' };

  constructor(public settings: SettingsService, private api: ApiService) {}

  ngOnInit() {
    this.s = { ...this.settings.settings() };
    this.api.getMenu().subscribe(m => this.menu.set(m));
    this.api.getUsers().subscribe(u => this.users.set(u));
  }

  getRoleIcon(role: string): string {
    const icons: Record<string,string> = {ADMIN:'⚙️',SERVEUR:'📋',CUISINE:'🍳',CAISSE:'💰'};
    return icons[role] ?? '👤';
  }

  saveSettings() {
    this.api.updateSettings(this.s).subscribe(saved => {
      this.settings.settings.set(saved);
      this.saved = true;
      setTimeout(() => this.saved = false, 2500);
    });
  }

  addArticle() {
    this.api.createMenuItem(this.newArt).subscribe(() => {
      this.api.getMenu().subscribe(m => this.menu.set(m));
      this.newArt = { name:'', price:0, category:'ENTREE', emoji:'🍽️', available:true };
    });
  }

  toggleOption(item: MenuItem, field: 'hasOptions'|'hasPiment'|'hasMenu', event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const updated = { ...item, [field]: checked };
    // Si on désactive hasOptions, désactiver aussi piment et menu
    if (field === 'hasOptions' && !checked) {
      updated.hasPiment = false;
      updated.hasMenu   = false;
    }
    this.api.updateMenuItem(item.id, updated).subscribe({
      next: () => this.api.getMenu().subscribe(m => this.menu.set(m)),
      error: () => alert('Erreur mise à jour options')
    });
  }

  deleteArticle(id: number) {
    if (!confirm('Supprimer cet article ?')) return;
    this.api.deleteMenuItem(id).subscribe(() => this.menu.update(m => m.filter(i => i.id !== id)));
  }

  addCategory() {
    this.api.createCategory({...this.newCat, code:this.newCat.code.toUpperCase(), active:true, sortOrder:this.settings.categories().length+1})
      .subscribe(() => { this.settings.load(); this.newCat = {code:'',label:'',emoji:'🍽️'}; });
  }

  deleteCategory(id: number) {
    if (!confirm('Supprimer ?')) return;
    this.api.deleteCategory(id).subscribe(() => this.settings.load());
  }

  addUser() {
    this.api.createUser(this.newUser).subscribe(() => {
      this.api.getUsers().subscribe(u => this.users.set(u));
      this.newUser = {username:'',password:'',role:'SERVEUR'};
    });
  }

  deleteUser(id: number) {
    if (!confirm('Supprimer ?')) return;
    this.api.deleteUser(id).subscribe(() => this.users.update(u => u.filter(x => x.id !== id)));
  }
}
