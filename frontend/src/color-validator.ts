// Color Validation Tooling for Campus Cafeteria Ordering System
// Automated color validation and contrast checking

export interface ColorValidationResult {
  isValid: boolean;
  contrastRatio: number;
  wcagLevel: 'AA' | 'AAA' | 'Fail';
  issues: string[];
  suggestions: string[];
}

export interface ColorPaletteValidation {
  palette: Record<string, string>;
  results: Record<string, ColorValidationResult>;
  overallScore: number;
  recommendations: string[];
}

// WCAG contrast ratio thresholds
const WCAG_THRESHOLDS = {
  AA: {
    normal: 4.5,
    large: 3.0,
  },
  AAA: {
    normal: 7.0,
    large: 4.5,
  },
};

/**
 * Calculate the contrast ratio between two colors
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Get the relative luminance of a color
 */
function getLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  const { r, g, b } = rgb;

  // Convert to linear RGB
  const toLinear = (c: number) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/**
 * Validate contrast between two colors
 */
export function validateContrast(
  foreground: string,
  background: string,
  isLargeText = false
): ColorValidationResult {
  const contrastRatio = calculateContrastRatio(foreground, background);
  const issues: string[] = [];
  const suggestions: string[] = [];

  let wcagLevel: 'AA' | 'AAA' | 'Fail' = 'Fail';
  let isValid = false;

  const aaThreshold = isLargeText ? WCAG_THRESHOLDS.AA.large : WCAG_THRESHOLDS.AA.normal;
  const aaaThreshold = isLargeText ? WCAG_THRESHOLDS.AAA.large : WCAG_THRESHOLDS.AAA.normal;

  if (contrastRatio >= aaaThreshold) {
    wcagLevel = 'AAA';
    isValid = true;
  } else if (contrastRatio >= aaThreshold) {
    wcagLevel = 'AA';
    isValid = true;
  } else {
    issues.push(`Contrast ratio ${contrastRatio.toFixed(2)} is below WCAG AA requirements (${aaThreshold}:1)`);
    suggestions.push(`Increase contrast to at least ${aaThreshold}:1 for AA compliance`);
    suggestions.push(`Aim for ${aaaThreshold}:1 for AAA compliance`);
  }

  // Additional checks
  if (contrastRatio < 3.0) {
    issues.push('Very low contrast may cause readability issues');
    suggestions.push('Consider using a darker foreground or lighter background');
  }

  return {
    isValid,
    contrastRatio,
    wcagLevel,
    issues,
    suggestions,
  };
}

/**
 * Validate an entire color palette
 */
export function validateColorPalette(
  palette: Record<string, string>,
  backgroundColor: string
): ColorPaletteValidation {
  const results: Record<string, ColorValidationResult> = {};
  const recommendations: string[] = [];
  let totalScore = 0;
  let validCount = 0;

  Object.entries(palette).forEach(([name, color]) => {
    const result = validateContrast(color, backgroundColor);
    results[name] = result;

    if (result.isValid) {
      validCount++;
      totalScore += result.wcagLevel === 'AAA' ? 3 : 2;
    } else {
      totalScore += 0;
    }

    // Add specific recommendations
    if (!result.isValid) {
      recommendations.push(`${name}: ${result.suggestions[0] || 'Improve contrast'}`);
    }
  });

  const overallScore = totalScore / (Object.keys(palette).length * 3); // Max score is 3 per color

  // General recommendations
  if (overallScore < 0.7) {
    recommendations.unshift('Overall palette needs significant contrast improvements');
  } else if (overallScore < 0.9) {
    recommendations.unshift('Consider enhancing contrast for better accessibility');
  }

  return {
    palette,
    results,
    overallScore,
    recommendations,
  };
}

/**
 * Generate accessible color variations
 */
export function generateAccessibleVariations(baseColor: string, backgroundColor: string): string[] {
  const variations: string[] = [];
  const baseRgb = hexToRgb(baseColor);

  if (!baseRgb) return variations;

  // Generate darker and lighter variations
  for (let i = 0.1; i <= 0.9; i += 0.1) {
    // Darker variation
    const darker = {
      r: Math.round(baseRgb.r * i),
      g: Math.round(baseRgb.g * i),
      b: Math.round(baseRgb.b * i),
    };

    // Lighter variation
    const lighter = {
      r: Math.round(baseRgb.r + (255 - baseRgb.r) * i),
      g: Math.round(baseRgb.g + (255 - baseRgb.g) * i),
      b: Math.round(baseRgb.b + (255 - baseRgb.b) * i),
    };

    variations.push(rgbToHex(darker));
    variations.push(rgbToHex(lighter));
  }

  // Filter for accessible variations
  return variations.filter(color => {
    const result = validateContrast(color, backgroundColor);
    return result.isValid;
  });
}

/**
 * Convert RGB to hex
 */
function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const toHex = (n: number) => {
    const hex = Math.min(255, Math.max(0, n)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Check if a color is distinguishable for color blindness
 */
export function checkColorBlindnessAccessibility(color1: string, color2: string): {
  isAccessible: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Simple check - in production, use proper color blindness simulation
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    issues.push('Invalid color format');
    return { isAccessible: false, issues, suggestions };
  }

  // Check for red-green color blindness (deuteranopia approximation)
  const simulateDeuteranopia = (rgb: { r: number; g: number; b: number }) => ({
    r: rgb.r * 0.625 + rgb.g * 0.375,
    g: rgb.r * 0.7 + rgb.g * 0.3,
    b: rgb.b,
  });

  const sim1 = simulateDeuteranopia(rgb1);
  const sim2 = simulateDeuteranopia(rgb2);

  const diff = Math.sqrt(
    Math.pow(sim1.r - sim2.r, 2) +
    Math.pow(sim1.g - sim2.g, 2) +
    Math.pow(sim1.b - sim2.b, 2)
  );

  const isAccessible = diff > 50; // Arbitrary threshold

  if (!isAccessible) {
    issues.push('Colors may not be distinguishable for red-green color blindness');
    suggestions.push('Add patterns, shapes, or text labels to distinguish elements');
    suggestions.push('Use colors with different brightness levels');
  }

  return { isAccessible, issues, suggestions };
}

/**
 * Export validation results to console
 */
export function logValidationResults(validation: ColorPaletteValidation): void {
  console.group('🎨 Color Palette Validation Results');

  console.log(`Overall Score: ${(validation.overallScore * 100).toFixed(1)}%`);

  Object.entries(validation.results).forEach(([name, result]) => {
    const status = result.isValid ? '✅' : '❌';
    console.log(`${status} ${name}: ${result.contrastRatio.toFixed(2)}:1 (${result.wcagLevel})`);

    if (result.issues.length > 0) {
      console.group(`Issues for ${name}:`);
      result.issues.forEach(issue => console.log(`  - ${issue}`));
      console.groupEnd();
    }
  });

  if (validation.recommendations.length > 0) {
    console.group('💡 Recommendations:');
    validation.recommendations.forEach(rec => console.log(`  - ${rec}`));
    console.groupEnd();
  }

  console.groupEnd();
}