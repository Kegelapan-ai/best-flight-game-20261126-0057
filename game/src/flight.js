// Langit Nusantara — the flight model. One step per frame: throttle sets
// target speed, bank turns the heading, pitch trades speed for altitude,
// and a stall sinks the aircraft when it flies too slow. Fuel drains with
// throttle; empty tanks mean a glide, not a fall out of the sky.

import {
  MIN_SPEED_KT,
  MAX_SPEED_KT,
  CLIMB_RATE_FT_S,
  TURN_RATE_DEG_S,
  BANK_MAX_DEG,
  FUEL_DRAIN_PER_S,
  FUEL_DRAIN_IDLE,
  RING_RADIUS_FT,
} from './config.js';
import { nextRing } from './world.js';

export function createFlight(mission) {
  return {
    // Position along the course (feet), lateral offset (feet), height (feet).
    distance: 0,
    offset: 0,
    altitude: 0,
    heading: 90, // east, down the course
    bank: 0, // degrees, + is right
    pitch: 0, // degrees, + is nose up
    speedKt: 0,
    throttle: 0, // 0..1
    verticalSpeed: 0, // feet per second, for the instruments
    fuel: mission.fuel,
    gearDown: false,
    onGround: true,
    crashed: false,
    landed: false,
    // Per-frame pilot inputs, filled by the game loop from input.js.
    steer: 0, // -1 left .. +1 right
    pitchInput: 0, // -1 down .. +1 up
    throttleInput: 0, // -1 down .. +1 up
    wind: mission.wind,
    time: 0,
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function stepFlight(f, world, dt, events) {
  if (f.crashed || f.landed) return;
  f.time += dt;

  // Throttle eases toward the pilot's input; fuel follows the throttle.
  f.throttle = clamp(f.throttle + f.throttleInput * dt * 0.5, 0, 1);
  const drain = FUEL_DRAIN_IDLE + (FUEL_DRAIN_PER_S - FUEL_DRAIN_IDLE) * f.throttle;
  f.fuel = Math.max(0, f.fuel - drain * dt);
  const hasFuel = f.fuel > 0;

  // Speed chases the throttle: full throttle ~200 kt, idle ~60 kt, and a
  // dead engine glides down toward 70 kt.
  const targetSpeed = hasFuel ? 60 + f.throttle * 145 : 70;
  f.speedKt += clamp(targetSpeed - f.speedKt, -28 * dt, 18 * dt);
  f.speedKt = clamp(f.speedKt, 0, MAX_SPEED_KT);

  // Bank follows the stick, then turns the heading; pitch sets the climb.
  const targetBank = f.steer * BANK_MAX_DEG;
  f.bank += clamp(targetBank - f.bank, -90 * dt, 90 * dt);
  const turn = (f.bank / BANK_MAX_DEG) * TURN_RATE_DEG_S;
  f.heading = (f.heading + turn * dt + 360) % 360;

  // Wind gusts in the storm mission push the nose around a little.
  if (f.wind) {
    f.heading = (f.heading + Math.sin(f.time * 0.7) * 1.6 * dt + 360) % 360;
  }

  const targetPitch = f.pitchInput * 12;
  f.pitch += clamp(targetPitch - f.pitch, -30 * dt, 30 * dt);

  // Climb needs speed: below stall speed the nose drops and the aircraft
  // sinks even with the stick pulled back.
  const stalling = f.speedKt < MIN_SPEED_KT && !f.onGround;
  const climb = stalling
    ? -CLIMB_RATE_FT_S * 1.6
    : (f.pitch / 12) * CLIMB_RATE_FT_S * (0.4 + f.speedKt / 200);
  f.verticalSpeed += clamp(climb - f.verticalSpeed, -30 * dt, 30 * dt);

  // Move along the course. Speed in feet per second is knots * 1.688.
  const fps = f.speedKt * 1.68781;
  const headingRad = ((f.heading - 90) * Math.PI) / 180;
  f.distance += Math.cos(headingRad) * fps * dt;
  f.offset += Math.sin(headingRad) * fps * dt;

  if (f.onGround) {
    // Rolling on the runway: lift off once fast enough with the nose up.
    f.altitude = 0;
    f.verticalSpeed = 0;
    if (f.speedKt > 78 && f.pitchInput > 0.3) {
      f.onGround = false;
      // Rotation lifts the nose: a small positive climb rate so the
      // touchdown check in this same frame never reads a lift-off as
      // a crash (altitude is still zero, speed is still vertical).
      f.verticalSpeed = 3;
      events.push({ type: 'takeoff' });
    }
  } else {
    f.altitude += f.verticalSpeed * dt;
    if (f.altitude > 6000) {
      f.altitude = 6000;
      f.verticalSpeed = Math.min(f.verticalSpeed, 0);
    }
  }

  // Rings: passed when the aircraft crosses the ring's distance within
  // its radius, in both offset and altitude.
  const ring = nextRing(world);
  if (ring && !f.onGround) {
    const prevDistance = f.distance - Math.cos(headingRad) * fps * dt;
    if (prevDistance < ring.distance && f.distance >= ring.distance) {
      const dOff = Math.abs(f.offset - ring.offset);
      const dAlt = Math.abs(f.altitude - ring.altitude);
      const dist = Math.hypot(dOff, dAlt);
      if (dist <= RING_RADIUS_FT) {
        ring.passed = true;
        const bonus = Math.round(25 * (f.speedKt / 145));
        events.push({ type: 'ring', ring: ring.index, bonus });
      } else {
        ring.passed = true; // flown past it: no points, the course moves on
        events.push({ type: 'ring-missed', ring: ring.index });
      }
    }
  }

  // The sea and the islands: touching the water away from the runway ends
  // the flight. A landing only counts on the runway strip itself. The
  // descent check matters: right after lift-off the altitude is still
  // near zero but the aircraft is climbing, which is not a crash.
  if (!f.onGround && f.altitude <= 0 && f.verticalSpeed <= 0) {
    const r = world.runway;
    const nearRunway =
      Math.abs(f.distance - r.distance) < r.length / 2 + 200 &&
      Math.abs(f.offset - r.offset) < r.width / 2 + 60;
    if (nearRunway && f.speedKt <= 150 && f.verticalSpeed >= -9) {
      f.landed = true;
      f.altitude = 0;
      f.onGround = true;
      events.push({ type: 'landed' });
    } else {
      f.crashed = true;
      f.altitude = 0;
      events.push({ type: 'crashed', reason: nearRunway ? 'hard-landing' : 'sea' });
    }
  }
}

// A short line for the instruments: what the pilot is doing right now.
export function flightHint(f, world) {
  if (f.crashed) return 'PESAWAT JATUH — tekan R untuk terbang lagi';
  if (f.landed) return 'MENDARAT DENGAN SELAMAT — tekan R untuk misi baru';
  if (f.onGround) return 'W penuh untuk throttle, panah ATAS untuk lepas landas';
  if (f.fuel <= 0) return 'BAHAN BAKAR HABIS — meluncur, cari landasan!';
  if (f.speedKt < MIN_SPEED_KT) return 'KECEPATAN RENDAH — tambah throttle, turunkan hidung';
  const ring = nextRing(world);
  if (ring) return `Ring ${ring.index + 1} di depan — ${Math.max(0, Math.round(ring.distance - f.distance))} kaki lagi`;
  return 'Semua ring dilewati — menuju landasan Pulau Bintang';
}
