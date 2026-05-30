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
        {{ i18n.lang() === 'ar' ? 'English' : 'العربية' }}
      </button>
      <div class="login-card">
        <div class="login-header">
          <i class="material-icons login-icon">school</i>
          <h1>{{ 'SkillSphere' | t }}</h1>
          <p>{{ 'School Management Platform' | t }}</p>
        </div>
        <form (ngSubmit)="onLogin()">
          <div class="form-group">
            <label><i class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">email</i> {{ 'Email' | t }}</label>
            <input type="email" [(ngModel)]="email" name="email" required placeholder="admin@school.com" />
          </div>
          <div class="form-group">
            <label><i class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">lock</i> {{ 'Password' | t }}</label>
            <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••" />
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
      display: flex; justify-content: center; align-items: center; min-height: 100vh;
      background: linear-gradient(135deg, #7b1fa2 0%, #e91e63 100%); position: relative;
    }
    .login-card {
      background: #fff; padding: 0; border-radius: 6px; width: 400px;
      box-shadow: 0 10px 30px -12px rgba(0,0,0,0.42), 0 4px 25px 0 rgba(0,0,0,0.12), 0 8px 10px -5px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    .login-header {
      background: linear-gradient(60deg, #ec407a, #d81b60);
      color: #fff; padding: 30px 40px 24px; text-align: center;
    }
    .login-icon { font-size: 48px; margin-bottom: 8px; }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 400; color: #fff; }
    .login-header p { color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 14px; }
    form { padding: 30px 40px 40px; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 6px; font-weight: 400; font-size: 13px; color: #999; text-transform: uppercase; letter-spacing: 0.3px; }
    .form-group input {
      width: 100%; padding: 10px 12px; border: none; border-bottom: 1px solid #ddd;
      border-radius: 0; font-size: 14px; font-family: inherit; color: #3c4858;
      background: transparent; transition: border-color 0.15s; box-sizing: border-box;
    }
    .form-group input:focus { outline: none; border-bottom-color: #e91e63; }
    .login-error {
      display: flex; align-items: center; gap: 8px;
      background: #ffebee; color: #c62828; padding: 10px 14px; border-radius: 4px; margin-bottom: 16px; font-size: 13px;
    }
    .login-error i { font-size: 18px; }
    .btn-login {
      width: 100%; padding: 12px; border: none; border-radius: 4px; font-size: 14px; font-weight: 500;
      text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; font-family: inherit;
      background: linear-gradient(60deg, #ec407a, #d81b60); color: #fff;
      box-shadow: 0 2px 2px 0 rgba(233,30,99,.14), 0 3px 1px -2px rgba(233,30,99,.2), 0 1px 5px 0 rgba(233,30,99,.12);
      transition: box-shadow 0.15s;
    }
    .btn-login:hover { box-shadow: 0 14px 26px -12px rgba(233,30,99,.42), 0 4px 23px 0 rgba(0,0,0,.12), 0 8px 10px -5px rgba(233,30,99,.2); }
    .btn-login:disabled { opacity: 0.65; cursor: not-allowed; }
    .lang-switch {
      position: absolute; top: 16px; right: 16px;
      background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.5);
      border-radius: 18px; padding: 4px 14px; font-size: 12px; cursor: pointer; font-family: inherit;
      backdrop-filter: blur(4px); transition: background 0.15s;
    }
    .lang-switch:hover { background: rgba(255,255,255,0.3); }
    :host-context([dir="rtl"]) .lang-switch { right: auto; left: 16px; }
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
