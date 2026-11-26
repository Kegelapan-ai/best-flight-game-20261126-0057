// Langit Nusantara — tunables for the whole game, in one place.
// Units the pilot sees: feet for altitude, knots for speed, degrees for
// heading. The canvas is 1280 by 720, the size the screenshots are taken at.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

export const GAME_NAME = 'LANGIT NUSANTARA';
export const GAME_SUBTITLE = 'Kurir udara antarpulau — terbang, lewati ring, mendarat';

// Flight model limits.
export const MIN_SPEED_KT = 55; // below this the aircraft stalls and sinks
export const MAX_SPEED_KT = 210;
export const CRUISE_SPEED_KT = 145;
export const MAX_ALT_FT = 6000;
export const CLIMB_RATE_FT_S = 14; // feet per second at full pitch up
export const TURN_RATE_DEG_S = 22; // degrees per second at full bank
export const BANK_MAX_DEG = 42;

// Throttle, fuel and damage.
export const FUEL_START = 100; // percent
export const FUEL_DRAIN_PER_S = 0.55; // at full throttle, percent per second
export const FUEL_DRAIN_IDLE = 0.12;
export const LANDING_SPEED_MAX_KT = 150; // faster than this on touchdown: hard landing
export const LANDING_DESCENT_MAX_FT_S = 9; // faster descent on touchdown: crash

// The course: rings to fly through, then the runway.
export const RING_COUNT = 8;
export const RING_RADIUS_FT = 90;
export const RING_SCORE = 100;
export const LANDING_BONUS = 500;
export const RING_TIME_BONUS = 25; // extra points for a fast ring, scaled by speed

// Missions, picked on the title screen with keys 1, 2 or 3.
export const MISSIONS = [
  {
    id: 'latihan',
    key: '1',
    name: 'Latihan Ring',
    brief: 'Lewati 8 ring emas di atas laut. Tanpa pendaratan, tanpa badai.',
    rings: 8,
    fuel: 100,
    wind: 0,
    landing: false,
  },
  {
    id: 'paket',
    key: '2',
    name: 'Antar Paket Pulau',
    brief: 'Lewati 8 ring, lalu mendarat di landasan Pulau Bintang.',
    rings: 8,
    fuel: 100,
    wind: 0,
    landing: true,
  },
  {
    id: 'badai',
    key: '3',
    name: 'Badai Sore',
    brief: 'Angin kencang, bahan bakar 70%. Ring dan pendaratan tetap wajib.',
    rings: 8,
    fuel: 70,
    wind: 1,
    landing: true,
  },
];

export const DEFAULT_MISSION = 1; // Antar Paket Pulau — the full game
export const DEFAULT_SEED = 7;
