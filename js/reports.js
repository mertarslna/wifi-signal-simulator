/**
 * Analytics Engine, Room Coverage Calculations, AI Optimization Advice, Export Features.
 */

// Convert RSSI dBm to Estimated Speed (Mbps) & Ping (ms)
function rssiToSpeedAndPing(rssi) {
  if (rssi >= -50) {
    return { speed: '550 Mbps', ping: '3 ms', status: 'Mükemmel', badgeClass: 'badge-success', hint: '4K 60FPS Video streaming ve online oyun için ideal.' };
  } else if (rssi >= -65) {
    return { speed: '280 Mbps', ping: '8 ms', status: 'İyi', badgeClass: 'badge-success', hint: 'HD görüntülü görüşme, evden çalışma için sorunsuz.' };
  } else if (rssi >= -75) {
    return { speed: '45 Mbps', ping: '24 ms', status: 'Orta / Zayıf', badgeClass: 'badge-warning', hint: "Web'de gezinme yeterli, 4K videoda takılma olabilir." };
  } else {
    return { speed: '2 Mbps', ping: '120 ms', status: 'Ölü Bölge', badgeClass: 'badge-danger', hint: 'Sinyal yetersiz. İnternet bağlantısı kopabilir.' };
  }
}

// Point in polygon helper
function isPointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    let xi = points[i].x, yi = points[i].y;
    let xj = points[j].x, yj = points[j].y;
    let intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Global function to update Live Inspector Card at top right
window.updateLiveInspector = function(rssi, x, y) {
  const inspector = document.getElementById('liveInspector');
  if (!inspector) return;

  inspector.classList.remove('hidden');

  const info = rssiToSpeedAndPing(rssi);

  document.getElementById('inspRssi').textContent = `${Math.round(rssi)} dBm`;
  document.getElementById('inspSpeed').textContent = info.speed;
  document.getElementById('inspPing').textContent = info.ping;
  
  const badge = document.getElementById('inspBadge');
  badge.textContent = info.status;
  badge.className = `badge ${info.badgeClass}`;

  document.getElementById('inspHint').textContent = info.hint;

  // Signal Bar Percentage (-90 to -30 dBm)
  const norm = Math.max(0, Math.min(100, ((rssi - (-90)) / 60) * 100));
  document.getElementById('inspBar').style.width = `${norm}%`;

  if (x !== undefined && y !== undefined) {
    // Add offset so it doesn't block the cursor (e.g. bottom-right of cursor)
    // Keep it within screen bounds
    const rect = inspector.getBoundingClientRect();
    let left = x + 15;
    let top = y + 15;

    if (left + rect.width > window.innerWidth) left = x - rect.width - 15;
    if (top + rect.height > window.innerHeight) top = y - rect.height - 15;

    inspector.style.left = `${left}px`;
    inspector.style.top = `${top}px`;
  }
};

window.hideLiveInspector = function() {
  const inspector = document.getElementById('liveInspector');
  if (inspector) inspector.classList.add('hidden');
};

