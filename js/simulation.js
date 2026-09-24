/**
 * Wi-Fi Signal Propagation Physics Engine.
 * Implements Log-Distance Path Loss Model + Multi-wall Obstacle Attenuation + Raytrace Intersections.
 */

window.MATERIAL_ATTENUATION = {
  concrete: { '2.4': 12.0, '5': 18.0, '6': 22.0 },  // Betonarme
  brick: { '2.4': 6.0, '5': 10.0, '6': 13.0 },      // Tuğla
  drywall: { '2.4': 2.5, '5': 4.5, '6': 6.0 },      // Alçıpan
  glass: { '2.4': 2.0, '5': 3.5, '6': 4.5 },        // Cam
  door: { '2.4': 3.0, '5': 5.5, '6': 7.0 },         // Ahşap Kapı
  steel_door: { '2.4': 15.0, '5': 22.0, '6': 26.0 } // Çelik Kapı
};

const WifiSimulation = {
  
  // Calculate Signal RSSI at point (px, py) from a router
  calculatePointRssi(px, py, router, walls, settings) {
    const { freqGhz = 5, txPowerDbm = 20, antennaGainDbi = 5 } = settings;

    // Convert pixel distance to meters (assume 40 pixels = 1 meter)
    const PIXELS_PER_METER = 40.0;
    const dx = (px - router.x) / PIXELS_PER_METER;
    const dy = (py - router.y) / PIXELS_PER_METER;
    const d = Math.max(0.1, Math.sqrt(dx * dx + dy * dy)); // distance in meters

    // Log-Distance Path Loss (LDPL) Model
    // 1. Free Space Path Loss at reference distance d0 = 1 meter
    const f_MHz = freqGhz * 1000;
    const PL_d0 = 20 * Math.log10(f_MHz) - 27.55;

    // 2. Path Loss Exponent (n)
    // Reflects environmental scattering/multipath in line-of-sight (before walls)
    let n = 2.2;
    if (freqGhz >= 5) n = 2.4;
    if (freqGhz >= 6) n = 2.5;

    // Base Path Loss formula: PL(d) = PL(d0) + 10 * n * log10(d)
    let pathLoss = PL_d0 + 10 * n * Math.log10(d);

    // 3. Multi-Wall Obstacle Attenuation
    let totalWallLoss = 0;
    const freqKey = freqGhz >= 6 ? '6' : (freqGhz >= 5 ? '5' : '2.4');

    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];
      if (this.lineIntersects(router.x, router.y, px, py, wall.x1, wall.y1, wall.x2, wall.y2)) {
        const mat = window.MATERIAL_ATTENUATION[wall.type];
        const loss = mat ? mat[freqKey] : 5.0;
        totalWallLoss += loss;
      }
    }

    pathLoss += totalWallLoss;

    // 4. Final Received Signal Strength Indicator (RSSI in dBm)
    // P_rx = P_tx + G_tx - PL
    const rssi = txPowerDbm + antennaGainDbi - pathLoss;

    // Limit values to realistic boundaries
    return Math.max(-100.0, Math.min(-20.0, rssi));
  },

  // Calculate grid RSSI matrix across whole canvas
  generateHeatmapGrid(minX, minY, width, height, resolution, routers, walls, settings) {
    const cols = Math.ceil(width / resolution);
    const rows = Math.ceil(height / resolution);
    const grid = new Array(rows);

    if (!routers || routers.length === 0) {
      // Return empty/dead grid if no router
      for (let r = 0; r < rows; r++) {
        grid[r] = new Float32Array(cols).fill(-95);
      }
      return grid;
    }

    for (let r = 0; r < rows; r++) {
      const y = minY + r * resolution + resolution / 2;
      grid[r] = new Float32Array(cols);

      for (let c = 0; c < cols; c++) {
        const x = minX + c * resolution + resolution / 2;
        
        // Take maximum RSSI signal among all active routers/mesh nodes
        let maxRssi = -120;
        for (let i = 0; i < routers.length; i++) {
          const router = routers[i];
          const rssi = this.calculatePointRssi(x, y, router, walls, settings);
          if (rssi > maxRssi) {
            maxRssi = rssi;
          }
        }

        grid[r][c] = maxRssi;
      }
    }

    return grid;
  },

  // Fast Line Segment Intersection Check (Ray vs Wall)
  lineIntersects(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false; // Parallel lines

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    return (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1);
  },

  // Generate Signal Rays for visual effect from router to outer bounds
  generateSignalRays(router, walls, numRays = 36) {
    const rays = [];
    const step = (Math.PI * 2) / numRays;
    const maxDist = 800;

    for (let i = 0; i < numRays; i++) {
      const angle = i * step;
      const targetX = router.x + Math.cos(angle) * maxDist;
      const targetY = router.y + Math.sin(angle) * maxDist;

      // Find closest wall intersection
      let closestHitX = targetX;
      let closestHitY = targetY;
      let minDist = maxDist;

      for (let w = 0; w < walls.length; w++) {
        const wall = walls[w];
        const hit = this.getLineIntersectionPoint(router.x, router.y, targetX, targetY, wall.x1, wall.y1, wall.x2, wall.y2);
        if (hit) {
          const dist = Math.hypot(hit.x - router.x, hit.y - router.y);
          if (dist < minDist) {
            minDist = dist;
            closestHitX = hit.x;
            closestHitY = hit.y;
          }
        }
      }

      rays.push({ x1: router.x, y1: router.y, x2: closestHitX, y2: closestHitY });
    }

    return rays;
  },

  getLineIntersectionPoint(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return null;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return {
        x: x1 + ua * (x2 - x1),
        y: y1 + ua * (y2 - y1)
      };
    }
    return null;
  }
};
