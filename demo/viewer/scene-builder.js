/**
 * Realistic interior scene builder for CAD 3D viewer.
 * Muted PBR materials, doors, windows, paths, ceiling fans & lights.
 */
import * as THREE from 'three';

export const FLOOR_TOP = 0.052;

const FLOOR_TEX = {
  oak_parquet: { color: 0x8f6a42, rough: 0.62, metal: 0.02 },
  marble_white: { color: 0xe5e2dc, rough: 0.22, metal: 0.04 },
  marble_cream: { color: 0xd8cfc0, rough: 0.2, metal: 0.04 },
  ceramic_tile: { color: 0xc4c2be, rough: 0.28, metal: 0.02 },
  laminate_warm: { color: 0xa88458, rough: 0.55, metal: 0.02 },
};

export function pbrMat({ color = 0xffffff, roughness = 0.65, metalness = 0.04, emissive = 0x000000, emissiveIntensity = 0, envMapIntensity = 1 }) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
    envMapIntensity,
  });
}

const PALETTE = {
  wall: pbrMat({ color: 0xf2efe8, roughness: 0.92, metalness: 0 }),
  woodTeak: pbrMat({ color: 0x5c4030, roughness: 0.58, metalness: 0.02 }),
  woodOak: pbrMat({ color: 0x7a5c3a, roughness: 0.52, metalness: 0.02 }),
  woodDark: pbrMat({ color: 0x3d2e24, roughness: 0.48, metalness: 0.02 }),
  fabricLinen: (c) => pbrMat({ color: c, roughness: 0.94, metalness: 0 }),
  metalBrass: pbrMat({ color: 0xb8956a, roughness: 0.35, metalness: 0.75 }),
  metalSteel: pbrMat({ color: 0x8a9098, roughness: 0.28, metalness: 0.82 }),
  applianceWhite: pbrMat({ color: 0xf0f0ee, roughness: 0.32, metalness: 0.05 }),
  granite: pbrMat({ color: 0x4a4846, roughness: 0.18, metalness: 0.08 }),
  glass: pbrMat({ color: 0xa8cce8, roughness: 0.05, metalness: 0.1, emissive: 0x223344, emissiveIntensity: 0.08 }),
  glassClear: pbrMat({ color: 0xdceefb, roughness: 0.02, metalness: 0.05, emissive: 0x112233, emissiveIntensity: 0.05 }),
  plantPot: pbrMat({ color: 0x6b4a32, roughness: 0.88, metalness: 0 }),
  plantLeaf: pbrMat({ color: 0x3d6b3a, roughness: 0.95, metalness: 0 }),
  path: pbrMat({ color: 0x4a90c2, roughness: 0.9, metalness: 0, emissive: 0x1a4060, emissiveIntensity: 0.15 }),
  pathArrow: pbrMat({ color: 0x2e6ea8, roughness: 0.7, metalness: 0.1 }),
  doorPanel: pbrMat({ color: 0x6b5040, roughness: 0.62, metalness: 0.02 }),
  doorFrame: pbrMat({ color: 0x4a3828, roughness: 0.55, metalness: 0.03 }),
  doorMain: pbrMat({ color: 0x5a4030, roughness: 0.5, metalness: 0.04 }),
  ceiling: pbrMat({ color: 0xfafaf8, roughness: 0.95, metalness: 0 }),
};

function mesh(geo, material, x, y, z, ry = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = m.receiveShadow = true;
  return m;
}

function box(w, h, d, material, x, z, centerY, ry = 0) {
  return mesh(new THREE.BoxGeometry(w, h, d), material, x, centerY, z, ry);
}

function cyl(rt, rb, h, seg, material, x, z, centerY, ry = 0) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material, x, centerY, z, ry);
}

function catalogColor(spec) {
  const c = spec?.color || [0.5, 0.5, 0.5];
  return new THREE.Color(c[0] * 0.92, c[1] * 0.9, c[2] * 0.88);
}

