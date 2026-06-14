import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProgressRingSegment {
  value: number;
  color: string;
  label?: string;
}

interface RenderedSegment extends ProgressRingSegment {
  dashArray: string;
  dashOffset: number;
}

@Component({
  selector: 'app-progress-ring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-ring" [style.width.px]="size" [style.height.px]="size">
      <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" [attr.width]="size" [attr.height]="size">
        <circle
          *ngFor="let seg of computedSegments()"
          [attr.cx]="size / 2"
          [attr.cy]="size / 2"
          [attr.r]="radius"
          fill="none"
          [attr.stroke]="seg.color"
          [attr.stroke-width]="strokeWidth"
          [attr.stroke-dasharray]="seg.dashArray"
          [attr.stroke-dashoffset]="seg.dashOffset"
          stroke-linecap="round"
          [attr.transform]="'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'"
        />
      </svg>
      <div class="ring-center">
        <span class="ring-value">{{ centerLabel }}</span>
        <span class="ring-caption" *ngIf="centerCaption">{{ centerCaption }}</span>
      </div>
    </div>
  `,
  styles: [`
    .progress-ring {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ring-center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .ring-value { font-size: 1.375rem; font-weight: 800; color: var(--gray-900); line-height: 1.2; }
    .ring-caption { font-size: 10px; color: var(--gray-400); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }
  `]
})
export class ProgressRingComponent {
  @Input() segments: ProgressRingSegment[] = [];
  @Input() size = 160;
  @Input() strokeWidth = 16;
  @Input() centerLabel = '';
  @Input() centerCaption = '';

  get radius(): number {
    return (this.size - this.strokeWidth) / 2;
  }

  computedSegments(): RenderedSegment[] {
    const circumference = 2 * Math.PI * this.radius;
    const total = this.segments.reduce((sum, s) => sum + s.value, 0) || 1;
    const gap = this.segments.length > 1 ? 6 : 0;
    let cumulative = 0;
    return this.segments.map(seg => {
      const fraction = seg.value / total;
      const dash = Math.max(fraction * circumference - gap, 0);
      const dashOffset = -cumulative * circumference;
      cumulative += fraction;
      return { ...seg, dashArray: `${dash} ${circumference - dash}`, dashOffset };
    });
  }
}
