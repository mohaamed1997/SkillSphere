import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherSubjectLinkService, AcademicService, UserService } from '@core/services/data.service';
import { TeacherSubjectLinkDto } from '@core/models';
import { TranslatePipe } from '@core/i18n/translate.pipe';

@Component({
  selector: 'app-teacher-subject-links',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header"><h1>{{ 'Teacher-Subject Links' | t }}</h1>
      <button class="btn btn-primary" (click)="showForm=!showForm">{{ (showForm ? 'Cancel' : '+ Add Link') | t }}</button>
    </div>

    <div class="card" *ngIf="showForm">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'Add Teacher-Subject Link' | t }}</h4>
        <p class="card-category">{{ 'Link a teacher to a subject they can teach for a grade' | t }}</p>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>{{ 'Teacher' | t }}</label>
            <select [(ngModel)]="form.teacherProfileId"><option value="">{{ 'Select' | t }}</option><option *ngFor="let t of teachers" [value]="t.id">{{t.fullName}}</option></select>
          </div>
          <div class="form-group"><label>{{ 'Subject' | t }}</label>
            <select [(ngModel)]="form.subjectId"><option value="">{{ 'Select' | t }}</option><option *ngFor="let s of subjects" [value]="s.id">{{s.name}}</option></select>
          </div>
          <div class="form-group"><label>{{ 'Grade (optional)' | t }}</label>
            <select [(ngModel)]="form.gradeId"><option value="">{{ 'Any Grade' | t }}</option><option *ngFor="let g of grades" [value]="g.id">{{g.name}}</option></select>
          </div>
        </div>
        <button class="btn btn-primary" (click)="save()">{{ 'Save' | t }}</button>
        <button class="btn btn-default" (click)="showForm=false">{{ 'Cancel' | t }}</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'All Links' | t }}</h4>
        <p class="card-category">{{ '{count} link(s)' | t:{ count: items.length } }}</p>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>{{ 'Teacher' | t }}</th><th>{{ 'Subject' | t }}</th><th>{{ 'Grade' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let l of items">
                <td>{{l.teacherName}}</td><td>{{l.subjectName}}</td><td>{{l.gradeName}}</td>
                <td><button class="btn btn-sm btn-danger" (click)="remove(l.id)">{{ 'Remove' | t }}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class TeacherSubjectLinksComponent implements OnInit {
  items: TeacherSubjectLinkDto[] = [];
  teachers: any[] = [];
  subjects: any[] = [];
  grades: any[] = [];
  showForm = false;
  form: any = {};

  constructor(
    private svc: TeacherSubjectLinkService,
    private academicSvc: AcademicService,
    private userSvc: UserService
  ) {}

  ngOnInit() {
    this.load();
    this.academicSvc.getSubjects().subscribe(s => this.subjects = s);
    this.academicSvc.getGrades().subscribe(g => this.grades = g);
    this.userSvc.getTeachers().subscribe((u: any) => this.teachers = u.items || u);
  }

  load() { this.svc.getLinks().subscribe(d => this.items = d); }

  save() {
    const payload = { ...this.form };
    if (!payload.gradeId) { delete payload.gradeId; }
    this.svc.create(payload).subscribe(() => { this.showForm = false; this.form = {}; this.load(); });
  }

  remove(id: string) { this.svc.remove(id).subscribe(() => this.load()); }
}
