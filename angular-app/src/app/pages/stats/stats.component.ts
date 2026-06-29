import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class StatsComponent implements OnInit {
  api      = inject(ApiService);
  settings = inject(SettingsService);

  today    = signal<any>(null);
  hourly   = signal<any[]>([]);
  topItems = signal<any[]>([]);
  service  = signal<any>(null);
  loading  = signal(true);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getStatsToday().subscribe(d => {
      this.today.set(d);
      this.loading.set(false);
    });
    this.api.getStatsHourly().subscribe(d => this.hourly.set(d));
    this.api.getStatsTopItems().subscribe(d => this.topItems.set(d));
    this.api.getServiceStats().subscribe(d => this.service.set(d));
  }

  get maxHourly(): number {
    return Math.max(...this.hourly().map((h: any) => h.total), 1);
  }

  barWidth(val: number): number {
    return Math.round((val / this.maxHourly) * 100);
  }

  fmt(v: number): string { return this.settings.fmt(v); }
}
