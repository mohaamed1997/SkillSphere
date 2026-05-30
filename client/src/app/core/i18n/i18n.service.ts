import { Injectable, signal, computed, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AR_DICTIONARY } from './i18n.dictionary';

export type Lang = 'en' | 'ar';

const STORAGE_KEY = 'skillsphere.lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _lang = signal<Lang>(this.detectInitialLang());
  readonly lang = this._lang.asReadonly();
  readonly dir = computed<'ltr' | 'rtl'>(() => (this._lang() === 'ar' ? 'rtl' : 'ltr'));

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    this.applyDocumentAttrs(this._lang());
  }

  setLang(lang: Lang): void {
    if (this._lang() === lang) return;
    this._lang.set(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    this.applyDocumentAttrs(lang);
  }

  toggle(): void {
    this.setLang(this._lang() === 'ar' ? 'en' : 'ar');
  }

  /**
   * Translate a string. The English source text is used as the lookup key.
   * Supports `{name}` placeholders via the optional `params` map.
   */
  t(key: string, params?: Record<string, unknown>): string {
    if (key == null) return '';
    let out: string;
    if (this._lang() === 'ar') {
      out = AR_DICTIONARY[key] ?? key;
    } else {
      out = key;
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        out = out.split(`{${k}}`).join(String(v));
      }
    }
    return out;
  }

  private detectInitialLang(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ar' || saved === 'en') return saved;
    } catch { /* ignore */ }
    const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
    return nav.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  private applyDocumentAttrs(lang: Lang): void {
    const html = this.document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }
}
