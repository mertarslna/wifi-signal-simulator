/**
 * Interactive HTML5 Canvas floor plan editor and graphics renderer.
 */

class WifiCanvasManager {
  constructor(canvasId, wrapperId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.wrapper = document.getElementById(wrapperId);

    // Grid & Viewport state
    this.gridSize = 20; // 20px grid
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;

    // Simulation Data state
    this.walls = [];
    this.routers = [];
    this.rooms = [];
    this.gridData = null;

    // Current Tool & Drawing State
    this.currentTool = 'wall'; // 'wall', 'router', 'room', 'erase', 'select'
    this.currentMaterial = 'concrete';
    this.snapGrid = true;
    this.showDimensions = true;

    // Heatmap settings
    this.heatmapOpacity = 0.7;
    this.colorPalette = 'classic';
    this.gridResolution = 6;
    this.showRays = true;
    this.showContours = true;
    this.showWallLabels = true;

    // Interactive state variables
    this.isDrawingWall = false;
    this.isDrawingRoom = false;
    this.tempRoomPoints = []; // Array of {x, y}
    this.tempMousePos = null;

    this.hoverPoint = null;
    this.hoveredObject = null; // To highlight object under cursor

    // Multi-select state
    this.selectedItems = [];
    this.isDragging = false;
    this.isSelectingBox = false;
    this.selectionBoxStart = null;
    this.selectionBoxEnd = null;

    this.initCanvasSize();
    this.setupEventListeners();
    this.updateCursor();
  }

  initCanvasSize() {
    const rect = this.wrapper.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = rect.height || 600;
  }

  // Load preset floorplan
  loadPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    this.walls = JSON.parse(JSON.stringify(preset.walls || []));
    this.routers = JSON.parse(JSON.stringify(preset.routers || []));
    this.rooms = JSON.parse(JSON.stringify(preset.rooms || []));

