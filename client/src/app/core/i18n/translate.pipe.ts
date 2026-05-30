import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * Translate pipe. Usage:
 *   {{ 'Save' | t }}
 *   {{ 'Assign {count} Student(s)' | t:{ count: 5 } }}
 *
 * The pipe is `pure: false` so it re-evaluates whenever change detection runs,
 * which is sufficient because lang changes always trigger CD via the signal.
 */
@Pipe({
  name: 't',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string | null | undefined, params?: Record<string, unknown>): string {
    // Read the signal so Angular tracks dependency.
    this.i18n.lang();
    return this.i18n.t(key ?? '', params);
  }
}
