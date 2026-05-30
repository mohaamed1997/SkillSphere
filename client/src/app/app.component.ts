import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  sidebarOpen = false;
  pageTitleKey = 'Dashboard';
  private routerSub!: Subscription;

  readonly i18n = inject(I18nService);

  private readonly titleMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/tenants': 'Schools',
    '/users': 'Users',
    '/academic/grades': 'Grades',
    '/academic/groups': 'Groups',
    '/academic/subjects': 'Subjects',
    '/academic/departments': 'Departments',
    '/academic/semesters': 'Semesters',
    '/rooms': 'Rooms',
    '/period-definitions': 'Periods',
    '/curriculum': 'Curriculum',
    '/teacher-subject-links': 'Teacher-Subject Links',
    '/assignments': 'Assignments',
    '/timetable': 'Timetable',
    '/attendance': 'Attendance',
    '/grades-records': 'Grade Records',
    '/weekly-reports': 'Weekly Reports',
    '/internal-reports': 'Internal Reports',
  };

  constructor(public auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.routerSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => {
      this.pageTitleKey = this.titleMap[e.urlAfterRedirects] ?? 'SkillSphere';
      if (this.sidebarOpen) { this.sidebarOpen = false; }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleLang(): void {
    this.i18n.toggle();
  }

  logout(): void {
    this.auth.logout();
  }
}
