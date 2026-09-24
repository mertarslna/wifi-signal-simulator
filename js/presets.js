/**
 * Floor plan presets for Turkish apartment layouts & office environments.
 * Coordinates are normalized to standard canvas grid scale (800x600 px).
 */

const PRESETS = {
  // Empty Canvas
  empty: {
    name: "Boş Kroki",
    walls: [],
    routers: [
      { id: "router-1", name: "Ana Router", x: 400, y: 300, isMain: true }
    ],
    rooms: []
  },

  // 1+1 Modern Apartment (~65m2)
  "1plus1": {
    name: "1+1 Modern Daire (~65m²)",
    walls: [
      // Outer Frame (Concrete)
      { x1: 100, y1: 80, x2: 700, y2: 80, type: "concrete" },
      { x1: 700, y1: 80, x2: 700, y2: 520, type: "concrete" },
      { x1: 700, y1: 520, x2: 100, y2: 520, type: "concrete" },
      { x1: 100, y1: 520, x2: 100, y2: 80, type: "concrete" },

      // Interior Walls (Brick & Drywall)
      // Bedroom divider
      { x1: 400, y1: 80, x2: 400, y2: 260, type: "brick" },
      { x1: 400, y1: 320, x2: 400, y2: 360, type: "brick" },
      { x1: 400, y1: 260, x2: 400, y2: 320, type: "door" }, // Door to bedroom

      // Bathroom divider
      { x1: 100, y1: 340, x2: 260, y2: 340, type: "brick" },
      { x1: 260, y1: 340, x2: 320, y2: 340, type: "door" }, // Door to bathroom
      { x1: 320, y1: 340, x2: 400, y2: 340, type: "brick" },
      { x1: 280, y1: 340, x2: 280, y2: 520, type: "drywall" },

      // Living Room / Kitchen Balcony window
      { x1: 700, y1: 200, x2: 700, y2: 380, type: "glass" },

      // Steel Main Entrance Door
      { x1: 100, y1: 220, x2: 100, y2: 280, type: "steel_door" }
    ],
    routers: [
      { id: "router-1", name: "Ana Router (Salon)", x: 550, y: 300, isMain: true }
    ],
    rooms: [
      { name: "Salon & Mutfak", x: 550, y: 220 },
      { name: "Yatak Odası", x: 250, y: 200 },
      { name: "Banyo / WC", x: 190, y: 420 },
      { name: "Antre / Koridor", x: 340, y: 420 }
    ]
  },

  // 2+1 Standard Family Apartment (~95m2)
  "2plus1": {
    name: "2+1 Aile Dairesi (~95m²)",
    walls: [
      // Outer Frame
      { x1: 80, y1: 60, x2: 720, y2: 60, type: "concrete" },
      { x1: 720, y1: 60, x2: 720, y2: 540, type: "concrete" },
      { x1: 720, y1: 540, x2: 80, y2: 540, type: "concrete" },
      { x1: 80, y1: 540, x2: 80, y2: 60, type: "concrete" },

      // Main Corridor (Koridor)
      { x1: 280, y1: 60, x2: 280, y2: 380, type: "brick" },
      { x1: 280, y1: 380, x2: 520, y2: 380, type: "brick" },

      // Salon divider
      { x1: 520, y1: 60, x2: 520, y2: 380, type: "brick" },

      // Room 1 (Çocuk Odası)
      { x1: 80, y1: 280, x2: 280, y2: 280, type: "brick" },

      // Room 2 (Ebeveyn Yatak Odası)
      { x1: 80, y1: 380, x2: 520, y2: 380, type: "brick" },
      { x1: 360, y1: 380, x2: 360, y2: 540, type: "brick" },

      // Doors
      { x1: 280, y1: 180, x2: 280, y2: 240, type: "door" },
      { x1: 280, y1: 300, x2: 280, y2: 360, type: "door" },
      { x1: 520, y1: 200, x2: 520, y2: 260, type: "door" },

      // Windows
      { x1: 600, y1: 60, x2: 700, y2: 60, type: "glass" },
      { x1: 120, y1: 60, x2: 220, y2: 60, type: "glass" }
    ],
    routers: [
      { id: "router-1", name: "Ana Router (Koridor)", x: 380, y: 220, isMain: true }
    ],
    rooms: [
      { name: "Büyük Salon", x: 620, y: 220 },
      { name: "Çocuk Odası", x: 180, y: 160 },
      { name: "Mutfak", x: 180, y: 340 },
      { name: "Yatak Odası", x: 200, y: 460 },
      { name: "Banyo", x: 440, y: 460 },
      { name: "Antre", x: 380, y: 120 }
    ]
  },

  // 3+1 Large House (~130m2)
  "3plus1": {
    name: "3+1 Geniş Ev (~130m²)",
    walls: [
      // Outer frame
      { x1: 60, y1: 50, x2: 740, y2: 50, type: "concrete" },
      { x1: 740, y1: 50, x2: 740, y2: 550, type: "concrete" },
      { x1: 740, y1: 550, x2: 60, y2: 550, type: "concrete" },
      { x1: 60, y1: 550, x2: 60, y2: 50, type: "concrete" },

      // Central Corridor structure
      { x1: 240, y1: 50, x2: 240, y2: 550, type: "brick" },
      { x1: 520, y1: 50, x2: 520, y2: 550, type: "brick" },
      { x1: 240, y1: 300, x2: 520, y2: 300, type: "brick" },

      // Horizontal dividers
      { x1: 60, y1: 280, x2: 240, y2: 280, type: "brick" },
      { x1: 520, y1: 260, x2: 740, y2: 260, type: "brick" },

      // Doors
      { x1: 240, y1: 140, x2: 240, y2: 200, type: "door" },
      { x1: 240, y1: 360, x2: 240, y2: 420, type: "door" },
      { x1: 520, y1: 120, x2: 520, y2: 180, type: "door" },
      { x1: 520, y1: 380, x2: 520, y2: 440, type: "door" },

      // Glass balcony windows
      { x1: 620, y1: 550, x2: 720, y2: 550, type: "glass" }
    ],
    routers: [
      { id: "router-1", name: "Ana Router (Salon)", x: 630, y: 140, isMain: true },
      { id: "router-2", name: "Mesh Nod 1 (Koridor)", x: 380, y: 420, isMain: false }
    ],
    rooms: [
      { name: "Salon", x: 630, y: 140 },
      { name: "Mutfak", x: 630, y: 410 },
      { name: "Çalışma Odası", x: 150, y: 150 },
      { name: "Yatak Odası 1", x: 150, y: 410 },
      { name: "Ana Koridor", x: 380, y: 180 },
      { name: "Ebeveyn Odası", x: 380, y: 420 }
    ]
  },

  // Open Office Layout
  "office": {
    name: "Açık Ofis & Toplantı Salonu",
    walls: [
      // Outer glass facade & concrete
      { x1: 80, y1: 60, x2: 720, y2: 60, type: "glass" },
      { x1: 720, y1: 60, x2: 720, y2: 540, type: "concrete" },
      { x1: 720, y1: 540, x2: 80, y2: 540, type: "glass" },
      { x1: 80, y1: 540, x2: 80, y2: 60, type: "concrete" },

      // Glass Meeting Room 1
      { x1: 80, y1: 220, x2: 300, y2: 220, type: "glass" },
      { x1: 300, y1: 60, x2: 300, y2: 220, type: "glass" },

      // Manager Office
      { x1: 500, y1: 60, x2: 500, y2: 220, type: "drywall" },
      { x1: 500, y1: 220, x2: 720, y2: 220, type: "drywall" },

      // Server Room (Concrete thick walls)
      { x1: 540, y1: 380, x2: 720, y2: 380, type: "concrete" },
      { x1: 540, y1: 380, x2: 540, y2: 540, type: "concrete" }
    ],
    routers: [
      { id: "router-1", name: "Ofis AP 1 (Merkez)", x: 400, y: 320, isMain: true }
    ],
    rooms: [
      { name: "Açık Çalışma Alanı", x: 360, y: 380 },
      { name: "Toplantı Odası (Cam)", x: 190, y: 140 },
      { name: "Yönetici Odası", x: 610, y: 140 },
      { name: "Sistem / Sunucu Odası", x: 630, y: 460 }
    ]
  }
};
