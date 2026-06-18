import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '@core/services/data.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { I18nService } from '@core/i18n/i18n.service';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="card" *ngIf="showForm">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ (editId ? 'Edit Department' : 'Add Department') | t }}</h4>
        <p class="card-category">{{ (editId ? 'Update department details' : 'Create a new department') | t }}</p>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>{{ 'Name (English)' | t }}</label><input [(ngModel)]="form.name" placeholder="e.g. Science Department" /></div>
          <div class="form-group"><label>{{ 'Name (Arabic)' | t }}</label><input [(ngModel)]="form.nameAr" placeholder="مثال: قسم العلوم" dir="rtl" /></div>
          <div class="form-group"><label>{{ 'Description' | t }}</label><input [(ngModel)]="form.description" /></div>
        </div>
        <button class="btn btn-primary" (click)="save()">{{ 'Save' | t }}</button>
        <button class="btn btn-default" (click)="cancelForm()">{{ 'Cancel' | t }}</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header card-header-rose">
        <h4 class="card-title">{{ 'Departments' | t }}</h4>
        <p class="card-category">{{ 'Manage departments' | t }}</p>
      </div>
      <div class="card-body">
        <button class="btn btn-primary" (click)="openAdd()" style="margin-bottom:15px">{{ '+ Add' | t }}</button>
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>{{ 'Name' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let d of items">
                <td>
                  {{ i18n.lang() === 'ar' && d.nameAr ? d.nameAr : d.name }}
                  <span *ngIf="i18n.lang() === 'ar' && !d.nameAr" style="color:#f59e0b;font-size:0.75rem;margin-inline-start:4px">{{ '(no Arabic name)' | t }}</span>
                </td>
                <td>
                  <button class="btn btn-sm btn-info" (click)="openEdit(d)" style="margin-inline-end:4px">{{ 'Edit' | t }}</button>
                  <button class="btn btn-sm btn-danger" (click)="remove(d.id)">{{ 'Delete' | t }}</button>
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
export class DepartmentsComponent implements OnInit {
  items: any[] = []; showForm = false; editId: string | null = null; form: any = {};
  readonly i18n = inject(I18nService);
  constructor(private svc: AcademicService) {}
  ngOnInit() { this.load(); }
  load() { this.svc.getDepartments().subscribe(d => this.items = d); }
  openAdd() { this.editId = null; this.form = {}; this.showForm = true; }
  openEdit(d: any) { this.editId = d.id; this.form = { name: d.name, nameAr: d.nameAr || '', description: d.description }; this.showForm = true; window.scrollTo({ top: 0, behavior: 'smooth' }); }
  cancelForm() { this.showForm = false; this.editId = null; this.form = {}; }
  save() {
    const obs = this.editId ? this.svc.updateDepartment(this.editId, this.form) : this.svc.createDepartment(this.form);
    obs.subscribe(() => { this.cancelForm(); this.load(); });
  }
  remove(id: string) { this.svc.deleteDepartment(id).subscribe(() => this.load()); }
}
