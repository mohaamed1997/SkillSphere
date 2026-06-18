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

      <!-- ── Left brand panel ── -->
      <div class="brand-panel">
        <div class="logo-section">
          <div class="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <span class="brand-name">SkillSphere</span>
        </div>

        <div class="hero-content">
          <h1 class="hero-title">{{ 'School Management Platform' | t }}</h1>
          <p class="hero-subtitle">{{ 'Attendance, grades, timetables and reports ! all in one place.' | t }}</p>
          <ul class="features-list">
            <li class="feature-item">
              <span class="feature-icon">✓</span>
              <span>{{ 'Real-time attendance tracking' | t }}</span>
            </li>
            <li class="feature-item">
              <span class="feature-icon">✓</span>
              <span>{{ 'Automated grade calculations' | t }}</span>
            </li>
            <li class="feature-item">
              <span class="feature-icon">✓</span>
              <span>{{ 'Parent-teacher communication' | t }}</span>
            </li>
          </ul>
        </div>

        <div></div>
      </div>

      <!-- ── Right form panel ── -->
      <div class="form-panel">
        <button type="button" class="lang-switch" (click)="i18n.toggle()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          {{ i18n.lang() === 'ar' ? 'English' : 'العربية' }}
        </button>

        <div class="form-container" [class.shake]="shaking">
          <div class="form-header">
            <h2 class="form-title">{{ 'Sign in' | t }}</h2>
            <p class="form-subtitle">{{ 'Welcome back, please enter your details' | t }}</p>
          </div>

          <div class="error-box" *ngIf="error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ error }}
          </div>

          <form (ngSubmit)="onLogin()">
            <div class="form-group">
              <label class="form-label">{{ 'Email' | t }}</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input type="email" [(ngModel)]="email" name="email" required
                       class="form-input" placeholder="admin@school.com" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">{{ 'Password' | t }}</label>
              <div class="input-wrapper has-toggle">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" name="password" required
                       class="form-input" placeholder="••••••••" />
                <button type="button" class="password-toggle" (click)="togglePassword()">
                  <svg *ngIf="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg *ngIf="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="form-options">
              <label class="remember-me">
                <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" />
                <span>{{ 'Remember me' | t }}</span>
              </label>
              <a href="#" class="forgot-link">{{ 'Forgot password?' | t }}</a>
            </div>

            <button type="submit" class="btn-login" [disabled]="loading">
              {{ (loading ? 'Signing in...' : 'Sign In') | t }}
            </button>
          </form>

          <p class="signup-prompt">
            {{ "Don't have an account?" | t }}
            <a href="#">{{ 'Contact administrator' | t }}</a>
          </p>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      min-height: 100vh;
      overflow-x: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* ── Left brand panel ── */
    .brand-panel {
      flex: 1;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      display: none;
      flex-direction: column;
      justify-content: space-between;
      padding: 3rem;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: -50%; right: -20%;
        width: 600px; height: 600px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 50%;
        pointer-events: none;
      }

      &::after {
        content: '';
        position: absolute;
        bottom: -30%; left: -10%;
        width: 400px; height: 400px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 50%;
        pointer-events: none;
      }
    }

    @media (min-width: 900px) {
      .brand-panel { display: flex; }
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      position: relative;
      z-index: 1;
    }

    .logo-icon {
      width: 40px; height: 40px;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .brand-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
      letter-spacing: -0.02em;
    }

    .hero-content {
      position: relative;
      z-index: 1;
      max-width: 400px;
    }

    .hero-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: white;
      line-height: 1.15;
      margin: 0 0 1rem;
      letter-spacing: -0.02em;
    }

    .hero-subtitle {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.75);
      line-height: 1.6;
      margin: 0;
    }

    .features-list {
      list-style: none;
      margin: 1.5rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.9rem;
    }

    .feature-icon {
      width: 20px; height: 20px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem;
      flex-shrink: 0;
    }

    /* ── Right form panel ── */
    .form-panel {
      flex: 1;
      background: var(--page-bg);
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 3rem;
      position: relative;
    }

    .lang-switch {
      position: absolute;
      top: 1.5rem; right: 1.5rem;
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px;
      background: var(--surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-pill);
      font-size: 12px; font-weight: 500; color: var(--gray-700);
      cursor: pointer; font-family: inherit;
      transition: all 0.2s;

      svg { color: var(--gray-400); }
      &:hover {
        background: var(--gray-100);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }
    }

    .form-container {
      max-width: 400px;
      width: 100%;
      margin: 0 auto;
      animation: slideIn 0.4s ease-out;

      &.shake { animation: shake 0.5s; }
    }

    .form-header { margin-bottom: 2rem; }

    .form-title {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--gray-900);
      margin: 0 0 0.375rem;
      letter-spacing: -0.01em;
    }

    .form-subtitle {
      color: var(--gray-500);
      font-size: 0.9375rem;
      margin: 0;
    }

    .error-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--danger-light);
      color: #b91c1c;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(239, 68, 68, 0.2);
      font-size: 0.875rem;
      margin-bottom: 1.25rem;
    }

    .form-group { margin-bottom: 1.25rem; }

    .form-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--gray-700);
      margin-bottom: 0.375rem;
    }

    .input-wrapper {
      position: relative;
      transition: transform 0.15s;
      &:focus-within { transform: scale(1.01); }
    }

    .input-icon {
      position: absolute;
      left: 0.875rem;
      top: 50%;
      transform: translateY(-50%);
      width: 18px; height: 18px;
      color: var(--gray-400);
      pointer-events: none;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem 0.75rem 2.625rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      font-size: 0.9375rem;
      font-family: inherit;
      color: var(--gray-800);
      background: var(--surface);
      transition: all 0.2s;
      outline: none;
      box-sizing: border-box;

      &:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-light);
      }
      &::placeholder { color: var(--gray-400); }
    }

    .has-toggle .form-input { padding-right: 3rem; }

    .password-toggle {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: var(--gray-400);
      padding: 0.25rem;
      display: flex; align-items: center; justify-content: center;
      &:hover { color: var(--gray-700); }
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      font-size: 0.8125rem;
    }

    .remember-me {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--gray-600);
      cursor: pointer;

      input[type="checkbox"] {
        width: 15px; height: 15px;
        accent-color: var(--primary);
        cursor: pointer;
      }
    }

    .forgot-link {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
      &:hover { text-decoration: underline; }
    }

    .btn-login {
      width: 100%;
      padding: 0.875rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: var(--primary-dark);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
      }
      &:active:not(:disabled) { transform: translateY(0); }
      &:disabled { opacity: 0.65; cursor: not-allowed; }
    }

    .signup-prompt {
      text-align: center;
      margin-top: 1.75rem;
      color: var(--gray-500);
      font-size: 0.8125rem;

      a { color: var(--primary); text-decoration: none; font-weight: 600; }
      a:hover { text-decoration: underline; }
    }

    /* ── Animations ── */
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25%       { transform: translateX(-8px); }
      75%       { transform: translateX(8px); }
    }

    /* ── RTL ── */
    :host-context([dir="rtl"]) {
      .lang-switch { right: auto; left: 1.5rem; }
      .input-icon { left: auto; right: 0.875rem; }
      .form-input { padding: 0.75rem 2.625rem 0.75rem 1rem; }
      .has-toggle .form-input { padding: 0.75rem 2.625rem 0.75rem 3rem; }
      .password-toggle { right: auto; left: 0.75rem; }
    }

    /* ── Responsive ── */
    @media (max-width: 899px) {
      .brand-panel {
        display: flex;
        min-height: 160px;
        padding: 1.5rem;
        .features-list { display: none; }
        .hero-title { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .hero-subtitle { font-size: 0.875rem; }
      }
      .login-container { flex-direction: column; }
      .form-panel { padding: 2rem 1.5rem; }
      .lang-switch { top: 1rem; right: 1rem; }
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;
  showPassword = false;
  rememberMe = false;
  shaking = false;
  readonly i18n = inject(I18nService);

  constructor(private auth: AuthService, private router: Router) {
    if (auth.isLoggedIn) this.router.navigate(['/dashboard']);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
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
        this.shaking = true;
        setTimeout(() => { this.shaking = false; }, 500);
      }
    });
  }
}
