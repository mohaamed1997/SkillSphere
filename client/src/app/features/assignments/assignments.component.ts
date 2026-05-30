import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssignmentService, AcademicService, UserService } from '@core/services/data.service';
import { StudentAssignmentDto, GradeDto, GroupDto, SemesterDto, BulkAssignStudentsRequest } from '@core/models';
import { StudentProfileDto } from '@core/models';
import { TranslatePipe } from '@core/i18n/translate.pipe';

interface SelectableStudent {
  profileId: string;
  fullName: string;
  studentNumber?: string;
  selected: boolean;
}

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header"><h1>{{ 'Student Assignments' | t }}</h1></div>

    <!-- Assign Students Card -->
    <div class="card">
      <div class="card-header card-header-success">
        <h4 class="card-title">{{ 'Assign Students to Group' | t }}</h4>
        <p class="card-category">{{ 'Select a grade, group, semester, then pick students to assign' | t }}</p>
      </div>
      <div class="card-body">
        <div class="form-grid">
          <div class="form-group">
            <label>{{ 'Semester' | t }}</label>
            <select [(ngModel)]="selectedSemesterId" (ngModelChange)="onFiltersChange()">
              <option value="">{{ '-- Select Semester --' | t }}</option>
              <option *ngFor="let s of semesters" [value]="s.id">{{s.name}}</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ 'Grade' | t }}</label>
            <select [(ngModel)]="selectedGradeId" (ngModelChange)="onGradeChange()">
              <option value="">{{ '-- Select Grade --' | t }}</option>
              <option *ngFor="let g of grades" [value]="g.id">{{g.name}}</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ 'Group' | t }}</label>
            <select [(ngModel)]="selectedGroupId" (ngModelChange)="onFiltersChange()">
              <option value="">{{ '-- Select Group --' | t }}</option>
              <option *ngFor="let g of filteredGroups" [value]="g.id">{{g.name}} ({{g.studentCount}}/{{g.capacity}})</option>
            </select>
          </div>
        </div>

        <!-- Unassigned students list -->
        <div *ngIf="selectedSemesterId && selectedGradeId && selectedGroupId">
          <div class="filter-row" style="margin:16px 0 8px">
            <span><strong>{{ 'Unassigned Students' | t }}</strong> ({{unassignedStudents.length}} {{ 'available' | t }})</span>
            <input type="text" [(ngModel)]="studentSearch" [placeholder]="'Search by name or number...' | t" style="max-width:250px" />
            <button class="btn btn-sm btn-outline-primary" (click)="selectAll(true)">{{ 'Select All' | t }}</button>
            <button class="btn btn-sm btn-outline-secondary" (click)="selectAll(false)">{{ 'Deselect All' | t }}</button>
          </div>

          <div *ngIf="loadingStudents" class="empty-row"><p>{{ 'Loading students...' | t }}</p></div>

          <div class="table-responsive" *ngIf="!loadingStudents && filteredUnassigned.length">
            <table class="table">
              <thead><tr><th style="width:40px"></th><th>{{ 'Name' | t }}</th><th>{{ 'Student Number' | t }}</th></tr></thead>
              <tbody>
                <tr *ngFor="let s of filteredUnassigned" (click)="s.selected = !s.selected" style="cursor:pointer"
                    [style.background]="s.selected ? '#e8f5e9' : ''">
                  <td><input type="checkbox" [(ngModel)]="s.selected" (click)="$event.stopPropagation()" /></td>
                  <td>{{s.fullName}}</td>
                  <td>{{s.studentNumber || '-'}}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="empty-row" *ngIf="!loadingStudents && !filteredUnassigned.length">
            <p>{{ 'All students are already assigned for this semester.' | t }}</p>
          </div>
        </div>
      </div>
      <div class="card-footer" style="text-align:right"
           *ngIf="selectedSemesterId && selectedGradeId && selectedGroupId && selectedCount > 0">
        <button class="btn btn-primary" (click)="assignSelected()" [disabled]="submitting">
          {{ submitting ? ('Assigning...' | t) : ('Assign {count} Student(s)' | t:{ count: selectedCount }) }}
        </button>
      </div>
      <div class="alert alert-success" *ngIf="successMsg" style="margin:0 16px 16px">{{successMsg}}</div>
      <div class="alert alert-danger" *ngIf="errorMsg" style="margin:0 16px 16px">{{errorMsg}}</div>
    </div>

    <!-- Current Assignments Card -->
    <div class="card">
      <div class="card-header card-header-warning">
        <h4 class="card-title">{{ 'Current Assignments' | t }}</h4>
        <p class="card-category">{{ 'Students assigned to groups for the selected semester' | t }}</p>
      </div>
      <div class="card-body">
        <div class="filter-row" style="margin-bottom:12px">
          <div class="form-group">
            <label>{{ 'Filter by Semester' | t }}</label>
            <select [(ngModel)]="filterSemesterId" (ngModelChange)="loadAssignments()">
              <option value="">{{ 'All Semesters' | t }}</option>
              <option *ngFor="let s of semesters" [value]="s.id">{{s.name}}</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ 'Filter by Grade' | t }}</label>
            <select [(ngModel)]="filterGradeId" (ngModelChange)="loadAssignments()">
              <option value="">{{ 'All Grades' | t }}</option>
              <option *ngFor="let g of grades" [value]="g.id">{{g.name}}</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ 'Filter by Group' | t }}</label>
            <select [(ngModel)]="filterGroupId" (ngModelChange)="loadAssignments()">
              <option value="">{{ 'All Groups' | t }}</option>
              <option *ngFor="let g of allGroups" [value]="g.id">{{g.name}}</option>
            </select>
          </div>
        </div>

        <div class="table-responsive" *ngIf="assignments.length">
          <table class="table">
            <thead><tr><th>{{ 'Student' | t }}</th><th>{{ 'Grade' | t }}</th><th>{{ 'Group' | t }}</th><th>{{ 'Semester' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let a of assignments">
                <td>{{a.studentName}}</td>
                <td>{{a.gradeName}}</td>
                <td>{{a.groupName}}</td>
                <td>{{a.semesterName}}</td>
                <td><button class="btn btn-sm btn-danger" (click)="removeAssignment(a.id)">{{ 'Remove' | t }}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="empty-row" *ngIf="!assignments.length">
          <p>{{ 'No assignments found for the selected filters.' | t }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class AssignmentsComponent implements OnInit {
  // Reference data
  semesters: SemesterDto[] = [];
  grades: GradeDto[] = [];
  allGroups: GroupDto[] = [];
  filteredGroups: GroupDto[] = [];
  allStudents: StudentProfileDto[] = [];

  // Assign form
  selectedSemesterId = '';
  selectedGradeId = '';
  selectedGroupId = '';
  unassignedStudents: SelectableStudent[] = [];
  studentSearch = '';
  loadingStudents = false;
  submitting = false;
  successMsg = '';
  errorMsg = '';

  // Assignments list
  assignments: StudentAssignmentDto[] = [];
  filterSemesterId = '';
  filterGradeId = '';
  filterGroupId = '';

  constructor(
    private assignmentSvc: AssignmentService,
    private academicSvc: AcademicService,
    private userSvc: UserService
  ) {}

  ngOnInit() {
    this.academicSvc.getSemesters().subscribe(s => {
      this.semesters = s;
      const active = s.find(sem => sem.isCurrent) || s[0];
      if (active) {
        this.selectedSemesterId = active.id;
        this.filterSemesterId = active.id;
      }
      this.loadAssignments();
    });
    this.academicSvc.getGrades().subscribe(g => this.grades = g);
    this.academicSvc.getGroups().subscribe(g => this.allGroups = g);
    this.userSvc.getStudents().subscribe(r => this.allStudents = r.items);
  }

  onGradeChange() {
    this.selectedGroupId = '';
    this.filteredGroups = this.allGroups.filter(g => g.gradeId === this.selectedGradeId);
    this.unassignedStudents = [];
  }

  onFiltersChange() {
    this.successMsg = '';
    this.errorMsg = '';
    if (!this.selectedSemesterId || !this.selectedGradeId || !this.selectedGroupId) {
      this.unassignedStudents = [];
      return;
    }
    this.loadUnassignedStudents();
  }

  loadUnassignedStudents() {
    this.loadingStudents = true;
    // Get students already assigned for this semester
    this.assignmentSvc.getStudentAssignments({
      semesterId: this.selectedSemesterId
    }).subscribe(assigned => {
      const assignedIds = new Set(assigned.map(a => a.studentProfileId));
      this.unassignedStudents = this.allStudents
        .filter(s => s.isActive && !assignedIds.has(s.profileId))
        .map(s => ({
          profileId: s.profileId,
          fullName: s.fullName,
          studentNumber: s.studentNumber,
          selected: false
        }));
      this.loadingStudents = false;
    });
  }

  get filteredUnassigned(): SelectableStudent[] {
    if (!this.studentSearch) return this.unassignedStudents;
    const q = this.studentSearch.toLowerCase();
    return this.unassignedStudents.filter(s =>
      s.fullName.toLowerCase().includes(q) ||
      (s.studentNumber && s.studentNumber.toLowerCase().includes(q))
    );
  }

  get selectedCount(): number {
    return this.unassignedStudents.filter(s => s.selected).length;
  }

  selectAll(selected: boolean) {
    this.filteredUnassigned.forEach(s => s.selected = selected);
  }

  assignSelected() {
    const selected = this.unassignedStudents.filter(s => s.selected);
    if (!selected.length) return;

    this.submitting = true;
    this.successMsg = '';
    this.errorMsg = '';

    const req: BulkAssignStudentsRequest = {
      studentProfileIds: selected.map(s => s.profileId),
      gradeId: this.selectedGradeId,
      groupId: this.selectedGroupId,
      semesterId: this.selectedSemesterId
    };

    this.assignmentSvc.bulkAssignStudents(req).subscribe({
      next: (result) => {
        this.submitting = false;
        this.successMsg = `${result.length} student(s) assigned successfully.`;
        this.loadUnassignedStudents();
        this.loadAssignments();
        // Refresh group counts
        this.academicSvc.getGroups().subscribe(g => {
          this.allGroups = g;
          this.filteredGroups = g.filter(gr => gr.gradeId === this.selectedGradeId);
        });
      },
      error: (err) => {
        this.submitting = false;
        this.errorMsg = err?.error?.error || 'Failed to assign students.';
      }
    });
  }

  loadAssignments() {
    const params: any = {};
    if (this.filterSemesterId) params.semesterId = this.filterSemesterId;
    if (this.filterGradeId) params.gradeId = this.filterGradeId;
    if (this.filterGroupId) params.groupId = this.filterGroupId;
    this.assignmentSvc.getStudentAssignments(params).subscribe(d => this.assignments = d);
  }

  removeAssignment(id: string) {
    this.assignmentSvc.deleteStudentAssignment(id).subscribe(() => {
      this.loadAssignments();
      if (this.selectedSemesterId && this.selectedGradeId && this.selectedGroupId) {
        this.loadUnassignedStudents();
      }
    });
  }
}
