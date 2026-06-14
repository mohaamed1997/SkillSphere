import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { DashboardService } from '@core/services/data.service';
import { AdminDashboardDto, ManagerDashboardDto, TeacherDashboardDto, SupervisorDashboardDto, ParentDashboardDto } from '@core/models';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ProgressRingComponent, ProgressRingSegment } from '../shared/progress-ring/progress-ring.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ProgressRingComponent],
  template: `
    <!-- Admin / SuperAdmin Dashboard -->
    <div *ngIf="auth.userRole === 'SchoolAdmin' || auth.userRole === 'PlatformSuperAdmin'">
      <div class="row">
        <div class="col-md-3">
          <div class="card card-stats stat-blue">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">person</i></div>
              <p class="card-category">{{ 'Teachers' | t }}</p>
              <h3 class="card-title">{{ adminData?.totalTeachers || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">school</i> {{ 'Active staff members' | t }}</div></div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card card-stats stat-mint">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">people</i></div>
              <p class="card-category">{{ 'Students' | t }}</p>
              <h3 class="card-title">{{ adminData?.totalStudents || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">groups</i> {{ 'Enrolled students' | t }}</div></div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card card-stats stat-peach">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">family_restroom</i></div>
              <p class="card-category">{{ 'Parents' | t }}</p>
              <h3 class="card-title">{{ adminData?.totalParents || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">verified_user</i> {{ 'Registered parents' | t }}</div></div>
          </div>
        </div>
        <div class="col-md-3" *ngIf="(adminData?.openEscalations || 0) > 0">
          <div class="card card-stats stat-pink">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">warning</i></div>
              <p class="card-category">{{ 'Open Escalations' | t }}</p>
              <h3 class="card-title">{{ adminData?.openEscalations }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">priority_high</i> {{ 'Requires attention' | t }}</div></div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-md-4">
          <div class="card">
            <div class="card-header">
              <div>
                <h4 class="card-title">{{ 'User Composition' | t }}</h4>
                <p class="card-category">{{ 'Across your school' | t }}</p>
              </div>
            </div>
            <div class="card-body composition-body">
              <app-progress-ring [segments]="compositionSegments" [centerLabel]="compositionTotal + ''" [centerCaption]="'Total' | t"></app-progress-ring>
              <div class="composition-legend">
                <div class="legend-item">
                  <span class="legend-dot" style="background:#4f6fd6"></span>
                  <span class="legend-value">{{ pct(adminData?.totalTeachers || 0) }}%</span>
                  <span class="legend-label">{{ 'Teachers' | t }}</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot" style="background:#7c9a5e"></span>
                  <span class="legend-value">{{ pct(adminData?.totalStudents || 0) }}%</span>
                  <span class="legend-label">{{ 'Students' | t }}</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot" style="background:#c2693a"></span>
                  <span class="legend-value">{{ pct(adminData?.totalParents || 0) }}%</span>
                  <span class="legend-label">{{ 'Parents' | t }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-4" *ngIf="adminData?.unresolvedInternalReports">
          <div class="card card-stats stat-lavender">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">report_problem</i></div>
              <p class="card-category">{{ 'Unresolved Reports' | t }}</p>
              <h3 class="card-title">{{ adminData?.unresolvedInternalReports }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">pending_actions</i> {{ 'Awaiting resolution' | t }}</div></div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card card-stats stat-tan">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">notifications_active</i></div>
              <p class="card-category">{{ 'Notifications' | t }}</p>
              <h3 class="card-title">{{ adminData?.notificationStatus?.delivered || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">check_circle</i> {{ 'Delivered' | t }}</div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Manager Dashboard -->
    <div *ngIf="auth.userRole === 'SchoolManager'">
      <div class="row">
        <div class="col-md-3">
          <div class="card card-stats" [ngClass]="(managerData?.missingAttendance || 0) > 0 ? 'stat-pink' : 'stat-mint'">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">fact_check</i></div>
              <p class="card-category">{{ 'Missing Attendance' | t }}</p>
              <h3 class="card-title">{{ managerData?.missingAttendance || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">today</i> {{ "Today's records" | t }}</div></div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card card-stats" [ngClass]="(managerData?.missingWeeklyReports || 0) > 0 ? 'stat-peach' : 'stat-mint'">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">summarize</i></div>
              <p class="card-category">{{ 'Missing Reports' | t }}</p>
              <h3 class="card-title">{{ managerData?.missingWeeklyReports || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">pending</i> {{ 'Weekly reports due' | t }}</div></div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card card-stats stat-blue">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">schedule</i></div>
              <p class="card-category">{{ 'Timetable Conflicts' | t }}</p>
              <h3 class="card-title">{{ managerData?.timetableConflicts || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">event_busy</i> {{ 'Scheduling issues' | t }}</div></div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card card-stats" [ngClass]="(managerData?.studentRiskQueue || 0) > 0 ? 'stat-pink' : 'stat-mint'">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">health_and_safety</i></div>
              <p class="card-category">{{ 'Students at Risk' | t }}</p>
              <h3 class="card-title">{{ managerData?.studentRiskQueue || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">monitor_heart</i> {{ 'Requires follow-up' | t }}</div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Teacher Dashboard -->
    <div *ngIf="auth.userRole === 'Teacher'">
      <div class="row">
        <div class="col-md-3">
          <div class="card card-stats stat-blue">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">event</i></div>
              <p class="card-category">{{ "Today's Sessions" | t }}</p>
              <h3 class="card-title">{{ teacherData?.todaySessions?.length || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">schedule</i> {{ 'Scheduled today' | t }}</div></div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card card-stats" [ngClass]="(teacherData?.attendanceTasksDue || 0) > 0 ? 'stat-pink' : 'stat-mint'">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">checklist</i></div>
              <p class="card-category">{{ 'Attendance Due' | t }}</p>
              <h3 class="card-title">{{ teacherData?.attendanceTasksDue || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">pending_actions</i> {{ 'Awaiting submission' | t }}</div></div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card card-stats stat-peach">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">description</i></div>
              <p class="card-category">{{ 'Reports Due' | t }}</p>
              <h3 class="card-title">{{ teacherData?.weeklyReportTasksDue || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">edit_note</i> {{ 'Weekly reports pending' | t }}</div></div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card card-stats stat-lavender">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">people</i></div>
              <p class="card-category">{{ 'My Students' | t }}</p>
              <h3 class="card-title">{{ teacherData?.totalAssignedStudents || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">school</i> {{ 'Assigned students' | t }}</div></div>
          </div>
        </div>
      </div>

      <!-- Today's Schedule -->
      <div class="row" *ngIf="teacherData?.todaySessions?.length">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header card-header-primary">
              <h4 class="card-title">{{ "Today's Schedule" | t }}</h4>
              <p class="card-category">{{ 'Your sessions for today' | t }}</p>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table">
                  <thead><tr><th>{{ 'Time' | t }}</th><th>{{ 'Subject' | t }}</th><th>{{ 'Class' | t }}</th><th>{{ 'Room' | t }}</th><th>{{ 'Attendance' | t }}</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let s of teacherData!.todaySessions">
                      <td>{{ s.startTime }} - {{ s.endTime }}</td>
                      <td>{{ s.subjectName }}</td>
                      <td>{{ s.gradeName }} {{ s.groupName }}</td>
                      <td>{{ s.roomName || '-' }}</td>
                      <td><span [class]="s.attendanceSubmitted ? 'badge badge-success' : 'badge badge-warning'">{{ (s.attendanceSubmitted ? 'Done' : 'Pending') | t }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Supervisor Dashboard -->
    <div *ngIf="auth.userRole === 'TeacherSupervisor'">
      <div class="row">
        <div class="col-md-4">
          <div class="card card-stats" [ngClass]="(supervisorData?.internalReportsInbox || 0) > 0 ? 'stat-pink' : 'stat-mint'">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">inbox</i></div>
              <p class="card-category">{{ 'Reports Inbox' | t }}</p>
              <h3 class="card-title">{{ supervisorData?.internalReportsInbox || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">mail</i> {{ 'Pending review' | t }}</div></div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card card-stats stat-peach">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">gpp_maybe</i></div>
              <p class="card-category">{{ 'Compliance Alerts' | t }}</p>
              <h3 class="card-title">{{ supervisorData?.complianceAlerts || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">policy</i> {{ 'Policy alerts' | t }}</div></div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card card-stats stat-blue">
            <div class="card-header card-header-icon">
              <div class="card-icon"><i class="material-icons">trending_up</i></div>
              <p class="card-category">{{ 'Trending Students' | t }}</p>
              <h3 class="card-title">{{ supervisorData?.trendingStudents?.length || 0 }}</h3>
            </div>
            <div class="card-footer"><div class="stats"><i class="material-icons">analytics</i> {{ 'Multiple reports' | t }}</div></div>
          </div>
        </div>
      </div>

      <!-- Trending Students Table -->
      <div class="row" *ngIf="supervisorData?.trendingStudents?.length">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header card-header-warning">
              <h4 class="card-title">{{ 'Trending Students' | t }}</h4>
              <p class="card-category">{{ 'Students with multiple reports' | t }}</p>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table">
                  <thead><tr><th>{{ 'Student' | t }}</th><th>{{ 'Report Count' | t }}</th><th>{{ 'Latest Category' | t }}</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let s of supervisorData!.trendingStudents">
                      <td>{{ s.studentName }}</td>
                      <td>{{ s.reportCount }}</td>
                      <td>{{ s.latestCategory }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Parent Dashboard -->
    <div *ngIf="auth.userRole === 'Parent'">
      <div class="row">
        <div class="col-md-4" *ngFor="let child of parentData?.studentCards || []">
          <div class="card">
            <div class="card-header card-header-info">
              <h4 class="card-title">{{ child.studentName }}</h4>
              <p class="card-category">{{ child.gradeName }} - {{ child.groupName }}</p>
            </div>
            <div class="card-body">
              <div class="child-stats-row">
                <div class="child-stat">
                  <span class="stat-value">{{ child.totalWeeklyReports }}</span>
                  <span class="stat-label">{{ 'Reports' | t }}</span>
                </div>
                <div class="child-stat">
                  <span class="stat-value">{{ child.averageGrade ? (child.averageGrade | number:'1.0-1') : 'N/A' }}</span>
                  <span class="stat-label">{{ 'Avg Score' | t }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Student Dashboard -->
    <div *ngIf="auth.userRole === 'Student'">
      <div class="row">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header card-header-primary">
              <h4 class="card-title">{{ 'Student Portal' | t }}</h4>
              <p class="card-category">{{ 'Your learning hub' | t }}</p>
            </div>
            <div class="card-body">
              <p>{{ 'Welcome to your student dashboard. Check your weekly reports and attendance from the navigation menu.' | t }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div *ngIf="loading" class="row">
      <div class="col-md-12">
        <div class="card"><div class="card-body"><p class="text-muted">{{ 'Loading dashboard data...' | t }}</p></div></div>
      </div>
    </div>
  `,
  styles: [`
    .child-stats-row { display: flex; gap: 2rem; justify-content: center; padding: 1rem 0; }
    .child-stat { text-align: center; }
    .child-stat .stat-value { display: block; font-size: 1.75rem; font-weight: 300; color: #3c4858; }
    .child-stat .stat-label { font-size: 0.75rem; color: #999; text-transform: uppercase; letter-spacing: 0.3px; }

    .composition-body { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
    .composition-legend { display: flex; flex-direction: column; gap: 10px; }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-value { font-weight: 700; color: var(--gray-900); min-width: 36px; }
    .legend-label { color: var(--gray-500); }
  `]
})
export class DashboardComponent implements OnInit {
  adminData: AdminDashboardDto | null = null;
  managerData: ManagerDashboardDto | null = null;
  teacherData: TeacherDashboardDto | null = null;
  supervisorData: SupervisorDashboardDto | null = null;
  parentData: ParentDashboardDto | null = null;
  loading = false;