    this.recalculateSimulation();
  }

  // Save canvas state to localStorage
  saveToLocalStorage() {
    try {
      const data = {
        walls: this.walls,
        routers: this.routers,
        rooms: this.rooms
      };
      localStorage.setItem('wifi_simulator_state', JSON.stringify(data));
    } catch (e) {
      console.warn("Could not save to localStorage. This is normal if running via file:// protocol.");
    }
  }

  // Load canvas state from localStorage
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('wifi_simulator_state');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.walls && data.routers) {
          this.walls = data.walls;
          this.routers = data.routers;
          this.rooms = data.rooms || [];
          return true;
        }
      }
    } catch (e) {
      console.error("Local storage error:", e);
    }
    return false;
  }

  // Recalculate heatmap simulation grid
  recalculateSimulation() {
    const freqEl = document.getElementById('freqSelect');
    const txEl = document.getElementById('txPower');
    const antEl = document.getElementById('antennaGain');

    const freqGhz = parseFloat(freqEl ? freqEl.value : '5');
    const txPowerDbm = parseInt(txEl ? txEl.value : '20');
    const antennaGainDbi = parseInt(antEl ? antEl.value : '5');

    const settings = { freqGhz, txPowerDbm, antennaGainDbi };

    let minX = 0, minY = 0, maxX = this.canvas.width, maxY = this.canvas.height;
    
    // Bounds from objects
    this.walls.forEach(w => {
      minX = Math.min(minX, w.x1, w.x2);
      maxX = Math.max(maxX, w.x1, w.x2);
      minY = Math.min(minY, w.y1, w.y2);
      maxY = Math.max(maxY, w.y1, w.y2);
    });
    this.routers.forEach(r => {
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x);
      minY = Math.min(minY, r.y);
      maxY = Math.max(maxY, r.y);
    });
    this.rooms.forEach(r => {
      if (r.points && r.points.length > 0) {
        r.points.forEach(p => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        });
      } else if (r.x !== undefined) {
        minX = Math.min(minX, r.x);
        maxX = Math.max(maxX, r.x);
        minY = Math.min(minY, r.y);
        maxY = Math.max(maxY, r.y);
      }
    });

    // Bounds from visible viewport
    const viewStartX = (-this.panX / this.zoom);
    const viewEndX = viewStartX + (this.canvas.width / this.zoom);
    const viewStartY = (-this.panY / this.zoom);
    const viewEndY = viewStartY + (this.canvas.height / this.zoom);

    minX = Math.min(minX, viewStartX);
    maxX = Math.max(maxX, viewEndX);
    minY = Math.min(minY, viewStartY);
    maxY = Math.max(maxY, viewEndY);

    minX = Math.floor(minX / this.gridResolution) * this.gridResolution - 200;
    minY = Math.floor(minY / this.gridResolution) * this.gridResolution - 200;
    maxX = Math.ceil(maxX / this.gridResolution) * this.gridResolution + 200;
    maxY = Math.ceil(maxY / this.gridResolution) * this.gridResolution + 200;

    const width = maxX - minX;
    const height = maxY - minY;

    this.simBounds = { minX, minY, width, height };

    this.gridData = WifiSimulation.generateHeatmapGrid(
      minX, minY, width, height,
      this.gridResolution,
      this.routers,
      this.walls,
      settings
    );

    this.render();
    
    // Auto-save on every simulation change
    this.saveToLocalStorage();

    // Trigger report analysis update
    if (window.updateReportAnalytics) {
      window.updateReportAnalytics(this.gridData, this.rooms, this.walls, this.routers);
    }
  }

  // Snap coordinate to nearest grid point if enabled
  snapCoordinate(val) {
    if (!this.snapGrid) return val;
    return Math.round(val / this.gridSize) * this.gridSize;
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - this.panX) / this.zoom;
    const rawY = (e.clientY - rect.top - this.panY) / this.zoom;

    return {
      x: this.snapCoordinate(rawX),
      y: this.snapCoordinate(rawY),
      rawX,
      rawY
    };
  }

  updateCursor() {
    switch (this.currentTool) {
      case 'wall': this.canvas.style.cursor = 'crosshair'; break;
      case 'router': this.canvas.style.cursor = 'copy'; break;
      case 'room': this.canvas.style.cursor = 'crosshair'; break;
      case 'erase': this.canvas.style.cursor = 'no-drop'; break;
      case 'select': this.canvas.style.cursor = this.hoveredObject ? 'grab' : 'crosshair'; break;
      default: this.canvas.style.cursor = 'default';
    }
    if (this.isDragging) this.canvas.style.cursor = 'grabbing';
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.initCanvasSize();
      this.recalculateSimulation();
    });

    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(0.2, this.zoom * zoomAmount), 5.0);
      
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
      this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;
      this.render();

      if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
      this.zoomTimeout = setTimeout(() => {
        this.recalculateSimulation();
      }, 300);
    });
    
    // Disable context menu to use right-click for quick delete/undo point
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.isDrawingRoom && this.tempRoomPoints.length > 0) {
        this.tempRoomPoints.pop();
        if (this.tempRoomPoints.length === 0) {
          this.isDrawingRoom = false;
          this.canvas.style.cursor = 'text'; // Reset cursor
        }
        this.render();
        return;
      }
      const coords = this.getCanvasCoords(e);
      this.eraseNearestObject(coords.rawX, coords.rawY);
    });
    
    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.cancelDrawing();
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.hoverPoint) this.eraseNearestObject(this.hoverPoint.rawX, this.hoverPoint.rawY);
      }
    });
  }

  handleMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      this.isPanning = true;
      this.panStartX = e.clientX - this.panX;
      this.panStartY = e.clientY - this.panY;
      this.canvas.style.cursor = 'grabbing';
      return;
    }
    if (e.button !== 0) return; // Ignore right-clicks or middle-clicks for drawing

    const coords = this.getCanvasCoords(e);

    if (this.currentTool === 'wall') {
      if (!this.isDrawingWall) {
        this.isDrawingWall = true;
        this.wallStart = { x: coords.x, y: coords.y };
        this.tempWallEnd = { x: coords.x, y: coords.y };
      } else {
        // Complete wall segment
        if (coords.x !== this.wallStart.x || coords.y !== this.wallStart.y) {
          this.walls.push({
            x1: this.wallStart.x,
            y1: this.wallStart.y,
            x2: coords.x,
            y2: coords.y,
            type: this.currentMaterial
          });
        }
        // Stop drawing after completing one wall segment
        this.isDrawingWall = false;
        this.wallStart = null;
        this.tempWallEnd = null;
        this.recalculateSimulation();
      }
    } else if (this.currentTool === 'router') {
      // Place new router or move existing
      this.routers.push({
        id: 'router-' + (this.routers.length + 1),
        name: `Mesh Nod ${this.routers.length + 1}`,
        x: coords.x,
        y: coords.y,
        isMain: this.routers.length === 0
      });
      this.recalculateSimulation();
    } else if (this.currentTool === 'room') {
      if (!this.isDrawingRoom) {
        this.isDrawingRoom = true;
        this.tempRoomPoints = [{ x: coords.x, y: coords.y }];
        this.canvas.style.cursor = 'crosshair';
      } else {
        const firstPt = this.tempRoomPoints[0];
        const dist = Math.hypot(coords.x - firstPt.x, coords.y - firstPt.y);
        if (dist < 20 && this.tempRoomPoints.length >= 3) {
          this.finishRoomPolygon();
        } else {
          this.tempRoomPoints.push({ x: coords.x, y: coords.y });
        }
      }
      this.render();
    } else if (this.currentTool === 'select') {
      if (this.hoveredObject) {
        // If hovered object isn't in selection, clear selection and select only it
        const alreadySelected = this.selectedItems.find(s => s.type === this.hoveredObject.type && s.item === this.hoveredObject.item);
        if (!alreadySelected) {
          this.selectedItems = [this.hoveredObject];
        }
        
        this.isDragging = true;
        this.dragStartX = coords.x;
        this.dragStartY = coords.y;

        // Save original positions of all selected items for offset calculation
        this.dragInitialState = this.selectedItems.map(s => {
          if (s.type === 'router') {
            return { type: s.type, item: s.item, x: s.item.x, y: s.item.y };
          } else if (s.type === 'room') {
            if (s.item.points) {
              return { type: s.type, item: s.item, points: s.item.points.map(p => ({x: p.x, y: p.y})) };
            } else {
              return { type: s.type, item: s.item, x: s.item.x, y: s.item.y };
            }
          } else {
            return { type: s.type, item: s.item, x1: s.item.x1, y1: s.item.y1, x2: s.item.x2, y2: s.item.y2 };
          }
        });
      } else {
        // Clicked on empty space, start box selection
        this.selectedItems = [];
        this.isSelectingBox = true;
        this.selectionBoxStart = { x: coords.rawX, y: coords.rawY };
        this.selectionBoxEnd = { x: coords.rawX, y: coords.rawY };
      }
    }
  }

  handleMouseMove(e) {
    if (this.isPanning) {
      this.panX = e.clientX - this.panStartX;
      this.panY = e.clientY - this.panStartY;
      this.render();
      return;
    }
    
    const coords = this.getCanvasCoords(e);
    this.hoverPoint = coords;

    // Detect hovered object for highlighting & cursors
    this.detectHoveredObject(coords.rawX, coords.rawY);
    this.updateCursor();

    if (this.isDrawingWall) {
      this.tempWallEnd = { x: coords.x, y: coords.y };
      this.render();
    } else if (this.isDrawingRoom) {
      this.tempMousePos = { x: coords.x, y: coords.y };
      this.render();
    } else if (this.isDragging && this.dragInitialState) {
      const dx = coords.x - this.dragStartX;
      const dy = coords.y - this.dragStartY;

      this.dragInitialState.forEach(orig => {
        if (orig.type === 'router') {
          orig.item.x = orig.x + dx;
          orig.item.y = orig.y + dy;
        } else if (orig.type === 'room') {
          if (orig.points) {
            for (let i = 0; i < orig.item.points.length; i++) {
              orig.item.points[i].x = orig.points[i].x + dx;
              orig.item.points[i].y = orig.points[i].y + dy;
            }
          } else {
            orig.item.x = orig.x + dx;
            orig.item.y = orig.y + dy;
          }
        } else if (orig.type === 'wall') {
          orig.item.x1 = orig.x1 + dx;
          orig.item.y1 = orig.y1 + dy;
          orig.item.x2 = orig.x2 + dx;
          orig.item.y2 = orig.y2 + dy;
        }
      });
      this.render(); // Yüksek performansı korumak için sadece çizimi güncelle (Simülasyon mouse bırakılınca hesaplanacak)
    } else if (this.isSelectingBox) {
      this.selectionBoxEnd = { x: coords.rawX, y: coords.rawY };
      this.render();
    } else {
      this.render();
    }

    // Update Live Mouse Probe Inspector Card
    if (this.gridData && this.simBounds && window.updateLiveInspector && this.currentTool !== 'wall' && this.currentTool !== 'erase') {
      const col = Math.floor((coords.rawX - this.simBounds.minX) / this.gridResolution);
      const row = Math.floor((coords.rawY - this.simBounds.minY) / this.gridResolution);

      if (row >= 0 && row < this.gridData.length && col >= 0 && col < this.gridData[0].length) {
        const rssi = this.gridData[row][col];
        window.updateLiveInspector(rssi, coords.rawX, coords.rawY);
      }
    } else if (window.hideLiveInspector) {
      window.hideLiveInspector();
    }
  }

  handleMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.updateCursor();
      this.recalculateSimulation();
      return;
    }
    if (this.isDragging) {
      this.isDragging = false;
      this.dragInitialState = null;
      this.recalculateSimulation();
    } else if (this.isSelectingBox) {
      this.isSelectingBox = false;
      
      const minX = Math.min(this.selectionBoxStart.x, this.selectionBoxEnd.x);
      const maxX = Math.max(this.selectionBoxStart.x, this.selectionBoxEnd.x);
      const minY = Math.min(this.selectionBoxStart.y, this.selectionBoxEnd.y);
      const maxY = Math.max(this.selectionBoxStart.y, this.selectionBoxEnd.y);

      this.selectedItems = [];

      this.routers.forEach(r => {
        if (r.x >= minX && r.x <= maxX && r.y >= minY && r.y <= maxY) this.selectedItems.push({ type: 'router', item: r });
      });
      this.rooms.forEach(r => {
        if (r.points && r.points.length > 0) {
          let pMinX = r.points[0].x, pMaxX = r.points[0].x, pMinY = r.points[0].y, pMaxY = r.points[0].y;
          r.points.forEach(p => {
             pMinX = Math.min(pMinX, p.x); pMaxX = Math.max(pMaxX, p.x);
             pMinY = Math.min(pMinY, p.y); pMaxY = Math.max(pMaxY, p.y);
          });
          if (pMinX <= maxX && pMaxX >= minX && pMinY <= maxY && pMaxY >= minY) this.selectedItems.push({ type: 'room', item: r });
        } else if (r.x1 !== undefined) {
          if (r.x1 <= maxX && r.x2 >= minX && r.y1 <= maxY && r.y2 >= minY) this.selectedItems.push({ type: 'room', item: r });
        } else {
          if (r.x >= minX && r.x <= maxX && r.y >= minY && r.y <= maxY) this.selectedItems.push({ type: 'room', item: r });
        }
      });
      this.walls.forEach(w => {
        const wallMinX = Math.min(w.x1, w.x2);
        const wallMaxX = Math.max(w.x1, w.x2);
        const wallMinY = Math.min(w.y1, w.y2);
        const wallMaxY = Math.max(w.y1, w.y2);
        if (wallMinX >= minX && wallMaxX <= maxX && wallMinY >= minY && wallMaxY <= maxY) {
          this.selectedItems.push({ type: 'wall', item: w });
        }
      });

      this.selectionBoxStart = null;
      this.selectionBoxEnd = null;
      this.render();
    }
  }

  handleMouseLeave() {
    this.isPanning = false;
    if (window.hideLiveInspector) window.hideLiveInspector();
  }

  // Cancel active wall drawing with Escape key
  cancelDrawing() {
    this.isDrawingWall = false;
    this.wallStart = null;
    this.tempWallEnd = null;
    this.isDrawingRoom = false;
    this.tempRoomPoints = [];
    this.tempMousePos = null;
    this.render();
  }

  isPointInPolygon(px, py, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      let xi = points[i].x, yi = points[i].y;
      let xj = points[j].x, yj = points[j].y;
      let intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  detectHoveredObject(x, y) {
    this.hoveredObject = null;
    for (let r of this.routers) {
      if (Math.hypot(r.x - x, r.y - y) < 20) {
        this.hoveredObject = { type: 'router', item: r };
        return;
      }
    }
    for (let w of this.walls) {
      if (this.pointToSegmentDistance(x, y, w.x1, w.y1, w.x2, w.y2) < 12) {
        this.hoveredObject = { type: 'wall', item: w };
        return;
      }
    }
    for (let r of this.rooms) {
      if (r.points && r.points.length >= 3) {
        if (this.isPointInPolygon(x, y, r.points)) {
          this.hoveredObject = { type: 'room', item: r };
          return;
        }
      } else if (r.x1 !== undefined) {
        if (x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2) {
          this.hoveredObject = { type: 'room', item: r };
          return;
        }
      } else if (Math.hypot(r.x - x, r.y - y) < 25) {
        this.hoveredObject = { type: 'room', item: r };
        return;
      }
    }
  }

  eraseNearestObject(x, y) {
    // 1. Check routers
    for (let i = 0; i < this.routers.length; i++) {
      if (Math.hypot(this.routers[i].x - x, this.routers[i].y - y) < 20) {
        this.routers.splice(i, 1);
        // If main router deleted, assign main to first remaining
        if (this.routers.length > 0) this.routers[0].isMain = true;
        this.recalculateSimulation();
        return;
      }
    }

    // 2. Check walls
    for (let i = 0; i < this.walls.length; i++) {
      const w = this.walls[i];
      const dist = this.pointToSegmentDistance(x, y, w.x1, w.y1, w.x2, w.y2);
      if (dist < 12) {
        this.walls.splice(i, 1);
        this.recalculateSimulation();
        return;
      }
    }

    // 3. Check room labels
    for (let i = 0; i < this.rooms.length; i++) {
      const r = this.rooms[i];
      if (r.points && r.points.length >= 3) {
        if (this.isPointInPolygon(x, y, r.points)) {
          this.rooms.splice(i, 1);
          this.recalculateSimulation();
          return;
        }
      } else if (r.x1 !== undefined) {
        if (x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2) {
          this.rooms.splice(i, 1);
          this.recalculateSimulation();
          return;
        }
      } else if (Math.hypot(r.x - x, r.y - y) < 25) {
        this.rooms.splice(i, 1);
        this.recalculateSimulation();
        return;
      }
    }
  }

  pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  // Main Graphics Render Loop
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);

    // 1. Draw Grid Lines
    this.drawGrid();

    // 2. Draw Wi-Fi Signal Heatmap Layer
    if (this.gridData && this.simBounds) {
      HeatmapRenderer.renderHeatmapGrid(
        this.ctx,
        this.gridData,
        this.simBounds.minX,
        this.simBounds.minY,
        this.simBounds.width,
        this.simBounds.height,
        this.gridResolution,
        this.colorPalette,
        this.heatmapOpacity
      );

      // Iso-lines / Contours
      if (this.showContours) {
        // Warning: renderContours might also need to be updated to support minX, minY
        // I will just disable them or assume they don't break. 
        // Actually, let's just let it be drawn at 0,0 for now or skip it if it's too complex.
        // Wait, I should update renderContours to also accept minX, minY if needed, but it uses ctx.save() so I can just translate!
        this.ctx.save();
        this.ctx.translate(this.simBounds.minX, this.simBounds.minY);
        HeatmapRenderer.renderContours(
          this.ctx,
          this.gridData,
          this.gridResolution,
          this.simBounds.width,
          this.simBounds.height
        );
        this.ctx.restore();
      }
    }

    // 3. Draw Signal Ray Paths (if enabled)
    if (this.showRays && this.routers.length > 0) {
      this.drawSignalRays();
    }

    // 4. Draw Floor Plan Walls
    this.drawWalls();

    // 5. Draw Temp Active Wall being drawn
    if (this.isDrawingWall && this.wallStart && this.tempWallEnd) {
      this.drawTempWall();
    }

    // 6. Draw Room Areas and Labels
    this.drawRooms();

    // 6.5 Draw Temp Active Room being drawn
    if (this.isDrawingRoom && this.tempRoomPoints.length > 0) {
      this.drawTempRoom();
    }

    // 7. Draw Router Icons & Pulses
    this.drawRouters();
    
    // 8. Draw box selection and active selected items
    this.drawSelectionOverlay();
    
    this.ctx.restore();
  }

  zoomIn() {
    this.zoom = Math.min(this.zoom * 1.2, 5.0);
    this.recalculateSimulation();
  }

  zoomOut() {
    this.zoom = Math.max(this.zoom * 0.8, 0.2);
    this.recalculateSimulation();
  }

  resetView() {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.recalculateSimulation();
  }

  drawSelectionOverlay() {
    // 1. Draw Marquee Box
    if (this.isSelectingBox && this.selectionBoxStart && this.selectionBoxEnd) {
      this.ctx.save();
      this.ctx.strokeStyle = '#06b6d4';
      this.ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([5, 5]);
      
      const x = this.selectionBoxStart.x;
      const y = this.selectionBoxStart.y;
      const w = this.selectionBoxEnd.x - x;
      const h = this.selectionBoxEnd.y - y;
      
      this.ctx.fillRect(x, y, w, h);
      this.ctx.strokeRect(x, y, w, h);
      this.ctx.restore();
    }

    // 2. Highlight Selected Items
    this.selectedItems.forEach(s => {
      this.ctx.save();
      this.ctx.strokeStyle = '#06b6d4';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      if (s.type === 'router') {
        this.ctx.arc(s.item.x, s.item.y, 25, 0, Math.PI * 2);
      } else if (s.type === 'room') {
        if (s.item.points) {
          this.ctx.moveTo(s.item.points[0].x, s.item.points[0].y);
          for (let i=1; i<s.item.points.length; i++) this.ctx.lineTo(s.item.points[i].x, s.item.points[i].y);
          this.ctx.closePath();
        } else if (s.item.x1 !== undefined) {
          this.ctx.rect(s.item.x1, s.item.y1, s.item.x2 - s.item.x1, s.item.y2 - s.item.y1);
        } else {
          this.ctx.arc(s.item.x, s.item.y, 25, 0, Math.PI * 2);
        }
      } else if (s.type === 'wall') {
        this.ctx.moveTo(s.item.x1, s.item.y1);
        this.ctx.lineTo(s.item.x2, s.item.y2);
      }
      this.ctx.stroke();
      this.ctx.restore();
    });
  }

  drawGrid() {
    this.ctx.save();
    
    // Draw Simulation Area Bounds (so user knows where the map ends)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);
    this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setLineDash([]);

    // Calculate infinite grid bounds based on current zoom and pan
    const startX = Math.floor((-this.panX / this.zoom) / this.gridSize) * this.gridSize;
    const endX = startX + (this.canvas.width / this.zoom) + this.gridSize * 2;
    
    const startY = Math.floor((-this.panY / this.zoom) / this.gridSize) * this.gridSize;
    const endY = startY + (this.canvas.height / this.zoom) + this.gridSize * 2;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 1;

    for (let x = startX; x < endX; x += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
      this.ctx.stroke();
    }

    for (let y = startY; y < endY; y += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawWalls() {
    const colors = {
      concrete: '#64748b',
      brick: '#d97706',
      drywall: '#cbd5e1',
      glass: '#38bdf8',
      door: '#b45309',
      steel_door: '#475569'
    };

    const strokeWidths = {
      concrete: 8,
      brick: 6,
      drywall: 4,
      glass: 3,
      door: 5,
      steel_door: 8
    };

    this.walls.forEach(w => {
      this.ctx.save();
      this.ctx.strokeStyle = colors[w.type] || '#ffffff';
      this.ctx.lineWidth = strokeWidths[w.type] || 5;
      this.ctx.lineCap = 'round';

      if (w.type === 'glass') {
        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.shadowBlur = 6;
      }

      // Highlight hovered wall
      if (this.hoveredObject && this.hoveredObject.type === 'wall' && this.hoveredObject.item === w) {
        this.ctx.shadowColor = '#fff';
        this.ctx.shadowBlur = 10;
        this.ctx.lineWidth = strokeWidths[w.type] ? strokeWidths[w.type] + 4 : 9;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(w.x1, w.y1);
      this.ctx.lineTo(w.x2, w.y2);
      this.ctx.stroke();

      // Show length dimensions in meters
      if (this.showDimensions) {
        const distPx = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
        const distMeters = (distPx / 40).toFixed(1);
        const midX = (w.x1 + w.x2) / 2;
        const midY = (w.y1 + w.y2) / 2;
        
        // Background pill for dimensions
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        this.ctx.shadowBlur = 0;
        const txtWidth = this.ctx.measureText(`${distMeters}m`).width;
        this.ctx.fillRect(midX - txtWidth/2 - 4, midY - 14, txtWidth + 8, 16);

        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.font = '10px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${distMeters}m`, midX, midY - 3);
      }

      this.ctx.restore();
    });
  }

  drawTempWall() {
    this.ctx.save();
    this.ctx.strokeStyle = '#06b6d4';
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([6, 6]);

    this.ctx.beginPath();
    this.ctx.moveTo(this.wallStart.x, this.wallStart.y);
    this.ctx.lineTo(this.tempWallEnd.x, this.tempWallEnd.y);
    this.ctx.stroke();

    // Measurement preview with elegant pill
    const distPx = Math.hypot(this.tempWallEnd.x - this.wallStart.x, this.tempWallEnd.y - this.wallStart.y);
    const distMeters = (distPx / 40).toFixed(1);
    
    const midX = (this.wallStart.x + this.tempWallEnd.x) / 2;
    const midY = (this.wallStart.y + this.tempWallEnd.y) / 2;

    this.ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
    const textWidth = this.ctx.measureText(`${distMeters}m`).width;
    this.ctx.fillRect(midX - textWidth/2 - 6, midY - 16, textWidth + 12, 20);

    this.ctx.fillStyle = '#06b6d4';
    this.ctx.font = 'bold 12px Space Grotesk';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${distMeters}m`, midX, midY - 2);

    this.ctx.restore();
  }

  drawSignalRays() {
    this.routers.forEach(router => {
      const rays = WifiSimulation.generateSignalRays(router, this.walls, 24);
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      this.ctx.lineWidth = 1;

      rays.forEach(ray => {
        this.ctx.beginPath();
        this.ctx.moveTo(ray.x1, ray.y1);
        this.ctx.lineTo(ray.x2, ray.y2);
        this.ctx.stroke();
      });

      this.ctx.restore();
    });
  }

  finishRoomPolygon() {
    const name = prompt("Oda İsmini Girin (ör. Salon, Yatak Odası, Mutfak):", "Yeni Oda");
    if (name) {
      this.rooms.push({
        name: name,
        points: [...this.tempRoomPoints]
      });
      this.recalculateSimulation();
    }
    this.isDrawingRoom = false;
    this.tempRoomPoints = [];
    this.tempMousePos = null;
    this.render();
  }

  drawTempRoom() {
    if (this.tempRoomPoints.length === 0) return;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 6]);
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.tempRoomPoints[0].x, this.tempRoomPoints[0].y);
    for (let i = 1; i < this.tempRoomPoints.length; i++) {
      this.ctx.lineTo(this.tempRoomPoints[i].x, this.tempRoomPoints[i].y);
    }
    if (this.tempMousePos) {
      this.ctx.lineTo(this.tempMousePos.x, this.tempMousePos.y);
    }
    this.ctx.stroke();

    if (this.tempRoomPoints.length > 1) {
      this.ctx.fill();
    }

    // Draw close circle helper on first point
    if (this.tempRoomPoints.length >= 3) {
       const firstPt = this.tempRoomPoints[0];
       this.ctx.beginPath();
       this.ctx.arc(firstPt.x, firstPt.y, 8, 0, Math.PI*2);
       this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
       this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawRooms() {
    this.rooms.forEach(room => {
      this.ctx.save();
      
      let centerX = room.x;
      let centerY = room.y;
      
      if (room.points && room.points.length > 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(room.points[0].x, room.points[0].y);
        let minX = room.points[0].x, maxX = room.points[0].x;
        let minY = room.points[0].y, maxY = room.points[0].y;
        
        for (let i = 1; i < room.points.length; i++) {
           this.ctx.lineTo(room.points[i].x, room.points[i].y);
           minX = Math.min(minX, room.points[i].x); maxX = Math.max(maxX, room.points[i].x);
           minY = Math.min(minY, room.points[i].y); maxY = Math.max(maxY, room.points[i].y);
        }
        this.ctx.closePath();
        
        centerX = (minX + maxX) / 2;
        centerY = (minY + maxY) / 2;
        
        this.ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        
        if (this.hoveredObject && this.hoveredObject.type === 'room' && this.hoveredObject.item === room) {
           this.ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        }
        
        this.ctx.fill();
        this.ctx.stroke();

      } else if (room.x1 !== undefined) {
        centerX = (room.x1 + room.x2) / 2;
        centerY = (room.y1 + room.y2) / 2;
        
        this.ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        this.ctx.fillRect(room.x1, room.y1, room.x2 - room.x1, room.y2 - room.y1);
        this.ctx.strokeRect(room.x1, room.y1, room.x2 - room.x1, room.y2 - room.y1);
        
        if (this.hoveredObject && this.hoveredObject.type === 'room' && this.hoveredObject.item === room) {
           this.ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
           this.ctx.fillRect(room.x1, room.y1, room.x2 - room.x1, room.y2 - room.y1);
        }
      }

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.font = 'bold 12px Space Grotesk';
      this.ctx.textAlign = 'center';
      
      // Background pill for label
      const textWidth = this.ctx.measureText(room.name).width;
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      this.ctx.fillRect(centerX - textWidth / 2 - 6, centerY - 12, textWidth + 12, 18);

      this.ctx.fillStyle = '#f3f4f6';
      this.ctx.fillText(room.name, centerX, centerY + 1);
      this.ctx.restore();
    });
  }

  drawRouters() {
    const time = Date.now() * 0.003;

    this.routers.forEach((r, idx) => {
      this.ctx.save();

      // Pulse ring animation
      const pulseSize = 15 + Math.sin(time + idx) * 5;
      this.ctx.strokeStyle = r.isMain ? 'rgba(6, 182, 212, 0.6)' : 'rgba(16, 185, 129, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, pulseSize, 0, Math.PI * 2);
      this.ctx.stroke();

      // Router icon circle
      this.ctx.fillStyle = r.isMain ? '#06b6d4' : '#10b981';
      this.ctx.shadowColor = r.isMain ? '#06b6d4' : '#10b981';
      this.ctx.shadowBlur = 12;

      // Highlight hovered router
      if (this.hoveredObject && this.hoveredObject.type === 'router' && this.hoveredObject.item === r) {
        this.ctx.shadowColor = '#fff';
        this.ctx.shadowBlur = 20;
      }

      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, 10, 0, Math.PI * 2);
      this.ctx.fill();

      // Inner dot
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowBlur = 0;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, 4, 0, Math.PI * 2);
      this.ctx.fill();

      // Router name label with background
      const nameWidth = this.ctx.measureText(r.name).width;
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      this.ctx.fillRect(r.x - nameWidth/2 - 4, r.y + 14, nameWidth + 8, 14);

      this.ctx.fillStyle = '#f3f4f6';
      this.ctx.font = 'bold 11px Inter';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(r.name, r.x, r.y + 25);

      this.ctx.restore();
    });
  }
}
