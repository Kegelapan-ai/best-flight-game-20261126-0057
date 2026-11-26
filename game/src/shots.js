// Langit Nusantara — staged scenes for the entry's screenshots.
// ?shot=start|play|ring|land poses the aircraft and the course, so each
// screenshot shows the game at its best: the runway ahead, a ring ahead,
// or the final approach. Live play never uses these poses.

export const SHOT_NAMES = ['start', 'play', 'ring', 'land'];

export function applyShot(game, shot) {
  const { f, world } = game;
  const ring = (i) => world.rings[i];
  if (shot === 'start') {
    // Rolling on the destination runway for take-off: the strip fills the
    // view ahead, the aircraft is in frame, the instruments are lit.
    f.distance = world.runway.distance - world.runway.length / 2 - 400;
    f.offset = 0;
    f.altitude = 0;
    f.onGround = true;
    f.heading = 90;
    f.bank = 0;
    f.pitch = 0;
    f.speedKt = 58;
    f.throttle = 0.7;
    f.fuel = 96;
    game.state = 'fly';
    game.hintText = 'W penuh untuk throttle, panah ATAS untuk lepas landas';
  } else if (shot === 'play') {
    // Mid-flight on the slalom, the third ring glowing gold ahead.
    const r = ring(2);
    f.distance = r.distance - 1400;
    f.offset = r.offset - 260;
    f.altitude = r.altitude - 60;
    f.onGround = false;
    f.heading = 90;
    f.bank = -8;
    f.pitch = 2;
    f.speedKt = 145;
    f.throttle = 0.75;
    f.verticalSpeed = 3;
    f.fuel = 82;
    f.time = 74;
    game.score = 200;
    world.rings[0].passed = true;
    world.rings[1].passed = true;
    game.state = 'fly';
    game.hintText = 'Ring 3 di depan — 1400 kaki lagi';
  } else if (shot === 'ring') {
    // Closing on the fourth ring: it fills the frame, gold and lit.
    // Nine hundred feet out, so the shot still catches it ahead.
    const r = ring(3);
    f.distance = r.distance - 900;
    f.offset = r.offset - 30;
    f.altitude = r.altitude - 12;
    f.onGround = false;
    f.heading = 90;
    f.bank = 4;
    f.pitch = 0;
    f.speedKt = 158;
    f.throttle = 0.85;
    f.verticalSpeed = 1;
    f.fuel = 76;
    f.time = 122;
    game.score = 300;
    world.rings[0].passed = true;
    world.rings[1].passed = true;
    world.rings[2].passed = true;
    game.state = 'fly';
    game.hintText = 'Ring 4 di depan — 900 kaki lagi';
  } else if (shot === 'land') {
    // Final approach: gear down, the runway big ahead, low and slow.
    // Further out, so the island does not fill the whole frame.
    f.distance = world.runway.distance - 3600;
    f.offset = -40;
    f.altitude = 320;
    f.onGround = false;
    f.heading = 90;
    f.bank = 0;
    f.pitch = -3;
    f.speedKt = 108;
    f.throttle = 0.35;
    f.verticalSpeed = -6;
    f.gearDown = true;
    f.fuel = 61;
    f.time = 301;
    game.score = 800;
    for (const r of world.rings) r.passed = true;
    game.state = 'fly';
    game.hintText = 'FINAL — turun pelan, jaga kecepatan di bawah 150 kt';
  }
  game.shot = shot;
}
