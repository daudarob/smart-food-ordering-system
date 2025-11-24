// Futuristic Interaction System - Gesture-Based Controls & AI-Driven Layouts
// Implements advanced user interaction patterns for the Settings page

export interface GestureConfig {
  enableGestures: boolean;
  gestureSensitivity: number;
  aiAdaptation: boolean;
  hapticFeedback: boolean;
}

export interface InteractionState {
  isDragging: boolean;
  dragStart: { x: number; y: number };
  velocity: { x: number; y: number };
  scale: number;
  rotation: number;
  lastInteraction: number;
}

export class FuturisticInteractionManager {
  private element: HTMLElement;
  private config: GestureConfig;
  private state: InteractionState;
  private animationFrame: number | null = null;
  private observers: Set<(event: CustomEvent) => void> = new Set();

  constructor(element: HTMLElement, config: Partial<GestureConfig> = {}) {
    this.element = element;
    this.config = {
      enableGestures: true,
      gestureSensitivity: 1,
      aiAdaptation: true,
      hapticFeedback: true,
      ...config
    };

    this.state = {
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      lastInteraction: Date.now()
    };

    this.initializeInteractions();
  }

  private initializeInteractions(): void {
    if (!this.config.enableGestures) return;

    // Touch Events
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

    // Mouse Events (for desktop)
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.element.addEventListener('mouseleave', this.handleMouseLeave.bind(this));

    // Wheel Events for 3D manipulation
    this.element.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

    // Keyboard Events for accessibility
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Motion Events (if supported)
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this));
    }
  }

  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.startInteraction(event.touches[0].clientX, event.touches[0].clientY);
    } else if (event.touches.length === 2) {
      // Pinch gesture
      this.handlePinchStart(event);
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();

    if (event.touches.length === 1 && this.state.isDragging) {
      this.updateInteraction(event.touches[0].clientX, event.touches[0].clientY);
    } else if (event.touches.length === 2) {
      this.handlePinchMove(event);
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      this.endInteraction();
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    this.startInteraction(event.clientX, event.clientY);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.state.isDragging) {
      this.updateInteraction(event.clientX, event.clientY);
    }
  }

  private handleMouseUp(): void {
    this.endInteraction();
  }

  private handleMouseLeave(): void {
    if (this.state.isDragging) {
      this.endInteraction();
    }
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    const delta = event.deltaY * 0.001 * this.config.gestureSensitivity;
    this.state.scale = Math.max(0.5, Math.min(2, this.state.scale - delta));

    this.updateElementTransform();
    this.emitEvent('scale', { scale: this.state.scale, delta });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const step = 10 * this.config.gestureSensitivity;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.adjustRotation(5);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.adjustRotation(-5);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.adjustPosition(-step, 0);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.adjustPosition(step, 0);
        break;
      case '+':
      case '=':
        event.preventDefault();
        this.adjustScale(0.1);
        break;
      case '-':
        event.preventDefault();
        this.adjustScale(-0.1);
        break;
    }
  }

  private handleDeviceMotion(event: DeviceMotionEvent): void {
    if (!this.config.aiAdaptation) return;

    const acceleration = event.accelerationIncludingGravity;
    if (acceleration && acceleration.x !== null && acceleration.y !== null) {
      // Subtle parallax effect based on device tilt
      const tiltX = acceleration.x * 0.01;
      const tiltY = acceleration.y * 0.01;

      this.element.style.transform += ` translate(${tiltX}px, ${tiltY}px)`;
    }
  }

  private startInteraction(x: number, y: number): void {
    this.state.isDragging = true;
    this.state.dragStart = { x, y };
    this.state.velocity = { x: 0, y: 0 };
    this.state.lastInteraction = Date.now();

    this.element.style.cursor = 'grabbing';
    this.emitEvent('interaction-start', { x, y });

    if (this.config.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  private updateInteraction(x: number, y: number): void {
    const deltaX = x - this.state.dragStart.x;
    const deltaY = y - this.state.dragStart.y;

    this.state.velocity.x = deltaX * 0.1;
    this.state.velocity.y = deltaY * 0.1;

    this.adjustPosition(deltaX, deltaY);
    this.emitEvent('interaction-update', { x, y, deltaX, deltaY });
  }

  private endInteraction(): void {
    this.state.isDragging = false;
    this.element.style.cursor = 'grab';

    // Apply momentum
    if (Math.abs(this.state.velocity.x) > 0.1 || Math.abs(this.state.velocity.y) > 0.1) {
      this.applyMomentum();
    }

    this.emitEvent('interaction-end', {
      velocity: this.state.velocity,
      duration: Date.now() - this.state.lastInteraction
    });
  }

  private adjustPosition(deltaX: number, deltaY: number): void {
    const currentTransform = this.element.style.transform || '';
    const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);

    let currentX = 0, currentY = 0;
    if (translateMatch) {
      currentX = parseFloat(translateMatch[1]);
      currentY = parseFloat(translateMatch[2]);
    }

    const newX = currentX + deltaX * this.config.gestureSensitivity;
    const newY = currentY + deltaY * this.config.gestureSensitivity;

    this.updateElementTransform(`translate(${newX}px, ${newY}px)`);
  }

  private adjustRotation(delta: number): void {
    this.state.rotation = (this.state.rotation + delta) % 360;
    this.updateElementTransform();
    this.emitEvent('rotation', { rotation: this.state.rotation, delta });
  }

  private adjustScale(delta: number): void {
    this.state.scale = Math.max(0.5, Math.min(2, this.state.scale + delta));
    this.updateElementTransform();
    this.emitEvent('scale', { scale: this.state.scale, delta });
  }

  private updateElementTransform(additionalTransform = ''): void {
    const transforms = [
      `scale(${this.state.scale})`,
      `rotate(${this.state.rotation}deg)`,
      additionalTransform
    ].filter(Boolean);

    this.element.style.transform = transforms.join(' ');
  }

  private applyMomentum(): void {
    let momentumApplied = false;

    const applyFrame = () => {
      if (Math.abs(this.state.velocity.x) < 0.01 && Math.abs(this.state.velocity.y) < 0.01) {
        if (momentumApplied) {
          this.animationFrame = null;
        }
        return;
      }

      momentumApplied = true;
      this.adjustPosition(this.state.velocity.x, this.state.velocity.y);

      this.state.velocity.x *= 0.95;
      this.state.velocity.y *= 0.95;

      this.animationFrame = requestAnimationFrame(applyFrame);
    };

    this.animationFrame = requestAnimationFrame(applyFrame);
  }

  private handlePinchStart(event: TouchEvent): void {
    // Calculate initial distance between touches
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const initialDistance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );

    (this as any).initialPinchDistance = initialDistance;
    (this as any).initialScale = this.state.scale;
  }

  private handlePinchMove(event: TouchEvent): void {
    if (!(this as any).initialPinchDistance) return;

    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const currentDistance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );

    const scaleChange = currentDistance / (this as any).initialPinchDistance;
    this.state.scale = Math.max(0.5, Math.min(2, (this as any).initialScale * scaleChange));

    this.updateElementTransform();
    this.emitEvent('pinch', { scale: this.state.scale, scaleChange });
  }

  private emitEvent(type: string, detail: any): void {
    const event = new CustomEvent(`futuristic:${type}`, {
      detail: { ...detail, element: this.element, timestamp: Date.now() }
    });

    this.element.dispatchEvent(event);

    // Notify observers
    this.observers.forEach(observer => observer(event));
  }

  // Public API
  public updateConfig(newConfig: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public resetTransform(): void {
    this.state.scale = 1;
    this.state.rotation = 0;
    this.updateElementTransform('translate(0px, 0px)');
    this.emitEvent('reset', {});
  }

  public getState(): InteractionState {
    return { ...this.state };
  }

  public subscribe(callback: (event: CustomEvent) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  public destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    // Remove all event listeners
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.element.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.element.removeEventListener('wheel', this.handleWheel.bind(this));
    this.element.removeEventListener('keydown', this.handleKeyDown.bind(this));

    if (window.DeviceMotionEvent) {
      window.removeEventListener('devicemotion', this.handleDeviceMotion.bind(this));
    }
  }
}

