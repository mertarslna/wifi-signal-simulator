/**
 * Heatmap palette generation & color rendering helper functions.
 */

const HeatmapRenderer = {
  // Convert RSSI dBm (-30 to -95 dBm) to RGB color based on selected palette
  rssiToColor(rssi, palette = 'classic', opacity = 0.7) {
    // Normalize dBm between 0.0 (Worst/Dead -90 dBm) and 1.0 (Best -30 dBm)
    const minDbm = -90;
    const maxDbm = -30;
    const norm = Math.max(0, Math.min(1, (rssi - minDbm) / (maxDbm - minDbm)));

    let r = 0, g = 0, b = 0;

    switch (palette) {
      case 'cyber':
        // Cyberpunk: Dark Red -> Purple -> Cyan -> Bright Yellow
        if (norm < 0.25) {
          const t = norm / 0.25;
          r = Math.round(120 * t); g = 0; b = Math.round(50 + 100 * t);
        } else if (norm < 0.6) {
          const t = (norm - 0.25) / 0.35;
          r = Math.round(120 - 120 * t); g = Math.round(180 * t); b = 255;
        } else {
          const t = (norm - 0.6) / 0.4;
          r = Math.round(255 * t); g = Math.round(180 + 75 * t); b = Math.round(255 - 255 * t);
        }
        break;

      case 'thermal':
        // Thermal: Blue -> Purple -> Red -> White
        if (norm < 0.33) {
          const t = norm / 0.33;
          r = Math.round(50 * t); g = 0; b = Math.round(150 + 105 * t);
        } else if (norm < 0.66) {
          const t = (norm - 0.33) / 0.33;
          r = Math.round(50 + 205 * t); g = Math.round(50 * t); b = Math.round(255 - 200 * t);
        } else {
          const t = (norm - 0.66) / 0.34;
          r = 255; g = Math.round(50 + 205 * t); b = Math.round(55 + 200 * t);
        }
        break;

      case 'monochrome':
        // Monochrome Emerald
        r = Math.round(16 * norm);
        g = Math.round(60 + 195 * norm);
        b = Math.round(80 + 120 * norm);
        break;

      case 'classic':
      default:
        // Classic: Red (-90) -> Orange (-75) -> Yellow (-65) -> Lime (-50) -> Green (-30)
        if (norm < 0.35) { // Red to Orange
          const t = norm / 0.35;
          r = 239; g = Math.round(68 + (158 - 68) * t); b = 68;
        } else if (norm < 0.65) { // Orange to Yellow/Lime
          const t = (norm - 0.35) / 0.3;
          r = Math.round(239 - (239 - 132) * t); g = Math.round(158 + (204 - 158) * t); b = Math.round(68 - 40 * t);
        } else { // Lime to Bright Emerald Green
          const t = (norm - 0.65) / 0.35;
          r = Math.round(132 - 116 * t); g = Math.round(204 + 20 * t); b = Math.round(28 + 101 * t);
        }
        break;
    }

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  },

  // Draw Heatmap grid onto offscreen buffer or directly on canvas context
  renderHeatmapGrid(ctx, gridData, minX, minY, width, height, resolution, palette, opacity) {
    if (!gridData || gridData.length === 0) return;

    const rows = gridData.length;
    const cols = gridData[0].length;

    // Fast image buffer creation
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Create a color lookup table for 100 levels between -90 and -30 dBm
    const lut = new Array(101);
    for (let i = 0; i <= 100; i++) {
      const dbm = -90 + (i / 100) * 60;
      const rgbaStr = this.rssiToColor(dbm, palette, opacity);
      // Parse rgba
      const match = rgbaStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (match) {
        lut[i] = [
          parseInt(match[1]),
          parseInt(match[2]),
          parseInt(match[3]),
          Math.round(parseFloat(match[4]) * 255)
        ];
      }
    }

    // Fill image pixel buffer
    for (let r = 0; r < rows; r++) {
      const yStart = r * resolution;
      const yEnd = Math.min(height, (r + 1) * resolution);

      for (let c = 0; c < cols; c++) {
        const xStart = c * resolution;
        const xEnd = Math.min(width, (c + 1) * resolution);

        const rssi = gridData[r][c];
        const normIdx = Math.max(0, Math.min(100, Math.round(((rssi - (-90)) / 60) * 100)));
        const color = lut[normIdx];

        for (let y = yStart; y < yEnd; y++) {
          const rowOffset = y * width * 4;
          for (let x = xStart; x < xEnd; x++) {
            const index = rowOffset + x * 4;
            data[index] = color[0];     // Red
            data[index + 1] = color[1]; // Green
            data[index + 2] = color[2]; // Blue
            data[index + 3] = color[3]; // Alpha
          }
        }
      }
    }

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const offCtx = offscreenCanvas.getContext('2d');
    offCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(offscreenCanvas, minX, minY);
  },

  // Draw signal iso-lines (contours) at -50, -65, -75 dBm
  renderContours(ctx, gridData, resolution, width, height) {
    if (!gridData) return;

    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.setLineDash([4, 4]);

    const thresholdLevels = [-50, -65, -75];
    const rows = gridData.length;
    const cols = gridData[0].length;

    thresholdLevels.forEach(threshold => {
      ctx.beginPath();
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const val = gridData[r][c];
          const valRight = gridData[r][c + 1];
          const valDown = gridData[r + 1][c];

          // Horizontal edge crossing
          if ((val >= threshold && valRight < threshold) || (val < threshold && valRight >= threshold)) {
            const x = (c + 0.5) * resolution;
            const y = r * resolution;
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + resolution);
          }

          // Vertical edge crossing
          if ((val >= threshold && valDown < threshold) || (val < threshold && valDown >= threshold)) {
            const x = c * resolution;
            const y = (r + 0.5) * resolution;
            ctx.moveTo(x, y);
            ctx.lineTo(x + resolution, y);
          }
        }
      }
      ctx.stroke();
    });

    ctx.restore();
  }
};
