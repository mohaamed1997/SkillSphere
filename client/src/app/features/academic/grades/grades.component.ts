import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '@core/services/data.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';

@Component({
  selector: 'app-grades',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="card" *ngIf="showForm">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'Add Grade' | t }}</h4>
        <p class="card-category">{{ 'Create a new grade level' | t }}</p>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>{{ 'Name' | t }}</label><input [(ngModel)]="form.name" /></div>
          <div class="form-group"><label>{{ 'Order Index' | t }}</label><input type="number" [(ngModel)]="form.orderIndex" /></div>
        </div>
        <button class="btn btn-primary" (click)="save()">{{ 'Save' | t }}</button>
        <button class="btn btn-default" (click)="showForm=false">{{ 'Cancel' | t }}</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header card-header-success">
        <h4 class="card-title">{{ 'Grades' | t }}</h4>
        <p class="card-category">{{ 'Manage grade levels' | t }}</p>
      </div>
      <div class="card-body">
        <button class="btn btn-primary" (click)="showForm=!showForm" style="margin-bottom:15px">{{ (showForm ? 'Cancel' : '+ Add') | t }}</button>
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>{{ 'Name' | t }}</th><th>{{ 'Order' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody><tr *ngFor="let g of items"><td>{{g.name}}</td><td>{{g.orderIndex}}</td>
              <td><button class="btn btn-sm btn-danger" (click)="remove(g.id)">{{ 'Delete' | t }}</button></td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class GradesComponent implements OnInit {
  items: any[] = []; showForm = false; form: any = {};
  constructor(private svc: AcademicService) {}
  ngOnInit() { this.load(); }
  load() { this.svc.getGrades().subscribe(d => this.items = d); }
  save() { this.svc.createGrade(this.form).subscribe(() => { this.showForm = false; this.form = {}; this.load(); }); }
  remove(id: string) { this.svc.deleteGrade(id).subscribe(() => this.load()); }
}
