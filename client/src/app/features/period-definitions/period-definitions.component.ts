import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeriodDefinitionService } from '@core/services/data.service';
import { PeriodDefinitionDto } from '@core/models';
import { TranslatePipe } from '@core/i18n/translate.pipe';

@Component({
  selector: 'app-period-definitions',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header"><h1>{{ 'Period Definitions' | t }}</h1>
      <button class="btn btn-primary" (click)="showForm=!showForm">{{ (showForm ? 'Cancel' : '+ Add Period') | t }}</button>
    </div>

    <div class="card" *ngIf="showForm">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ (editId ? 'Edit Period' : 'Add Period') | t }}</h4>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>{{ 'Period Number' | t }}</label><input type="number" [(ngModel)]="form.periodNumber" /></div>
          <div class="form-group"><label>{{ 'Label' | t }}</label><input [(ngModel)]="form.label" [placeholder]="'e.g. Period 1' | t" /></div>
          <div class="form-group"><label>{{ 'Start Time' | t }}</label><input type="time" [(ngModel)]="form.startTime" /></div>
          <div class="form-group"><label>{{ 'End Time' | t }}</label><input type="time" [(ngModel)]="form.endTime" /></div>
          <div class="form-group">
            <label>{{ 'Is Break?' | t }}</label>
            <select [(ngModel)]="form.isBreak">
              <option [ngValue]="false">{{ 'No' | t }}</option>
              <option [ngValue]="true">{{ 'Yes' | t }}</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" (click)="save()">{{ 'Save' | t }}</button>
        <button class="btn btn-default" (click)="cancelEdit()">{{ 'Cancel' | t }}</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'All Periods' | t }}</h4>
        <p class="card-category">{{ '{count} period(s) defined' | t:{ count: items.length } }}</p>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>#</th><th>{{ 'Label' | t }}</th><th>{{ 'Start' | t }}</th><th>{{ 'End' | t }}</th><th>{{ 'Break?' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let p of items" [class.break-row]="p.isBreak">
                <td>{{p.periodNumber}}</td><td>{{p.label}}</td><td>{{p.startTime}}</td><td>{{p.endTime}}</td>
                <td>{{ (p.isBreak ? 'Yes' : 'No') | t }}</td>
                <td>
                  <button class="btn btn-sm btn-info" (click)="edit(p)">{{ 'Edit' | t }}</button>
                  <button class="btn btn-sm btn-danger" (click)="remove(p.id)">{{ 'Delete' | t }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; } .break-row { background: #fff3e0; }`]
})
export class PeriodDefinitionsComponent implements OnInit {
  items: PeriodDefinitionDto[] = [];
  showForm = false;
  form: any = { isBreak: false };
  editId: string | null = null;

  constructor(private svc: PeriodDefinitionService) {}

  ngOnInit() { this.load(); }

  load() { this.svc.getAll().subscribe(d => this.items = d); }

  save() {
    if (this.editId) {
      this.svc.update(this.editId, this.form).subscribe(() => { this.cancelEdit(); this.load(); });
    } else {
      this.svc.create(this.form).subscribe(() => { this.cancelEdit(); this.load(); });
    }
  }

  edit(p: PeriodDefinitionDto) {
    this.editId = p.id;
    this.form = { periodNumber: p.periodNumber, label: p.label, startTime: p.startTime, endTime: p.endTime, isBreak: p.isBreak };
    this.showForm = true;
  }

  cancelEdit() { this.editId = null; this.form = { isBreak: false }; this.showForm = false; }

  remove(id: string) { this.svc.delete(id).subscribe(() => this.load()); }
}
