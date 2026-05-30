import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantService } from '@core/services/data.service';
import { TenantDto } from '@core/models';
import { TranslatePipe } from '@core/i18n/translate.pipe';

interface CountryCode { name: string; dial: string; code: string; phonePlaceholder: string; phonePattern: RegExp; }

const COUNTRY_CODES: CountryCode[] = [
  { name: 'Egypt', dial: '+20', code: 'EG', phonePlaceholder: '1XXXXXXXXX', phonePattern: /^[12][0-9]{9}$/ },
  { name: 'Saudi Arabia', dial: '+966', code: 'SA', phonePlaceholder: '5XXXXXXXX', phonePattern: /^5[0-9]{8}$/ },
  { name: 'UAE', dial: '+971', code: 'AE', phonePlaceholder: '5XXXXXXXX', phonePattern: /^5[0-9]{8}$/ },
  { name: 'Kuwait', dial: '+965', code: 'KW', phonePlaceholder: 'XXXXXXXX', phonePattern: /^[0-9]{8}$/ },
  { name: 'Qatar', dial: '+974', code: 'QA', phonePlaceholder: 'XXXXXXXX', phonePattern: /^[0-9]{8}$/ },
  { name: 'Bahrain', dial: '+973', code: 'BH', phonePlaceholder: 'XXXXXXXX', phonePattern: /^[0-9]{8}$/ },
  { name: 'Oman', dial: '+968', code: 'OM', phonePlaceholder: 'XXXXXXXX', phonePattern: /^[0-9]{8}$/ },
  { name: 'Jordan', dial: '+962', code: 'JO', phonePlaceholder: '7XXXXXXXX', phonePattern: /^7[0-9]{8}$/ },
  { name: 'Lebanon', dial: '+961', code: 'LB', phonePlaceholder: 'XXXXXXXX', phonePattern: /^[0-9]{7,8}$/ },
  { name: 'Iraq', dial: '+964', code: 'IQ', phonePlaceholder: '7XXXXXXXXX', phonePattern: /^7[0-9]{9}$/ },
  { name: 'United States', dial: '+1', code: 'US', phonePlaceholder: 'XXXXXXXXXX', phonePattern: /^[2-9][0-9]{9}$/ },
  { name: 'United Kingdom', dial: '+44', code: 'GB', phonePlaceholder: '7XXXXXXXXX', phonePattern: /^7[0-9]{9}$/ },
  { name: 'India', dial: '+91', code: 'IN', phonePlaceholder: 'XXXXXXXXXX', phonePattern: /^[6-9][0-9]{9}$/ },
  { name: 'Turkey', dial: '+90', code: 'TR', phonePlaceholder: '5XXXXXXXXX', phonePattern: /^5[0-9]{9}$/ },
  { name: 'Pakistan', dial: '+92', code: 'PK', phonePlaceholder: '3XXXXXXXXX', phonePattern: /^3[0-9]{9}$/ },
  { name: 'Morocco', dial: '+212', code: 'MA', phonePlaceholder: '6XXXXXXXX', phonePattern: /^[67][0-9]{8}$/ },
  { name: 'Tunisia', dial: '+216', code: 'TN', phonePlaceholder: 'XXXXXXXX', phonePattern: /^[0-9]{8}$/ },
  { name: 'Algeria', dial: '+213', code: 'DZ', phonePlaceholder: '5XXXXXXXX', phonePattern: /^[567][0-9]{8}$/ },
  { name: 'Libya', dial: '+218', code: 'LY', phonePlaceholder: '9XXXXXXXX', phonePattern: /^9[0-9]{8}$/ },
  { name: 'Sudan', dial: '+249', code: 'SD', phonePlaceholder: '9XXXXXXXX', phonePattern: /^9[0-9]{8}$/ },
  { name: 'Germany', dial: '+49', code: 'DE', phonePlaceholder: '1XXXXXXXXX', phonePattern: /^1[0-9]{9,10}$/ },
  { name: 'France', dial: '+33', code: 'FR', phonePlaceholder: '6XXXXXXXX', phonePattern: /^[67][0-9]{8}$/ },
  { name: 'Canada', dial: '+1', code: 'CA', phonePlaceholder: 'XXXXXXXXXX', phonePattern: /^[2-9][0-9]{9}$/ },
  { name: 'Australia', dial: '+61', code: 'AU', phonePlaceholder: '4XXXXXXXX', phonePattern: /^4[0-9]{8}$/ },
];

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1>{{ 'Schools (Tenants)' | t }}</h1>
      <button class="btn btn-primary" (click)="toggleForm()">{{ (showForm ? 'Cancel' : '+ Add School') | t }}</button>
    </div>

    <div class="alert alert-danger" *ngIf="errorMessage">
      <span class="alert-icon">⚠</span>
      <span class="alert-text">{{ errorMessage }}</span>
      <button class="alert-close" (click)="errorMessage = ''">✕</button>
    </div>

    <div class="alert alert-success" *ngIf="successMessage">
      <span class="alert-icon">✓</span>
      <span class="alert-text">{{ successMessage }}</span>
      <button class="alert-close" (click)="successMessage = ''">✕</button>
    </div>

    <div class="card form-card" *ngIf="showForm">
      <div class="card-header card-header-info">
        <h4 class="card-title">{{ 'Onboard New School' | t }}</h4>
        <p class="card-category">{{ 'Fill in the details to create a new school tenant' | t }}</p>
      </div>
      <div class="card-body">
        <form [formGroup]="schoolForm" (ngSubmit)="create()">
          <!-- School Info -->
          <div class="form-section-title">{{ 'School Information' | t }}</div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ 'School Name' | t }} <span class="required">*</span></label>
              <input formControlName="name" [placeholder]="'e.g. Al Abtal Academy' | t" />
              <div class="field-error" *ngIf="showError('name')">
                <span *ngIf="schoolForm.get('name')?.errors?.['required']">{{ 'School name is required.' | t }}</span>
                <span *ngIf="schoolForm.get('name')?.errors?.['minlength']">{{ 'Must be at least 2 characters.' | t }}</span>
                <span *ngIf="schoolForm.get('name')?.errors?.['maxlength']">{{ 'Must be under 100 characters.' | t }}</span>
              </div>
            </div>
            <div class="form-group">
              <label>{{ 'Subdomain / Code' | t }} <span class="required">*</span></label>
              <input formControlName="code" [placeholder]="'e.g. al-abtal' | t" />
              <div class="field-hint" *ngIf="!showError('code')">{{ 'Lowercase letters, numbers, and hyphens only.' | t }}</div>
              <div class="field-error" *ngIf="showError('code')">
                <span *ngIf="schoolForm.get('code')?.errors?.['required']">{{ 'Subdomain code is required.' | t }}</span>
                <span *ngIf="schoolForm.get('code')?.errors?.['minlength']">{{ 'Must be at least 3 characters.' | t }}</span>
                <span *ngIf="schoolForm.get('code')?.errors?.['maxlength']">{{ 'Must be under 50 characters.' | t }}</span>
                <span *ngIf="schoolForm.get('code')?.errors?.['pattern']">{{ 'Only lowercase letters, numbers, and hyphens allowed.' | t }}</span>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ 'Contact Email' | t }}</label>
              <input formControlName="email" type="email" placeholder="e.g. info&#64;school.com" />
              <div class="field-error" *ngIf="showError('email')">
                <span *ngIf="schoolForm.get('email')?.errors?.['email']">{{ 'Enter a valid email address.' | t }}</span>
              </div>
            </div>
            <div class="form-group">
              <label>{{ 'Phone' | t }}</label>
              <div class="phone-input-group">
                <select formControlName="countryCode" class="country-select">
                  <option value="">{{ 'Country' | t }}</option>
                  <option *ngFor="let c of countries" [value]="c.code">{{ c.name }} ({{ c.dial }})</option>
                </select>
                <input formControlName="phoneNumber" class="phone-number-input"
                       [placeholder]="selectedCountry?.phonePlaceholder || ('Phone number' | t)" />
              </div>
              <div class="field-error" *ngIf="showError('phoneNumber')">
                <span *ngIf="schoolForm.get('phoneNumber')?.errors?.['invalidPhone']">
                  {{ 'Invalid phone number for {country}.' | t:{ country: selectedCountry?.name || ('selected country' | t) } }}
                </span>
              </div>
              <div class="field-error" *ngIf="schoolForm.get('phoneNumber')?.value && !schoolForm.get('countryCode')?.value">
                <span>{{ 'Please select a country first.' | t }}</span>
              </div>
            </div>
          </div>

          <!-- Admin Account -->
          <div class="form-section-title">{{ 'Admin Account' | t }}</div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ 'Admin Email' | t }} <span class="required">*</span></label>
              <input formControlName="adminEmail" type="email" placeholder="e.g. admin&#64;school.com" />
              <div class="field-error" *ngIf="showError('adminEmail')">
                <span *ngIf="schoolForm.get('adminEmail')?.errors?.['required']">{{ 'Admin email is required.' | t }}</span>
                <span *ngIf="schoolForm.get('adminEmail')?.errors?.['email']">{{ 'Enter a valid email address.' | t }}</span>
              </div>
            </div>
            <div class="form-group">
              <label>{{ 'Admin Password' | t }} <span class="required">*</span></label>
              <div class="password-wrapper">
                <input formControlName="adminPassword" [type]="showPassword ? 'text' : 'password'" [placeholder]="'Min 8 chars, uppercase, number, symbol' | t" />
                <button type="button" class="toggle-password" (click)="showPassword = !showPassword">
                  {{ showPassword ? '🙈' : '👁' }}
                </button>
              </div>
              <div class="password-strength" *ngIf="schoolForm.get('adminPassword')?.value">
                <div class="strength-bar">
                  <div class="strength-fill" [style.width.%]="passwordStrength" [class]="passwordStrengthClass"></div>
                </div>
                <span class="strength-label" [class]="passwordStrengthClass">{{ passwordStrengthLabel | t }}</span>
              </div>
              <div class="field-error" *ngIf="showError('adminPassword')">
                <span *ngIf="schoolForm.get('adminPassword')?.errors?.['required']">{{ 'Password is required.' | t }}</span>
                <span *ngIf="schoolForm.get('adminPassword')?.errors?.['minlength']">{{ 'Must be at least 8 characters.' | t }}</span>
                <span *ngIf="schoolForm.get('adminPassword')?.errors?.['passwordStrength']">
                  {{ schoolForm.get('adminPassword')?.errors?.['passwordStrength'] | t }}
                </span>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ 'Admin First Name' | t }} <span class="required">*</span></label>
              <input formControlName="adminFirstName" [placeholder]="'e.g. Ahmed' | t" />
              <div class="field-error" *ngIf="showError('adminFirstName')">
                <span *ngIf="schoolForm.get('adminFirstName')?.errors?.['required']">{{ 'First name is required.' | t }}</span>
                <span *ngIf="schoolForm.get('adminFirstName')?.errors?.['minlength']">{{ 'Must be at least 2 characters.' | t }}</span>
                <span *ngIf="schoolForm.get('adminFirstName')?.errors?.['maxlength']">{{ 'Must be under 50 characters.' | t }}</span>
              </div>
            </div>
            <div class="form-group">
              <label>{{ 'Admin Last Name' | t }} <span class="required">*</span></label>
              <input formControlName="adminLastName" [placeholder]="'e.g. Fahmy' | t" />
              <div class="field-error" *ngIf="showError('adminLastName')">
                <span *ngIf="schoolForm.get('adminLastName')?.errors?.['required']">{{ 'Last name is required.' | t }}</span>
                <span *ngIf="schoolForm.get('adminLastName')?.errors?.['minlength']">{{ 'Must be at least 2 characters.' | t }}</span>
                <span *ngIf="schoolForm.get('adminLastName')?.errors?.['maxlength']">{{ 'Must be under 50 characters.' | t }}</span>
              </div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-submit" [disabled]="creating || schoolForm.invalid">
            {{ (creating ? 'Creating...' : 'Create School') | t }}
          </button>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-header card-header-rose">
        <h4 class="card-title">{{ 'Schools' | t }}</h4>
        <p class="card-category">{{ 'Manage school tenants' | t }}</p>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>{{ 'School Name' | t }}</th><th>{{ 'Subdomain' | t }}</th><th>{{ 'Email' | t }}</th><th>{{ 'Phone' | t }}</th><th>{{ 'Status' | t }}</th><th>{{ 'Actions' | t }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let t of tenants">
                <td>{{ t.name }}</td>
                <td>{{ t.code }}</td>
                <td>{{ t.email || '—' }}</td>
                <td>{{ t.phone || '—' }}</td>
                <td><span [class]="t.isActive ? 'badge-active' : 'badge-inactive'">{{ (t.isActive ? 'Active' : 'Inactive') | t }}</span></td>
                <td>
                  <button class="btn btn-sm btn-danger" (click)="deactivate(t.id)" *ngIf="t.isActive">{{ 'Deactivate' | t }}</button>
                  <button class="btn btn-sm btn-success" (click)="reactivate(t.id)" *ngIf="!t.isActive">{{ 'Reactivate' | t }}</button>
                </td>
              </tr>
              <tr *ngIf="tenants.length === 0">
                <td colspan="6" class="empty-row">{{ 'No schools found. Click "+ Add School" to create one.' | t }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .btn-submit { margin-top: 8px; }
  `]
})
export class TenantListComponent implements OnInit {
  tenants: TenantDto[] = [];
  showForm = false;
  errorMessage = '';
  successMessage = '';
  creating = false;
  showPassword = false;
  countries = COUNTRY_CODES;

  schoolForm!: FormGroup;

  get selectedCountry(): CountryCode | undefined {
    const code = this.schoolForm?.get('countryCode')?.value;
    return code ? this.countries.find(c => c.code === code) : undefined;
  }

  get passwordStrength(): number {
    const pw = this.schoolForm?.get('adminPassword')?.value || '';
    let score = 0;
    if (pw.length >= 8) score += 25;
    if (/[A-Z]/.test(pw)) score += 25;
    if (/[0-9]/.test(pw)) score += 25;
    if (/[^A-Za-z0-9]/.test(pw)) score += 25;
    return score;
  }

  get passwordStrengthClass(): string {
    const s = this.passwordStrength;
    if (s <= 25) return 'weak';
    if (s <= 50) return 'fair';
    if (s <= 75) return 'good';
    return 'strong';
  }

  get passwordStrengthLabel(): string {
    const s = this.passwordStrength;
    if (s <= 25) return 'Weak';
    if (s <= 50) return 'Fair';
    if (s <= 75) return 'Good';
    return 'Strong';
  }

  constructor(private tenantService: TenantService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
    this.load();
  }

  initForm(): void {
    this.schoolForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      code: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)]],
      email: ['', [Validators.email]],
      countryCode: [''],
      phoneNumber: ['', [this.phoneValidator.bind(this)]],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminPassword: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
      adminFirstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      adminLastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    });

    // Re-validate phone when country changes
    this.schoolForm.get('countryCode')?.valueChanges.subscribe(() => {
      this.schoolForm.get('phoneNumber')?.updateValueAndValidity();
    });
  }

  phoneValidator(control: AbstractControl): ValidationErrors | null {
    const phone = control.value;
    if (!phone) return null; // phone is optional
    const countryCode = this.schoolForm?.get('countryCode')?.value;
    if (!countryCode) return null; // no country = skip validation (separate hint shown)
    const country = this.countries.find(c => c.code === countryCode);
    if (!country) return null;
    const digitsOnly = phone.replace(/[\s\-()]/g, '');
    return country.phonePattern.test(digitsOnly) ? null : { invalidPhone: true };
  }

  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const pw = control.value;
    if (!pw) return null;
    if (!/[A-Z]/.test(pw)) return { passwordStrength: 'Must contain at least one uppercase letter.' };
    if (!/[a-z]/.test(pw)) return { passwordStrength: 'Must contain at least one lowercase letter.' };
    if (!/[0-9]/.test(pw)) return { passwordStrength: 'Must contain at least one number.' };
    if (!/[^A-Za-z0-9]/.test(pw)) return { passwordStrength: 'Must contain at least one special character (@, #, $, etc.).' };
    return null;
  }

  showError(field: string): boolean {
    const ctrl = this.schoolForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.errorMessage = '';
    if (this.showForm) {
      this.initForm();
    }
  }

  load(): void {
    this.tenantService.getAll().subscribe({
      next: t => this.tenants = t,
      error: (err: HttpErrorResponse) => {
        this.errorMessage = this.extractError(err);
      }
    });
  }

  create(): void {
    if (this.schoolForm.invalid) {
      this.schoolForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.creating = true;

    const v = this.schoolForm.value;
    const phone = v.phoneNumber
      ? (this.selectedCountry ? this.selectedCountry.dial + v.phoneNumber.replace(/[\s\-()]/g, '') : v.phoneNumber)
      : undefined;

    const payload = {
      name: v.name.trim(),
      code: v.code.trim(),
      email: v.email?.trim() || undefined,
      phone: phone || undefined,
      adminEmail: v.adminEmail.trim(),
      adminPassword: v.adminPassword,
      adminFirstName: v.adminFirstName.trim(),
      adminLastName: v.adminLastName.trim(),
    };

    this.tenantService.create(payload).subscribe({
      next: () => {
        this.showForm = false;
        this.creating = false;
        this.successMessage = 'School created successfully!';
        this.load();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err: HttpErrorResponse) => {
        this.creating = false;
        this.errorMessage = this.extractError(err);
      }
    });
  }

  deactivate(id: string): void {
    if (confirm('Deactivate this school?')) {
      this.errorMessage = '';
      this.tenantService.deactivate(id).subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          this.errorMessage = this.extractError(err);
        }
      });
    }
  }

  reactivate(id: string): void {
    if (confirm('Reactivate this school?')) {
      this.errorMessage = '';
      this.tenantService.reactivate(id).subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          this.errorMessage = this.extractError(err);
        }
      });
    }
  }

  private extractError(err: HttpErrorResponse): string {
    if (err.error?.error) return err.error.error;
    if (err.error?.message) return err.error.message;
    if (typeof err.error === 'string') return err.error;
    if (err.message) return err.message;
    return 'An unexpected error occurred. Please try again.';
  }
}
