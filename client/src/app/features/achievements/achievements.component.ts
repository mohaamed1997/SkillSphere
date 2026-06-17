import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { GradesService, DashboardService } from '@core/services/data.service';
import {
  GradeRecordDto, BehaviorFeedbackDto,
  TeacherDashboardDto, StudentCardDto
} from '@core/models';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ProgressRingComponent, ProgressRingSegment } from '../shared/progress-ring/progress-ring.component';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum';
type CardColor = 'peach' | 'blue' | 'mint' | 'lavender' | 'tan';

interface Achievement {
  id: string;
  icon: string;
  color: CardColor;
  badgeLevel: BadgeLevel;
  title: string;
  story: string;
  metric: string;
  isTop?: boolean;
}

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ProgressRingComponent],
  template: `
    <!-- Loading skeleton -->
    <div *ngIf="loading" class="skeleton-grid">
      <div class="skeleton-card" *ngFor="let n of [1,2,3,4,5,6]"></div>
    </div>

    <ng-container *ngIf="!loading">

      <!-- ── Hero header ── -->
      <div class="achievements-hero" [ngClass]="heroBgClass">
        <div class="confetti" aria-hidden="true">
          <span *ngFor="let n of confettiDots" class="confetti-dot" [style]="n.style"></span>
        </div>
        <div class="hero-body">
          <span class="hero-role-tag">
            {{ heroRoleIcon }}&nbsp;{{ heroRoleTagText | t }}
          </span>
          <h2 class="hero-title">
            {{ heroTitle }}
          </h2>
          <p class="hero-subtitle">{{ heroSubtitle | t }}</p>

          <!-- Student level badge -->
          <div class="level-badge badge-{{ studentLevel }}" *ngIf="role === 'Student' && overallGpa > 0">
            {{ levelIcon }} {{ studentLevel | titlecase }} {{ 'Learner' | t }}
            <span class="level-gpa">{{ overallGpa | number:'1.0-1' }}%</span>
          </div>
        </div>

        <!-- Student GPA ring -->
        <div class="hero-ring" *ngIf="role === 'Student' && overallGpa > 0">
          <app-progress-ring
            [segments]="gpaSegments"
            [size]="130"
            [strokeWidth]="13"
            [centerLabel]="(overallGpa | number:'1.0-0') + '%'"
            [centerCaption]="'GPA' | t">
          </app-progress-ring>
        </div>
      </div>

      <!-- ── Parent: child tabs ── -->
      <div class="child-tabs" *ngIf="role === 'Parent' && studentCards.length > 1">
        <button
          *ngFor="let sc of studentCards"
          class="child-tab"
          [class.active]="selectedStudentId === sc.studentProfileId"
          (click)="selectStudent(sc.studentProfileId)">
          <span class="child-avatar">{{ initials(sc.studentName) }}</span>
          {{ sc.studentName }}
        </button>
      </div>

      <!-- ── Parent: current child header ── -->
      <div class="child-header-card" *ngIf="role === 'Parent' && currentCard">
        <div class="child-avatar large">{{ initials(currentCard.studentName) }}</div>
        <div class="child-info">
          <h3>{{ currentCard.studentName }}</h3>
          <p>{{ currentCard.gradeName }} · {{ currentCard.groupName }}</p>
        </div>
        <div class="child-avg-badge" *ngIf="currentCard.averageGrade">
          <span class="avg-label">{{ 'Avg Score' | t }}</span>
          <span class="avg-value">{{ currentCard.averageGrade | number:'1.0-1' }}%</span>
        </div>
      </div>

      <!-- ── Achievement cards ── -->
      <div class="achievements-grid" *ngIf="achievements.length > 0">
        <div
          *ngFor="let a of achievements; let i = index"
          class="achievement-card stat-{{ a.color }}"
          [class.achievement-top]="a.isTop"
          [style.animation-delay.ms]="i * 70">

          <div class="ach-header">
            <span class="ach-icon">{{ a.icon }}</span>
            <span class="badge-pill badge-{{ a.badgeLevel }}">
              {{ a.badgeLevel | titlecase }}
            </span>
          </div>

          <div class="ach-metric">{{ a.metric }}</div>
          <h3 class="ach-title">{{ a.title }}</h3>
          <p class="ach-story">{{ a.story }}</p>

          <div class="ach-shine" *ngIf="a.isTop" aria-hidden="true"></div>
        </div>
      </div>

      <!-- ── Empty state ── -->
      <div class="empty-state" *ngIf="achievements.length === 0">
        <div class="empty-icon">🌱</div>
        <h3>{{ 'Your story is just beginning!' | t }}</h3>
        <p>{{ emptyMessage | t }}</p>
      </div>

    </ng-container>
  `,
  styles: [`
    /* ── Skeleton ── */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      padding: 8px 0 24px;
    }
    .skeleton-card {
      height: 180px;
      border-radius: var(--radius-xl);
      background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
      background-size: 400% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer {
      0%   { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    /* ── Hero ── */
    .achievements-hero {
      border-radius: var(--radius-xl);
      padding: 32px 36px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      position: relative;
      overflow: hidden;
      animation: fadeDown 0.45s ease-out;
    }
    .hero-mint  { background: var(--pastel-mint); }
    .hero-blue  { background: var(--pastel-blue); }
    .hero-tan   { background: var(--pastel-tan); }

    .hero-body { flex: 1; position: relative; z-index: 1; }

    .hero-role-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--gray-600);
      margin-bottom: 10px;
    }

    .hero-title {
      font-size: 1.625rem;
      font-weight: 800;
      color: var(--gray-900);
      margin: 0 0 8px;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }

    .hero-subtitle {
      font-size: 0.9375rem;
      color: var(--gray-600);
      margin: 0 0 14px;
      line-height: 1.5;
    }

    .level-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: var(--radius-pill);
      font-size: 13px;
      font-weight: 700;
    }
    .level-badge.badge-platinum { background: #ede9fe; color: #6d28d9; }
    .level-badge.badge-gold     { background: #fef3c7; color: #b45309; }
    .level-badge.badge-silver   { background: var(--gray-100); color: var(--gray-700); }
    .level-badge.badge-bronze   { background: #fde8d0; color: #9a3412; }

    .level-gpa {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 20px;
      background: rgba(255,255,255,0.5);
    }

    .hero-ring {
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    /* Confetti burst */
    .confetti {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .confetti-dot {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: floatUp 3s ease-in-out infinite;
    }
    @keyframes floatUp {
      0%   { transform: translateY(0) scale(1); opacity: 0.6; }
      100% { transform: translateY(-60px) scale(0.5); opacity: 0; }
    }

    /* ── Child tabs ── */
    .child-tabs {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .child-tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border: 2px solid var(--border-color);
      border-radius: var(--radius-pill);
      background: var(--surface);
      font-size: 13px;
      font-weight: 600;
      color: var(--gray-600);
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;

      &.active {
        border-color: var(--primary);
        background: var(--primary);
        color: white;
        .child-avatar { background: rgba(255,255,255,0.25); color: white; }
      }
    }

    .child-avatar {
      width: 26px; height: 26px;
      border-radius: 50%;
      background: var(--pastel-blue);
      color: var(--pastel-blue-fg);
      font-size: 11px;
      font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;

      &.large {
        width: 52px; height: 52px;
        font-size: 18px;
      }
    }

    /* ── Child header card ── */
    .child-header-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--surface);
      border-radius: var(--radius-xl);
      padding: 18px 24px;
      margin-bottom: 20px;
      box-shadow: var(--shadow-sm);
    }
    .child-info {
      flex: 1;
      h3 { margin: 0; font-size: 1.0625rem; font-weight: 700; color: var(--gray-900); }
      p  { margin: 4px 0 0; font-size: 13px; color: var(--gray-500); }
    }
    .child-avg-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--pastel-mint);
      border-radius: var(--radius-lg);
      padding: 8px 16px;
    }
    .avg-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: var(--pastel-mint-fg); letter-spacing: 0.5px; }
    .avg-value { font-size: 1.25rem; font-weight: 800; color: var(--gray-900); }

    /* ── Achievement grid ── */
    .achievements-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      padding-bottom: 24px;
    }

    /* Each card is built on top of the existing .card.card-stats pastel system */
    .achievement-card {
      border-radius: var(--radius-xl);
      padding: 24px;
      position: relative;
      overflow: hidden;
      box-shadow: none;
      animation: cardPop 0.4s ease-out both;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: default;

      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));
      }

      &.achievement-top {
        grid-column: span 1;
        border: 2px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 0 4px rgba(255,255,255,0.4), 0 8px 24px rgba(0,0,0,0.1);
      }
    }

    /* pastel backgrounds via existing token system */
    .stat-peach   { background: var(--pastel-peach); }
    .stat-blue    { background: var(--pastel-blue); }
    .stat-mint    { background: var(--pastel-mint); }
    .stat-lavender{ background: var(--pastel-lavender); }
    .stat-tan     { background: var(--pastel-tan); }

    .ach-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .ach-icon {
      font-size: 1.875rem;
      line-height: 1;
    }

    /* Badge level pills */
    .badge-pill {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 3px 10px;
      border-radius: 20px;
    }
    .badge-pill.badge-platinum { background: #ede9fe; color: #6d28d9; }
    .badge-pill.badge-gold     { background: #fef3c7; color: #b45309; }
    .badge-pill.badge-silver   { background: var(--gray-200); color: var(--gray-600); }
    .badge-pill.badge-bronze   { background: #fde8d0; color: #9a3412; }

    .ach-metric {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--gray-900);
      letter-spacing: -0.03em;
      line-height: 1;
      margin-bottom: 6px;
    }

    .ach-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--gray-800);
      margin: 0 0 8px;
    }

    .ach-story {
      font-size: 0.8125rem;
      color: var(--gray-600);
      line-height: 1.55;
      margin: 0;
    }

    /* Shine overlay on top card */
    .ach-shine {
      position: absolute;
      top: -40%;
      right: -20%;
      width: 120px;
      height: 120px;
      background: rgba(255,255,255,0.25);
      border-radius: 50%;
      pointer-events: none;
    }

    /* ── Empty state ── */
    .empty-state {
      text-align: center;
      padding: 64px 24px;
      color: var(--gray-500);

      .empty-icon { font-size: 3.5rem; margin-bottom: 16px; }
      h3 { font-size: 1.125rem; font-weight: 700; color: var(--gray-700); margin: 0 0 8px; }
      p  { font-size: 0.9375rem; margin: 0; max-width: 380px; margin-inline: auto; line-height: 1.6; }
    }

    /* ── Animations ── */
    @keyframes fadeDown {
      from { opacity: 0; transform: translateY(-12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes cardPop {
      from { opacity: 0; transform: translateY(16px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ── RTL ── */
    :host-context([dir="rtl"]) {
      .ach-shine { right: auto; left: -20%; }
    }

    /* ── Responsive ── */
    @media (max-width: 600px) {
      .achievements-hero { flex-direction: column; align-items: flex-start; padding: 24px; }
      .hero-ring { align-self: flex-end; }
      .achievements-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AchievementsComponent implements OnInit {
  loading = true;
  role = '';
  achievements: Achievement[] = [];
  studentCards: StudentCardDto[] = [];
  selectedStudentId = '';
  overallGpa = 0;
  studentLevel: BadgeLevel = 'bronze';
  levelIcon = '🥉';
  gpaSegments: ProgressRingSegment[] = [];
  heroTitle = '';
  heroSubtitle = '';
  emptyMessage = 'Complete assessments and assignments to unlock your first achievement.';
  confettiDots: { style: string }[] = [];

  get currentCard(): StudentCardDto | undefined {
    return this.studentCards.find(s => s.studentProfileId === this.selectedStudentId);
  }

  get heroRoleIcon(): string {
    return this.role === 'Student' ? '\u{1F393}' : this.role === 'Parent' ? '\u{1F3C6}' : '✨';
  }

  get heroRoleTagText(): string {
    if (this.role === 'Student') return 'Your Learning Journey';
    if (this.role === 'Parent') return "Your Child's Story";
    return 'Your Teaching Impact';
  }

  get heroBgClass(): string {
    return this.role === 'Student' ? 'hero-mint' : this.role === 'Parent' ? 'hero-blue' : 'hero-tan';
  }

  constructor(public auth: AuthService, private dashSvc: DashboardService, private gradesSvc: GradesService) {}

  ngOnInit(): void {
    this.role = this.auth.userRole ?? '';
    this.heroTitle = `${this.auth.currentUser?.user?.fullName ?? ''}'s ${
      this.role === 'Teacher' ? 'Impact Report' : 'Achievements'
    }`;
    this.spawnConfetti();

    if (this.role === 'Parent') {
      this.heroSubtitle = 'Every step forward is worth celebrating.';
      this.emptyMessage = 'Your child\'s achievements will appear here as they progress through the semester.';
      this.loadParentAchievements();
    } else if (this.role === 'Student') {
      this.heroSubtitle = 'Your effort, your growth, your story.';
      this.emptyMessage = 'Complete assessments and assignments to unlock your first achievement.';
      this.loadStudentAchievements();
    } else {
      this.heroTitle = `Your Teaching Impact`;
      this.heroSubtitle = 'See the difference you\'re making in your students\' lives.';
      this.emptyMessage = 'Record grade assessments and behavior feedback to track your teaching impact.';
      this.loadTeacherAchievements();
    }
  }

  private loadParentAchievements(): void {
    if (!this.auth.profileId) { this.loading = false; return; }

    this.dashSvc.getParentDashboard(this.auth.profileId).pipe(
      switchMap(dash => {
        this.studentCards = dash.studentCards ?? [];
        if (this.studentCards.length === 0) { return of([]); }
        this.selectedStudentId = this.studentCards[0].studentProfileId;

        return forkJoin(
          this.studentCards.map(sc =>
            this.gradesSvc.getRecords({ studentProfileId: sc.studentProfileId })
              .pipe(catchError(() => of([] as GradeRecordDto[])))
          )
        );
      }),
      catchError(() => of([]))
    ).subscribe((gradesByStudent: GradeRecordDto[][]) => {
      this.computeAchievementsForSelectedStudent(gradesByStudent);
      this.loading = false;
    });
  }

  private computeAchievementsForSelectedStudent(gradesByStudent: GradeRecordDto[][]): void {
    const idx = this.studentCards.findIndex(s => s.studentProfileId === this.selectedStudentId);
    const grades = gradesByStudent[idx] ?? [];
    const card = this.studentCards[idx];
    if (card) {
      this.achievements = this.computeParentAchievements(card.studentName, grades, card.averageGrade ?? null);
    }
    this.storedGradesByStudent = gradesByStudent;
  }

  private storedGradesByStudent: GradeRecordDto[][] = [];

  selectStudent(id: string): void {
    this.selectedStudentId = id;
    this.computeAchievementsForSelectedStudent(this.storedGradesByStudent);
  }

  private loadStudentAchievements(): void {
    if (!this.auth.profileId) { this.loading = false; return; }

    this.gradesSvc.getRecords({ studentProfileId: this.auth.profileId })
      .pipe(catchError(() => of([] as GradeRecordDto[])))
      .subscribe(grades => {
        this.achievements = this.computeStudentAchievements(grades);
        this.loading = false;
      });
  }

  private loadTeacherAchievements(): void {
    if (!this.auth.profileId) { this.loading = false; return; }

    forkJoin([
      this.dashSvc.getTeacherDashboard(this.auth.profileId)
        .pipe(catchError(() => of(null as TeacherDashboardDto | null))),
      this.gradesSvc.getRecords({ teacherProfileId: this.auth.profileId })
        .pipe(catchError(() => of([] as GradeRecordDto[]))),
      this.gradesSvc.getBehavior({ teacherProfileId: this.auth.profileId })
        .pipe(catchError(() => of([] as BehaviorFeedbackDto[]))),
    ]).subscribe(([teacherData, grades, behavior]) => {
      this.achievements = this.computeTeacherAchievements(teacherData, grades, behavior);
      this.loading = false;
    });
  }

  // ── Achievement engines ──────────────────────────────────────────────────

  private computeParentAchievements(studentName: string, grades: GradeRecordDto[], avgGrade: number | null): Achievement[] {
    const achs: Achievement[] = [];
    const bySubject = this.groupBy(grades.filter(g => g.score != null), g => g.subjectId);

    // Overall performance achievement (from dashboard averageGrade)
    const overall = avgGrade ?? (grades.length ? this.avgPct(grades) : 0);
    if (overall > 0) {
      const lvl = this.levelFor(overall);
      achs.push({
        id: 'overall',
        icon: lvl === 'platinum' ? '🏆' : lvl === 'gold' ? '🥇' : lvl === 'silver' ? '🥈' : '🥉',
        color: 'tan', badgeLevel: lvl,
        title: 'Overall Performance',
        story: `${studentName} has an overall academic average of ${overall.toFixed(1)}% this semester — ${lvl === 'platinum' ? 'absolutely outstanding!' : lvl === 'gold' ? 'excellent work!' : lvl === 'silver' ? 'great progress!' : 'steadily growing!'}`,
        metric: `${overall.toFixed(1)}%`,
        isTop: true,
      });
    }

    // Subject excellence
    for (const records of Object.values(bySubject)) {
      const pct = this.avgPct(records);
      const name = records[0].subjectName;
      if (pct >= 90) {
        achs.push({ id: `exc-${name}`, icon: '🌟', color: 'mint', badgeLevel: 'platinum',
          title: `${name} Excellence`, metric: `${pct.toFixed(0)}%`,
          story: `${studentName} achieved an outstanding ${pct.toFixed(0)}% average in ${name} — exceptional mastery of this subject!` });
      } else if (pct >= 80) {
        achs.push({ id: `exc-${name}`, icon: '⭐', color: 'blue', badgeLevel: 'gold',
          title: `${name} Star`, metric: `${pct.toFixed(0)}%`,
          story: `${studentName} is excelling in ${name} with an ${pct.toFixed(0)}% average — great academic engagement!` });
      }
    }

    // Grade improvement per subject
    let bestImprovement = 0;
    for (const records of Object.values(bySubject)) {
      if (records.length < 2) continue;
      const sorted = [...records].sort((a, b) => new Date(a.recordedDate).getTime() - new Date(b.recordedDate).getTime());
      const firstPct = this.pctOf(sorted[0]);
      const lastPct  = this.pctOf(sorted[sorted.length - 1]);
      const diff = lastPct - firstPct;
      if (diff >= 8 && diff > bestImprovement) {
        bestImprovement = diff;
        const lvl: BadgeLevel = diff >= 25 ? 'platinum' : diff >= 18 ? 'gold' : 'silver';
        achs.push({ id: `imp-${records[0].subjectId}`, icon: '📈', color: 'peach', badgeLevel: lvl,
          title: `${records[0].subjectName} Breakthrough`,
          metric: `+${diff.toFixed(0)}pts`,
          story: `${studentName} improved their ${records[0].subjectName} score from ${firstPct.toFixed(0)}% to ${lastPct.toFixed(0)}% — a ${diff.toFixed(0)}-point improvement this semester!` });
      }
    }

    // Assessment milestone
    if (grades.length >= 5) {
      const lvl: BadgeLevel = grades.length >= 20 ? 'gold' : grades.length >= 10 ? 'silver' : 'bronze';
      achs.push({ id: 'total-assessments', icon: '📝', color: 'lavender', badgeLevel: lvl,
        title: 'Consistent Learner',
        metric: `${grades.length} assessments`,
        story: `${studentName} has completed ${grades.length} assessments this semester — demonstrating dedication and engagement across all subjects.` });
    }

    // Multi-subject engagement
    const subjectCount = Object.keys(bySubject).length;
    if (subjectCount >= 3) {
      achs.push({ id: 'multi-subject', icon: '🎯', color: 'blue', badgeLevel: subjectCount >= 5 ? 'gold' : 'silver',
        title: 'Well-Rounded Student',
        metric: `${subjectCount} subjects`,
        story: `${studentName} has active academic records across ${subjectCount} subjects — showing broad intellectual curiosity and engagement.` });
    }

    return achs;
  }

  private computeStudentAchievements(grades: GradeRecordDto[]): Achievement[] {
    const achs: Achievement[] = [];
    const withScores = grades.filter(g => g.score != null);
    const allPcts = withScores.map(g => this.pctOf(g));

    this.overallGpa = allPcts.length ? allPcts.reduce((a, b) => a + b, 0) / allPcts.length : 0;
    this.studentLevel = this.levelFor(this.overallGpa);
    this.levelIcon = this.studentLevel === 'platinum' ? '💎' : this.studentLevel === 'gold' ? '🥇' : this.studentLevel === 'silver' ? '🥈' : '🥉';

    // GPA ring
    if (this.overallGpa > 0) {
      this.gpaSegments = [{
        value: this.overallGpa,
        color: this.studentLevel === 'platinum' ? '#7c3aed' : this.studentLevel === 'gold' ? '#f59e0b' : this.studentLevel === 'silver' ? '#64748b' : '#cd7f32',
      }, { value: 100 - this.overallGpa, color: 'rgba(0,0,0,0.06)' }];

      achs.push({ id: 'gpa', icon: this.levelIcon, color: 'tan', badgeLevel: this.studentLevel,
        title: `${this.studentLevel.charAt(0).toUpperCase() + this.studentLevel.slice(1)} Learner`,
        metric: `${this.overallGpa.toFixed(1)}%`,
        isTop: true,
        story: `Your overall academic average is ${this.overallGpa.toFixed(1)}% — ${this.studentLevel === 'platinum' ? 'absolutely outstanding! You\'re in the top tier!' : this.studentLevel === 'gold' ? 'excellent work! Keep pushing higher!' : this.studentLevel === 'silver' ? 'great progress! You\'re on the right track!' : 'every point counts — keep going!'}` });
    }

    const bySubject = this.groupBy(withScores, g => g.subjectId);

    // Best subject star
    let bestSubject = ''; let bestPct = 0;
    for (const records of Object.values(bySubject)) {
      const p = this.avgPct(records);
      if (p > bestPct) { bestPct = p; bestSubject = records[0].subjectName; }
    }
    if (bestSubject && bestPct >= 75) {
      achs.push({ id: 'best-subject', icon: '⭐', color: 'blue',
        badgeLevel: this.levelFor(bestPct),
        title: `${bestSubject} Champion`,
        metric: `${bestPct.toFixed(0)}%`,
        story: `You're performing best in ${bestSubject} with an average of ${bestPct.toFixed(0)}%. Your dedication to this subject really shows — keep it up!` });
    }

    // Biggest improvement
    let biggestDiff = 0; let impSubject = ''; let fromP = 0; let toP = 0;
    for (const records of Object.values(bySubject)) {
      if (records.length < 2) continue;
      const sorted = [...records].sort((a, b) => new Date(a.recordedDate).getTime() - new Date(b.recordedDate).getTime());
      const f = this.pctOf(sorted[0]), l = this.pctOf(sorted[sorted.length - 1]);
      if (l - f > biggestDiff) { biggestDiff = l - f; impSubject = records[0].subjectName; fromP = f; toP = l; }
    }
    if (biggestDiff >= 10) {
      achs.push({ id: 'improvement', icon: '📈', color: 'peach',
        badgeLevel: biggestDiff >= 25 ? 'platinum' : biggestDiff >= 18 ? 'gold' : 'silver',
        title: `${impSubject} Breakthrough`,
        metric: `+${biggestDiff.toFixed(0)}pts`,
        story: `You improved your ${impSubject} score from ${fromP.toFixed(0)}% to ${toP.toFixed(0)}% — a ${biggestDiff.toFixed(0)}-point improvement! That kind of growth is something to be really proud of.` });
    }

    // Assessments completed (= missions)
    if (grades.length >= 5) {
      achs.push({ id: 'missions', icon: '✅', color: 'mint',
        badgeLevel: grades.length >= 20 ? 'gold' : grades.length >= 10 ? 'silver' : 'bronze',
        title: `${grades.length} Missions Complete`,
        metric: `${grades.length} done`,
        story: `You've completed ${grades.length} assessments this semester. Every challenge you've tackled has made you a stronger learner!` });
    }

    // Multi-subject engagement
    const subjectCount = Object.keys(bySubject).length;
    if (subjectCount >= 3) {
      achs.push({ id: 'breadth', icon: '🎯', color: 'lavender',
        badgeLevel: subjectCount >= 5 ? 'gold' : 'silver',
        title: 'Multi-Subject Explorer',
        metric: `${subjectCount} subjects`,
        story: `You've shown academic engagement across ${subjectCount} different subjects this semester — demonstrating broad curiosity and intellectual range!` });
    }

    // Top score achievement
    const topScore = allPcts.length ? Math.max(...allPcts) : 0;
    if (topScore >= 90) {
      achs.push({ id: 'top-score', icon: '🎯', color: 'mint',
        badgeLevel: topScore >= 98 ? 'platinum' : topScore >= 95 ? 'gold' : 'silver',
        title: 'Perfect Score Alert',
        metric: `${topScore.toFixed(0)}%`,
        story: `You scored ${topScore.toFixed(0)}% in one of your assessments — an incredible individual performance that shows what you're truly capable of!` });
    }

    return achs;
  }

  private computeTeacherAchievements(
    teacherData: TeacherDashboardDto | null,
    grades: GradeRecordDto[],
    behavior: BehaviorFeedbackDto[]
  ): Achievement[] {
    const achs: Achievement[] = [];
    const withScores = grades.filter(g => g.score != null);
    const byStudent = this.groupBy(withScores, g => g.studentProfileId);
    const uniqueStudents = Object.keys(byStudent).length;

    // Students impacted
    const assigned = teacherData?.totalAssignedStudents ?? uniqueStudents;
    if (assigned > 0) {
      achs.push({ id: 'impact', icon: '🎓', color: 'blue',
        badgeLevel: assigned >= 60 ? 'platinum' : assigned >= 40 ? 'gold' : assigned >= 20 ? 'silver' : 'bronze',
        title: 'Educational Reach',
        metric: `${assigned} learners`,
        isTop: true,
        story: `You're currently shaping the academic journey of ${assigned} students across your assigned classes — a meaningful and lasting impact every single day.` });
    }

    // High achievers (≥ 85% average)
    let highAchievers = 0;
    for (const records of Object.values(byStudent)) {
      if (this.avgPct(records) >= 85) highAchievers++;
    }
    if (highAchievers > 0) {
      achs.push({ id: 'high-achievers', icon: '🌟', color: 'tan',
        badgeLevel: highAchievers >= 10 ? 'platinum' : highAchievers >= 5 ? 'gold' : 'silver',
        title: 'High Achievers Developed',
        metric: `${highAchievers} students`,
        story: `${highAchievers} of your students achieved an average of 85% or above — a direct reflection of your effective and inspiring teaching approach.` });
    }

    // Class improvement rate
    let improved = 0;
    for (const records of Object.values(byStudent)) {
      if (records.length < 2) continue;
      const sorted = [...records].sort((a, b) => new Date(a.recordedDate).getTime() - new Date(b.recordedDate).getTime());
      if (this.pctOf(sorted[sorted.length - 1]) > this.pctOf(sorted[0])) improved++;
    }
    if (improved > 0 && uniqueStudents > 0) {
      const rate = Math.round((improved / uniqueStudents) * 100);
      achs.push({ id: 'improvement-rate', icon: '📈', color: 'peach',
        badgeLevel: rate >= 75 ? 'platinum' : rate >= 60 ? 'gold' : rate >= 40 ? 'silver' : 'bronze',
        title: 'Class Growth Rate',
        metric: `${rate}% improved`,
        story: `${rate}% of your assessed students showed grade improvement over time — your teaching methods are clearly making a measurable difference!` });
    }

    // Assessment volume = thoroughness
    if (grades.length >= 10) {
      achs.push({ id: 'volume', icon: '📊', color: 'mint',
        badgeLevel: grades.length >= 50 ? 'platinum' : grades.length >= 30 ? 'gold' : grades.length >= 20 ? 'silver' : 'bronze',
        title: 'Assessment Champion',
        metric: `${grades.length} entries`,
        story: `You've recorded ${grades.length} grade entries this semester — providing detailed, actionable academic feedback for every student in your care.` });
    }

    // Positive behavior recognitions
    const positiveRecognitions = behavior.filter(b =>
      (b.rating ?? 0) >= 4 || ['Positive', 'Excellent', 'Outstanding', 'Good'].some(c => b.category?.toLowerCase().includes(c.toLowerCase()))
    ).length;
    if (positiveRecognitions > 0) {
      achs.push({ id: 'recognition', icon: '💫', color: 'lavender',
        badgeLevel: positiveRecognitions >= 15 ? 'platinum' : positiveRecognitions >= 8 ? 'gold' : positiveRecognitions >= 4 ? 'silver' : 'bronze',
        title: 'Student Champion',
        metric: `${positiveRecognitions} kudos`,
        story: `You've given ${positiveRecognitions} positive behavior recognitions this semester — actively nurturing student confidence, motivation, and a positive classroom culture.` });
    }

    // Sessions today
    const todaySessions = teacherData?.todaySessions?.length ?? 0;
    if (todaySessions > 0) {
      achs.push({ id: 'sessions', icon: '🗓️', color: 'blue',
        badgeLevel: todaySessions >= 5 ? 'gold' : todaySessions >= 3 ? 'silver' : 'bronze',
        title: 'Active Teaching Day',
        metric: `${todaySessions} sessions today`,
        story: `You have ${todaySessions} teaching session${todaySessions > 1 ? 's' : ''} today — stay energized, your students are counting on you!` });
    }

    return achs;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
    return arr.reduce((acc, item) => {
      const k = key(item);
      (acc[k] = acc[k] || []).push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }

  private pctOf(r: GradeRecordDto): number {
    return r.maxScore ? (r.score! / r.maxScore) * 100 : r.score ?? 0;
  }

  private avgPct(records: GradeRecordDto[]): number {
    const pts = records.filter(r => r.score != null).map(r => this.pctOf(r));
    return pts.length ? pts.reduce((a, b) => a + b, 0) / pts.length : 0;
  }

  private levelFor(pct: number): BadgeLevel {
    return pct >= 90 ? 'platinum' : pct >= 80 ? 'gold' : pct >= 70 ? 'silver' : 'bronze';
  }

  private spawnConfetti(): void {
    const colors = ['#fbe5d3', '#dde6fc', '#e8eed2', '#ece3f9', '#f1ddc1'];
    this.confettiDots = Array.from({ length: 14 }, (_, i) => ({
      style: `left:${Math.random() * 100}%;top:${20 + Math.random() * 70}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * 2}s;animation-duration:${2 + Math.random() * 2}s`
    }));
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }
}
