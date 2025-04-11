import { Component, Inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { CommonModule } from '@angular/common';
import { ParticlesBackgroundComponent } from '../../shared/particles/particles-background.component';

@Component({
  selector: 'app-home',
  imports: [CommonModule, ParticlesBackgroundComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  constructor(
    @Inject(DOCUMENT) public document: Document,
    public auth: AuthService
  ) {}

  ngOnInit(): void {}
}
