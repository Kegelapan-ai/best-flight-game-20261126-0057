// Langit Nusantara — the game loop: menu, flying, paused, crashed and
// landed states, scoring, popups, and the best score kept on this machine.
// Wires input, flight, world, render and audio together; nothing here
// draws a pixel or touches the network.

import { CANVAS_W, CANVAS_H, MISSIONS, DEFAULT_MISSION, DEFAULT_SEED, LANDING_BONUS } from './config.js';
import { buildWorld, ringsPassed } from './world.js';
import { createFlight, stepFlight, flightHint } from './flight.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { drawScene } from './render.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || DEFAULT_SEED) || DEFAULT_SEED;
const shot = params.get('shot') || '';

const canvas = document.getElementById('game');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

const input = createInput(canvas);
const audio = createAudio();
const world = buildWorld(seed);

const game = {
  state: 'menu', // menu | fly | paused | crashed | landed | complete
  missionIndex: DEFAULT_MISSION,
  get mission() {
    return MISSIONS[this.missionIndex];
  },
  get missions() {
    return MISSIONS;
  },
  world,
  f: null,
  score: 0,
  ringsCleared: 0,
  time: 0,
  popups: [],
  hintText: '',
  endReason: '',
  bestScore: 0,
  missionRects: [],
  shot: '',
  muted: false,
  paused: false,
};

try {
  game.bestScore = Number(window.localStorage.getItem('langit-nusantara-best') || 0) || 0;
} catch {
  game.bestScore = 0;
}

function saveBest() {
  if (game.score > game.bestScore) {
    game.bestScore = game.score;
    try {
      window.localStorage.setItem('langit-nusantara-best', String(game.bestScore));
    } catch {
      // Best score is a nicety; the game plays on without it.
    }
  }
}

function startMission(index) {
  game.missionIndex = index;
  game.world = buildWorld(seed);
  game.f = createFlight(game.mission);
  game.score = 0;
  game.ringsCleared = 0;
  game.time = 0;
  game.popups = [];
  game.endReason = '';
  game.state = 'fly';
  game.hintText = flightHint(game.f, game.world);
  audio.unlock();
  audio.click();
}

function endFlight(landed, reason) {
  game.state = landed ? 'landed' : 'crashed';
  game.endReason = reason;
  if (landed) {
    game.score += LANDING_BONUS + Math.round(game.f.fuel * 2);
    audio.touchdown();
  } else {
    audio.crashThud();
  }
  saveBest();
}

function completeMission() {
  game.state = 'complete';
  game.endReason = 'Semua ring dilewati — misi latihan selesai!';
  game.score += Math.round(game.f.fuel * 2);
  saveBest();
}

function addPopup(text, color) {
  game.popups.push({ text, color: color || '#ffc93c', at: game.time });
  if (game.popups.length > 4) game.popups.shift();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const pressed = input.consumePressed();
  const click = input.consumeClick();

  if (pressed.has('m')) {
    game.muted = audio.toggleMute();
  }

  if (game.state === 'menu') {
    if (pressed.has('1')) game.missionIndex = 0;
    if (pressed.has('2')) game.missionIndex = 1;
    if (pressed.has('3')) game.missionIndex = 2;
    if (pressed.has('Enter') || pressed.has(' ')) startMission(game.missionIndex);
    if (click) {
      for (const r of game.missionRects) {
        if (click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h) {
          game.missionIndex = r.index;
          audio.unlock();
          audio.click();
        }
      }
    }
  } else if (game.state === 'fly') {
    if (pressed.has('p') || pressed.has('Escape')) {
      game.state = 'paused';
    }
    const f = game.f;
    // Steering: keys, plus the mouse as a gentle stick.
    let steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let pitchInput = (input.pitchUp ? 1 : 0) - (input.pitchDown ? 1 : 0);
    if (input.mouseActive && Math.abs(input.mouseX) > 0.12) {
      steer += input.mouseX * 0.7;
    }
    if (input.mouseActive && Math.abs(input.mouseY) > 0.15) {
      pitchInput += -input.mouseY * 0.5;
    }
    f.steer = Math.max(-1, Math.min(1, steer));
    f.pitchInput = Math.max(-1, Math.min(1, pitchInput));
    f.throttleInput = (input.throttleUp ? 1 : 0) - (input.throttleDown ? 1 : 0);
    const events = [];
    stepFlight(f, game.world, dt, events);
    for (const ev of events) {
      if (ev.type === 'ring') {
        game.score += 100 + ev.bonus;
        game.ringsCleared = ringsPassed(game.world);
        addPopup(`+${100 + ev.bonus}  RING ${ev.ring + 1} DILEWATI!`, '#ffc93c');
        audio.ringChime();
      } else if (ev.type === 'ring-missed') {
        addPopup(`Ring ${ev.ring + 1} terlewat`, '#cfe8ff');
      } else if (ev.type === 'takeoff') {
        addPopup('LEPAS LANDAS!', '#b8e986');
      } else if (ev.type === 'landed') {
        endFlight(true, 'Roda menyentuh landasan dengan mulus.');
      } else if (ev.type === 'crashed') {
        endFlight(false, ev.reason === 'hard-landing' ? 'Terlalu keras saat menyentuh landasan.' : 'Pesawat menyentuh laut.');
      }
    }
    // A ring-free mission ends when the last ring is cleared.
    if (!game.mission.landing && game.state === 'fly' && game.world.rings.every((r) => r.passed)) {
      completeMission();
    }
    game.time += dt;
    game.hintText = flightHint(f, game.world);
    audio.setEngine(f.throttle, f.speedKt, !f.onGround || f.speedKt > 20);
  } else if (game.state === 'paused') {
    if (pressed.has('p') || pressed.has('Escape') || pressed.has('Enter')) {
      game.state = 'fly';
    }
  } else if (game.state === 'crashed' || game.state === 'landed' || game.state === 'complete') {
    if (pressed.has('r')) startMission(game.missionIndex);
    if (pressed.has('Enter')) game.state = 'menu';
  }

  // The game object the renderer reads, with the flight state flattened in.
  drawScene(ctx, game);
  requestAnimationFrame(loop);
}

// A screenshot scene poses the game before the first frame, so the shot
// is the game itself, mid-flight, with its own instruments and HUD.
if (shot) {
  game.f = createFlight(game.mission);
  game.world = buildWorld(seed);
  applyShot(game, shot);
  game.time = game.f.time;
} else {
  game.f = createFlight(game.mission);
}

// Test hook: the play-test reads the live state from here.
window.__game = game;
requestAnimationFrame(loop);