export function addWindow(win, room, WH, WT, group) {
  const r = room.rect;
  const wall = win.wall;
  const ww = win.width || 1.2;
  const wh = win.height || 1.2;
  const sill = win.sill_m || 0.9;
  const off = win.offset || 1.0;
  let x, z, rw, rd, rh;
  if (wall === 'N') {
    x = r.x + off + ww / 2; z = r.y + WT * 0.6; rw = ww; rd = 0.04; rh = wh;
  } else if (wall === 'S') {
    x = r.x + off + ww / 2; z = r.y + r.h - WT * 0.6; rw = ww; rd = 0.04; rh = wh;
  } else if (wall === 'W') {
    x = r.x + WT * 0.6; z = r.y + off + ww / 2; rw = 0.04; rd = ww; rh = wh;
  } else {
    x = r.x + r.w - WT * 0.6; z = r.y + off + ww / 2; rw = 0.04; rd = ww; rh = wh;
  }
  const cy = FLOOR_TOP + sill + rh / 2;
  group.add(box(rw, rh, rd, PALETTE.glassClear, x, z, cy));
  const frame = PALETTE.doorFrame;
  const ft = 0.05;
  if (wall === 'N' || wall === 'S') {
    group.add(box(ww + ft * 2, ft, 0.06, frame, x, z, cy + rh / 2));
    group.add(box(ww + ft * 2, ft, 0.06, frame, x, z, cy - rh / 2));
    group.add(box(ft, rh, 0.06, frame, x - ww / 2, z, cy));
    group.add(box(ft, rh, 0.06, frame, x + ww / 2, z, cy));
  } else {
    group.add(box(0.06, ft, ww + ft * 2, frame, x, z, cy + rh / 2));
    group.add(box(0.06, ft, ww + ft * 2, frame, x, z, cy - rh / 2));
    group.add(box(0.06, rh, ft, frame, x, z - ww / 2, cy));
    group.add(box(0.06, rh, ft, frame, x, z + ww / 2, cy));
  }
}

export function addDoor(door, WH, group) {
  const w = door.width || 0.9;
  const h = door.height || 2.05;
  const isMain = door.style === 'teak' || door.name?.includes('Main');
  const panelMat = isMain ? PALETTE.doorMain : PALETTE.doorPanel;
  const frameMat = PALETTE.doorFrame;
  const x = door.x, z = door.y;
  const wall = door.wall || 'S';
  const cy = FLOOR_TOP + h / 2;
  const ft = 0.07;
  const panelT = 0.04;

  if (wall === 'S' || wall === 'N') {
    const zOff = wall === 'S' ? 0 : 0;
    group.add(box(w + ft * 2, ft, 0.1, frameMat, x, z + zOff, cy + h / 2));
    group.add(box(w + ft * 2, ft, 0.1, frameMat, x, z + zOff, FLOOR_TOP + ft / 2));
    group.add(box(ft, h, 0.1, frameMat, x - w / 2, z + zOff, cy));
    group.add(box(ft, h, 0.1, frameMat, x + w / 2, z + zOff, cy));
    group.add(box(w * 0.92, h * 0.96, panelT, panelMat, x, z + zOff, cy));
    group.add(cyl(0.025, 0.025, 0.12, 12, PALETTE.metalBrass, x + w * 0.38, z + zOff, FLOOR_TOP + 1.0));
  } else {
    group.add(box(0.1, ft, w + ft * 2, frameMat, x, z, cy + h / 2));
    group.add(box(0.1, ft, w + ft * 2, frameMat, x, z, FLOOR_TOP + ft / 2));
    group.add(box(0.1, h, ft, frameMat, x, z - w / 2, cy));
    group.add(box(0.1, h, ft, frameMat, x, z + w / 2, cy));
    group.add(box(panelT, h * 0.96, w * 0.92, panelMat, x, z, cy));
    group.add(cyl(0.025, 0.025, 0.12, 12, PALETTE.metalBrass, x, z + w * 0.38, FLOOR_TOP + 1.0));
  }
}

