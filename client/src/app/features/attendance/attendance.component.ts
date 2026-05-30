import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService, AssignmentService, TimetableService, AcademicService } from '@core/services/data.service';
import { AuthService } from '@core/services/auth.service';
import { TimetableEntryDto, AttendanceRecordDto, SubmitAttendanceRequest, SessionComplianceDto, AttendanceEditPermissionDto, AttendanceComplianceDto, UpdateAttendanceEntryRequest, GrantEditPermissionRequest } from '@core/models';
import { AttendanceStatus, SubmissionStatus } from '@core/models/enums';
import { TranslatePipe } from '@core/i18n/translate.pipe';

interface StudentEntry {
  studentProfileId: string;
  studentName: string;
  status: AttendanceStatus;
  notes: string;
}

interface SessionOption {
  label: string;
  subjectId: string;
  groupId: string;
  semesterId: string;
  timetableEntryId?: string;
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1>{{ 'Attendance' | t }}</h1>
      <div class="tabs">
        <button class="tab-btn" *ngIf="isTeacher" [class.active]="mode==='submit'" (click)="mode='submit'">{{ 'Submit' | t }}</button>
        <button class="tab-btn" [class.active]="mode==='view'" (click)="mode='view'">{{ 'View Records' | t }}</button>
        <button class="tab-btn" *ngIf="isSupervisor || isAdmin || isManager" [class.active]="mode==='compliance'" (click)="mode='compliance'; loadCompliance()">{{ 'Compliance' | t }}</button>
        <button class="tab-btn" *ngIf="isSupervisor || isAdmin" [class.active]="mode==='session'" (click)="mode='session'; loadSessionCompliance()">{{ 'Session Status' | t }}</button>
        <button class="tab-btn" *ngIf="isAdmin" [class.active]="mode==='permissions'" (click)="mode='permissions'; loadPermissions()">{{ 'Edit Permissions' | t }}</button>
      </div>
    </div>

