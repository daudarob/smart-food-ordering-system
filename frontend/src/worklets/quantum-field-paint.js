// Quantum Field Paint Worklet - CSS Houdini Implementation
// Creates dynamic quantum field visualizations with particle effects

class QuantumFieldPainter {
  static get inputProperties() {
    return [
      '--quantum-bg',
      '--quantum-border',
      '--quantum-shadow',
      '--neural-primary',
      '--neural-secondary'
    ];
  }

  static get inputArguments() {
    return ['<number>?', '<number>?'];
  }

  paint(ctx, { width, height }, properties, args) {
    const bgColor = properties.get('--quantum-bg').toString();
    const borderColor = properties.get('--quantum-border').toString();
    const shadowColor = properties.get('--quantum-shadow').toString();
    const primaryColor = properties.get('--neural-primary').toString();
    const secondaryColor = properties.get('--neural-secondary').toString();

    const particleCount = args[0] ? args[0].value : 50;
    const fieldIntensity = args[1] ? args[1].value : 1;

    // Create quantum particles
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 4 + 1,
        color: Math.random() > 0.5 ? primaryColor : secondaryColor,
        energy: Math.random(),
        phase: Math.random() * Math.PI * 2
      });
    }

    // Draw quantum field background
    const bgGradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 2
    );
    bgGradient.addColorStop(0, bgColor);
    bgGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw quantum field lines
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (height / 20) * i);

      for (let x = 0; x < width; x += 10) {
        const y = (height / 20) * i + Math.sin(x * 0.01 + i) * 20 * fieldIntensity;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw particles
    ctx.globalAlpha = 0.8;
    particles.forEach(particle => {
      // Update particle position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Wrap around edges
      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;

      // Draw particle
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.size * 2;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();

      // Draw energy field
      if (particle.energy > 0.7) {
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.8;
      }
    });

    // Draw quantum entanglement connections
    ctx.strokeStyle = shadowColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.2;

    particles.forEach((particle, i) => {
      particles.slice(i + 1).forEach(otherParticle => {
        const distance = Math.sqrt(
          Math.pow(particle.x - otherParticle.x, 2) +
          Math.pow(particle.y - otherParticle.y, 2)
        );

        if (distance < 80) {
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(otherParticle.x, otherParticle.y);
          ctx.stroke();
        }
      });
    });
  }
}

registerPaint('quantum-field-paint', QuantumFieldPainter);