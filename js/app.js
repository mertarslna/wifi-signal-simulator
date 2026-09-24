/**
 * Main Application Orchestrator & Event Listener Bindings.
 */

document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize Canvas Manager
    const manager = new WifiCanvasManager('wifiCanvas', 'canvasWrapper');
    window.canvasManager = manager;

  // Try to load saved state, otherwise fallback to 1+1 preset
  const presetSelect = document.getElementById('presetSelect');
  if (manager.loadFromLocalStorage()) {
    if (presetSelect) presetSelect.value = 'empty'; // "Özel Çizim"
    manager.recalculateSimulation();
  } else {
    manager.loadPreset('1plus1');
  }

  // --- Tab Navigation Setup ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = document.getElementById(tabId);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // --- Preset Selection Dropdown ---
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      manager.loadPreset(e.target.value);
    });
  }

  // --- Tool Selection Buttons ---
  const toolBtns = document.querySelectorAll('.tool-btn');
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const tool = btn.getAttribute('data-tool');
      manager.currentTool = tool;

      const statusText = document.getElementById('canvasStatusText');
      if (statusText) {
        if (tool === 'wall') statusText.textContent = 'Duvar çizmek için haritada tıklayın ve sürükleyin';
        else if (tool === 'router') statusText.textContent = 'Modem / Mesh Nod yerleştirmek için haritaya tıklayın';
        else if (tool === 'room') statusText.textContent = 'Odanın köşelerini nokta nokta tıklayarak seçin. Bitirmek için ilk noktaya tıklayın.';
        else if (tool === 'erase') statusText.textContent = 'Silmek istediğiniz duvar veya modem üzerine tıklayın';
        else if (tool === 'select') statusText.textContent = 'Modemi harita üzerinde taşımak için basılı tutup sürükleyin';
      }
    });
  });

  // --- Wall Material Selection Cards ---
  const materialCards = document.querySelectorAll('.material-card');
  materialCards.forEach(card => {
    card.addEventListener('click', () => {
      materialCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const mat = card.getAttribute('data-material');
      manager.currentMaterial = mat;

      // Switch to wall drawing tool automatically if not active
      const toolWallBtn = document.getElementById('toolWall');
      if (toolWallBtn) toolWallBtn.click();
    });
  });

  // --- Undo & Redo ---
  const btnUndo = document.getElementById('btnUndo');
  if (btnUndo) {
    btnUndo.addEventListener('click', () => {
      if (manager.walls.length > 0) {
        manager.walls.pop();
        manager.recalculateSimulation();
      }
    });
  }

  // Keyboard escape cancel wall draw
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      manager.cancelDrawing();
    }
  });

  // --- Wi-Fi & Frequency Parameters Sliders ---
  const freqSelect = document.getElementById('freqSelect');
  if (freqSelect) {
    freqSelect.addEventListener('change', (e) => {
      // Update UI labels for material attenuation
      const freq = e.target.value;
      const freqKey = freq >= 6 ? '6' : (freq >= 5 ? '5' : '2.4');
      
      const updateLabel = (matId, labelText) => {
        const matCard = document.querySelector(`.material-card[data-material="${matId}"] .material-loss`);
        if (matCard && window.MATERIAL_ATTENUATION && window.MATERIAL_ATTENUATION[matId]) {
          const loss = window.MATERIAL_ATTENUATION[matId][freqKey];
          matCard.textContent = `-${loss} dB ${labelText}`;
        }
      };
      
      if (window.MATERIAL_ATTENUATION) {
        updateLabel('concrete', '(Çok Yüksek Kayıp)');
        updateLabel('brick', '(Yüksek Kayıp)');
        updateLabel('drywall', '(Orta Kayıp)');
        updateLabel('glass', '(Minimum Kayıp)');
        updateLabel('door', 'Kayıp');
        updateLabel('steel_door', '(Çok Yüksek Kayıp)');
      }
      
      manager.recalculateSimulation();
    });
  }

  const txPower = document.getElementById('txPower');
  const txPowerVal = document.getElementById('txPowerVal');
  if (txPower && txPowerVal) {
    txPower.addEventListener('input', (e) => {
      const val = e.target.value;
      const mW = Math.round(Math.pow(10, val / 10));
      txPowerVal.textContent = `${val} dBm (${mW} mW)`;
      manager.recalculateSimulation();
    });
  }

  const antennaGain = document.getElementById('antennaGain');
  const antennaGainVal = document.getElementById('antennaGainVal');
  if (antennaGain && antennaGainVal) {
    antennaGain.addEventListener('input', (e) => {
      antennaGainVal.textContent = `${e.target.value} dBi`;
      manager.recalculateSimulation();
    });
  }

  // Add Mesh Node button
  const btnAddMesh = document.getElementById('btnAddMesh');
  if (btnAddMesh) {
    btnAddMesh.addEventListener('click', () => {
      const routerBtn = document.getElementById('toolRouter');
      if (routerBtn) routerBtn.click();
      alert('Sinyal genişletici / Mesh Nod eklemek istediğiniz noktaya haritada tıklayın.');
    });
  }

  // --- Heatmap Appearance Controls ---
  const heatmapOpacity = document.getElementById('heatmapOpacity');
  const heatmapOpacityVal = document.getElementById('heatmapOpacityVal');
  if (heatmapOpacity && heatmapOpacityVal) {
    heatmapOpacity.addEventListener('input', (e) => {
      const val = e.target.value;
      heatmapOpacityVal.textContent = `%${val}`;
      manager.heatmapOpacity = val / 100;
      manager.render();
    });
  }

  const colorPalette = document.getElementById('colorPalette');
  if (colorPalette) {
    colorPalette.addEventListener('change', (e) => {
      manager.colorPalette = e.target.value;
      manager.render();
    });
  }

  const gridResolution = document.getElementById('gridResolution');
  const gridResolutionVal = document.getElementById('gridResolutionVal');
  if (gridResolution && gridResolutionVal) {
    gridResolution.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      gridResolutionVal.textContent = val <= 4 ? `Ekstra Detaylı (${val}px)` : (val <= 7 ? `Detaylı (${val}px)` : `Hızlı (${val}px)`);
      manager.gridResolution = val;
      manager.recalculateSimulation();
    });
  }

  // Toggles
  const chkShowRays = document.getElementById('chkShowRays');
  if (chkShowRays) {
    chkShowRays.addEventListener('change', (e) => {
      manager.showRays = e.target.checked;
      manager.render();
    });
  }

  const chkShowContours = document.getElementById('chkShowContours');
  if (chkShowContours) {
    chkShowContours.addEventListener('change', (e) => {
      manager.showContours = e.target.checked;
      manager.render();
    });
  }

  const chkSnapGrid = document.getElementById('chkSnapGrid');
  if (chkSnapGrid) {
    chkSnapGrid.addEventListener('change', (e) => {
      manager.snapGrid = e.target.checked;
    });
  }

  const chkShowDimensions = document.getElementById('chkShowDimensions');
  if (chkShowDimensions) {
    chkShowDimensions.addEventListener('change', (e) => {
      manager.showDimensions = e.target.checked;
      manager.render();
    });
  }

  // --- Action Buttons ---
  const btnZoomIn = document.getElementById('btnZoomIn');
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => manager.zoomIn());

  const btnZoomOut = document.getElementById('btnZoomOut');
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => manager.zoomOut());

  const btnResetView = document.getElementById('btnResetView');
  if (btnResetView) btnResetView.addEventListener('click', () => manager.resetView());

  const btnSimulate = document.getElementById('btnSimulate');
  if (btnSimulate) {
    btnSimulate.addEventListener('click', () => {
      manager.recalculateSimulation();
    });
  }

  const btnClear = document.getElementById('btnClear');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Tüm çizimleri, duvarları ve modemleri temizlemek istediğinize emin misiniz?')) {
        manager.walls = [];
        manager.routers = [];
        manager.rooms = [];
        localStorage.removeItem('wifi_simulator_state');
        if (presetSelect) presetSelect.value = 'empty';
        manager.recalculateSimulation();
      }
    });
  }

  const btnExport = document.getElementById('btnExport');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      window.exportHeatmapImage(manager.canvas);
    });
  }

  } catch (err) {
    alert("Kritik Hata Oluştu:\n\n" + err.stack);
    console.error("Initialization Error:", err);
  }
});
