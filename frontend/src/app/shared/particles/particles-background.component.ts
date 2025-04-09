import {
  Component,
  OnDestroy,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgParticlesModule } from 'ng-particles';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';
import { loadSlim } from '@tsparticles/slim';
import { Engine } from '@tsparticles/engine';

@Component({
  selector: 'app-particles-background',
  standalone: true,
  imports: [NgParticlesModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-particles
      [id]="particlesId"
      [options]="particleOptions()"
      (particlesInit)="particlesInit($event)"
      class="particles-container"
    >
    </ng-particles>
  `,
  styles: [
    `
      .particles-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
        opacity: 0.3;
      }
    `,
  ],
})
export class ParticlesBackgroundComponent implements OnInit, OnDestroy {
  private themeService = inject(ThemeService);
  private subscription: Subscription;
  isDarkMode = signal(false);

  particlesId = 'particles-' + Math.random().toString(36).substring(2, 9);

  constructor() {
    this.subscription = this.themeService.isDarkMode$.subscribe((dark) => {
      this.isDarkMode.set(dark);
    });
  }

  ngOnInit(): void {
    // Ensure theme subscription is active
  }

  async particlesInit(event: any): Promise<void> {
    const engine = event.engine as Engine;
    await loadSlim(engine);
  }

  particleOptions = () => ({
    background: {
      color: this.isDarkMode() ? '#121212' : '#ffffff',
    },
    particles: {
      number: { value: 40 },
      color: { value: '#4B8BFF' },
      shape: { type: 'circle' },
      opacity: { value: 0.4 },
      size: { value: 3 },
      move: {
        enable: true,
        speed: 2,
      },
    },
    interactivity: {
      events: {
        onhover: { enable: true, mode: 'grab' },
        onclick: { enable: true, mode: 'push' },
      },
    },
    retina_detect: true,
  });

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
