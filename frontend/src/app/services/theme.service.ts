// frontend/src/app/services/theme.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private darkModeKey = 'darkMode';
  private darkModeSubject = new BehaviorSubject<boolean>(
    this.getInitialDarkModeState()
  );

  // Observable that components can subscribe to
  public isDarkMode$ = this.darkModeSubject.asObservable();

  constructor() {
    // Apply theme on service initialization
    this.applyTheme(this.darkModeSubject.value);

    // Listen for system preference changes
    this.listenForSystemPreferenceChanges();
  }

  private getInitialDarkModeState(): boolean {
    // Check local storage first
    const storedPreference = localStorage.getItem(this.darkModeKey);

    if (storedPreference !== null) {
      return storedPreference === 'true';
    }

    // Fall back to system preference
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }

  private listenForSystemPreferenceChanges(): void {
    // Only set up listener if no user preference is stored
    if (localStorage.getItem(this.darkModeKey) === null && window.matchMedia) {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', (event) => {
          this.darkModeSubject.next(event.matches);
          this.applyTheme(event.matches);
        });
    }
  }

  toggleTheme(): void {
    const newValue = !this.darkModeSubject.value;
    this.darkModeSubject.next(newValue);
    localStorage.setItem(this.darkModeKey, String(newValue));
    this.applyTheme(newValue);
  }

  setTheme(theme: 'light' | 'dark'): void {
    const isDark = theme === 'dark';
    this.darkModeSubject.next(isDark);
    localStorage.setItem(this.darkModeKey, String(isDark));
    this.applyTheme(isDark);
  }

  private applyTheme(isDarkMode: boolean): void {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }
}
