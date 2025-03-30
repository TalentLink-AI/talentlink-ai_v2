import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-container">
      <header>
        <h1>TalentLink</h1>
        <div class="nav-links">
          <a routerLink="/login">Login</a>
        </div>
      </header>

      <main>
        <section class="hero">
          <h1>Connect with Top Talent</h1>
          <p>
            Find the right professionals for your projects or showcase your
            skills to potential clients.
          </p>
          <a routerLink="/login" class="cta-button">Get Started</a>
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      .home-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 0;
      }

      .nav-links a {
        margin-left: 20px;
        text-decoration: none;
        color: #0056b3;
      }

      .hero {
        text-align: center;
        padding: 100px 0;
      }

      .hero h1 {
        font-size: 48px;
        margin-bottom: 20px;
      }

      .hero p {
        font-size: 18px;
        margin-bottom: 30px;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
      }

      .cta-button {
        display: inline-block;
        padding: 12px 24px;
        background-color: #0056b3;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
      }

      .cta-button:hover {
        background-color: #003d82;
      }
    `,
  ],
})
export class HomeComponent {}