// AI-Driven Adaptive Layout System
export class AdaptiveLayoutManager {
  private container: HTMLElement;
  private contentAreas: HTMLElement[];
  private aiEngine: AILayoutEngine;

  constructor(container: HTMLElement) {
    this.container = container;
    this.contentAreas = Array.from(container.querySelectorAll('[data-adaptive-area]'));
    this.aiEngine = new AILayoutEngine();

    this.initializeAdaptiveLayout();
  }

  private initializeAdaptiveLayout(): void {
    // Observe user interactions and adapt layout
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.adaptLayoutForElement(entry.target as HTMLElement);
        }
      });
    });

    this.contentAreas.forEach(area => observer.observe(area));

    // Listen for interaction events
    this.container.addEventListener('futuristic:interaction-update', (event: any) => {
      this.handleInteraction(event.detail);
    });
  }

  private adaptLayoutForElement(element: HTMLElement): void {
    const userPreferences = this.aiEngine.analyzeUserBehavior();
    const optimalLayout = this.aiEngine.calculateOptimalLayout(element, userPreferences);

    this.applyLayoutChanges(element, optimalLayout);
  }

  private handleInteraction(detail: any): void {
    // Update AI model with interaction data
    this.aiEngine.updateModel(detail);

    // Adapt layout based on interaction patterns
    const adaptations = this.aiEngine.generateAdaptations(detail);
    adaptations.forEach(adaptation => {
      this.applyAdaptation(adaptation);
    });
  }

  private applyLayoutChanges(element: HTMLElement, layout: any): void {
    element.style.gridColumn = layout.gridColumn || 'auto';
    element.style.gridRow = layout.gridRow || 'auto';
    element.style.order = layout.order || '0';

    if (layout.animation) {
      element.style.animation = layout.animation;
    }
  }

  private applyAdaptation(adaptation: any): void {
    const target = this.container.querySelector(adaptation.selector);
    if (target) {
      Object.assign(target.style, adaptation.styles);
    }
  }
}