export function addWalkPath(tourPoints, group, visible = true) {
  if (!tourPoints.length || !visible) return;
  const pts = tourPoints.map(p => new THREE.Vector3(p.x, FLOOR_TOP + 0.018, p.y));
  if (pts.length < 2) return;
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, pts.length * 16, 0.055, 8, false),
    PALETTE.path
  );
  tube.material.transparent = true;
  tube.material.opacity = 0.55;
  tube.receiveShadow = true;
  group.add(tube);

  for (let i = 0; i < pts.length - 1; i += 2) {
    const a = pts[i], b = pts[i + 1];
    const mid = a.clone().lerp(b, 0.5);
    const dir = b.clone().sub(a).normalize();
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 8), PALETTE.pathArrow);
    arrow.position.copy(mid);
    arrow.position.y = FLOOR_TOP + 0.04;
    const ang = Math.atan2(dir.x, dir.z);
    arrow.rotation.set(0, ang, 0);
    group.add(arrow);
  }

  pts.forEach((p, i) => {
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 16),
      pbrMat({ color: i === 0 ? 0x2ecc71 : i === pts.length - 1 ? 0xe74c3c : 0x4a90c2, roughness: 0.8, emissiveIntensity: 0.1 })
    );
    dot.rotation.x = -Math.PI / 2;
    dot.position.copy(p);
    dot.position.y = FLOOR_TOP + 0.022;
    group.add(dot);
  });
}

export function addCeilingFan(fx, fz, WH, group) {
  const yRod = WH - 0.35;
  const yBlade = WH - 0.42;
  group.add(cyl(0.025, 0.025, 0.28, 10, PALETTE.metalSteel, fx, fz, yRod));
  group.add(cyl(0.12, 0.08, 0.08, 16, PALETTE.metalSteel, fx, fz, yBlade));
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const bx = fx + Math.sin(ang) * 0.55;
    const bz = fz + Math.cos(ang) * 0.55;
    group.add(box(0.48, 0.025, 0.1, PALETTE.metalSteel, bx, bz, yBlade));
  }
  group.add(cyl(0.04, 0.04, 0.06, 12, PALETTE.applianceWhite, fx, fz, WH - 0.22));
}

export function addCeilingLight(fx, fz, WH, group, sceneLights) {
  const y = WH - 0.06;
  group.add(cyl(0.22, 0.22, 0.04, 24, PALETTE.applianceWhite, fx, fz, y));
  group.add(cyl(0.08, 0.08, 0.06, 16, PALETTE.metalBrass, fx, fz, y - 0.04));
  const bulb = pbrMat({ color: 0xfff4e0, roughness: 0.3, emissive: 0xffe8c0, emissiveIntensity: 1.2 });
  group.add(cyl(0.06, 0.06, 0.08, 12, bulb, fx, fz, y - 0.08));
  if (sceneLights) {
    const pl = new THREE.PointLight(0xffe8cc, 0.45, 5.5, 2);
    pl.position.set(fx, WH - 0.15, fz);
    sceneLights.add(pl);
  }
}

export function addPendantLight(fx, fz, WH, group, sceneLights) {
  group.add(cyl(0.008, 0.008, 0.45, 8, PALETTE.metalSteel, fx, fz, WH - 0.25));
  group.add(cyl(0.14, 0.2, 0.16, 20, PALETTE.applianceWhite, fx, fz, WH - 0.52));
  const glow = pbrMat({ color: 0xfff8ee, emissive: 0xffe0b0, emissiveIntensity: 1.4, roughness: 0.4 });
  group.add(cyl(0.1, 0.1, 0.04, 16, glow, fx, fz, WH - 0.58));
  if (sceneLights) {
    const pl = new THREE.PointLight(0xffeedd, 0.35, 4, 2);
    pl.position.set(fx, WH - 0.55, fz);
    sceneLights.add(pl);
  }
}

