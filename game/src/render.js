// Langit Nusantara — everything the pilot sees, drawn on one canvas.
// The view is a chase camera behind the aircraft: dawn sky above, sea and
// islands below, the runway and the next ring ahead, the aircraft in frame,
// and a lit instrument panel along the bottom with the HUD on top.

import { CANVAS_W, CANVAS_H } from './config.js';
import { nextRing, ringsPassed } from './world.js';

const FOCAL = 900; // perspective focal length, in pixels
// The chase camera rides above the aircraft's own altitude, looking
// slightly down: without this the whole ground plane would collapse onto
// the horizon line whenever the aircraft sits on the runway.
const CAM_H = 55;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Project a point on the course into screen space. d is feet ahead of the
// aircraft, off is feet to the side, alt is feet above the aircraft.
function project(f, horizonY, d, off, alt) {
  const dd = Math.max(60, d);
  return {
    x: CANVAS_W / 2 + (off / dd) * FOCAL,
    y: horizonY - (alt / dd) * FOCAL,
    s: FOCAL / dd,
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawScene(ctx, game) {
  const { f, world, mission, state } = game;
  const horizonY = CANVAS_H * 0.52 - f.pitch * 2.2 - f.altitude * 0.004;
  drawSky(ctx, horizonY, game.time);
  drawSea(ctx, horizonY, game.time);
  drawClouds(ctx, f, world, horizonY, game.time);
  drawIslands(ctx, f, world, horizonY);
  drawBoats(ctx, f, world, horizonY, game.time);
  drawRunway(ctx, f, world, horizonY);
  drawRings(ctx, f, world, horizonY, game.time);
  drawAircraft(ctx, f, game.time);
  drawHud(ctx, f, world, mission, game);
  drawInstruments(ctx, f, game);
  drawMessages(ctx, game);
  if (state === 'menu') drawMenu(ctx, game);
  if (state === 'crashed') drawEndCard(ctx, game, false);
  if (state === 'landed') drawEndCard(ctx, game, true);
  if (state === 'complete') drawEndCard(ctx, game, true);
}

function drawSky(ctx, horizonY, time) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  g.addColorStop(0, '#1b2a5e');
  g.addColorStop(0.35, '#4a5fa8');
  g.addColorStop(0.52, '#e8907c');
  g.addColorStop(0.62, '#f7c489');
  g.addColorStop(1, '#2c4a6b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Low dawn sun, right of centre, with a soft halo.
  const sunX = CANVAS_W * 0.72;
  const sunY = horizonY - 130;
  const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
  halo.addColorStop(0, 'rgba(255, 214, 140, 0.95)');
  halo.addColorStop(0.25, 'rgba(255, 178, 102, 0.55)');
  halo.addColorStop(1, 'rgba(255, 178, 102, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 160, sunY - 160, 320, 320);
  ctx.fillStyle = '#ffe9b0';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
}

function drawSea(ctx, horizonY, time) {
  const g = ctx.createLinearGradient(0, horizonY, 0, CANVAS_H);
  g.addColorStop(0, '#3f7d9e');
  g.addColorStop(0.25, '#2a5f7e');
  g.addColorStop(1, '#123652');
  ctx.fillStyle = g;
  ctx.fillRect(0, horizonY, CANVAS_W, CANVAS_H - horizonY);
  // Sun glitter on the water.
  ctx.strokeStyle = 'rgba(255, 205, 130, 0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const y = horizonY + 18 + i * 18 + ((time * 7 + i * 37) % 9);
    const w = 50 + i * 12;
    const x = CANVAS_W * 0.72 + Math.sin(time * 0.6 + i) * 14 - w / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
  }
  // Slow swell lines.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const y = horizonY + 30 + i * 34;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_W; x += 40) {
      const yy = y + Math.sin(x * 0.012 + time * 0.8 + i * 2.1) * 3;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

function drawClouds(ctx, f, world, horizonY, time) {
  for (const c of world.clouds) {
    const d = c.distance - f.distance + Math.sin(time * 0.05 + c.offset) * 20;
    if (d < 200 || d > 30000) continue;
    const off = c.offset - f.offset + c.speed * time * 0.2;
    const p = project(f, horizonY, d, off, c.altitude - f.altitude);
    if (p.x < -200 || p.x > CANVAS_W + 200) continue;
    const s = p.s * c.scale;
    ctx.fillStyle = 'rgba(255, 244, 230, 0.85)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 90 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - 55 * s, p.y + 6 * s, 55 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + 60 * s, p.y + 5 * s, 60 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawIslands(ctx, f, world, horizonY) {
  // Far islands first so near ones paint over them.
  const sorted = [...world.islands].sort((a, b) => b.distance - a.distance);
  // Only the nearest island gets its name: several labels at one spot
  // stack into an unreadable pile.
  let nearest = null;
  let nearestW = 0;
  for (const isl of sorted) {
    const d = isl.distance - f.distance;
    if (d < -4000 || d > 32000) continue;
    const w = Math.max(8, isl.width * (FOCAL / Math.max(300, d)));
    if (w > nearestW) {
      nearestW = w;
      nearest = isl;
    }
  }
  for (const isl of sorted) {
    const d = isl.distance - f.distance;
    if (d < -4000 || d > 32000) continue;
    const off = isl.offset - f.offset;
    const base = project(f, horizonY, Math.max(300, d), off, -f.altitude - CAM_H);
    // Clamp the drawn size: an island right under the aircraft would
    // otherwise paint the whole frame one flat colour.
    const w = Math.min(1150, Math.max(8, isl.width * base.s));
    const h = Math.min(380, Math.max(6, isl.peak * base.s * 1.6));
    if (base.x < -w || base.x > CANVAS_W + w) continue;
    // Lagoon ring, sand beach, green island, peak.
    if (isl.lagoon) {
      ctx.fillStyle = 'rgba(64, 190, 200, 0.55)';
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, w * 0.72, w * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e8d9a0';
    ctx.beginPath();
    ctx.ellipse(base.x, base.y, w * 0.62, w * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f7d4f';
    ctx.beginPath();
    ctx.ellipse(base.x, base.y - h * 0.12, w * 0.55, w * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();
    // A darker inner ridge, so a near island reads as land, not flat paint.
    ctx.fillStyle = '#27603c';
    ctx.beginPath();
    ctx.ellipse(base.x, base.y - h * 0.14, w * 0.34, w * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    // The peak: a hill, or a volcano with smoke on Pulau Api.
    ctx.fillStyle = isl.volcano ? '#5c4a3a' : '#27603c';
    ctx.beginPath();
    ctx.moveTo(base.x - w * 0.30, base.y - h * 0.10);
    ctx.lineTo(base.x, base.y - h);
    ctx.lineTo(base.x + w * 0.30, base.y - h * 0.10);
    ctx.closePath();
    ctx.fill();
    if (isl.volcano) {
      ctx.fillStyle = 'rgba(240, 235, 225, 0.8)';
      ctx.beginPath();
      ctx.ellipse(base.x + 8, base.y - h - 8, w * 0.06, 7, 0.3, 0, Math.PI * 2);
      ctx.ellipse(base.x + 22, base.y - h - 20, w * 0.05, 6, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Palm dots along the beach.
    ctx.fillStyle = '#1d5c33';
    for (let i = 0; i < isl.palms; i++) {
      const px = base.x - w * 0.45 + (i / Math.max(1, isl.palms - 1)) * w * 0.9;
      const py = base.y - h * 0.08 - ((i * 37) % 10);
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.5, w * 0.008), 0, Math.PI * 2);
      ctx.fill();
    }
    // Name label on the nearest island only, and never under the HUD bar.
    if (isl === nearest && w > 130 && base.y - h - 14 > 120) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isl.name, base.x, base.y - h - 14);
    }
  }
}

function drawBoats(ctx, f, world, horizonY, time) {
  for (const b of world.boats) {
    const d = b.distance - f.distance + b.speed * time;
    if (d < 300 || d > 20000) continue;
    const off = b.offset - f.offset;
    const p = project(f, horizonY, d, off, -f.altitude - CAM_H);
    if (p.x < -60 || p.x > CANVAS_W + 60) continue;
    const s = p.s * 1.4;
    ctx.fillStyle = '#7a4a28';
    ctx.beginPath();
    ctx.moveTo(p.x - 26 * s, p.y);
    ctx.lineTo(p.x + 26 * s, p.y);
    ctx.lineTo(p.x + 18 * s, p.y + 8 * s);
    ctx.lineTo(p.x - 18 * s, p.y + 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = b.kind === 'feri' ? '#f2ead8' : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(p.x - 4 * s, p.y);
    ctx.lineTo(p.x - 4 * s, p.y - 26 * s);
    ctx.lineTo(p.x + 14 * s, p.y - 4 * s);
    ctx.closePath();
    ctx.fill();
    // Wake.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, 2 * s);
    ctx.beginPath();
    ctx.moveTo(p.x - 26 * s, p.y + 8 * s);
    ctx.lineTo(p.x - 70 * s, p.y + 16 * s);
    ctx.stroke();
  }
}

function drawRunway(ctx, f, world, horizonY) {
  const r = world.runway;
  const dNear = r.distance - r.length / 2 - f.distance;
  const dFar = r.distance + r.length / 2 - f.distance;
  if (dFar < 100) return;
  const corners = [
    project(f, horizonY, Math.max(120, dNear), r.offset - r.width / 2 - f.offset, -f.altitude - CAM_H),
    project(f, horizonY, Math.max(120, dNear), r.offset + r.width / 2 - f.offset, -f.altitude - CAM_H),
    project(f, horizonY, Math.max(120, dFar), r.offset + r.width / 2 - f.offset, -f.altitude - CAM_H),
    project(f, horizonY, Math.max(120, dFar), r.offset - r.width / 2 - f.offset, -f.altitude - CAM_H),
  ];
  ctx.fillStyle = '#3a3f46';
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (const c of corners.slice(1)) ctx.lineTo(c.x, c.y);
  ctx.closePath();
  ctx.fill();
  // Centreline dashes.
  ctx.fillStyle = '#f5f5f5';
  const dashes = 9;
  for (let i = 0; i < dashes; i++) {
    const t0 = i / dashes;
    const t1 = (i + 0.55) / dashes;
    const a = lerpCorner(corners, t0);
    const b = lerpCorner(corners, t1);
    ctx.beginPath();
    ctx.moveTo(a.x - 1.5, a.y);
    ctx.lineTo(b.x - 1.5, b.y);
    ctx.lineTo(b.x + 1.5, b.y);
    ctx.lineTo(a.x + 1.5, a.y);
    ctx.closePath();
    ctx.fill();
  }
  // Threshold bars at the near end.
  ctx.fillStyle = '#ffffff';
  for (let k = -2; k <= 2; k++) {
    const t = 0.02;
    const a = lerpCorner(corners, t);
    const cx = a.x + k * 8;
    ctx.fillRect(cx - 3, a.y - 2, 6, 4);
  }
  // The runway's distance is shown in the HUD (drawHud), not in the
  // world: an in-world label lands on the aircraft or under the HUD bar.
  // Windsock beside the runway, planted on the ground beside the strip.
  const sock = project(f, horizonY, Math.max(300, dNear + 300), r.offset + r.width / 2 + 260 - f.offset, -f.altitude - CAM_H);
  if (sock.x > 0 && sock.x < CANVAS_W && dNear > 0 && dNear < 12000) {
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sock.x, sock.y);
    ctx.lineTo(sock.x, sock.y - 26 * sock.s * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff7a2f';
    ctx.beginPath();
    ctx.moveTo(sock.x, sock.y - 26 * sock.s * 2);
    ctx.lineTo(sock.x + 22 * sock.s * 2, sock.y - 20 * sock.s * 2);
    ctx.lineTo(sock.x + 22 * sock.s * 2, sock.y - 14 * sock.s * 2);
    ctx.lineTo(sock.x, sock.y - 18 * sock.s * 2);
    ctx.closePath();
    ctx.fill();
  }
}

function lerpCorner(corners, t) {
  // Interpolate down the runway centreline from the near edge to the far.
  const left = {
    x: corners[0].x + (corners[3].x - corners[0].x) * t,
    y: corners[0].y + (corners[3].y - corners[0].y) * t,
  };
  const right = {
    x: corners[1].x + (corners[2].x - corners[1].x) * t,
    y: corners[1].y + (corners[2].y - corners[1].y) * t,
  };
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function drawRings(ctx, f, world, horizonY, time) {
  const next = nextRing(world);
  const sorted = [...world.rings].sort((a, b) => b.distance - a.distance);
  for (const ring of sorted) {
    const d = ring.distance - f.distance;
    if (d < 40 || d > 26000) continue;
    const p = project(f, horizonY, d, ring.offset - f.offset, ring.altitude - f.altitude);
    const rx = ring.radius * p.s;
    const ry = rx * 0.94;
    if (p.x < -rx - 40 || p.x > CANVAS_W + rx + 40) continue;
    const isNext = next && ring.index === next.index;
    const pulse = isNext ? 1 + Math.sin(time * 5) * 0.06 : 1;
    ctx.lineWidth = Math.max(2, 5 * p.s * 2 + 2);
    ctx.strokeStyle = ring.passed
      ? 'rgba(120, 220, 140, 0.85)'
      : isNext
        ? '#ffc93c'
        : 'rgba(160, 200, 255, 0.75)';
    if (isNext) {
      ctx.shadowColor = '#ffc93c';
      ctx.shadowBlur = 18;
    }
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Chevrons on the next ring so the pilot can find it at a glance.
    // Clamped into the frame: a ring that fills the screen would push its
    // number under the HUD bar and its distance under the panel.
    if (isNext && rx > 14) {
      ctx.fillStyle = '#ffc93c';
      ctx.font = `bold ${Math.max(12, Math.min(28, rx * 0.5))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${ring.index + 1}`, p.x, Math.max(124, p.y - ry - 10));
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(`${Math.max(0, Math.round(d))} kaki`, p.x, Math.min(CANVAS_H - 162, p.y + ry + 20));
    }
  }
}

// The aircraft, seen from behind and slightly above: the chase view the
// pilot flies from. It banks with the flight model and bobs gently.
function drawAircraft(ctx, f, time) {
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H * 0.60 + Math.sin(time * 1.4) * 2 - f.pitch * 1.2;
  const scale = 1 + clamp(f.altitude / 6000, 0, 1) * 0.06;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-f.bank * Math.PI) / 180);
  ctx.scale(scale, scale);
  // Soft shadow on the sea when low.
  if (f.altitude < 1500) {
    const sh = 1 - f.altitude / 1500;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.25 * sh})`;
    ctx.beginPath();
    ctx.ellipse(0, 128, 90 * sh + 20, 10 * sh + 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Wings: wide, slightly swept, orange tips.
  ctx.fillStyle = '#e8e4da';
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.lineTo(-168, 26);
  ctx.lineTo(-168, 40);
  ctx.lineTo(-10, 26);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 6);
  ctx.lineTo(168, 26);
  ctx.lineTo(168, 40);
  ctx.lineTo(10, 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff7a2f';
  ctx.fillRect(-168, 26, 22, 14);
  ctx.fillRect(146, 26, 22, 14);
  // Nav lights: red left, green right, glowing.
  ctx.shadowColor = '#ff3b30';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(-170, 33, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = '#34d17b';
  ctx.fillStyle = '#34d17b';
  ctx.beginPath();
  ctx.arc(170, 33, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Fuselage, seen from the tail: tapered body with a window stripe.
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath();
  ctx.moveTo(-26, -58);
  ctx.quadraticCurveTo(0, -72, 26, -58);
  ctx.lineTo(30, 34);
  ctx.quadraticCurveTo(0, 48, -30, 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff7a2f';
  ctx.beginPath();
  ctx.moveTo(-26, -30);
  ctx.lineTo(26, -30);
  ctx.lineTo(28, -18);
  ctx.lineTo(-28, -18);
  ctx.closePath();
  ctx.fill();
  // Tail fin and stabilisers.
  ctx.fillStyle = '#ff7a2f';
  ctx.beginPath();
  ctx.moveTo(-16, -56);
  ctx.lineTo(0, -96);
  ctx.lineTo(16, -56);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8e4da';
  ctx.beginPath();
  ctx.moveTo(-12, -52);
  ctx.lineTo(-72, -38);
  ctx.lineTo(-72, -28);
  ctx.lineTo(-10, -40);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, -52);
  ctx.lineTo(72, -38);
  ctx.lineTo(72, -28);
  ctx.lineTo(10, -40);
  ctx.closePath();
  ctx.fill();
  // Spinning propeller blur behind the tail, and the Elang roundel.
  ctx.fillStyle = 'rgba(200, 200, 210, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, -62, 10, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b2a5e';
  ctx.beginPath();
  ctx.arc(0, -8, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffc93c';
  ctx.beginPath();
  ctx.arc(0, -8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The HUD: altitude, speed and heading in big figures across the top,
// plus score, rings and the mission clock.
function drawHud(ctx, f, world, mission, game) {
  ctx.fillStyle = 'rgba(10, 18, 38, 0.55)';
  roundRect(ctx, 12, 10, CANVAS_W - 24, 64, 10);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('ALT — KETINGGIAN', 28, 28);
  ctx.fillText('SPD — KECEPATAN', 300, 28);
  ctx.fillText('HDG — ARAH', 560, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`${Math.round(f.altitude)} ft`, 28, 60);
  ctx.fillText(`${Math.round(f.speedKt)} kt`, 300, 60);
  ctx.fillText(`${String(Math.round(f.heading)).padStart(3, '0')}°`, 560, 60);
  // Compass tape: a heading strip in its own row under the top bar, so it
  // never collides with the HDG figure above it.
  ctx.fillStyle = 'rgba(10, 18, 38, 0.55)';
  roundRect(ctx, CANVAS_W / 2 - 150, 80, 300, 24, 8);
  ctx.fill();
  ctx.fillStyle = '#cfe8ff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let k = -2; k <= 2; k++) {
    const raw = Math.round(f.heading / 15) * 15 + k * 15;
    const h = ((raw % 360) + 360) % 360;
    const label = h === 0 ? 'U 360' : h === 90 ? 'T 090' : h === 180 ? 'S 180' : h === 270 ? 'B 270' : String(h).padStart(3, '0');
    ctx.fillText(label, CANVAS_W / 2 + k * 58, 97);
  }
  ctx.fillStyle = '#ffc93c';
  ctx.beginPath();
  ctx.moveTo(CANVAS_W / 2, 80);
  ctx.lineTo(CANVAS_W / 2 - 5, 72);
  ctx.lineTo(CANVAS_W / 2 + 5, 72);
  ctx.closePath();
  ctx.fill();
  // Right side: score, rings, time.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('SKOR', CANVAS_W - 280, 28);
  ctx.fillText('RING', CANVAS_W - 160, 28);
  ctx.fillText('WAKTU', CANVAS_W - 28, 28);
  ctx.fillStyle = '#ffc93c';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`${game.score}`, CANVAS_W - 280, 58);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${ringsPassed(world)}/${world.rings.length}`, CANVAS_W - 160, 58);
  const mm = String(Math.floor(f.time / 60)).padStart(2, '0');
  const ss = String(Math.floor(f.time % 60)).padStart(2, '0');
  ctx.fillText(`${mm}:${ss}`, CANVAS_W - 28, 58);
  // Fuel warning, flashing when low.
  if (f.fuel < 25 && !f.onGround) {
    const on = Math.sin(game.time * 8) > 0;
    if (on) {
      ctx.fillStyle = '#ff5a4e';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`BAHAN BAKAR RENDAH — ${Math.round(f.fuel)}%`, CANVAS_W / 2, 140);
    }
  }
  // Runway distance, in its own line under the compass tape.
  const dNear = world.runway.distance - world.runway.length / 2 - f.distance;
  if (dNear > 0 && dNear < 6000 && game.state === 'fly') {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LANDASAN PULAU BINTANG — ${Math.round(dNear)} kaki`, CANVAS_W / 2, 122);
  }
  // Next-ring pointer when the ring is off to the side.
  const ring = nextRing(world);
  if (ring && !f.onGround && game.state === 'fly') {
    const d = ring.distance - f.distance;
    if (d > 0) {
      const rel = (ring.offset - f.offset) / Math.max(400, d);
      if (Math.abs(rel) > 0.45) {
        ctx.fillStyle = '#ffc93c';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = rel > 0 ? 'right' : 'left';
        ctx.fillText(rel > 0 ? 'RING ▶' : '◀ RING', rel > 0 ? CANVAS_W - 30 : 30, CANVAS_H * 0.24);
      }
    }
  }
}

// The lit instrument panel: artificial horizon, altimeter, airspeed,
// vertical speed, throttle and fuel — the instruments the bounty asks for.
function drawInstruments(ctx, f, game) {
  const panelY = CANVAS_H - 118;
  ctx.fillStyle = 'rgba(8, 14, 30, 0.82)';
  roundRect(ctx, 0, panelY, CANVAS_W, 118, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(159, 216, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, panelY);
  ctx.lineTo(CANVAS_W, panelY);
  ctx.stroke();

  drawArtificialHorizon(ctx, 110, panelY + 56, 40, f);
  drawDial(ctx, 250, panelY + 56, 40, f.altitude / 6000, `${Math.round(f.altitude)}`, 'ALT ft', '#7fd0ff');
  drawDial(ctx, 380, panelY + 56, 40, f.speedKt / 220, `${Math.round(f.speedKt)}`, 'SPD kt', '#7fd0ff');
  drawDial(ctx, 510, panelY + 56, 40, clamp((f.verticalSpeed + 20) / 40, 0, 1), `${f.verticalSpeed >= 0 ? '+' : ''}${Math.round(f.verticalSpeed)}`, 'VSI ft/s', '#b8e986');
  drawThrottle(ctx, 640, panelY + 14, f);
  drawFuel(ctx, 760, panelY + 14, f);
  // Mission strip on the right of the panel.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('MISI', 900, panelY + 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText(game.mission.name, 900, panelY + 55);
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(game.mission.brief, 900, panelY + 78, 350);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Panah: kendali  •  W/S: throttle  •  M: suara  •  P: jeda', 900, panelY + 100);
}

function drawArtificialHorizon(ctx, x, y, r, f) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate((-f.bank * Math.PI) / 180);
  ctx.translate(0, f.pitch * 1.6);
  ctx.fillStyle = '#3d7ac2';
  ctx.fillRect(-r - 4, -r - 60, (r + 4) * 2, r + 60);
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(-r - 4, 0, (r + 4) * 2, r + 60);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-r - 4, -1, (r + 4) * 2, 2);
  ctx.restore();
  ctx.strokeStyle = '#ffc93c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker in the middle.
  ctx.fillStyle = '#ffc93c';
  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  ctx.lineTo(x - 4, y);
  ctx.lineTo(x - 4, y + 3);
  ctx.lineTo(x - 18, y + 3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 18, y);
  ctx.lineTo(x + 4, y);
  ctx.lineTo(x + 4, y + 3);
  ctx.lineTo(x + 18, y + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HORIZON', x, y + r + 11);
}

function drawDial(ctx, x, y, r, frac, value, label, color) {
  ctx.fillStyle = '#0e1a33';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(159, 216, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Tick marks.
  ctx.strokeStyle = 'rgba(207, 232, 255, 0.7)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const a = (-210 + i * 30) * (Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r - 6), y + Math.sin(a) * (r - 6));
    ctx.lineTo(x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1));
    ctx.stroke();
  }
  // Glowing needle.
  const a = (-210 + clamp(frac, 0, 1) * 300) * (Math.PI / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * (r - 10), y + Math.sin(a) * (r - 10));
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(value, x, y + 6);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(label, x, y + r + 11);
}

function drawThrottle(ctx, x, y, f) {
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THROTTLE', x + 30, y + 6);
  ctx.fillStyle = '#0e1a33';
  roundRect(ctx, x, y + 14, 60, 72, 6);
  ctx.fill();
  const h = 64 * f.throttle;
  ctx.fillStyle = f.throttle > 0.85 ? '#ff7a2f' : '#7fd0ff';
  roundRect(ctx, x + 4, y + 14 + (64 - h), 52, h, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`${Math.round(f.throttle * 100)}%`, x + 30, y + 98);
}

function drawFuel(ctx, x, y, f) {
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BAHAN BAKAR', x + 40, y + 6);
  ctx.fillStyle = '#0e1a33';
  roundRect(ctx, x, y + 14, 80, 72, 6);
  ctx.fill();
  const h = 64 * (f.fuel / 100);
  ctx.fillStyle = f.fuel < 25 ? '#ff5a4e' : '#b8e986';
  roundRect(ctx, x + 4, y + 14 + (64 - h), 72, h, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`${Math.round(f.fuel)}%`, x + 40, y + 98);
}

// Floating score popups and the hint line above the panel.
function drawMessages(ctx, game) {
  const { f } = game;
  ctx.textAlign = 'center';
  const hint = game.hintText || '';
  if (hint && game.state === 'fly') {
    // A dark pill behind the hint so it reads over bright sand or sky.
    ctx.font = '15px system-ui, sans-serif';
    const w = ctx.measureText(hint).width + 28;
    ctx.fillStyle = 'rgba(10, 18, 38, 0.6)';
    roundRect(ctx, CANVAS_W / 2 - w / 2, CANVAS_H - 152, w, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#eaf4ff';
    ctx.fillText(hint, CANVAS_W / 2, CANVAS_H - 134);
  }
  for (const pop of game.popups) {
    const age = game.time - pop.at;
    if (age > 1.6) continue;
    ctx.globalAlpha = 1 - age / 1.6;
    ctx.fillStyle = pop.color || '#ffc93c';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(pop.text, CANVAS_W / 2, CANVAS_H * 0.30 - age * 30);
    ctx.globalAlpha = 1;
  }
}

function drawMenu(ctx, game) {
  ctx.fillStyle = 'rgba(6, 12, 28, 0.45)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('LANGIT NUSANTARA', CANVAS_W / 2, 150);
  ctx.fillStyle = '#ffc93c';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Kurir udara antarpulau — terbang, lewati ring, mendarat', CANVAS_W / 2, 188);
  ctx.fillStyle = '#eaf4ff';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Panah ATAS/BAWAH: naik-turun  •  Panah KIRI/KANAN: belok  •  W/S: throttle  •  Mouse: kemudi halus', CANVAS_W / 2, 226);
  // Mission cards.
  game.missionRects = [];
  const cardW = 300;
  const gap = 24;
  const totalW = cardW * 3 + gap * 2;
  let x = (CANVAS_W - totalW) / 2;
  game.missions.forEach((m, i) => {
    const y = 268;
    const h = 150;
    const selected = i === game.missionIndex;
    ctx.fillStyle = selected ? 'rgba(255, 201, 60, 0.22)' : 'rgba(10, 18, 38, 0.75)';
    roundRect(ctx, x, y, cardW, h, 12);
    ctx.fill();
    ctx.strokeStyle = selected ? '#ffc93c' : 'rgba(159, 216, 255, 0.4)';
    ctx.lineWidth = selected ? 3 : 1;
    roundRect(ctx, x, y, cardW, h, 12);
    ctx.stroke();
    ctx.fillStyle = '#ffc93c';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`TEKAN ${m.key}`, x + cardW / 2, y + 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillText(m.name, x + cardW / 2, y + 62);
    ctx.fillStyle = '#cfe8ff';
    ctx.font = '14px system-ui, sans-serif';
    wrapText(ctx, m.brief, x + cardW / 2, y + 88, cardW - 32, 19);
    game.missionRects.push({ x, y, w: cardW, h, index: i });
    x += cardW + gap;
  });
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('Klik misi atau tekan 1 / 2 / 3, lalu ENTER untuk lepas landas', CANVAS_W / 2, 470);
  if (game.bestScore > 0) {
    ctx.fillStyle = '#ffc93c';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`Skor terbaik: ${game.bestScore}`, CANVAS_W / 2, 502);
  }
  ctx.fillStyle = 'rgba(234, 244, 255, 0.75)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Game orisinal — pesawat, pulau, dan suara dibuat khusus untuk game ini.', CANVAS_W / 2, 540);
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  const lines = [''];
  for (const w of words) {
    const test = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w;
    if (ctx.measureText(test).width > maxW) lines.push(w);
    else lines[lines.length - 1] = test;
  }
  lines.forEach((line, i) => ctx.fillText(line, cx, y + i * lineH));
}

function drawEndCard(ctx, game, landed) {
  ctx.fillStyle = 'rgba(6, 12, 28, 0.55)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const cx = CANVAS_W / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = landed ? '#b8e986' : '#ff5a4e';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText(landed ? 'MENDARAT DENGAN SELAMAT' : 'PESAWAT JATUH', cx, 250);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(game.endReason || '', cx, 292);
  ctx.fillStyle = '#ffc93c';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`Skor: ${game.score}   •   Ring: ${game.ringsCleared}/${game.world.rings.length}`, cx, 344);
  if (game.bestScore > 0) {
    ctx.fillStyle = '#eaf4ff';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(`Skor terbaik: ${game.bestScore}`, cx, 378);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText('Tekan R untuk terbang lagi  •  M untuk kembali ke menu', cx, 430);
}
