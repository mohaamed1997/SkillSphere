import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeeklyReportService, AssignmentService, TimetableService, AcademicService } from '@core/services/data.service';
import { AuthService } from '@core/services/auth.service';
import { LocalDatePipe } from '@core/pipes/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { StudentAssignmentDto, WeeklyReportDto, CreateWeeklyReportRequest, WeeklyReportItemRequest } from '@core/models';

interface ReportItemEntry {
  attributeName: string;
  value: string;
  numericValue: number | null;
  comments: string;
}

interface SessionOption {
  label: string;
  subjectId: string;
  groupId: string;
  semesterId: string;
}

@Component({
  selector: 'app-weekly-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, LocalDatePipe, TranslatePipe],
  template: `
    <div class="page-header"><h1>{{ 'Weekly Reports' | t }}</h1></div>

    <!-- ====== TABS (Teacher toggle) ====== -->
    <div class="tabs" *ngIf="isTeacher">
      <button class="tab-btn" [class.active]="!showCreateForm" (click)="showCreateForm=false">{{ 'Reports List' | t }}</button>
      <button class="tab-btn" [class.active]="showCreateForm" (click)="showCreateForm=true">{{ '+ Create Report' | t }}</button>
    </div>

    <!-- ====== CREATE REPORT FORM (Teacher only) ====== -->
    <div class="card" *ngIf="isTeacher && showCreateForm">
      <div class="card-header card-header-success">
        <h4 class="card-title">{{ 'Create Weekly Report' | t }}</h4>
        <p class="card-category">{{ 'Fill in assignment, student, and report items' | t }}</p>
      </div>
      <div class="card-body">
        <div class="form-grid">
          <div class="form-group">
            <label>{{ 'Session (Subject / Group)' | t }}</label>
            <select [(ngModel)]="createForm.sessionIdx" (ngModelChange)="onCreateSessionChange()">
              <option [ngValue]="-1">{{ '-- Select --' | t }}</option>
              <option *ngFor="let s of sessionOptions; let i = index" [ngValue]="i">
                {{s.label}}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ 'Student' | t }}</label>
            <select [(ngModel)]="createForm.studentProfileId">
              <option value="">{{ '-- Select --' | t }}</option>
              <option *ngFor="let s of createStudents" [value]="s.studentProfileId">{{s.studentName}}</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ 'Week Number' | t }}</label>
            <input type="number" [(ngModel)]="createForm.weekNumber" min="1" max="52" placeholder="e.g. 12" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ 'Week Start Date' | t }}</label>
            <input type="date" [(ngModel)]="createForm.weekStartDate" />
          </div>
          <div class="form-group">
            <label>{{ 'Week End Date' | t }}</label>
            <input type="date" [(ngModel)]="createForm.weekEndDate" />
          </div>
        </div>

        <div class="items-section">
          <div class="items-header">
            <h4>{{ 'Report Items' | t }}</h4>
            <button class="btn btn-sm" (click)="addItem()">{{ '+ Add Item' | t }}</button>
          </div>
          <div class="item-card" *ngFor="let item of createForm.items; let i = index">
            <div class="item-row">
              <div class="form-group">
                <label>{{ 'Attribute' | t }}</label>
                <select [(ngModel)]="item.attributeName">
                  <option value="">{{ '-- Select --' | t }}</option>
                  <option *ngFor="let attr of defaultAttributes" [value]="attr">{{ attr | t }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>{{ 'Value' | t }}</label>
                <select [(ngModel)]="item.value">
                  <option value="">{{ '-- Select --' | t }}</option>
                  <option value="Excellent">{{ 'Excellent' | t }}</option>
                  <option value="Good">{{ 'Good' | t }}</option>
                  <option value="Satisfactory">{{ 'Satisfactory' | t }}</option>
                  <option value="Needs Improvement">{{ 'Needs Improvement' | t }}</option>
                  <option value="Poor">{{ 'Poor' | t }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>{{ 'Score (0-10)' | t }}</label>
                <input type="number" [(ngModel)]="item.numericValue" min="0" max="10" />
              </div>
              <button class="btn-remove" (click)="removeItem(i)" [title]="'Remove' | t">✕</button>
            </div>
            <div class="form-group">
              <label>{{ 'Comments' | t }}</label>
              <input type="text" [(ngModel)]="item.comments" [placeholder]="'Optional comments for this attribute' | t" />
            </div>
          </div>
          <p class="hint" *ngIf="!createForm.items.length">{{ 'Click "+ Add Item" to add report attributes (e.g., Academic Performance, Behavior, Homework).' | t }}</p>
        </div>

        <div class="card-footer">
          <button class="btn btn-primary" (click)="createReport()" [disabled]="createSubmitting">
            {{ (createSubmitting ? 'Saving...' : 'Save as Draft') | t }}
          </button>
        </div>
        <div class="alert alert-success" *ngIf="createSuccess">{{ 'Weekly report created as draft!' | t }}</div>
        <div class="alert alert-danger" *ngIf="createError">{{createError}}</div>
      </div>
    </div>

    <!-- ====== REPORTS LIST ====== -->
    <div class="card">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'Weekly Reports' | t }}</h4>
        <p class="card-category">{{ 'All weekly reports for your assignments' | t }}</p>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>{{ 'Student' | t }}</th><th>{{ 'Teacher' | t }}</th><th>{{ 'Week' | t }}</th><th>{{ 'Period' | t }}</th><th>{{ 'Status' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of reports">
                <td>{{r.studentName}}</td><td>{{r.teacherName}}</td><td>{{ 'Week' | t }} {{r.weekNumber}}</td>
                <td>{{r.weekStartDate | localDate:'shortDate'}} - {{r.weekEndDate | localDate:'shortDate'}}</td>
                <td><span [class]="'badge-' + r.status.toLowerCase()">{{ r.status | t }}</span></td>
                <td>
                  <button class="btn btn-sm" (click)="viewReport(r)">{{ 'View' | t }}</button>
                  <button class="btn btn-sm btn-primary" *ngIf="isTeacher && r.status === 'Draft'" (click)="submitReport(r)">{{ 'Submit' | t }}</button>
                </td>
              </tr>
              <tr *ngIf="!reports.length"><td colspan="6" class="empty-row">{{ 'No weekly reports found.' | t }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ====== REPORT DETAIL VIEW ====== -->
    <div class="card" *ngIf="selectedReport">
      <div class="card-header card-header-primary">
        <h4 class="card-title">{{ 'Report Details' | t }} — {{selectedReport.studentName}} — {{ 'Week' | t }} {{selectedReport.weekNumber}}</h4>
        <p class="card-category">{{selectedReport.subjectName}} | {{selectedReport.teacherName}} | {{ selectedReport.status | t }}</p>
      </div>
      <div class="card-body">
        <div class="detail-view">
          <div class="detail-header">
            <h3>{{ 'Report Items' | t }}</h3>
            <button class="btn btn-sm" (click)="selectedReport=null">{{ 'Close' | t }}</button>
          </div>
          <div class="detail-grid">
            <div class="detail-item" *ngFor="let item of selectedReport.items">
              <h4>{{ item.attributeName | t }}</h4>
              <p *ngIf="item.value"><strong>{{ 'Value' | t }}:</strong> {{ item.value | t }}</p>
              <p *ngIf="item.numericValue != null"><strong>{{ 'Score' | t }}:</strong> {{item.numericValue}}</p>
              <p *ngIf="item.comments"><strong>{{ 'Comments' | t }}:</strong> {{item.comments}}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [':host { display: block; }']
})
export class WeeklyReportsComponent implements OnInit {
  reports: WeeklyReportDto[] = [];
  selectedReport: WeeklyReportDto | null = null;
  isTeacher = false;
  sessionOptions: SessionOption[] = [];
  createStudents: StudentAssignmentDto[] = [];

  showCreateForm = false;
  createForm = {
    sessionIdx: -1 as number,
    studentProfileId: '',
    weekNumber: 1,
    weekStartDate: '',
    weekEndDate: '',
    items: [] as ReportItemEntry[]
  };
  createSubmitting = false;
  createSuccess = false;
  createError = '';

  defaultAttributes = [
    'Academic Performance',
    'Homework Completion',
    'Class Participation',
    'Behavior & Discipline',
    'Attendance & Punctuality',
    'Social Skills',
    'Creativity',
    'Physical Education',
    'Reading',
    'Writing'
  ];

  constructor(
    private reportSvc: WeeklyReportService,
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
      // Pre-populate current week info
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      this.createForm.weekStartDate = monday.toISOString().split('T')[0];
      this.createForm.weekEndDate = friday.toISOString().split('T')[0];

      // Calculate week number
      const start = new Date(now.getFullYear(), 0, 1);
      const diff = now.getTime() - start.getTime();
      this.createForm.weekNumber = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
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

  addItem() {
    this.createForm.items.push({ attributeName: '', value: '', numericValue: null, comments: '' });
  }

  removeItem(index: number) {
    this.createForm.items.splice(index, 1);
  }

  createReport() {
    if (this.createForm.sessionIdx < 0 || !this.createForm.studentProfileId || this.createForm.items.length === 0) {
      this.createError = 'Please fill in session, student, and at least one report item.';
      return;
    }
    const session = this.sessionOptions[this.createForm.sessionIdx];
    if (!session) return;

    this.createSubmitting = true;
    this.createSuccess = false;
    this.createError = '';

    const req: CreateWeeklyReportRequest = {
      studentProfileId: this.createForm.studentProfileId,
      subjectId: session.subjectId,
      semesterId: session.semesterId,
      weekNumber: this.createForm.weekNumber,
      weekStartDate: this.createForm.weekStartDate,
      weekEndDate: this.createForm.weekEndDate,
      items: this.createForm.items
        .filter(i => i.attributeName)
        .map(i => ({
          attributeName: i.attributeName,
          value: i.value || undefined,
          numericValue: i.numericValue ?? undefined,
          comments: i.comments || undefined
        }))
    };

    this.reportSvc.create(this.auth.profileId!, req).subscribe({
      next: (report) => {
        this.createSubmitting = false;
        this.createSuccess = true;
        this.reports = [report, ...this.reports];
        // Reset items but keep assignment/week context
        this.createForm.studentProfileId = '';
        this.createForm.items = [];
      },
      error: (err) => {
        this.createSubmitting = false;
        this.createError = err?.error?.message || err?.error?.detail || 'Failed to create weekly report.';
      }
    });
  }

  submitReport(report: WeeklyReportDto) {
    this.reportSvc.submit(report.id).subscribe({
      next: () => {
        report.status = 'Submitted' as any;
      },
      error: (err) => {
        alert(err?.error?.message || 'Failed to submit report.');
      }
    });
  }

  viewReport(report: WeeklyReportDto) {
    this.reportSvc.getById(report.id).subscribe(r => this.selectedReport = r);
  }
}