export function addFurniture(type, item, catalog, WH, group, sceneLights) {
  const spec = catalog[type] || { size: [0.5, 0.5, 0.5], color: [0.5, 0.5, 0.5] };
  const fx = item.x, fz = item.y, ry = (item.rotation_deg || 0) * Math.PI / 180;
  const fab = PALETTE.fabricLinen(catalogColor(spec));
  const g = new THREE.Group();
  g.position.set(fx, 0, fz);
  g.rotation.y = ry;

  if (type === 'sofa') {
    g.add(box(2.0, 0.36, 0.88, fab, 0, 0, FLOOR_TOP + 0.22));
    g.add(box(2.0, 0.62, 0.16, fab, 0, -0.4, FLOOR_TOP + 0.58));
    g.add(box(0.14, 0.42, 0.88, fab, -0.98, 0, FLOOR_TOP + 0.28));
    g.add(box(0.14, 0.42, 0.88, fab, 0.98, 0, FLOOR_TOP + 0.28));
    g.add(box(2.0, 0.08, 0.9, PALETTE.woodDark, 0, 0, FLOOR_TOP + 0.06));
  } else if (type === 'bed_double') {
    g.add(box(2.05, 0.28, 1.65, PALETTE.woodOak, 0, 0, FLOOR_TOP + 0.18));
    g.add(box(1.95, 0.22, 1.55, fab, 0, 0, FLOOR_TOP + 0.42));
    g.add(box(2.05, 0.85, 0.1, PALETTE.woodOak, 0, -0.74, FLOOR_TOP + 0.52));
    g.add(box(0.52, 0.1, 0.36, pbrMat({ color: 0xf5f3ef, roughness: 0.98 }), -0.55, -0.55, FLOOR_TOP + 0.58));
    g.add(box(0.52, 0.1, 0.36, pbrMat({ color: 0xf5f3ef, roughness: 0.98 }), 0.55, -0.55, FLOOR_TOP + 0.58));
  } else if (type === 'bed_single') {
    g.add(box(1.05, 0.26, 1.95, PALETTE.woodOak, 0, 0, FLOOR_TOP + 0.16));
    g.add(box(0.95, 0.2, 1.85, fab, 0, 0, FLOOR_TOP + 0.38));
    g.add(box(1.05, 0.7, 0.08, PALETTE.woodOak, 0, -0.9, FLOOR_TOP + 0.48));
  } else if (type === 'kitchen_counter') {
    g.add(box(2.4, 0.88, 0.62, PALETTE.applianceWhite, 0, 0, FLOOR_TOP + 0.46));
    g.add(box(2.42, 0.035, 0.64, PALETTE.granite, 0, 0, FLOOR_TOP + 0.915));
    g.add(box(2.4, 0.68, 0.34, PALETTE.applianceWhite, 0, -0.14, FLOOR_TOP + 1.62));
    g.add(box(0.55, 0.04, 0.48, PALETTE.metalSteel, 0, 0.2, FLOOR_TOP + 0.935));
  } else if (type === 'stove') {
    g.add(box(0.58, 0.04, 0.52, PALETTE.metalSteel, 0, 0, FLOOR_TOP + 0.935));
    for (let i = -1; i <= 1; i += 2) {
      g.add(cyl(0.09, 0.09, 0.02, 16, PALETTE.metalSteel, i * 0.15, 0, FLOOR_TOP + 0.96));
    }
  } else if (type === 'pooja_mandir') {
    g.add(box(1.0, 0.22, 0.42, PALETTE.metalBrass, 0, 0, FLOOR_TOP + 0.14));
    g.add(box(0.85, 0.5, 0.36, PALETTE.metalBrass, 0, 0, FLOOR_TOP + 0.58));
    g.add(box(0.7, 0.4, 0.3, PALETTE.metalBrass, 0, 0, FLOOR_TOP + 1.15));
  } else if (type === 'tv_unit') {
    g.add(box(1.8, 0.42, 0.46, PALETTE.woodDark, 0, 0, FLOOR_TOP + 0.26));
    g.add(box(1.45, 0.82, 0.045, pbrMat({ color: 0x0a0a0c, roughness: 0.15, metalness: 0.3 }), 0, -0.04, FLOOR_TOP + 0.92));
    g.add(box(1.38, 0.76, 0.01, pbrMat({ color: 0x111118, roughness: 0.05, emissive: 0x0a1020, emissiveIntensity: 0.25 }), 0, -0.04, FLOOR_TOP + 0.92));
  } else if (type === 'plant') {
    g.add(cyl(0.16, 0.2, 0.26, 12, PALETTE.plantPot, 0, 0, FLOOR_TOP + 0.15));
    g.add(cyl(0.05, 0.28, 0.55, 8, PALETTE.plantLeaf, 0, 0, FLOOR_TOP + 0.58));
    g.add(cyl(0, 0.22, 0.35, 8, PALETTE.plantLeaf, 0.08, 0.06, FLOOR_TOP + 0.78));
    g.add(cyl(0, 0.18, 0.28, 8, PALETTE.plantLeaf, -0.06, -0.05, FLOOR_TOP + 0.72));
  } else if (type === 'floor_lamp') {
    g.add(cyl(0.14, 0.16, 0.05, 16, PALETTE.metalSteel, 0, 0, FLOOR_TOP + 0.04));
    g.add(cyl(0.015, 0.015, 1.45, 8, PALETTE.metalSteel, 0, 0, FLOOR_TOP + 0.78));
    const shade = pbrMat({ color: 0xf5ecd8, roughness: 0.85, emissive: 0xffe8c0, emissiveIntensity: 0.6 });
    g.add(cyl(0.02, 0.18, 0.22, 16, shade, 0, 0, FLOOR_TOP + 1.48));
    if (sceneLights) {
      const pl = new THREE.PointLight(0xffe8cc, 0.25, 3.5, 2);
      pl.position.set(fx, FLOOR_TOP + 1.4, fz);
      sceneLights.add(pl);
    }
  } else if (type === 'wardrobe') {
    g.add(box(0.58, 2.15, 1.78, PALETTE.woodTeak, 0, 0, FLOOR_TOP + 1.12));
    g.add(box(0.02, 2.0, 0.86, PALETTE.woodDark, 0, 0.44, FLOOR_TOP + 1.1));
    g.add(cyl(0.015, 0.015, 0.08, 8, PALETTE.metalBrass, 0.12, 0.44, FLOOR_TOP + 1.0));
  } else if (type === 'fridge') {
    g.add(box(0.68, 1.72, 0.62, PALETTE.applianceWhite, 0, 0, FLOOR_TOP + 0.9));
    g.add(box(0.04, 0.35, 0.04, PALETTE.metalSteel, 0.26, 0.28, FLOOR_TOP + 1.0));
  } else if (type === 'dining_table') {
    g.add(box(1.18, 0.045, 0.72, PALETTE.woodOak, 0, 0, FLOOR_TOP + 0.73));
    [[-0.48, -0.3], [0.48, -0.3], [0.48, 0.3], [-0.48, 0.3]].forEach(([dx, dz]) => {
      g.add(cyl(0.03, 0.035, 0.72, 10, PALETTE.woodOak, dx, dz, FLOOR_TOP + 0.36));
    });
  } else if (type === 'dining_chair') {
    g.add(box(0.4, 0.04, 0.4, PALETTE.woodOak, 0, 0, FLOOR_TOP + 0.44));
    g.add(box(0.4, 0.45, 0.04, fab, 0, -0.17, FLOOR_TOP + 0.68));
    g.add(box(0.04, 0.45, 0.04, PALETTE.woodOak, -0.16, -0.17, FLOOR_TOP + 0.68));
    g.add(box(0.04, 0.45, 0.04, PALETTE.woodOak, 0.16, -0.17, FLOOR_TOP + 0.68));
  } else if (type === 'study_desk') {
    g.add(box(1.18, 0.035, 0.58, PALETTE.woodOak, 0, 0, FLOOR_TOP + 0.72));
    g.add(box(0.48, 0.32, 0.025, pbrMat({ color: 0x080808, roughness: 0.2 }), 0, -0.12, FLOOR_TOP + 0.92));
    g.add(box(0.12, 0.02, 0.08, PALETTE.metalSteel, 0.05, -0.12, FLOOR_TOP + 0.76));
  } else if (type === 'office_chair') {
    g.add(box(0.48, 0.05, 0.48, pbrMat({ color: 0x2a2a30, roughness: 0.85 }), 0, 0, FLOOR_TOP + 0.42));
    g.add(box(0.44, 0.42, 0.04, pbrMat({ color: 0x2a2a30, roughness: 0.85 }), 0, -0.2, FLOOR_TOP + 0.68));
    g.add(cyl(0.04, 0.04, 0.5, 10, PALETTE.metalSteel, 0, 0, FLOOR_TOP + 0.28));
  } else if (type === 'toilet') {
    g.add(box(0.38, 0.4, 0.58, PALETTE.applianceWhite, 0, 0, FLOOR_TOP + 0.24));
    g.add(box(0.36, 0.35, 0.18, PALETTE.applianceWhite, 0, -0.28, FLOOR_TOP + 0.52));
  } else if (type === 'sink') {
    g.add(box(0.5, 0.82, 0.4, PALETTE.applianceWhite, 0, 0, FLOOR_TOP + 0.45));
    g.add(cyl(0.14, 0.14, 0.06, 20, PALETTE.metalSteel, 0, 0.08, FLOOR_TOP + 0.88));
  } else if (type === 'ceiling_light') {
    addCeilingLight(fx, fz, WH, g, sceneLights);
  } else if (type === 'ceiling_fan') {
    addCeilingFan(fx, fz, WH, g);
  } else if (type === 'pendant_light') {
    addPendantLight(fx, fz, WH, g, sceneLights);
  } else {
    const [sw, sd, sh] = spec.size;
    g.add(box(sw, sh, sd, PALETTE.fabricLinen(catalogColor(spec)), 0, 0, FLOOR_TOP + sh / 2));
  }
  group.add(g);
}

