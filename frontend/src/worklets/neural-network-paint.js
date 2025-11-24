// Neural Network Paint Worklet - CSS Houdini Implementation
// Creates dynamic neural network visualizations using Canvas API

class NeuralNetworkPainter {
  static get inputProperties() {
    return [
      '--neural-primary',
      '--neural-secondary',
      '--neural-accent',
      '--neural-tertiary',
      '--neural-quaternary'
    ];
  }

  static get inputArguments() {
    return ['<length>?'];
  }

  paint(ctx, { width, height }, properties, args) {
    const primary = properties.get('--neural-primary').toString();
    const secondary = properties.get('--neural-secondary').toString();
    const accent = properties.get('--neural-accent').toString();
    const tertiary = properties.get('--neural-tertiary').toString();
    const quaternary = properties.get('--neural-quaternary').toString();

    const nodeRadius = args[0] ? args[0].value : 3;
    const colors = [primary, secondary, accent, tertiary, quaternary];

    // Create neural network nodes
    const nodes = [];
    const numNodes = Math.floor(width / 50) * Math.floor(height / 50);

    for (let i = 0; i < numNodes; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        color: colors[Math.floor(Math.random() * colors.length)],
        connections: []
      });
    }

    // Create connections between nearby nodes
    nodes.forEach((node, i) => {
      nodes.slice(i + 1).forEach(otherNode => {
        const distance = Math.sqrt(
          Math.pow(node.x - otherNode.x, 2) +
          Math.pow(node.y - otherNode.y, 2)
        );

        if (distance < 100) {
          node.connections.push({
            to: otherNode,
            strength: 1 - (distance / 100)
          });
        }
      });
    });

    // Draw connections
    ctx.globalAlpha = 0.3;
    nodes.forEach(node => {
      node.connections.forEach(connection => {
        const gradient = ctx.createLinearGradient(
          node.x, node.y,
          connection.to.x, connection.to.y
        );
        gradient.addColorStop(0, node.color);
        gradient.addColorStop(1, connection.to.color);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = connection.strength * 2;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(connection.to.x, connection.to.y);
        ctx.stroke();
      });
    });

    // Draw nodes
    ctx.globalAlpha = 0.8;
    nodes.forEach(node => {
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Add glow effect
      ctx.shadowColor = node.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }
}

registerPaint('neural-network-paint', NeuralNetworkPainter);