import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GradesService, AssignmentService, AcademicService, TimetableService } from '@core/services/data.service';
import { AuthService } from '@core/services/auth.service';
import { LocalDatePipe } from '@core/pipes/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { StudentAssignmentDto, GradeRecordDto, BehaviorFeedbackDto, CreateGradeRecordRequest, CreateBehaviorFeedbackRequest, SemesterDto, TimetableEntryDto, TimetableVersionDto } from '@core/models';

interface SessionOption {
  label: string;
  subjectId: string;
  groupId: string;
  semesterId: string;
}

@Component({
  selector: 'app-grades-records',
  standalone: true,
  imports: [CommonModule, FormsModule, LocalDatePipe, TranslatePipe],
  template: `
    <div class="page-header"><h1>{{ 'Grade Records' | t }}</h1></div>

    <div class="tabs">
      <button class="tab-btn" [class.active]="tab==='grades'" (click)="tab='grades'">{{ 'Grade Records' | t }}</button>
      <button class="tab-btn" [class.active]="tab==='behavior'" (click)="tab='behavior'">{{ 'Behavior Feedback' | t }}</button>
    </div>

    <!-- ====== GRADE RECORDS TAB ====== -->
    <ng-container *ngIf="tab==='grades'">
      <!-- ADD GRADE FORM (Teacher only) -->
      <div class="card" *ngIf="isTeacher">
        <div class="card-header card-header-success" (click)="showGradeForm=!showGradeForm" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center">
          <h4 class="card-title">{{ '+ Add Grade Record' | t }}</h4>
          <span>{{showGradeForm ? '▲' : '▼'}}</span>
        </div>
        <div class="card-body" *ngIf="showGradeForm">
          <div class="form-grid">
            <div class="form-group">
              <label>{{ 'Session (Subject / Group)' | t }}</label>
              <select [(ngModel)]="gradeForm.sessionIdx" (ngModelChange)="onGradeSessionChange()">
                <option [ngValue]="-1">{{ '-- Select --' | t }}</option>
                <option *ngFor="let s of sessionOptions; let i = index" [ngValue]="i">
                  {{s.label}}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ 'Student' | t }}</label>
              <select [(ngModel)]="gradeForm.studentProfileId">
                <option value="">{{ '-- Select --' | t }}</option>
                <option *ngFor="let s of gradeStudents" [value]="s.studentProfileId">{{s.studentName}}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ 'Assessment Type' | t }}</label>
              <select [(ngModel)]="gradeForm.assessmentType">
                <option value="">{{ '-- Select --' | t }}</option>
                <option value="Quiz">{{ 'Quiz' | t }}</option>
                <option value="Test">{{ 'Test' | t }}</option>
                <option value="MidtermExam">{{ 'Midterm Exam' | t }}</option>
                <option value="FinalExam">{{ 'Final Exam' | t }}</option>
                <option value="Homework">{{ 'Homework' | t }}</option>
                <option value="Project">{{ 'Project' | t }}</option>
                <option value="Participation">{{ 'Participation' | t }}</option>
              </select>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>{{ 'Score' | t }}</label>
              <input type="number" [(ngModel)]="gradeForm.score" placeholder="e.g. 85" />
            </div>
            <div class="form-group">
              <label>{{ 'Max Score' | t }}</label>
              <input type="number" [(ngModel)]="gradeForm.maxScore" placeholder="e.g. 100" />
            </div>
            <div class="form-group">
              <label>{{ 'Letter Grade (optional)' | t }}</label>
              <select [(ngModel)]="gradeForm.letterGrade">
                <option value="">{{ '-- Select --' | t }}</option>
                <option *ngFor="let g of letterGrades" [value]="g">{{g}}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>{{ 'Notes (optional)' | t }}</label>
            <textarea [(ngModel)]="gradeForm.notes" rows="2" [placeholder]="'Additional notes...' | t"></textarea>
          </div>
          <div class="card-footer" style="display:flex;justify-content:flex-end">
            <button class="btn btn-primary" (click)="submitGradeRecord()" [disabled]="gradeSubmitting">
              {{ (gradeSubmitting ? 'Saving...' : 'Save Grade Record') | t }}
            </button>
          </div>
          <div class="alert alert-success" *ngIf="gradeSuccess">{{ 'Grade record saved!' | t }}</div>
          <div class="alert alert-danger" *ngIf="gradeError">{{gradeError}}</div>
        </div>
      </div>

      <!-- EXISTING RECORDS TABLE -->
      <div class="card">
        <div class="card-header card-header-primary">
          <h4 class="card-title">{{ 'Grade Records' | t }}</h4>
          <p class="card-category">{{ 'All recorded grades' | t }}</p>
        </div>
        <div class="card-body">
          <div class="filter-row">
            <div class="form-group">
              <label>{{ 'Search Student' | t }}</label>
              <input type="text" [(ngModel)]="gradeFilter.studentName" [placeholder]="'Student name' | t" />
            </div>
            <div class="form-group">
              <label>{{ 'Subject' | t }}</label>
              <select [(ngModel)]="gradeFilter.subjectName">
                <option value="">{{ 'All Subjects' | t }}</option>
                <option *ngFor="let s of distinctGradeSubjects" [value]="s">{{ s }}</option>
              </select>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead><tr><th>{{ 'Student' | t }}</th><th>{{ 'Subject' | t }}</th><th>{{ 'Score' | t }}</th><th>{{ 'Grade' | t }}</th><th>{{ 'Assessment' | t }}</th><th>{{ 'Date' | t }}</th></tr></thead>
              <tbody>
                <tr *ngFor="let r of filteredGradeRecords">
                  <td>{{r.studentName}}</td><td>{{r.subjectName}}</td><td>{{r.score}}/{{r.maxScore}}</td>
                  <td>{{r.letterGrade}}</td><td>{{r.assessmentType}}</td><td>{{r.recordedDate | localDate:'mediumDate'}}</td>
                </tr>
                <tr *ngIf="!filteredGradeRecords.length"><td colspan="6" class="empty-row">{{ 'No grade records found.' | t }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- ====== BEHAVIOR FEEDBACK TAB ====== -->
    <ng-container *ngIf="tab==='behavior'">
      <!-- ADD BEHAVIOR FEEDBACK FORM (Teacher only) -->
      <div class="card" *ngIf="isTeacher">
        <div class="card-header card-header-warning" (click)="showBehaviorForm=!showBehaviorForm" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center">
          <h4 class="card-title">{{ '+ Add Behavior Feedback' | t }}</h4>
          <span>{{showBehaviorForm ? '▲' : '▼'}}</span>
        </div>
        <div class="card-body" *ngIf="showBehaviorForm">
          <div class="form-grid">
            <div class="form-group">
              <label>{{ 'Session (Subject / Group)' | t }}</label>
              <select [(ngModel)]="behaviorForm.sessionIdx" (ngModelChange)="onBehaviorSessionChange()">
                <option [ngValue]="-1">{{ '-- Select --' | t }}</option>
                <option *ngFor="let s of sessionOptions; let i = index" [ngValue]="i">
                  {{s.label}}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ 'Student' | t }}</label>
              <select [(ngModel)]="behaviorForm.studentProfileId">
                <option value="">{{ '-- Select --' | t }}</option>
                <option *ngFor="let s of behaviorStudents" [value]="s.studentProfileId">{{s.studentName}}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ 'Category' | t }}</label>
              <select [(ngModel)]="behaviorForm.category">
                <option value="">{{ '-- Select --' | t }}</option>
                <option value="Participation">{{ 'Participation' | t }}</option>
                <option value="Discipline">{{ 'Discipline' | t }}</option>
                <option value="Teamwork">{{ 'Teamwork' | t }}</option>
                <option value="Leadership">{{ 'Leadership' | t }}</option>
                <option value="Respect">{{ 'Respect' | t }}</option>
                <option value="Punctuality">{{ 'Punctuality' | t }}</option>
                <option value="Homework">{{ 'Homework' | t }}</option>
              </select>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>{{ 'Rating (1-5)' | t }}</label>
              <div class="rating-buttons">
                <button *ngFor="let n of [1,2,3,4,5]" [class.selected]="behaviorForm.rating===n"
                  (click)="behaviorForm.rating=n" class="rating-btn">{{n}}</button>
              </div>
            </div>
            <div class="form-group" style="grid-column: span 2">
              <label>{{ 'Description (optional)' | t }}</label>
              <textarea [(ngModel)]="behaviorForm.description" rows="2" [placeholder]="'Describe the behavior...' | t"></textarea>
            </div>
          </div>
          <div class="card-footer" style="display:flex;justify-content:flex-end">
            <button class="btn btn-primary" (click)="submitBehaviorFeedback()" [disabled]="behaviorSubmitting">
              {{ (behaviorSubmitting ? 'Saving...' : 'Save Feedback') | t }}
            </button>
          </div>
          <div class="alert alert-success" *ngIf="behaviorSuccess">{{ 'Behavior feedback saved!' | t }}</div>
          <div class="alert alert-danger" *ngIf="behaviorError">{{behaviorError}}</div>
        </div>
      </div>

      <!-- EXISTING BEHAVIOR TABLE -->
      <div class="card">
        <div class="card-header card-header-primary">
          <h4 class="card-title">{{ 'Behavior Feedback' | t }}</h4>
          <p class="card-category">{{ 'All recorded behavior feedback' | t }}</p>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table">
              <thead><tr><th>{{ 'Student' | t }}</th><th>{{ 'Category' | t }}</th><th>{{ 'Rating' | t }}</th><th>{{ 'Description' | t }}</th><th>{{ 'Date' | t }}</th></tr></thead>
              <tbody>
                <tr *ngFor="let b of behaviorFeedback">
                  <td>{{b.studentName}}</td><td>{{b.category}}</td><td>{{b.rating}}/5</td><td>{{b.description}}</td><td>{{b.recordedDate | localDate:'mediumDate'}}</td>
                </tr>
                <tr *ngIf="!behaviorFeedback.length"><td colspan="5" class="empty-row">{{ 'No behavior feedback found.' | t }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [':host { display: block; }']
})
export class GradesRecordsComponent implements OnInit {
  tab = 'grades';
  isTeacher = false;
  sessionOptions: SessionOption[] = [];
  letterGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];

  // Grade Records
  gradeRecords: GradeRecordDto[] = [];
  gradeFilter = { studentName: '', subjectName: '' };
  showGradeForm = false;
  gradeStudents: StudentAssignmentDto[] = [];
  gradeForm = { sessionIdx: -1 as number, studentProfileId: '', score: null as number | null, maxScore: null as number | null, letterGrade: '', assessmentType: '', notes: '' };
  gradeSubmitting = false;
  gradeSuccess = false;
  gradeError = '';

  // Behavior Feedback
  behaviorFeedback: BehaviorFeedbackDto[] = [];
  showBehaviorForm = false;
  behaviorStudents: StudentAssignmentDto[] = [];
  behaviorForm = { sessionIdx: -1 as number, studentProfileId: '', category: '', description: '', rating: 0 };
  behaviorSubmitting = false;
  behaviorSuccess = false;
  behaviorError = '';

  constructor(
    private gradesSvc: GradesService,
    private assignmentSvc: AssignmentService,
    private timetableSvc: TimetableService,
    private academicSvc: AcademicService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.isTeacher = this.auth.userRole === 'Teacher';

    this.gradesSvc.getRecords().subscribe(r => this.gradeRecords = r);
    this.gradesSvc.getBehavior().subscribe(b => this.behaviorFeedback = b);

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

  onGradeSessionChange() {
    this.gradeStudents = [];
    this.gradeForm.studentProfileId = '';
    if (this.gradeForm.sessionIdx < 0) return;
    const session = this.sessionOptions[this.gradeForm.sessionIdx];
    if (!session || !session.groupId) return;
    this.assignmentSvc.getStudentAssignments({ groupId: session.groupId, semesterId: session.semesterId })
      .subscribe(s => this.gradeStudents = s.filter(x => x.isActive));
  }

  onBehaviorSessionChange() {
    this.behaviorStudents = [];
    this.behaviorForm.studentProfileId = '';
    if (this.behaviorForm.sessionIdx < 0) return;
    const session = this.sessionOptions[this.behaviorForm.sessionIdx];
    if (!session || !session.groupId) return;
    this.assignmentSvc.getStudentAssignments({ groupId: session.groupId, semesterId: session.semesterId })
      .subscribe(s => this.behaviorStudents = s.filter(x => x.isActive));
  }

  get distinctGradeSubjects(): string[] {
    return Array.from(new Set(this.gradeRecords.map(r => r.subjectName).filter(x => !!x))).sort();
  }

  get filteredGradeRecords(): GradeRecordDto[] {
    const nameQ = this.gradeFilter.studentName.trim().toLowerCase();
    const subj = this.gradeFilter.subjectName;
    return this.gradeRecords.filter(r =>
      (!nameQ || (r.studentName || '').toLowerCase().includes(nameQ)) &&
      (!subj || r.subjectName === subj)
    );
  }

  submitGradeRecord() {
    if (this.gradeForm.sessionIdx < 0 || !this.gradeForm.studentProfileId) return;
    const session = this.sessionOptions[this.gradeForm.sessionIdx];
    if (!session) return;

    this.gradeSubmitting = true;
    this.gradeSuccess = false;
    this.gradeError = '';

    const req: CreateGradeRecordRequest = {
      studentProfileId: this.gradeForm.studentProfileId,
      subjectId: session.subjectId,
      semesterId: session.semesterId,
      score: this.gradeForm.score ?? undefined,
      maxScore: this.gradeForm.maxScore ?? undefined,
      letterGrade: this.gradeForm.letterGrade || undefined,
      assessmentType: this.gradeForm.assessmentType || undefined,
      notes: this.gradeForm.notes || undefined
    };

    this.gradesSvc.createRecord(this.auth.profileId!, req).subscribe({
      next: (record) => {
        this.gradeSubmitting = false;
        this.gradeSuccess = true;
        this.gradeRecords = [record, ...this.gradeRecords];
        this.gradeForm = { sessionIdx: this.gradeForm.sessionIdx, studentProfileId: '', score: null, maxScore: this.gradeForm.maxScore, letterGrade: '', assessmentType: this.gradeForm.assessmentType, notes: '' };
      },
      error: (err) => {
        this.gradeSubmitting = false;
        this.gradeError = err?.error?.message || err?.error?.detail || 'Failed to save grade record.';
      }
    });
  }

  submitBehaviorFeedback() {
    if (this.behaviorForm.sessionIdx < 0 || !this.behaviorForm.studentProfileId || !this.behaviorForm.category) return;
    const session = this.sessionOptions[this.behaviorForm.sessionIdx];
    if (!session) return;

    this.behaviorSubmitting = true;
    this.behaviorSuccess = false;
    this.behaviorError = '';

    const req: CreateBehaviorFeedbackRequest = {
      studentProfileId: this.behaviorForm.studentProfileId,
      semesterId: session.semesterId,
      category: this.behaviorForm.category,
      description: this.behaviorForm.description || undefined,
      rating: this.behaviorForm.rating > 0 ? this.behaviorForm.rating : undefined
    };

    this.gradesSvc.createBehavior(this.auth.profileId!, req).subscribe({
      next: (feedback) => {
        this.behaviorSubmitting = false;
        this.behaviorSuccess = true;
        this.behaviorFeedback = [feedback, ...this.behaviorFeedback];
        this.behaviorForm = { sessionIdx: this.behaviorForm.sessionIdx, studentProfileId: '', category: '', description: '', rating: 0 };
      },
      error: (err) => {
        this.behaviorSubmitting = false;
        this.behaviorError = err?.error?.message || err?.error?.detail || 'Failed to save behavior feedback.';
      }
    });
  }
}
