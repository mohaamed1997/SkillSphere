import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurriculumService, AcademicService } from '@core/services/data.service';
import { CurriculumContractDto } from '@core/models';
import { TranslatePipe } from '@core/i18n/translate.pipe';

@Component({
  selector: 'app-curriculum',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header"><h1>{{ 'Curriculum Contracts' | t }}</h1>
      <button class="btn btn-primary" (click)="showForm=!showForm">{{ (showForm ? 'Cancel' : '+ Add Contract') | t }}</button>
    </div>

    <div class="card" *ngIf="showForm">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'Add Curriculum Contract' | t }}</h4>
        <p class="card-category">{{ 'Assign a subject to a grade for a semester with weekly hours' | t }}</p>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>{{ 'Grade' | t }}</label>
            <select [(ngModel)]="form.gradeId"><option value="">{{ 'Select' | t }}</option><option *ngFor="let g of grades" [value]="g.id">{{g.name}}</option></select>
          </div>
          <div class="form-group"><label>{{ 'Semester' | t }}</label>
            <select [(ngModel)]="form.semesterId"><option value="">{{ 'Select' | t }}</option><option *ngFor="let s of semesters" [value]="s.id">{{s.name}}</option></select>
          </div>
          <div class="form-group"><label>{{ 'Subject' | t }}</label>
            <select [(ngModel)]="form.subjectId"><option value="">{{ 'Select' | t }}</option><option *ngFor="let s of subjects" [value]="s.id">{{s.name}}</option></select>
          </div>
          <div class="form-group"><label>{{ 'Periods Per Week' | t }}</label><input type="number" [(ngModel)]="form.periodsPerWeek" /></div>
        </div>
        <button class="btn btn-primary" (click)="save()">{{ 'Save' | t }}</button>
        <button class="btn btn-default" (click)="showForm=false">{{ 'Cancel' | t }}</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>{{ 'Filter by Grade' | t }}</label>
            <select [(ngModel)]="filterGradeId" (ngModelChange)="load()"><option value="">{{ 'All' | t }}</option><option *ngFor="let g of grades" [value]="g.id">{{g.name}}</option></select>
          </div>
          <div class="form-group"><label>{{ 'Filter by Semester' | t }}</label>
            <select [(ngModel)]="filterSemesterId" (ngModelChange)="load()"><option value="">{{ 'All' | t }}</option><option *ngFor="let s of semesters" [value]="s.id">{{s.name}}</option></select>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'Curriculum Contracts' | t }}</h4>
        <p class="card-category">{{ '{count} contract(s)' | t:{ count: items.length } }}</p>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>{{ 'Grade' | t }}</th><th>{{ 'Semester' | t }}</th><th>{{ 'Subject' | t }}</th><th>{{ 'Periods Per Week' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let c of items">
                <td>{{c.gradeName}}</td><td>{{c.semesterName}}</td><td>{{c.subjectName}}</td><td>{{c.periodsPerWeek}}</td>
                <td><button class="btn btn-sm btn-danger" (click)="remove(c.id)">{{ 'Remove' | t }}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class CurriculumComponent implements OnInit {
  items: CurriculumContractDto[] = [];
  grades: any[] = [];
  semesters: any[] = [];
  subjects: any[] = [];
  showForm = false;
  form: any = {};
  filterGradeId = '';
  filterSemesterId = '';

  constructor(private svc: CurriculumService, private academicSvc: AcademicService) {}

  ngOnInit() {
    this.load();
    this.academicSvc.getGrades().subscribe(g => this.grades = g);
    this.academicSvc.getSemesters().subscribe(s => this.semesters = s);
    this.academicSvc.getSubjects().subscribe(s => this.subjects = s);
  }

  load() {
    this.svc.getContracts(this.filterGradeId || undefined, this.filterSemesterId || undefined)
      .subscribe(d => this.items = d);
  }

  save() {
    this.svc.setContract(this.form).subscribe(() => { this.showForm = false; this.form = {}; this.load(); });
  }

  remove(id: string) { this.svc.removeContract(id).subscribe(() => this.load()); }
}
