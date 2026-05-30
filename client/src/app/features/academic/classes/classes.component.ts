import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '@core/services/data.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="card" *ngIf="showForm">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'Add Group' | t }}</h4>
        <p class="card-category">{{ 'Create a new group' | t }}</p>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>{{ 'Name' | t }}</label><input [(ngModel)]="form.name" /></div>
          <div class="form-group"><label>{{ 'Grade' | t }}</label>
            <select [(ngModel)]="form.gradeId"><option value="">{{ 'Select' | t }}</option><option *ngFor="let g of grades" [value]="g.id">{{g.name}}</option></select>
          </div>
          <div class="form-group"><label>{{ 'Capacity' | t }}</label><input type="number" [(ngModel)]="form.capacity" /></div>
        </div>
        <button class="btn btn-primary" (click)="save()">{{ 'Save' | t }}</button>
        <button class="btn btn-default" (click)="showForm=false">{{ 'Cancel' | t }}</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'Groups' | t }}</h4>
        <p class="card-category">{{ 'Manage groups' | t }}</p>
      </div>
      <div class="card-body">
        <button class="btn btn-primary" (click)="showForm=!showForm" style="margin-bottom:15px">{{ (showForm ? 'Cancel' : '+ Add') | t }}</button>
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>{{ 'Name' | t }}</th><th>{{ 'Grade' | t }}</th><th>{{ 'Capacity' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody><tr *ngFor="let c of items"><td>{{c.name}}</td><td>{{c.gradeName}}</td><td>{{c.capacity}}</td>
              <td><button class="btn btn-sm btn-danger" (click)="remove(c.id)">{{ 'Delete' | t }}</button></td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class ClassesComponent implements OnInit {
  items: any[] = []; grades: any[] = []; showForm = false; form: any = {};
  constructor(private svc: AcademicService) {}
  ngOnInit() { this.load(); this.svc.getGrades().subscribe(g => this.grades = g); }
  load() { this.svc.getGroups().subscribe(d => this.items = d); }
  save() { this.svc.createGroup(this.form).subscribe(() => { this.showForm = false; this.form = {}; this.load(); }); }
  remove(id: string) { this.svc.deleteGroup(id).subscribe(() => this.load()); }
}
