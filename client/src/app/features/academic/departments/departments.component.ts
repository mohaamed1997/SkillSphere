import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '@core/services/data.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="card" *ngIf="showForm">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'Add Department' | t }}</h4>
        <p class="card-category">{{ 'Create a new department' | t }}</p>
      </div>
      <div class="card-body">
        <div class="form-group"><label>{{ 'Name' | t }}</label><input [(ngModel)]="form.name" /></div>
        <button class="btn btn-primary" (click)="save()">{{ 'Save' | t }}</button>
        <button class="btn btn-default" (click)="showForm=false">{{ 'Cancel' | t }}</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header card-header-rose">
        <h4 class="card-title">{{ 'Departments' | t }}</h4>
        <p class="card-category">{{ 'Manage departments' | t }}</p>
      </div>
      <div class="card-body">
        <button class="btn btn-primary" (click)="showForm=!showForm" style="margin-bottom:15px">{{ (showForm ? 'Cancel' : '+ Add') | t }}</button>
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>{{ 'Name' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody><tr *ngFor="let d of items"><td>{{d.name}}</td>
              <td><button class="btn btn-sm btn-danger" (click)="remove(d.id)">{{ 'Delete' | t }}</button></td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class DepartmentsComponent implements OnInit {
  items: any[] = []; showForm = false; form: any = {};
  constructor(private svc: AcademicService) {}
  ngOnInit() { this.load(); }
  load() { this.svc.getDepartments().subscribe(d => this.items = d); }
  save() { this.svc.createDepartment(this.form).subscribe(() => { this.showForm = false; this.form = {}; this.load(); }); }
  remove(id: string) { this.svc.deleteDepartment(id).subscribe(() => this.load()); }
}