// Update Sidebar Analytics (Metrics %, Room RSSIs, AI Advice)
window.updateReportAnalytics = function(gridData, rooms, walls, routers) {
  if (!gridData || gridData.length === 0) return;

  let totalCells = 0;
  let goodCells = 0;
  let deadCells = 0;

  const rows = gridData.length;
  const cols = gridData[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rssi = gridData[r][c];
      totalCells++;
      if (rssi >= -65) goodCells++;
      if (rssi < -75) deadCells++;
    }
  }

  const goodPct = Math.round((goodCells / totalCells) * 100);
  const deadPct = Math.round((deadCells / totalCells) * 100);

  // Update Metric Cards
  const elGood = document.getElementById('metricGoodPct');
  const elDead = document.getElementById('metricDeadPct');
  if (elGood) elGood.textContent = `${goodPct}%`;
  if (elDead) elDead.textContent = `${deadPct}%`;

  // Update Room Analysis List
  const roomListContainer = document.getElementById('roomAnalysisList');
  if (roomListContainer) {
    if (!rooms || rooms.length === 0) {
      roomListContainer.innerHTML = `<div class="empty-rooms-text">Oda ekleyerek oda bazlı detaylı kapsama analizini görebilirsiniz.</div>`;
    } else {
      let html = '';
      const res = (window.canvasManager && window.canvasManager.gridResolution) ? window.canvasManager.gridResolution : 6;
      const minX = (window.canvasManager && window.canvasManager.simBounds) ? window.canvasManager.simBounds.minX : 0;
      const minY = (window.canvasManager && window.canvasManager.simBounds) ? window.canvasManager.simBounds.minY : 0;

      rooms.forEach(room => {
        let sumMw = 0;
        let count = 0;
        let roomRssi = -90;

        if (room.points && room.points.length >= 3) {
          let pMinX = room.points[0].x, pMaxX = room.points[0].x;
          let pMinY = room.points[0].y, pMaxY = room.points[0].y;
          room.points.forEach(p => {
             pMinX = Math.min(pMinX, p.x); pMaxX = Math.max(pMaxX, p.x);
             pMinY = Math.min(pMinY, p.y); pMaxY = Math.max(pMaxY, p.y);
          });
          
          for (let rX = pMinX; rX <= pMaxX; rX += res) {
            for (let rY = pMinY; rY <= pMaxY; rY += res) {
              if (isPointInPolygon(rX, rY, room.points)) {
                 const c = Math.floor((rX - minX) / res);
                 const r = Math.floor((rY - minY) / res);
                 if (r >= 0 && r < rows && c >= 0 && c < cols) {
                   const dBm = gridData[r][c];
                   sumMw += Math.pow(10, dBm / 10);
                   count++;
                 }
              }
            }
          }
        } else if (room.x1 !== undefined) {
          for (let rX = room.x1; rX <= room.x2; rX += res) {
            for (let rY = room.y1; rY <= room.y2; rY += res) {
              const c = Math.floor((rX - minX) / res);
              const r = Math.floor((rY - minY) / res);
              if (r >= 0 && r < rows && c >= 0 && c < cols) {
                const dBm = gridData[r][c];
                sumMw += Math.pow(10, dBm / 10);
                count++;
              }
            }
          }
        } else {
          const col = Math.floor((room.x - minX) / res);
          const row = Math.floor((room.y - minY) / res);
          if (row >= 0 && row < rows && col >= 0 && col < cols) {
            const dBm = gridData[row][col];
            sumMw += Math.pow(10, dBm / 10);
            count++;
          }
        }

        // Literatüre uygun RF sinyal ortalaması: dBm'den mW'a çevrilmiş toplamın ortalamasını tekrar dBm'e çevirme
        if (count > 0 && sumMw > 0) {
          const avgMw = sumMw / count;
          roomRssi = 10 * Math.log10(avgMw);
        }

        const info = rssiToSpeedAndPing(roomRssi);
        const pillBg = roomRssi >= -65 ? 'rgba(16, 185, 129, 0.2)' : (roomRssi >= -75 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)');
        const pillColor = roomRssi >= -65 ? '#10b981' : (roomRssi >= -75 ? '#f59e0b' : '#ef4444');

        html += `
          <div class="room-item">
            <span class="room-name"><i class="fa-solid fa-door-closed" style="color:var(--accent-cyan)"></i> ${room.name}</span>
            <span class="room-signal-pill" style="background:${pillBg}; color:${pillColor};">
              ${Math.round(roomRssi)} dBm (${info.status})
            </span>
          </div>
        `;
      });

      roomListContainer.innerHTML = html;
    }
  }

  // Generate AI Optimization Recommendations
  generateAiSuggestions(goodPct, deadPct, walls, routers, rooms);
};

function generateAiSuggestions(goodPct, deadPct, walls, routers, rooms) {
  const container = document.getElementById('aiSuggestions');
  if (!container) return;

  const tips = [];

  if (routers.length === 1) {
    const mainRouter = routers[0];
    
    // Check if router is near canvas edges
    if (mainRouter.x < 150 || mainRouter.x > 650 || mainRouter.y < 120 || mainRouter.y > 480) {
      tips.push({
        icon: 'fa-location-crosshairs',
        title: 'Modemi Merkez Noktaya Taşıyın',
        text: 'Modeminiz dış duvar veya köşe kenarında bulunuyor. Modemi koridora veya dairenin ortasına taşımak tüm odalarda kapsama alanını ortalama %35 artıracaktır.',
        type: 'warning'
      });
    }

    if (deadPct > 15) {
      tips.push({
        icon: 'fa-tower-cell',
        title: 'Mesh / Sinyal Güçlendirici Eklemesi Önerilir',
        text: `Evinizin %${deadPct}'lik kısmında sinyal ölü bölgede. Yatak odası veya uzak köşeye bir Mesh Nod ekleyerek kesintisiz Wi-Fi sağlayabilirsiniz.`,
        type: 'warning'
      });
    }
  }

  // Check 5GHz wall count
  const freqSelect = document.getElementById('freqSelect');
  if (freqSelect && freqSelect.value === '5' && deadPct > 10) {
    tips.push({
      icon: 'fa-wifi',
      title: '5 GHz Duvar Engeli Algılandı',
      text: '5 GHz frekansı beton duvarlarda yüksek sönümlemeye uğrar. Sinyal geçmeyen uzak odalar için 2.4 GHz bandına geçebilir veya kablolu Access Point ekleyebilirsiniz.',
      type: 'warning'
    });
  }

  if (goodPct > 85) {
    tips.push({
      icon: 'fa-circle-check',
      title: 'Harika Wi-Fi Kapsaması!',
      text: 'Ev geneli sinyal seviyesi mükemmel seviyede. Tüm odalarda kesintisiz 4K video ve düşük gecikmeli gaming deneyimi sağlandı.',
      type: 'success'
    });
  }

  if (tips.length === 0) {
     tips.push({
      icon: 'fa-thumbs-up',
      title: 'Her Şey Yolunda',
      text: 'Şu anki modem yerleşiminiz ve frekans ayarlarınız gayet iyi durumda.',
      type: 'success'
    });
  }

  // Render cards
  container.innerHTML = tips.map(t => `
    <div class="suggestion-card ${t.type || ''}">
      <i class="fa-solid ${t.icon}"></i>
      <div>
        <strong>${t.title}</strong>
        <p>${t.text}</p>
      </div>
    </div>
  `).join('');
}

// Download Heatmap PNG Screenshot
window.exportHeatmapImage = function(canvas) {
  if (!canvas) return;

  const link = document.createElement('a');
  link.download = `Wifi-Isi-Haritasi-Analizi-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