    <!-- ========== TEACHER: SUBMIT ATTENDANCE ========== -->
    <ng-container *ngIf="isTeacher && mode==='submit'">
      <div class="card">
        <div class="card-header card-header-success">
          <h4 class="card-title">{{ 'Submit Attendance' | t }}</h4>
          <p class="card-category">{{ 'Mark student attendance for a session' | t }}</p>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label>{{ 'Session (Subject / Group)' | t }}</label>
              <select [(ngModel)]="selectedSessionIdx" (ngModelChange)="onSessionChange()">
                <option [ngValue]="-1">{{ '-- Select --' | t }}</option>
                <option *ngFor="let s of sessionOptions; let i = index" [ngValue]="i">
                  {{s.label}}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ 'Date' | t }}</label>
              <input type="date" [(ngModel)]="submitDate" (ngModelChange)="checkExistingAttendance()" />
            </div>
            <div class="form-group">
              <label>{{ 'Session Time (optional)' | t }}</label>
              <input type="time" [(ngModel)]="submitSessionTime" />
            </div>
          </div>
        </div>
      </div>

      <div class="alert alert-warning" *ngIf="isTeacher && mode==='submit' && !sessionOptions.length">
        {{ 'No sessions available. Make sure your timetable is published and you have classes assigned.' | t }}
      </div>

      <div class="alert alert-warning" *ngIf="alreadySubmitted && !editingRecord">
        {{ 'Attendance has been submitted for this session. You may edit within the grace period.' | t }}
      </div>

      <div class="card" *ngIf="studentEntries.length && !alreadySubmitted">
        <div class="card-body">
          <div class="filter-row">
            <span>{{ '{count} students' | t:{ count: studentEntries.length } }}</span>
            <button class="btn btn-sm btn-success" (click)="markAll('Present')">{{ 'All Present' | t }}</button>
            <button class="btn btn-sm btn-danger" (click)="markAll('Absent')">{{ 'All Absent' | t }}</button>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead><tr><th>{{ 'Student' | t }}</th><th>{{ 'Status' | t }}</th><th>{{ 'Notes' | t }}</th></tr></thead>
              <tbody>
                <tr *ngFor="let s of studentEntries; let i = index">
                  <td>{{s.studentName}}</td>
                  <td>
                    <div class="status-buttons">
                      <button *ngFor="let st of statuses" [class]="'btn btn-sm badge-' + st.toLowerCase()"
                        [class.selected]="s.status === st" (click)="s.status = st">{{ st | t }}</button>
                    </div>
                  </td>
                  <td><input type="text" [(ngModel)]="s.notes" [placeholder]="'Optional notes' | t" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer" style="text-align:right">
          <button class="btn btn-outline-secondary" (click)="submitAttendance(true)" [disabled]="submitting" style="margin-right:8px">
            {{ 'Save as Draft' | t }}
          </button>
          <button class="btn btn-primary" (click)="submitAttendance(false)" [disabled]="submitting">
            {{ (submitting ? 'Submitting...' : 'Submit Attendance') | t }}
          </button>
        </div>
      </div>

      <div class="alert alert-success" *ngIf="submitSuccess">{{ 'Attendance submitted successfully!' | t }}</div>
      <div class="alert alert-danger" *ngIf="submitError">{{submitError}}</div>
    </ng-container>

    <!-- ========== VIEW ATTENDANCE RECORDS ========== -->
    <ng-container *ngIf="mode==='view'">
      <div class="card">
        <div class="card-header card-header-info">
          <h4 class="card-title">{{ 'Attendance Records' | t }}</h4>
          <p class="card-category">{{ 'View submitted attendance' | t }}</p>
        </div>
        <div class="card-body">
          <div class="filter-row">
            <div class="form-group"><label>{{ 'Date' | t }}</label><input type="date" [(ngModel)]="filterDate" /></div>
            <div class="form-group" style="align-self:end"><button class="btn btn-primary" (click)="loadAttendance()">{{ 'Load' | t }}</button></div>
          </div>

          <div class="table-responsive" *ngIf="records.length">
            <table class="table">
              <thead><tr>
                <th>{{ 'Student' | t }}</th><th>{{ 'Subject' | t }}</th><th>{{ 'Group' | t }}</th><th>{{ 'Period' | t }}</th><th>{{ 'Status' | t }}</th><th>{{ 'Submission' | t }}</th><th>{{ 'Notes' | t }}</th>
                <th *ngIf="isAdmin || isTeacher">{{ 'Actions' | t }}</th>
              </tr></thead>
              <tbody>
                <tr *ngFor="let r of records">
                  <td>{{r.studentName}}</td><td>{{r.subjectName}}</td><td>{{r.groupName}}</td>
                  <td>{{r.periodLabel || '-'}}</td>
                  <td><span [class]="'badge-' + r.status.toLowerCase()">{{ r.status | t }}</span></td>
                  <td>
                    <span [class]="'badge-' + getSubmissionBadge(r.submissionStatus)">{{ r.submissionStatus | t }}</span>
                  </td>
                  <td>{{r.notes}}</td>
                  <td *ngIf="isAdmin || isTeacher">
                    <button class="btn btn-sm btn-outline-primary" (click)="startEdit(r)" *ngIf="r.submissionStatus !== 'Draft'">{{ 'Edit' | t }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="empty-row" *ngIf="!records.length && filterDate && !loadError">
            <p>{{ 'No attendance records for this date.' | t }}</p>
          </div>
          <div class="alert alert-danger" *ngIf="loadError">{{ loadError }}</div>
        </div>
      </div>

      <!-- Edit Dialog -->
      <div class="card" *ngIf="editingRecord">
        <div class="card-header card-header-warning">
          <h4 class="card-title">{{ 'Edit Attendance Record' | t }}</h4>
        </div>
        <div class="card-body">
          <p><strong>{{ 'Student' | t }}:</strong> {{editingRecord.studentName}} | <strong>{{ 'Subject' | t }}:</strong> {{editingRecord.subjectName}}</p>
          <div class="form-grid">
            <div class="form-group">
              <label>{{ 'Status' | t }}</label>
              <select [(ngModel)]="editStatus">
                <option *ngFor="let st of statuses" [value]="st">{{ st | t }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ 'Notes' | t }}</label>
              <input type="text" [(ngModel)]="editNotes" />
            </div>
            <div class="form-group">
              <label>{{ 'Reason for Change' | t }} *</label>
              <input type="text" [(ngModel)]="editReason" [placeholder]="'Required' | t" />
            </div>
          </div>
        </div>
        <div class="card-footer" style="text-align:right">
          <button class="btn btn-outline-secondary" (click)="editingRecord=null" style="margin-right:8px">{{ 'Cancel' | t }}</button>
          <button class="btn btn-warning" (click)="saveEdit()" [disabled]="!editReason || submitting">
            {{ (submitting ? 'Saving...' : 'Save Changes') | t }}
          </button>
        </div>
        <div class="alert alert-danger" *ngIf="editError" style="margin:0 16px 16px">{{editError}}</div>
      </div>
    </ng-container>

    <!-- ========== COMPLIANCE (Supervisor / Admin / Manager) ========== -->
    <ng-container *ngIf="mode==='compliance'">
      <div class="card">
        <div class="card-header card-header-primary">
          <h4 class="card-title">{{ 'Teacher Compliance' | t }}</h4>
          <p class="card-category">{{ 'Attendance submission compliance by teacher' | t }}</p>
        </div>
        <div class="card-body">
          <div class="filter-row">
            <div class="form-group">
              <label>{{ 'Semester' | t }}</label>
              <select [(ngModel)]="complianceSemesterId" (ngModelChange)="loadCompliance()">
                <option *ngFor="let s of semesters" [value]="s.id">{{s.name}}</option>
              </select>
            </div>
          </div>
          <div class="table-responsive" *ngIf="complianceData.length">
            <table class="table">
              <thead><tr><th>{{ 'Teacher' | t }}</th><th>{{ 'Expected' | t }}</th><th>{{ 'Completed' | t }}</th><th>{{ 'Rate' | t }}</th><th>{{ 'Late' | t }}</th><th>{{ 'Missing' | t }}</th></tr></thead>
              <tbody>
                <tr *ngFor="let c of complianceData">
                  <td>{{c.teacherName}}</td>
                  <td>{{c.totalExpectedSessions}}</td>
                  <td>{{c.completedSessions}}</td>
                  <td>{{c.completionPercentage}}%</td>
                  <td><span class="badge-late">{{c.lateDays}}</span></td>
                  <td><span class="badge-absent">{{c.missingSessions}}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- ========== SESSION COMPLIANCE (Supervisor / Admin) ========== -->
    <ng-container *ngIf="mode==='session'">
      <div class="card">
        <div class="card-header card-header-info">
          <h4 class="card-title">{{ 'Session Submission Status' | t }}</h4>
          <p class="card-category">{{ 'Per-session submission grid' | t }}</p>
        </div>
        <div class="card-body">
          <div class="filter-row">
            <div class="form-group">
              <label>{{ 'Semester' | t }}</label>
              <select [(ngModel)]="complianceSemesterId" (ngModelChange)="loadSessionCompliance()">
                <option *ngFor="let s of semesters" [value]="s.id">{{s.name}}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ 'Date' | t }}</label>
              <input type="date" [(ngModel)]="sessionDate" (ngModelChange)="loadSessionCompliance()" />
            </div>
            <div class="form-group" style="align-self:end">
              <button class="btn btn-primary btn-sm" (click)="loadSessionCompliance()">{{ 'Refresh' | t }}</button>
            </div>
          </div>
          <div class="table-responsive" *ngIf="sessionData.length">
            <table class="table">
              <thead><tr><th>{{ 'Day' | t }}</th><th>{{ 'Period' | t }}</th><th>{{ 'Subject' | t }}</th><th>{{ 'Group' | t }}</th><th>{{ 'Teacher' | t }}</th><th>{{ 'Status' | t }}</th><th>{{ 'Submitted At' | t }}</th></tr></thead>
              <tbody>
                <tr *ngFor="let s of sessionData" [class]="getSessionRowClass(s.submissionStatus)">
                  <td>{{ getDayName(s.dayOfWeek) | t }}</td>
                  <td>{{s.periodLabel}}</td>
                  <td>{{s.subjectName}}</td>
                  <td>{{s.groupName}}</td>
                  <td>{{s.teacherName}}</td>
                  <td><span [class]="'badge-' + getSessionBadge(s.submissionStatus)">{{ s.submissionStatus | t }}</span></td>
                  <td>{{s.submittedAt ? (s.submittedAt | date:'short') : '-'}}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="empty-row" *ngIf="!sessionData.length">
            <p>{{ 'No session data. Select a semester and date.' | t }}</p>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- ========== EDIT PERMISSIONS (Admin) ========== -->
    <ng-container *ngIf="mode==='permissions' && isAdmin">
      <div class="card">
        <div class="card-header card-header-warning">
          <h4 class="card-title">{{ 'Edit Permissions' | t }}</h4>
          <p class="card-category">{{ 'Grant or revoke teacher edit access' | t }}</p>
        </div>
        <div class="card-body">
          <div class="filter-row" style="margin-bottom:16px">
            <button class="btn btn-primary btn-sm" (click)="showGrantForm=!showGrantForm">
              {{ (showGrantForm ? 'Cancel' : '+ Grant Permission') | t }}
            </button>
          </div>

          <div *ngIf="showGrantForm" class="card" style="border:1px solid #ccc; padding:16px; margin-bottom:16px">
            <div class="form-grid">
              <div class="form-group">
                <label>{{ 'Teacher Profile ID' | t }}</label>
                <input type="text" [(ngModel)]="grantReq.teacherProfileId" />
              </div>
              <div class="form-group">
                <label>{{ 'Timetable Entry ID (optional)' | t }}</label>
                <input type="text" [(ngModel)]="grantReq.timetableEntryId" />
              </div>
              <div class="form-group">
                <label>{{ 'Valid From' | t }}</label>
                <input type="datetime-local" [(ngModel)]="grantReq.validFrom" />
              </div>
              <div class="form-group">
                <label>{{ 'Valid Until' | t }}</label>
                <input type="datetime-local" [(ngModel)]="grantReq.validUntil" />
              </div>
              <div class="form-group">
                <label>{{ 'Reason' | t }} *</label>
                <input type="text" [(ngModel)]="grantReq.reason" />
              </div>
            </div>
            <button class="btn btn-primary" (click)="grantPermission()" [disabled]="!grantReq.teacherProfileId || !grantReq.reason || submitting">
              {{ 'Grant' | t }}
            </button>
          </div>

          <div class="table-responsive" *ngIf="permissions.length">
            <table class="table">
              <thead><tr><th>{{ 'Teacher' | t }}</th><th>{{ 'Session' | t }}</th><th>{{ 'From' | t }}</th><th>{{ 'Until' | t }}</th><th>{{ 'Granted By' | t }}</th><th>{{ 'Reason' | t }}</th><th>{{ 'Status' | t }}</th><th></th></tr></thead>
              <tbody>
                <tr *ngFor="let p of permissions">
                  <td>{{p.teacherName}}</td>
                  <td>{{ p.sessionLabel || ('All' | t) }}</td>
                  <td>{{p.validFrom | date:'short'}}</td>
                  <td>{{p.validUntil | date:'short'}}</td>
                  <td>{{p.grantedByName}}</td>
                  <td>{{p.reason}}</td>
                  <td>
                    <span *ngIf="p.isRevoked" class="badge-absent">{{ 'Revoked' | t }}</span>
                    <span *ngIf="!p.isRevoked" class="badge-present">{{ 'Active' | t }}</span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-danger" *ngIf="!p.isRevoked" (click)="revokePermission(p.id)">{{ 'Revoke' | t }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="empty-row" *ngIf="!permissions.length">
            <p>{{ 'No edit permissions found.' | t }}</p>
          </div>
        </div>
      </div>
      <div class="alert alert-danger" *ngIf="permissionError">{{permissionError}}</div>
    </ng-container>
  `,
  styles: [`
    :host { display: block; }
    .session-missing { background-color: #fff3f3; }
    .session-late { background-color: #ffffee; }
  `]
})
export class AttendanceComponent implements OnInit {
  // View mode
  records: AttendanceRecordDto[] = [];
  filterDate = '';

  // Tab mode
  mode: 'submit' | 'view' | 'compliance' | 'session' | 'permissions' = 'submit';
  isTeacher = false;
  isSupervisor = false;
  isAdmin = false;
  isManager = false;
  isParent = false;

  // Submit mode (teacher)
  sessionOptions: SessionOption[] = [];
  selectedSessionIdx = -1;
  submitDate = '';
  submitSessionTime = '';
  studentEntries: StudentEntry[] = [];
  statuses = [AttendanceStatus.Present, AttendanceStatus.Absent, AttendanceStatus.Late, AttendanceStatus.Excused];
  submitting = false;
  submitSuccess = false;
  submitError = '';
  alreadySubmitted = false;

  // Edit mode
  editingRecord: AttendanceRecordDto | null = null;
  editStatus: AttendanceStatus = AttendanceStatus.Present;
  editNotes = '';
  editReason = '';
  editError = '';
  loadError = '';

  // Compliance
  complianceData: AttendanceComplianceDto[] = [];
  complianceSemesterId = '';

  // Session compliance
  sessionData: SessionComplianceDto[] = [];
  sessionDate = '';

  // Permissions (Admin)
  permissions: AttendanceEditPermissionDto[] = [];
  showGrantForm = false;
  grantReq: GrantEditPermissionRequest = { teacherProfileId: '', validFrom: '', validUntil: '', reason: '' };
  permissionError = '';

  semesters: any[] = [];

  constructor(
    private attendanceSvc: AttendanceService,
    private assignmentSvc: AssignmentService,
    private timetableSvc: TimetableService,
    private academicSvc: AcademicService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const today = new Date().toISOString().split('T')[0];
    this.filterDate = today;
    this.submitDate = today;
    this.sessionDate = today;

    const role = this.auth.userRole;
    this.isTeacher = role === 'Teacher';
    this.isSupervisor = role === 'TeacherSupervisor';
    this.isAdmin = role === 'SchoolAdmin';
    this.isManager = role === 'SchoolManager';
    this.isParent = role === 'Parent';

    // Set default tab based on role
    if (this.isTeacher) this.mode = 'submit';
    else if (this.isSupervisor) this.mode = 'session';
    else if (this.isAdmin) this.mode = 'view';
    else if (this.isManager) this.mode = 'compliance';
    else if (this.isParent) this.mode = 'view';
    else this.mode = 'view';

    // Load semesters for all roles
    this.academicSvc.getSemesters().subscribe(semesters => {
      this.semesters = semesters;
      const active = semesters.find((s: any) => s.isActive) || semesters[0];
      if (active) this.complianceSemesterId = active.id;
    });

    // Auto-load records for view tab so parents/admin see data immediately
    if (this.mode === 'view') {
      this.loadAttendance();
    }

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
                  const key = `${e.subjectId}_${e.timetableVersionId}_${e.dayOfWeek}_${e.periodDefinitionId}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    const version = versions.find(v => v.id === e.timetableVersionId);
                    // Skip entries whose version isn't visible (no groupId resolvable)
                    if (!version?.groupId) continue;
                    this.sessionOptions.push({
                      label: `${e.subjectName} — ${version.groupName ?? 'Unknown'} — ${e.periodLabel ?? ''} (${e.dayOfWeek})`,
                      subjectId: e.subjectId,
                      groupId: version.groupId,
                      semesterId: activeSemester.id,
                      timetableEntryId: e.id
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

  onSessionChange() {
    this.studentEntries = [];
    this.submitSuccess = false;
    this.submitError = '';
    this.alreadySubmitted = false;
    if (this.selectedSessionIdx < 0) return;

    const session = this.sessionOptions[this.selectedSessionIdx];
    if (!session || !session.groupId) return;

    this.assignmentSvc.getStudentAssignments({
      groupId: session.groupId,
      semesterId: session.semesterId
    }).subscribe(students => {
      this.studentEntries = students
        .filter((s: any) => s.isActive)
        .map((s: any) => ({
          studentProfileId: s.studentProfileId,
          studentName: s.studentName,
          status: AttendanceStatus.Present,
          notes: ''
        }));
      this.checkExistingAttendance();
    });
  }

  checkExistingAttendance() {
    if (this.selectedSessionIdx < 0 || !this.submitDate) return;
    const session = this.sessionOptions[this.selectedSessionIdx];
    if (!session) return;

    this.attendanceSvc.getAttendance(this.submitDate, session.groupId, session.subjectId).subscribe(
      existing => {
        const nonDraft = existing.filter(r => r.submissionStatus !== SubmissionStatus.Draft);
        this.alreadySubmitted = nonDraft.length > 0;
        // If draft records exist, pre-populate entries
        const drafts = existing.filter(r => r.submissionStatus === SubmissionStatus.Draft);
        if (drafts.length > 0 && this.studentEntries.length > 0) {
          for (const d of drafts) {
            const entry = this.studentEntries.find(e => e.studentProfileId === d.studentProfileId);
            if (entry) {
              entry.status = d.status;
              entry.notes = d.notes || '';
            }
          }
        }
      },
      () => { this.alreadySubmitted = false; }
    );
  }

  markAll(status: string) {
    const s = status as AttendanceStatus;
    this.studentEntries.forEach(e => e.status = s);
  }

  submitAttendance(isDraft: boolean) {
    if (this.selectedSessionIdx < 0 || this.studentEntries.length === 0) return;
    const session = this.sessionOptions[this.selectedSessionIdx];
    if (!session) return;

    this.submitting = true;
    this.submitSuccess = false;
    this.submitError = '';

    const request: SubmitAttendanceRequest = {
      subjectId: session.subjectId,
      groupId: session.groupId,
      semesterId: session.semesterId,
      timetableEntryId: session.timetableEntryId,
      date: this.submitDate,
      sessionTime: this.submitSessionTime || undefined,
      isDraft,
      entries: this.studentEntries.map(e => ({
        studentProfileId: e.studentProfileId,
        status: e.status,
        notes: e.notes || undefined
      }))
    };

    this.attendanceSvc.submit(request).subscribe({
      next: () => {
        this.submitting = false;
        this.submitSuccess = true;
        if (!isDraft) this.alreadySubmitted = true;
      },
      error: (err) => {
        this.submitting = false;
        this.submitError = err?.error?.error || err?.error?.message || 'Failed to submit attendance.';
      }
    });
  }

  loadAttendance() {
    this.loadError = '';
    if (!this.filterDate) {
      this.loadError = 'Please select a date.';
      return;
    }
    this.attendanceSvc.getAttendance(this.filterDate).subscribe({
      next: r => this.records = r,
      error: err => {
        this.records = [];
        this.loadError = err?.error?.error || err?.error?.message || 'Failed to load attendance records.';
      }
    });
  }

  // Edit
  startEdit(record: AttendanceRecordDto) {
    this.editingRecord = record;
    this.editStatus = record.status;
    this.editNotes = record.notes || '';
    this.editReason = '';
    this.editError = '';
  }

  saveEdit() {
    if (!this.editingRecord || !this.editReason) return;
    this.submitting = true;
    this.editError = '';
    const req: UpdateAttendanceEntryRequest = {
      attendanceRecordId: this.editingRecord.id,
      status: this.editStatus,
      notes: this.editNotes || undefined,
      editReason: this.editReason
    };
    this.attendanceSvc.update(this.editingRecord.id, req).subscribe({
      next: () => {
        this.submitting = false;
        this.editingRecord = null;
        this.loadAttendance();
      },
      error: (err) => {
        this.submitting = false;
        this.editError = err?.error?.error || err?.error?.message || 'Failed to update attendance.';
      }
    });
  }

  // Compliance
  loadCompliance() {
    if (!this.complianceSemesterId) return;
    this.attendanceSvc.getCompliance(this.complianceSemesterId).subscribe(d => this.complianceData = d);
  }

  // Session compliance
  loadSessionCompliance() {
    if (!this.complianceSemesterId) return;
    this.attendanceSvc.getSessionCompliance(this.complianceSemesterId, this.sessionDate || undefined).subscribe(d => this.sessionData = d);
  }

  // Permissions
  loadPermissions() {
    this.attendanceSvc.getEditPermissions().subscribe(p => this.permissions = p);
  }

  grantPermission() {
    this.permissionError = '';
    this.submitting = true;
    this.attendanceSvc.grantEditPermission(this.grantReq).subscribe({
      next: () => {
        this.submitting = false;
        this.showGrantForm = false;
        this.grantReq = { teacherProfileId: '', validFrom: '', validUntil: '', reason: '' };
        this.loadPermissions();
      },
      error: (err) => {
        this.submitting = false;
        this.permissionError = err?.error?.error || 'Failed to grant permission.';
      }
    });
  }

  revokePermission(id: string) {
    this.attendanceSvc.revokeEditPermission(id).subscribe(() => this.loadPermissions());
  }

  // Helpers
  getSubmissionBadge(status: string): string {
    switch (status) {
      case 'Submitted': return 'present';
      case 'SubmittedLate': return 'late';
      case 'Updated': return 'excused';
      case 'Draft': return 'absent';
      default: return 'absent';
    }
  }

  getSessionBadge(status: string): string {
    switch (status) {
      case 'Submitted': return 'present';
      case 'SubmittedLate': return 'late';
      case 'Missing': return 'absent';
      case 'Pending': return 'excused';
      default: return 'absent';
    }
  }

  getSessionRowClass(status: string): string {
    if (status === 'Missing') return 'session-missing';
    if (status === 'SubmittedLate') return 'session-late';
    return '';
  }

  getDayName(day: number): string {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day] || '';
  }
}
