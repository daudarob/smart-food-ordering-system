// AI Gradient Paint Worklet - CSS Houdini Implementation
// Creates intelligent gradient patterns that adapt to content

class AIGradientPainter {
  static get inputProperties() {
    return [
      '--ai-surface',
      '--ai-text',
      '--neural-primary',
      '--neural-secondary',
      '--neural-accent'
    ];
  }

  static get inputArguments() {
    return ['<number>?', '<angle>?'];
  }

  paint(ctx, { width, height }, properties, args) {
    const surfaceColor = properties.get('--ai-surface').toString();
    const textColor = properties.get('--ai-text').toString();
    const primaryColor = properties.get('--neural-primary').toString();
    const secondaryColor = properties.get('--neural-secondary').toString();
    const accentColor = properties.get('--neural-accent').toString();

    const complexity = args[0] ? args[0].value : 5;
    const angle = args[1] ? args[1].value : 45;

    // Create AI-driven gradient pattern
    const gradient = ctx.createLinearGradient(
      0, 0,
      Math.cos(angle * Math.PI / 180) * Math.max(width, height),
      Math.sin(angle * Math.PI / 180) * Math.max(width, height)
    );

    // Adaptive color stops based on complexity
    const colors = [primaryColor, secondaryColor, accentColor, surfaceColor, textColor];
    const stops = [];

    for (let i = 0; i <= complexity; i++) {
      stops.push(i / complexity);
    }

    stops.forEach((stop, index) => {
      const colorIndex = index % colors.length;
      gradient.addColorStop(stop, colors[colorIndex]);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add intelligent noise pattern
    this.addNoisePattern(ctx, width, height, complexity);

    // Add adaptive geometric patterns
    this.addGeometricPatterns(ctx, width, height, complexity);
  }

  addNoisePattern(ctx, width, height, complexity) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 255 * (complexity / 10);
      data[i] = noise;     // Red
      data[i + 1] = noise; // Green
      data[i + 2] = noise; // Blue
      data[i + 3] = 10;    // Alpha (very transparent)
    }

    ctx.putImageData(imageData, 0, 0);
  }

  addGeometricPatterns(ctx, width, height, complexity) {
    ctx.globalAlpha = 0.1;

    // Draw adaptive geometric shapes
    for (let i = 0; i < complexity; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 50 + 10;

      ctx.strokeStyle = `hsl(${i * 360 / complexity}, 70%, 60%)`;
      ctx.lineWidth = 1;

      // Random geometric shape
      const shapeType = Math.floor(Math.random() * 3);

      ctx.beginPath();
      switch (shapeType) {
        case 0: // Circle
          ctx.arc(x, y, size / 2, 0, Math.PI * 2);
          break;
        case 1: // Triangle
          ctx.moveTo(x, y - size / 2);
          ctx.lineTo(x - size / 2, y + size / 2);
          ctx.lineTo(x + size / 2, y + size / 2);
          ctx.closePath();
          break;
        case 2: // Square
          ctx.rect(x - size / 2, y - size / 2, size, size);
          break;
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }
}

registerPaint('ai-gradient-paint', AIGradientPainter);