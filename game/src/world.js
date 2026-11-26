// Langit Nusantara — the course: a chain of islands in a dawn sea, the
// ring course above them, and the runway on Pulau Bintang at the end.
// Everything is placed from the seed, so the course never changes for a
// given seed. Distances are in feet along the course; the aircraft flies
// the course from distance 0 toward the runway.

import { makeRng, range, pick } from './random.js';
import { RING_COUNT, RING_RADIUS_FT } from './config.js';

const ISLAND_NAMES = [
  'Pulau Bintang',
  'Pulau Kelapa',
  'Pulau Api',
  'Pulau Karang',
  'Pulau Ombak',
  'Pulau Senja',
  'Pulau Lumba',
  'Pulau Terumbu',
];

export function buildWorld(seed) {
  const rng = makeRng(seed);
  const islands = [];
  // The home airstrip sits at the start; the destination runway at the end.
  const courseLength = 42000; // feet of course, about 7 nautical miles
  const count = 7;
  for (let i = 0; i < count; i++) {
    const d = (i / (count - 1)) * courseLength;
    islands.push({
      name: ISLAND_NAMES[i % ISLAND_NAMES.length],
      distance: d,
      // Lateral offset from the course centreline, in feet.
      offset: range(rng, -2600, 2600),
      width: range(rng, 2600, 5200),
      peak: range(rng, 500, 1600),
      volcano: i === 2,
      palms: Math.floor(range(rng, 4, 11)),
      lagoon: rng() > 0.5,
    });
  }
  // Rings: one every stretch of the course, alternating sides so the pilot
  // has to bank through a gentle slalom, at a flyable height.
  const rings = [];
  let side = -1;
  for (let i = 0; i < RING_COUNT; i++) {
    side = -side;
    const d = 3500 + (i / RING_COUNT) * (courseLength - 9000);
    rings.push({
      index: i,
      distance: d,
      offset: side * range(rng, 500, 1500) + range(rng, -250, 250),
      altitude: range(rng, 900, 2200),
      radius: RING_RADIUS_FT,
      passed: false,
    });
  }
  // The destination runway, on the last island, aligned with the course.
  const runway = {
    name: 'Pulau Bintang',
    distance: courseLength,
    offset: 0,
    altitude: 0,
    length: 2600,
    width: 180,
    heading: 90, // the course runs east, heading 090
  };
  // Clouds: slow drifters placed across the whole course.
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      distance: range(rng, -2000, courseLength + 4000),
      offset: range(rng, -7000, 7000),
      altitude: range(rng, 2600, 4800),
      scale: range(rng, 0.7, 1.9),
      speed: range(rng, 12, 30),
    });
  }
  // A fishing boat and a ferry, for scale on the sea.
  const boats = [
    { distance: 9000, offset: -1800, kind: 'perahu', speed: 6 },
    { distance: 21000, offset: 2200, kind: 'feri', speed: 12 },
    { distance: 33000, offset: -2600, kind: 'perahu', speed: 5 },
  ];
  return { seed, courseLength, islands, rings, runway, clouds, boats };
}

// How far along the course the aircraft is, from its distance value.
export function courseProgress(world, distance) {
  return Math.max(0, Math.min(1, distance / world.courseLength));
}

// The next ring the pilot still has to fly through, or null.
export function nextRing(world) {
  return world.rings.find((r) => !r.passed) ?? null;
}

export function ringsPassed(world) {
  return world.rings.filter((r) => r.passed).length;
}
