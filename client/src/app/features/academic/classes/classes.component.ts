import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '@core/services/data.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { I18nService } from '@core/i18n/i18n.service';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="card" *ngIf="showForm">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ (editId ? 'Edit Group' : 'Add Group') | t }}</h4>
        <p class="card-category">{{ (editId ? 'Update group details' : 'Create a new group') | t }}</p>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>{{ 'Name (English)' | t }}</label><input [(ngModel)]="form.name" placeholder="e.g. Class A" /></div>
          <div class="form-group"><label>{{ 'Name (Arabic)' | t }}</label><input [(ngModel)]="form.nameAr" placeholder="مثال: الفصل أ" dir="rtl" /></div>
          <div class="form-group"><label>{{ 'Grade' | t }}</label>
            <select [(ngModel)]="form.gradeId">
              <option value="">{{ 'Select' | t }}</option>
              <option *ngFor="let g of grades" [value]="g.id">{{ i18n.lang() === 'ar' && g.nameAr ? g.nameAr : g.name }}</option>
            </select>
          </div>
          <div class="form-group"><label>{{ 'Capacity' | t }}</label><input type="number" [(ngModel)]="form.capacity" /></div>
        </div>
        <button class="btn btn-primary" (click)="save()">{{ 'Save' | t }}</button>
        <button class="btn btn-default" (click)="cancelForm()">{{ 'Cancel' | t }}</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'Groups' | t }}</h4>
        <p class="card-category">{{ 'Manage groups' | t }}</p>
      </div>
      <div class="card-body">
        <button class="btn btn-primary" (click)="openAdd()" style="margin-bottom:15px">{{ '+ Add' | t }}</button>
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>{{ 'Name' | t }}</th><th>{{ 'Grade' | t }}</th><th>{{ 'Capacity' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let c of items">
                <td>
                  {{ i18n.lang() === 'ar' && c.nameAr ? c.nameAr : c.name }}
                  <span *ngIf="i18n.lang() === 'ar' && !c.nameAr" style="color:#f59e0b;font-size:0.75rem;margin-inline-start:4px">{{ '(no Arabic name)' | t }}</span>
                </td>
                <td>{{ i18n.lang() === 'ar' && c.gradeNameAr ? c.gradeNameAr : c.gradeName }}</td>
                <td>{{c.capacity}}</td>
                <td>
                  <button class="btn btn-sm btn-info" (click)="openEdit(c)" style="margin-inline-end:4px">{{ 'Edit' | t }}</button>
                  <button class="btn btn-sm btn-danger" (click)="remove(c.id)">{{ 'Delete' | t }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class ClassesComponent implements OnInit {
  items: any[] = []; grades: any[] = []; showForm = false; editId: string | null = null; form: any = {};
  readonly i18n = inject(I18nService);
  constructor(private svc: AcademicService) {}
  ngOnInit() { this.load(); this.svc.getGrades().subscribe(g => this.grades = g); }
  load() { this.svc.getGroups().subscribe(d => this.items = d); }
  openAdd() { this.editId = null; this.form = {}; this.showForm = true; }
  openEdit(c: any) { this.editId = c.id; this.form = { name: c.name, nameAr: c.nameAr || '', gradeId: c.gradeId, capacity: c.capacity }; this.showForm = true; window.scrollTo({ top: 0, behavior: 'smooth' }); }
  cancelForm() { this.showForm = false; this.editId = null; this.form = {}; }
  save() {
    const obs = this.editId ? this.svc.updateGroup(this.editId, this.form) : this.svc.createGroup(this.form);
    obs.subscribe(() => { this.cancelForm(); this.load(); });
  }
  remove(id: string) { this.svc.deleteGroup(id).subscribe(() => this.load()); }
}
