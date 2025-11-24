// Theme Manager for Campus Cafeteria Ordering System
// Handles dynamic theme switching with persistence and accessibility

import { lightTheme, darkTheme, getTheme, validateContrast, isAccessibleColor } from './design-tokens';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ColorScheme = 'default' | 'high-contrast' | 'color-blind-friendly';

export interface ThemeConfig {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  reducedMotion: boolean;
  highContrast: boolean;
}

export class ThemeManager {
  private static instance: ThemeManager;
  private currentConfig: ThemeConfig;
  private mediaQuery: MediaQueryList;
  private observers: Set<(config: ThemeConfig) => void> = new Set();

  private constructor() {
    // Initialize with saved preferences or defaults
    this.currentConfig = this.loadSavedConfig();

    // Listen for system theme changes
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));

    // Listen for accessibility preferences
    this.setupAccessibilityListeners();

    // Apply initial theme
    this.applyTheme();
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  // Public API Methods
  setTheme(mode: ThemeMode): void {
    this.currentConfig.mode = mode;
    this.saveConfig();
    this.applyTheme();
    this.notifyObservers();
  }

  setColorScheme(scheme: ColorScheme): void {
    this.currentConfig.colorScheme = scheme;
    this.saveConfig();
    this.applyTheme();
    this.notifyObservers();
  }

  toggleTheme(): void {
    const newMode = this.currentConfig.mode === 'light' ? 'dark' : 'light';
    this.setTheme(newMode);
  }

  getCurrentConfig(): ThemeConfig {
    return { ...this.currentConfig };
  }

  subscribe(callback: (config: ThemeConfig) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  // Validation and Accessibility Methods
  validateColorContrast(foreground: string, background: string): boolean {
    return validateContrast(foreground, background);
  }

  isColorAccessible(color: string): boolean {
    return isAccessibleColor(color);
  }

  // Utility Methods
  getThemeColors(): typeof lightTheme {
    const isDark = this.shouldUseDarkTheme();
    return getTheme(isDark);
  }

  getCSSVariableValue(variable: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }

  // Private Methods
  private loadSavedConfig(): ThemeConfig {
    try {
      const saved = localStorage.getItem('cafeteria-theme-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          mode: parsed.mode || 'auto',
          colorScheme: parsed.colorScheme || 'default',
          reducedMotion: parsed.reducedMotion ?? this.detectReducedMotion(),
          highContrast: parsed.highContrast ?? this.detectHighContrast(),
        };
      }
    } catch (error) {
      console.warn('Failed to load saved theme config:', error);
    }

    return {
      mode: 'auto',
      colorScheme: 'default',
      reducedMotion: this.detectReducedMotion(),
      highContrast: this.detectHighContrast(),
    };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('cafeteria-theme-config', JSON.stringify(this.currentConfig));
    } catch (error) {
      console.warn('Failed to save theme config:', error);
    }
  }

  private shouldUseDarkTheme(): boolean {
    switch (this.currentConfig.mode) {
      case 'light':
        return false;
      case 'dark':
        return true;
      case 'auto':
      default:
        return this.mediaQuery.matches;
    }
  }

  private applyTheme(): void {
    const root = document.documentElement;
    const isDark = this.shouldUseDarkTheme();

    // Set theme attribute
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Apply color scheme
    root.setAttribute('data-color-scheme', this.currentConfig.colorScheme);

    // Apply accessibility preferences
    if (this.currentConfig.reducedMotion) {
      root.setAttribute('data-reduced-motion', 'true');
    } else {
      root.removeAttribute('data-reduced-motion');
    }

    if (this.currentConfig.highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }

    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(isDark);

    // Apply custom CSS variables for dynamic theming
    this.applyCustomVariables(isDark);
  }

  private applyCustomVariables(isDark: boolean): void {
    const root = document.documentElement;
    const theme = getTheme(isDark);

    // Apply any custom overrides or dynamic colors
    // This can be extended for user customization
    Object.entries(theme).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--dynamic-${key}`, value);
      }
    });
  }

  private updateMetaThemeColor(isDark: boolean): void {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }

    const themeColor = isDark ? darkTheme.primary : lightTheme.primary;
    metaThemeColor.setAttribute('content', themeColor);
  }

  private handleSystemThemeChange(_event: MediaQueryListEvent): void {
    if (this.currentConfig.mode === 'auto') {
      this.applyTheme();
      this.notifyObservers();
    }
  }

  private setupAccessibilityListeners(): void {
    // Listen for reduced motion preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (event) => {
      this.currentConfig.reducedMotion = event.matches;
      this.applyTheme();
      this.notifyObservers();
    });

    // Listen for high contrast preference changes
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    contrastQuery.addEventListener('change', (event) => {
      this.currentConfig.highContrast = event.matches;
      this.applyTheme();
      this.notifyObservers();
    });
  }

  private detectReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private detectHighContrast(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => callback(this.getCurrentConfig()));
  }
}

// Utility function for React components (requires React import in component files)
export const createThemeHook = () => {
  // This would be implemented in a React context provider
  // For now, components can use ThemeManager.getInstance() directly
  return ThemeManager.getInstance();
};

// Global theme instance
export const themeManager = ThemeManager.getInstance();

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  // Ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => themeManager);
  } else {
    themeManager;
  }
}