  constructor(public auth: AuthService, private dashboardService: DashboardService) {}

  get compositionSegments(): ProgressRingSegment[] {
    return [
      { value: this.adminData?.totalTeachers || 0, color: '#4f6fd6', label: 'Teachers' },
      { value: this.adminData?.totalStudents || 0, color: '#7c9a5e', label: 'Students' },
      { value: this.adminData?.totalParents || 0, color: '#c2693a', label: 'Parents' },
    ];
  }

  get compositionTotal(): number {
    return (this.adminData?.totalTeachers || 0) + (this.adminData?.totalStudents || 0) + (this.adminData?.totalParents || 0);
  }

  pct(value: number): number {
    const total = this.compositionTotal;
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  ngOnInit(): void {
    const role = this.auth.userRole;
    const profileId = this.auth.profileId;
    this.loading = true;

    if (role === 'SchoolAdmin' || role === 'PlatformSuperAdmin') {
      this.dashboardService.getAdminDashboard().subscribe({
        next: d => { this.adminData = d; this.loading = false; },
        error: () => this.loading = false
      });
    } else if (role === 'SchoolManager') {
      this.dashboardService.getManagerDashboard().subscribe({
        next: d => { this.managerData = d; this.loading = false; },
        error: () => this.loading = false
      });
    } else if (role === 'Teacher' && profileId) {
      this.dashboardService.getTeacherDashboard(profileId).subscribe({
        next: d => { this.teacherData = d; this.loading = false; },
        error: () => this.loading = false
      });
    } else if (role === 'TeacherSupervisor' && profileId) {
      this.dashboardService.getSupervisorDashboard(profileId).subscribe({
        next: d => { this.supervisorData = d; this.loading = false; },
        error: () => this.loading = false
      });
    } else if (role === 'Parent' && profileId) {
      this.dashboardService.getParentDashboard(profileId).subscribe({
        next: d => { this.parentData = d; this.loading = false; },
        error: () => this.loading = false
      });
    } else {
      this.loading = false;
    }
  }
}
