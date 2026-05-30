import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '@core/services/data.service';
import { UserDto, ParentProfileDto, StudentProfileDto, LinkParentRequest } from '@core/models';
import { TranslatePipe } from '@core/i18n/translate.pipe';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1>{{ 'Users' | t }}</h1>
      <div>
        <button class="btn btn-info" (click)="toggleParentLinking()" style="margin-right:8px">
          {{ (showParentLinking ? 'Hide Parent Links' : 'Manage Parent Links') | t }}
        </button>
        <button class="btn btn-primary" (click)="showForm = !showForm">{{ (showForm ? 'Cancel' : '+ Add User') | t }}</button>
      </div>
    </div>

    <div class="card form-card" *ngIf="showForm">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'Create User' | t }}</h4>
        <p class="card-category">{{ 'Add a new staff or student account' | t }}</p>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>{{ 'Email' | t }}</label><input [(ngModel)]="form.email" /></div>
          <div class="form-group"><label>{{ 'Password' | t }}</label><input type="password" [(ngModel)]="form.password" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>{{ 'First Name' | t }}</label><input [(ngModel)]="form.firstName" /></div>
          <div class="form-group"><label>{{ 'Last Name' | t }}</label><input [(ngModel)]="form.lastName" /></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ 'Role' | t }}</label>
            <select [(ngModel)]="form.role">
              <option value="">{{ 'Select Role' | t }}</option>
              <option value="SchoolAdmin">{{ 'School Admin' | t }}</option>
              <option value="SchoolManager">{{ 'School Manager' | t }}</option>
              <option value="Teacher">{{ 'Teacher' | t }}</option>
              <option value="TeacherSupervisor">{{ 'Teacher Supervisor' | t }}</option>
              <option value="Parent">{{ 'Parent' | t }}</option>
              <option value="Student">{{ 'Student' | t }}</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" (click)="create()">{{ 'Create' | t }}</button>
      </div>
    </div>

    <!-- Parent-Child Linking Section -->
    <div class="card" *ngIf="showParentLinking">
      <div class="card-header card-header-warning">
        <h4 class="card-title">{{ 'Parent-Child Links' | t }}</h4>
        <p class="card-category">{{ 'Assign children to parent accounts' | t }}</p>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label>{{ 'Parent' | t }}</label>
            <select [(ngModel)]="linkForm.parentUserId" (ngModelChange)="onParentSelected()">
              <option value="">{{ '-- Select Parent --' | t }}</option>
              <option *ngFor="let p of parents" [value]="p.userId">{{ p.fullName }} ({{ p.email }})</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ 'Student (Child)' | t }}</label>
            <select [(ngModel)]="linkForm.studentUserId">
              <option value="">{{ '-- Select Student --' | t }}</option>
              <option *ngFor="let s of students" [value]="s.userId">{{ s.fullName }} ({{ s.studentNumber || s.email }})</option>
            </select>
          </div>
          <div class="form-group" style="display:flex; align-items:center; gap:8px">
            <label style="margin:0">
              <input type="checkbox" [(ngModel)]="linkForm.isPrimary" /> {{ 'Primary Contact' | t }}
            </label>
          </div>
          <div class="form-group" style="align-self:end">
            <button class="btn btn-primary" (click)="linkParent()" [disabled]="!linkForm.parentUserId || !linkForm.studentUserId || linking">
              {{ (linking ? 'Linking...' : 'Link') | t }}
            </button>
          </div>
        </div>
        <div class="alert alert-success" *ngIf="linkSuccess">{{ 'Parent linked to student successfully.' | t }}</div>
        <div class="alert alert-danger" *ngIf="linkError">{{ linkError }}</div>

        <h5 *ngIf="selectedParent" style="margin-top:16px">{{ 'Children of' | t }} {{ selectedParent.fullName }}</h5>
        <div class="table-responsive" *ngIf="selectedParent">
          <table class="table">
            <thead><tr><th>{{ 'Name' | t }}</th><th>{{ 'Student #' | t }}</th><th>{{ 'Email' | t }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let s of selectedParent.students">
                <td>{{ s.fullName }}</td><td>{{ s.studentNumber || '-' }}</td><td>{{ s.email }}</td>
              </tr>
              <tr *ngIf="!selectedParent.students.length"><td colspan="3" class="empty-row">{{ 'No children linked yet.' | t }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header card-header-primary">
        <h4 class="card-title">{{ 'Users' | t }}</h4>
        <p class="card-category">{{ 'School staff and student accounts' | t }}</p>
      </div>
      <div class="card-body">
        <div class="filter-row">
          <select [(ngModel)]="filter.role" (change)="load()">
            <option value="">{{ 'All Roles' | t }}</option>
            <option value="SchoolAdmin">{{ 'Admin' | t }}</option>
            <option value="SchoolManager">{{ 'Manager' | t }}</option>
            <option value="Teacher">{{ 'Teacher' | t }}</option>
            <option value="TeacherSupervisor">{{ 'Supervisor' | t }}</option>
            <option value="Parent">{{ 'Parent' | t }}</option>
            <option value="Student">{{ 'Student' | t }}</option>
          </select>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>{{ 'Name' | t }}</th><th>{{ 'Email' | t }}</th><th>{{ 'Role' | t }}</th><th>{{ 'Status' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let u of users">
                <td>{{ u.fullName }}</td>
                <td>{{ u.email }}</td>
                <td>{{ u.role }}</td>
                <td><span [class]="u.isActive ? 'badge-active' : 'badge-inactive'">{{ (u.isActive ? 'Active' : 'Inactive') | t }}</span></td>
                <td>
                  <button class="btn btn-sm btn-danger" *ngIf="u.isActive" (click)="toggleActive(u, false)">{{ 'Deactivate' | t }}</button>
                  <button class="btn btn-sm btn-success" *ngIf="!u.isActive" (click)="toggleActive(u, true)">{{ 'Activate' | t }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class UserListComponent implements OnInit {
  users: UserDto[] = [];
  showForm = false;
  form: any = {};
  filter: any = { role: '' };

  // Parent-child linking
  showParentLinking = false;
  parents: ParentProfileDto[] = [];
  students: StudentProfileDto[] = [];
  selectedParent: ParentProfileDto | null = null;
  linkForm: LinkParentRequest = { parentUserId: '', studentUserId: '', isPrimary: false };
  linking = false;
  linkSuccess = false;
  linkError = '';

  constructor(private userService: UserService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.userService.getAll(this.filter.role ? { role: this.filter.role } : {}).subscribe(r => this.users = r.items || []);
  }

  create(): void {
    this.userService.create(this.form).subscribe(() => { this.showForm = false; this.form = {}; this.load(); });
  }

  toggleActive(user: UserDto, activate: boolean): void {
    const obs = activate ? this.userService.activate(user.id) : this.userService.deactivate(user.id);
    obs.subscribe(() => this.load());
  }

  toggleParentLinking(): void {
    this.showParentLinking = !this.showParentLinking;
    if (this.showParentLinking) {
      this.loadParentLinkingData();
    }
  }

  private loadParentLinkingData(): void {
    this.userService.getParents().subscribe(r => {
      this.parents = r.items || [];
      if (this.linkForm.parentUserId) {
        this.selectedParent = this.parents.find(p => p.userId === this.linkForm.parentUserId) ?? null;
      }
    });
    this.userService.getStudents().subscribe(r => this.students = r.items || []);
  }

  onParentSelected(): void {
    this.selectedParent = this.parents.find(p => p.userId === this.linkForm.parentUserId) ?? null;
    this.linkSuccess = false;
    this.linkError = '';
  }

  linkParent(): void {
    if (!this.linkForm.parentUserId || !this.linkForm.studentUserId) return;
    this.linking = true;
    this.linkSuccess = false;
    this.linkError = '';
    this.userService.linkParent(this.linkForm).subscribe({
      next: () => {
        this.linking = false;
        this.linkSuccess = true;
        const parentUserId = this.linkForm.parentUserId;
        this.linkForm = { parentUserId, studentUserId: '', isPrimary: false };
        this.loadParentLinkingData();
      },
      error: (err) => {
        this.linking = false;
        this.linkError = err?.error?.message || err?.error?.error || 'Failed to link parent and student.';
      }
    });
  }
}