// Simplified AI Layout Engine (conceptual implementation)
class AILayoutEngine {
  private userModel: Map<string, any> = new Map();

  analyzeUserBehavior(): any {
    // Analyze interaction patterns, time spent, preferences
    return {
      preferredContentSize: 'medium',
      interactionStyle: 'gestural',
      attentionSpan: 'focused'
    };
  }

  calculateOptimalLayout(_element: HTMLElement, _preferences: any): any {
    // Calculate optimal layout based on AI analysis
    return {
      gridColumn: 'span 2',
      order: '1',
      animation: 'adaptive-appear 0.5s ease-out'
    };
  }

  updateModel(interaction: any): void {
    // Update internal model with interaction data
    const key = `${interaction.type}-${Date.now()}`;
    this.userModel.set(key, interaction);
  }

  generateAdaptations(interaction: any): any[] {
    // Generate layout adaptations based on interaction
    return [
      {
        selector: '.adaptive-card',
        styles: {
          transform: `scale(${1 + interaction.deltaX * 0.001})`,
          transition: 'transform 0.3s ease'
        }
      }
    ];
  }
}

// Global initialization
export function initializeFuturisticInteractions(): void {
  // Initialize on settings page
  const settingsContainer = document.querySelector('.settings-futuristic');
  if (settingsContainer) {
    const interactionManager = new FuturisticInteractionManager(settingsContainer as HTMLElement, {
      enableGestures: true,
      gestureSensitivity: 0.8,
      aiAdaptation: true,
      hapticFeedback: true
    });

    const layoutManager = new AdaptiveLayoutManager(settingsContainer as HTMLElement);

    // Make managers globally available for debugging
    (window as any).futuristicInteractionManager = interactionManager;
    (window as any).adaptiveLayoutManager = layoutManager;
  }
}

// Auto-initialize when DOM is ready - DISABLED for performance
// Animations and interactions removed as requested
// if (typeof document !== 'undefined') {
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initializeFuturisticInteractions);
//   } else {
//     initializeFuturisticInteractions();
//   }
// }