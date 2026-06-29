import { Component, OnInit, signal, inject, computed } from '@angular/core';
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
  compare  = signal<any>(null);
  weekly   = signal<any[]>([]);
  loading  = signal(true);
  activeTab = signal<'jour'|'semaine'|'top'>('jour');

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getStatsToday().subscribe(d  => { this.today.set(d); this.loading.set(false); });
    this.api.getStatsHourly().subscribe(d  => this.hourly.set(d));
    this.api.getStatsTopItems().subscribe(d => this.topItems.set(d));
    this.api.getServiceStats().subscribe(d  => this.service.set(d));
    this.api.getStatsCompare().subscribe(d  => this.compare.set(d));
    this.api.getStatsWeekly().subscribe(d   => this.weekly.set(d));
  }

  fmt(v: number): string { return this.settings.fmt(v ?? 0); }

  get ticketMoyen(): number {
    const s = this.service();
    if (!s || !s.nbCommandes) return 0;
    return s.totalJour / s.nbCommandes;
  }

  get comparePct(): string {
    const c = this.compare();
    if (!c) return '';
    const p = c.pct;
    return (p >= 0 ? '+' : '') + p.toFixed(1) + '%';
  }

  get comparePctPositive(): boolean {
    return (this.compare()?.pct ?? 0) >= 0;
  }

  // Graphique en aires : normaliser 0-100
  maxHourly(): number { return Math.max(...this.hourly().map((h:any) => h.total), 1); }
  barH(val: number): number { return Math.round((val / this.maxHourly()) * 100); }

  // Top items : max pour normaliser barres
  maxItem(): number { return Math.max(...this.topItems().map((i:any) => i.qty), 1); }
  itemBarW(qty: number): number { return Math.round((qty / this.maxItem()) * 100); }

  // Heatmap couleur selon intensité 0-max
  heatColor(count: number, max: number): string {
    if (!max) return '#E6F1FB';
    const ratio = count / max;
    if (ratio < 0.2)  return '#E6F1FB';
    if (ratio < 0.4)  return '#B5D4F4';
    if (ratio < 0.6)  return '#85B7EB';
    if (ratio < 0.8)  return '#378ADD';
    if (ratio < 0.95) return '#185FA5';
    return '#042C53';
  }

  weeklyHours(): number[] {
    const all = new Set<number>();
    this.weekly().forEach(d => d.hours?.forEach((h:any) => all.add(h.hour)));
    return Array.from(all).sort((a,b) => a-b);
  }

  weeklyCount(dayData: any, hour: number): number {
    return dayData.hours?.find((h:any) => h.hour === hour)?.count ?? 0;
  }

  weeklyMax(): number {
    let max = 0;
    this.weekly().forEach(d => d.hours?.forEach((h:any) => { if (h.count > max) max = h.count; }));
    return max;
  }

  // Compare bars height
  compareMax(): number {
    if (!this.compare()?.hours) return 1;
    return Math.max(...this.compare().hours.flatMap((h:any) => [h.today, h.lastWeek]), 1);
  }

  compareBarH(val: number): number {
    return Math.round((val / this.compareMax()) * 90);
  }
}
