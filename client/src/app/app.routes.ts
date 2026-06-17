import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '@core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'tenants',
    canActivate: [roleGuard('PlatformSuperAdmin')],
    loadComponent: () => import('./features/tenants/tenant-list/tenant-list.component').then(m => m.TenantListComponent)
  },
  {
    path: 'users',
    canActivate: [roleGuard('SchoolAdmin', 'SchoolManager', 'PlatformSuperAdmin')],
    loadComponent: () => import('./features/users/user-list/user-list.component').then(m => m.UserListComponent)
  },
  {
    path: 'academic',
    canActivate: [roleGuard('SchoolAdmin', 'SchoolManager')],
    children: [
      { path: '', redirectTo: 'grades', pathMatch: 'full' },
      { path: 'grades', loadComponent: () => import('./features/academic/grades/grades.component').then(m => m.GradesComponent) },
      { path: 'groups', loadComponent: () => import('./features/academic/classes/classes.component').then(m => m.ClassesComponent) },
      { path: 'subjects', loadComponent: () => import('./features/academic/subjects/subjects.component').then(m => m.SubjectsComponent) },
      { path: 'departments', loadComponent: () => import('./features/academic/departments/departments.component').then(m => m.DepartmentsComponent) },
      { path: 'semesters', loadComponent: () => import('./features/academic/semesters/semesters.component').then(m => m.SemestersComponent) },
    ]
  },
  {
    path: 'rooms',
    canActivate: [roleGuard('SchoolAdmin', 'SchoolManager')],
    loadComponent: () => import('./features/rooms/rooms.component').then(m => m.RoomsComponent)
  },
  {
    path: 'period-definitions',
    canActivate: [roleGuard('SchoolAdmin', 'SchoolManager')],
    loadComponent: () => import('./features/period-definitions/period-definitions.component').then(m => m.PeriodDefinitionsComponent)
  },
  {
    path: 'curriculum',
    canActivate: [roleGuard('SchoolAdmin', 'SchoolManager')],
    loadComponent: () => import('./features/curriculum/curriculum.component').then(m => m.CurriculumComponent)
  },
  {
    path: 'teacher-subject-links',
    canActivate: [roleGuard('SchoolAdmin', 'SchoolManager')],
    loadComponent: () => import('./features/teacher-subject-links/teacher-subject-links.component').then(m => m.TeacherSubjectLinksComponent)
  },
  {
    path: 'assignments',
    canActivate: [roleGuard('SchoolAdmin', 'SchoolManager')],
    loadComponent: () => import('./features/assignments/assignments.component').then(m => m.AssignmentsComponent)
  },
  {
    path: 'timetable',
    canActivate: [roleGuard('SchoolAdmin', 'SchoolManager', 'Teacher')],
    loadComponent: () => import('./features/timetable/timetable.component').then(m => m.TimetableComponent)
  },
  {
    path: 'attendance',
    canActivate: [roleGuard('Teacher', 'TeacherSupervisor', 'SchoolManager', 'SchoolAdmin', 'Parent')],
    loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent)
  },
  {
    path: 'grades-records',
    canActivate: [roleGuard('Teacher', 'TeacherSupervisor', 'SchoolManager', 'Parent')],
    loadComponent: () => import('./features/grades/grades-records.component').then(m => m.GradesRecordsComponent)
  },
  {
    path: 'weekly-reports',
    canActivate: [roleGuard('Teacher', 'TeacherSupervisor', 'SchoolManager', 'Parent')],
    loadComponent: () => import('./features/reports/weekly-reports/weekly-reports.component').then(m => m.WeeklyReportsComponent)
  },
  {
    path: 'internal-reports',
    canActivate: [roleGuard('Teacher', 'TeacherSupervisor', 'SchoolManager', 'SchoolAdmin', 'Parent')],
    loadComponent: () => import('./features/reports/internal-reports/internal-reports.component').then(m => m.InternalReportsComponent)
  },
  {
    path: 'achievements',
    canActivate: [roleGuard('Student', 'Parent', 'Teacher')],
    loadComponent: () => import('./features/achievements/achievements.component').then(m => m.AchievementsComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/shared/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];
