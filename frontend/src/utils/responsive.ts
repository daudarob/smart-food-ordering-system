// Responsive Design Utilities for USIU-A Smart Food System
// Handles orientation switching and dynamic layout adaptation

export interface OrientationState {
  isPortrait: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
  aspectRatio: number;
}

export interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
  large: number;
}

export const BREAKPOINTS: BreakpointConfig = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  large: 1440
};

export const ORIENTATION_BREAKPOINTS = {
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  // Aspect ratio breakpoints for fine-tuned control
  portraitMobile: '(max-width: 768px) and (orientation: portrait)',
  landscapeMobile: '(max-width: 768px) and (orientation: landscape)',
  portraitTablet: '(min-width: 769px) and (max-width: 1024px) and (orientation: portrait)',
  landscapeTablet: '(min-width: 769px) and (max-width: 1024px) and (orientation: landscape)',
  portraitDesktop: '(min-width: 1025px) and (orientation: portrait)',
  landscapeDesktop: '(min-width: 1025px) and (orientation: landscape)'
};

// Orientation detection and state management
export class OrientationManager {
  private listeners: Set<(state: OrientationState) => void> = new Set();
  private currentState: OrientationState;

  constructor() {
    this.currentState = this.getCurrentOrientation();
    this.bindEvents();
  }

  private getCurrentOrientation(): OrientationState {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const aspectRatio = screenWidth / screenHeight;
    const isLandscape = screenWidth > screenHeight;

    return {
      isPortrait: !isLandscape,
      isLandscape,
      screenWidth,
      screenHeight,
      aspectRatio
    };
  }

  private bindEvents(): void {
    // Orientation change event (mobile devices)
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));

    // Resize event for desktop orientation simulation
    window.addEventListener('resize', this.handleResize.bind(this));

    // Match media queries for orientation
    Object.entries(ORIENTATION_BREAKPOINTS).forEach(([key, query]) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', this.handleMediaQueryChange.bind(this, key));
    });
  }

  private handleOrientationChange(): void {
    // Delay to allow browser to complete orientation change
    setTimeout(() => {
      this.updateOrientation();
    }, 100);
  }

  private handleResize(): void {
    // Debounce resize events
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.updateOrientation();
    }, 150);
  }

  private resizeTimeout: number | undefined;

  private handleMediaQueryChange(key: string, event: MediaQueryListEvent): void {
    console.log(`Orientation breakpoint ${key} changed:`, event.matches);
    this.updateOrientation();
  }

  private updateOrientation(): void {
    const newState = this.getCurrentOrientation();

    // Only update if state actually changed
    if (
      newState.isPortrait !== this.currentState.isPortrait ||
      Math.abs(newState.screenWidth - this.currentState.screenWidth) > 50 ||
      Math.abs(newState.screenHeight - this.currentState.screenHeight) > 50
    ) {
      this.currentState = newState;
      this.notifyListeners(newState);
      this.applyOrientationStyles(newState);
    }
  }

  private notifyListeners(state: OrientationState): void {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in orientation listener:', error);
      }
    });
  }

  private applyOrientationStyles(state: OrientationState): void {
    const root = document.documentElement;

    // Apply CSS custom properties for orientation
    root.style.setProperty('--orientation-is-portrait', state.isPortrait ? '1' : '0');
    root.style.setProperty('--orientation-is-landscape', state.isLandscape ? '1' : '0');
    root.style.setProperty('--screen-aspect-ratio', state.aspectRatio.toString());

    // Apply orientation class to body
    document.body.classList.toggle('orientation-portrait', state.isPortrait);
    document.body.classList.toggle('orientation-landscape', state.isLandscape);

    // Log orientation change for debugging
    console.log('Orientation changed:', {
      isPortrait: state.isPortrait,
      isLandscape: state.isLandscape,
      screenSize: `${state.screenWidth}x${state.screenHeight}`,
      aspectRatio: state.aspectRatio.toFixed(2)
    });
  }

  // Public API
  public subscribe(listener: (state: OrientationState) => void): () => void {
    this.listeners.add(listener);

    // Immediately call with current state
    listener(this.currentState);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCurrentState(): OrientationState {
    return { ...this.currentState };
  }

  public destroy(): void {
    this.listeners.clear();
    window.removeEventListener('orientationchange', this.handleOrientationChange);
    window.removeEventListener('resize', this.handleResize);
  }
}

// Singleton instance
export const orientationManager = new OrientationManager();

// Utility functions for responsive design
export const getDeviceType = (width: number): 'mobile' | 'tablet' | 'desktop' | 'large' => {
  if (width <= BREAKPOINTS.mobile) return 'mobile';
  if (width <= BREAKPOINTS.tablet) return 'tablet';
  if (width <= BREAKPOINTS.desktop) return 'desktop';
  return 'large';
};

export const getResponsiveValue = <T>(
  values: { mobile?: T; tablet?: T; desktop?: T; large?: T; default: T },
  screenWidth: number
): T => {
  const deviceType = getDeviceType(screenWidth);
  return values[deviceType] ?? values.default;
};

// CSS-in-JS utilities for orientation-based styling
export const orientationStyles = {
  portrait: {
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center' as const
  },
  landscape: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    textAlign: 'left' as const
  }
};

// Hook for React components (if using React)
export const useOrientation = () => {
  const [orientation, setOrientation] = React.useState(orientationManager.getCurrentState());

  React.useEffect(() => {
    const unsubscribe = orientationManager.subscribe(setOrientation);
    return unsubscribe;
  }, []);

  return orientation;
};

// Import React conditionally to avoid issues in non-React environments
let React: any = null;
try {
  React = (window as any).React;
} catch {
  // React not available, skip React-specific features
}