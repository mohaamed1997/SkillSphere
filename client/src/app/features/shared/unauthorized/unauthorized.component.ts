import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="unauthorized">
      <i class="material-icons" style="font-size:80px;color:#f44336;margin-bottom:16px">block</i>
      <h1>403</h1>
      <h2>{{ 'Access Denied' | t }}</h2>
      <p>{{ "You don't have permission to access this page." | t }}</p>
      <a routerLink="/dashboard" class="btn btn-primary btn-round">{{ 'Go to Dashboard' | t }}</a>
    </div>
  `,
  styles: [`
    .unauthorized { text-align: center; padding: 4rem 2rem; }
    h1 { font-size: 5rem; margin: 0; color: #f44336; font-weight: 300; }
    h2 { margin: 8px 0 12px; color: #3c4858; font-weight: 300; }
    p { color: #999; margin-bottom: 24px; }
  `]
})
export class UnauthorizedComponent {}