export function buildRealisticInterior({
  layout, catalog, interiorGroup, ceilingGroup, sceneLights,
  wallH, WH, WT, viewMode, showPaths = true,
}) {
  const FLOOR = FLOOR_TEX;

  for (const room of layout.rooms || []) {
    const r = room.rect;
    const cx = r.x + r.w / 2, cz = r.y + r.h / 2;
    const ft = FLOOR[room.floor] || FLOOR.oak_parquet;
    interiorGroup.add(box(r.w, 0.052, r.h, pbrMat({ color: ft.color, roughness: ft.rough, metalness: ft.metal }), cx, cz, FLOOR_TOP / 2));

    const wc = room.wall_color || [0.95, 0.93, 0.9];
    const wm = pbrMat({ color: new THREE.Color(wc[0], wc[1], wc[2]), roughness: 0.9, metalness: 0 });
    interiorGroup.add(box(r.w, wallH, WT, wm, cx, r.y + WT / 2, FLOOR_TOP + wallH / 2));
    interiorGroup.add(box(r.w, wallH, WT, wm, cx, r.y + r.h - WT / 2, FLOOR_TOP + wallH / 2));
    interiorGroup.add(box(WT, wallH, r.h, wm, r.x + WT / 2, cz, FLOOR_TOP + wallH / 2));
    interiorGroup.add(box(WT, wallH, r.h, wm, r.x + r.w - WT / 2, cz, FLOOR_TOP + wallH / 2));

    const sk = box(r.w, 0.035, r.h, PALETTE.ceiling, cx, cz, FLOOR_TOP + WH - 0.02);
    sk.name = `Ceil_${room.name}`;
    ceilingGroup.add(sk);

    for (const win of room.windows || []) addWindow(win, room, WH, WT, interiorGroup);

    const hasFan = (room.furniture || []).some(f => f.type === 'ceiling_fan');
    if (!hasFan && ['Living Room', 'Master Bedroom', 'Kids Bedroom'].includes(room.name)) {
      addCeilingFan(cx, cz, WH, interiorGroup);
    }

    for (const item of room.furniture || []) {
      addFurniture(item.type, item, catalog, WH, interiorGroup, sceneLights);
    }
  }

  for (const door of layout.doors || []) addDoor(door, WH, interiorGroup);

  if (showPaths && layout.camera_tour?.length) {
    addWalkPath(layout.camera_tour, interiorGroup, true);
  }
}
