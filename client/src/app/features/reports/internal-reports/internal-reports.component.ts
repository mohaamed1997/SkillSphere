import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InternalReportService, AssignmentService, TimetableService, AcademicService } from '@core/services/data.service';
import { AuthService } from '@core/services/auth.service';
import { LocalDatePipe } from '@core/pipes/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { StudentAssignmentDto, CreateInternalReportRequest } from '@core/models';
import { InternalReportCategory } from '@core/models/enums';

interface SessionOption {
  label: string;
  subjectId: string;
  groupId: string;
  semesterId: string;
}

@Component({
  selector: 'app-internal-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, LocalDatePipe, TranslatePipe],
  template: `
    <div class="page-header"><h1>{{ 'Internal Reports' | t }}</h1></div>

    <!-- ====== TABS ====== -->
    <div class="tabs">
      <button class="tab-btn" [class.active]="!selectedReport" (click)="selectedReport=null">{{ 'Reports List' | t }}</button>
      <button class="tab-btn" [class.active]="selectedReport" *ngIf="selectedReport">{{ 'Report Detail' | t }}</button>
    </div>

    <!-- ====== CREATE REPORT FORM (Teacher only) ====== -->
    <div class="card" *ngIf="isTeacher">
      <div class="card-header card-header-danger" (click)="showCreateForm=!showCreateForm" style="cursor:pointer">
        <h4 class="card-title">{{ '+ Create Internal Report' | t }}</h4>
        <p class="card-category">{{showCreateForm ? '▲' : '▼'}}</p>
      </div>
      <div class="card-body" *ngIf="showCreateForm">
        <div class="form-grid">
          <div class="form-group">
            <label>{{ 'Category' | t }}</label>
            <select [(ngModel)]="createForm.category">
              <option value="">{{ '-- Select --' | t }}</option>
              <option *ngFor="let c of categories" [value]="c">{{c}}</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ 'Student (optional — select session first)' | t }}</label>
            <select [(ngModel)]="createForm.sessionIdx" (ngModelChange)="onCreateSessionChange()">
              <option [ngValue]="-1">{{ '-- Select session --' | t }}</option>
              <option *ngFor="let s of sessionOptions; let i = index" [ngValue]="i">
                {{s.label}}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>&nbsp;</label>
            <select [(ngModel)]="createForm.studentProfileId">
              <option value="">{{ '-- Select student --' | t }}</option>
              <option *ngFor="let s of createStudents" [value]="s.studentProfileId">{{s.studentName}}</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>{{ 'Title' | t }}</label>
          <input type="text" [(ngModel)]="createForm.title" [placeholder]="'Brief summary of the issue' | t" />
        </div>
        <div class="form-group">
          <label>{{ 'Description' | t }}</label>
          <textarea [(ngModel)]="createForm.description" rows="4" [placeholder]="'Detailed description of the report...' | t"></textarea>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary" (click)="createReport()" [disabled]="createSubmitting">
            {{ (createSubmitting ? 'Submitting...' : 'Submit Report') | t }}
          </button>
        </div>
        <div class="alert alert-success" *ngIf="createSuccess">{{ 'Internal report created!' | t }}</div>
        <div class="alert alert-danger" *ngIf="createError">{{createError}}</div>
      </div>
    </div>

    <!-- ====== REPORTS LIST ====== -->
    <div class="card" *ngIf="!selectedReport">
      <div class="card-header card-header-rose">
        <h4 class="card-title">{{ 'Reports List' | t }}</h4>
        <p class="card-category">{{ 'All internal reports' | t }}</p>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>{{ 'Title' | t }}</th><th>{{ 'Category' | t }}</th><th>{{ 'Reporter' | t }}</th><th>{{ 'Status' | t }}</th><th>{{ 'Created' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of reports">
                <td>{{r.title}}</td><td>{{r.category}}</td><td>{{r.reporterName}}</td>
                <td><span [class]="'badge-' + statusClass(r.status)">{{ r.status | t }}</span></td>
                <td>{{r.createdAt | localDate:'mediumDate'}}</td>
                <td><button class="btn btn-sm btn-primary" (click)="viewReport(r)">{{ 'View' | t }}</button></td>
              </tr>
              <tr *ngIf="!reports.length"><td colspan="6" class="empty-row">{{ 'No internal reports found.' | t }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ====== REPORT DETAIL ====== -->
    <div class="card" *ngIf="selectedReport">
      <div class="card-header card-header-primary">
        <h4 class="card-title">{{selectedReport.title}}</h4>
        <p class="card-category">{{selectedReport.category}} | {{selectedReport.status}} | {{ 'Reporter:' | t }} {{selectedReport.reporterName}}</p>
      </div>
      <div class="card-body">
        <div class="detail-view">
          <div class="detail-header">
            <h3>{{selectedReport.title}}</h3>
            <button class="btn btn-sm btn-danger" (click)="selectedReport=null">{{ 'Close' | t }}</button>
          </div>
          <div class="detail-grid">
            <div class="detail-item"><label>{{ 'Category' | t }}</label><span>{{selectedReport.category}}</span></div>
            <div class="detail-item"><label>{{ 'Status' | t }}</label><span [class]="'badge-' + statusClass(selectedReport.status)">{{selectedReport.status}}</span></div>
            <div class="detail-item"><label>{{ 'Reporter' | t }}</label><span>{{selectedReport.reporterName}}</span></div>
            <div class="detail-item" *ngIf="selectedReport.studentName"><label>{{ 'Student' | t }}</label><span>{{selectedReport.studentName}}</span></div>
          </div>
          <p>{{selectedReport.description}}</p>
        </div>

        <!-- Comments Section -->
        <div class="card">
          <div class="card-header">
            <h4 class="card-title">{{ 'Comments' | t }}</h4>
          </div>
          <div class="card-body">
            <div *ngFor="let c of selectedReport.comments" class="comment">
              <strong>{{c.authorName}}</strong> <small>{{c.createdAt | localDate:'short'}}</small>
              <p>{{c.content}}</p>
            </div>

            <div class="form-group" style="margin-top:1rem">
              <textarea [(ngModel)]="newComment" rows="3" [placeholder]="'Add a comment...' | t"></textarea>
              <button class="btn btn-primary" (click)="addComment()" style="margin-top:.5rem">{{ 'Add Comment' | t }}</button>
            </div>
          </div>
        </div>

        <div class="card-footer" *ngIf="selectedReport.status !== 'Resolved' && selectedReport.status !== 'Closed'">
          <button class="btn btn-sm btn-warning" (click)="escalate()">{{ 'Escalate' | t }}</button>
          <button class="btn btn-sm btn-success" (click)="resolve()">{{ 'Resolve' | t }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [':host { display: block; }']
})
export class InternalReportsComponent implements OnInit {
  reports: any[] = [];
  selectedReport: any = null;
  newComment = '';
  isTeacher = false;
  sessionOptions: SessionOption[] = [];
  createStudents: StudentAssignmentDto[] = [];
  categories = Object.values(InternalReportCategory);

  showCreateForm = false;
  createForm = { category: '', sessionIdx: -1 as number, studentProfileId: '', title: '', description: '' };
  createSubmitting = false;
  createSuccess = false;
  createError = '';

  constructor(
    private reportSvc: InternalReportService,
    private assignmentSvc: AssignmentService,
    private timetableSvc: TimetableService,
    private academicSvc: AcademicService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.isTeacher = this.auth.userRole === 'Teacher';
    this.reportSvc.getReports().subscribe(r => this.reports = r.items || []);

    if (this.isTeacher) {
      const profileId = this.auth.profileId;
      if (profileId) {
        this.academicSvc.getSemesters().subscribe(semesters => {
          const activeSemester = semesters.find((s: any) => s.isActive) || semesters[0];
          if (activeSemester) {
            this.timetableSvc.getTeacherSchedule(profileId, activeSemester.id).subscribe(entries => {
              this.timetableSvc.getVersions(undefined, activeSemester.id).subscribe(versions => {
                const seen = new Set<string>();
                this.sessionOptions = [];
                for (const e of entries) {
                  const key = `${e.subjectId}_${e.timetableVersionId}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    const version = versions.find(v => v.id === e.timetableVersionId);
                    this.sessionOptions.push({
                      label: `${e.subjectName} — ${version?.groupName ?? 'Unknown'}`,
                      subjectId: e.subjectId,
                      groupId: version?.groupId ?? '',
                      semesterId: activeSemester.id
                    });
                  }
                }
              });
            });
          }
        });
      }
    }
  }

  onCreateSessionChange() {
    this.createStudents = [];
    this.createForm.studentProfileId = '';
    if (this.createForm.sessionIdx < 0) return;
    const session = this.sessionOptions[this.createForm.sessionIdx];
    if (!session || !session.groupId) return;
    this.assignmentSvc.getStudentAssignments({ groupId: session.groupId, semesterId: session.semesterId })
      .subscribe(s => this.createStudents = s.filter(x => x.isActive));
  }

  createReport() {
    if (!this.createForm.category || !this.createForm.title || !this.createForm.description) {
      this.createError = 'Please fill in category, title, and description.';
      return;
    }

    this.createSubmitting = true;
    this.createSuccess = false;
    this.createError = '';

    const req: CreateInternalReportRequest = {
      studentProfileId: this.createForm.studentProfileId || undefined,
      category: this.createForm.category,
      title: this.createForm.title,
      description: this.createForm.description
    };

    this.reportSvc.create(this.auth.profileId!, req).subscribe({
      next: (report) => {
        this.createSubmitting = false;
        this.createSuccess = true;
        this.reports = [report, ...this.reports];
        this.createForm = { category: '', sessionIdx: -1 as number, studentProfileId: '', title: '', description: '' };
      },
      error: (err) => {
        this.createSubmitting = false;
        this.createError = err?.error?.message || err?.error?.detail || 'Failed to create internal report.';
      }
    });
  }

  viewReport(report: any) {
    this.reportSvc.getById(report.id).subscribe(r => this.selectedReport = r);
  }

  addComment() {
    if (!this.newComment.trim()) return;
    this.reportSvc.addComment(this.selectedReport.id, { content: this.newComment, isDecisionNote: false }).subscribe(() => {
      this.newComment = '';
      this.viewReport(this.selectedReport);
    });
  }

  escalate() {
    const userId = prompt('Escalate to User ID:');
    if (userId) {
      const notes = prompt('Escalation notes (optional):') || '';
      this.reportSvc.escalate(this.selectedReport.id, { escalateToUserId: userId, notes }).subscribe(() => this.viewReport(this.selectedReport));
    }
  }

  resolve() {
    this.reportSvc.resolve(this.selectedReport.id).subscribe(() => this.viewReport(this.selectedReport));
  }

  statusClass(status: string): string {
    const map: any = { Submitted: 'open', UnderReview: 'inprogress', Escalated: 'escalated', Resolved: 'resolved', Closed: 'resolved' };
    return map[status] || 'open';
  }
}
