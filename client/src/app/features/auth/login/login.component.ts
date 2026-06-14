import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="login-container">
      <button type="button" class="lang-switch" (click)="i18n.toggle()">
        <i class="material-icons">language</i>
        {{ i18n.lang() === 'ar' ? 'English' : 'العربية' }}
      </button>

      <div class="login-panel">
        <div class="brand">
          <span class="brand-icon"><i class="material-icons">school</i></span>
          <span class="brand-name">{{ 'SkillSphere' | t }}</span>
        </div>
        <div class="panel-copy">
          <h2>{{ 'School Management Platform' | t }}</h2>
          <p>{{ 'Attendance, grades, timetables and reports — all in one place.' | t }}</p>
        </div>
      </div>

      <div class="login-card">
        <div class="login-header">
          <h1>{{ 'Sign in' | t }}</h1>
          <p>{{ 'Welcome back, please enter your details' | t }}</p>
        </div>
        <form (ngSubmit)="onLogin()">
          <div class="form-group">
            <label>{{ 'Email' | t }}</label>
            <div class="input-with-icon">
              <i class="material-icons">mail_outline</i>
              <input type="email" [(ngModel)]="email" name="email" required placeholder="admin@school.com" />
            </div>
          </div>
          <div class="form-group">
            <label>{{ 'Password' | t }}</label>
            <div class="input-with-icon">
              <i class="material-icons">lock_outline</i>
              <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••" />
            </div>
          </div>
          <div class="login-error" *ngIf="error">
            <i class="material-icons">error_outline</i>
            {{ error }}
          </div>
          <button type="submit" class="btn-login" [disabled]="loading">
            {{ (loading ? 'Signing in...' : 'Sign In') | t }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex; min-height: 100vh; position: relative;
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    }

    /* Left brand panel */
    .login-panel {
      flex: 1.1; display: none; flex-direction: column; justify-content: space-between;
      padding: 48px; color: #fff;
      background-image: linear-gradient(160deg, #1e3a8a 0%, #2563eb 100%),
                         radial-gradient(circle at 85% 80%, rgba(255,255,255,0.08), transparent 45%);
    }
    @media (min-width: 900px) { .login-panel { display: flex; } }

    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 40px; height: 40px; border-radius: var(--radius-md);
      background: var(--primary); display: flex; align-items: center; justify-content: center;
      i { font-size: 22px; color: #fff; }
    }
    .brand-name { font-size: 18px; font-weight: 700; letter-spacing: 0.2px; }

    .panel-copy h2 { font-size: 2rem; font-weight: 700; color: #fff; margin: 0 0 12px; line-height: 1.3; max-width: 460px; }
    .panel-copy p { font-size: 15px; color: rgba(255,255,255,0.6); max-width: 420px; line-height: 1.6; margin: 0; }

    /* Right form panel */
    .login-card {
      flex: 1; display: flex; flex-direction: column; justify-content: center;
      padding: 40px; max-width: 460px; margin: 0 auto; width: 100%;
    }
    .login-header { margin-bottom: 28px; }
    .login-header h1 { margin: 0; font-size: 1.625rem; font-weight: 700; color: var(--gray-900); }
    .login-header p { color: var(--gray-500); margin: 6px 0 0; font-size: 14px; }

    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 13px; color: var(--gray-600); }
    .input-with-icon {
      position: relative; display: flex; align-items: center;
      i { position: absolute; left: 12px; font-size: 20px; color: var(--gray-400); }
    }
    .input-with-icon input {
      width: 100%; padding: 11px 12px 11px 42px; border: 1px solid var(--border-color);
      border-radius: var(--radius-md); font-size: 14px; font-family: inherit; color: var(--gray-800);
      background: var(--surface); transition: var(--transition); box-sizing: border-box;
    }
    .input-with-icon input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
    .input-with-icon input::placeholder { color: var(--gray-400); }

    .login-error {
      display: flex; align-items: center; gap: 8px;
      background: var(--danger-light); color: #b91c1c; padding: 10px 14px; border-radius: var(--radius-md); margin-bottom: 16px; font-size: 13px;
    }
    .login-error i { font-size: 18px; }

    .btn-login {
      width: 100%; padding: 12px; border: none; border-radius: var(--radius-md); font-size: 14px; font-weight: 600;
      cursor: pointer; font-family: inherit;
      background: var(--primary); color: #fff;
      transition: background 0.15s;
    }
    .btn-login:hover { background: var(--primary-dark); }
    .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

    .lang-switch {
      position: absolute; top: 20px; right: 20px; z-index: 2;
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--surface); color: var(--gray-700); border: 1px solid var(--border-color);
      border-radius: var(--radius-pill); padding: 6px 14px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit;
      transition: background 0.15s;
      i { font-size: 16px; color: var(--gray-400); }
    }
    .lang-switch:hover { background: var(--gray-50); }
    :host-context([dir="rtl"]) .lang-switch { right: auto; left: 20px; }
    :host-context([dir="rtl"]) .input-with-icon i { left: auto; right: 12px; }
    :host-context([dir="rtl"]) .input-with-icon input { padding: 11px 42px 11px 12px; }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;
  readonly i18n = inject(I18nService);

  constructor(private auth: AuthService, private router: Router) {
    if (auth.isLoggedIn) this.router.navigate(['/dashboard']);
  }

  onLogin(): void {
    this.loading = true;
    this.error = '';
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.loading = false;
        this.error = this.i18n.t(err.error?.error || 'Invalid credentials');
      }
    });
  }
}
