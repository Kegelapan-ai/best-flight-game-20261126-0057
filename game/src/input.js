// Langit Nusantara — keyboard and mouse input, kept apart from the game
// logic so the flight model only ever reads a plain control object.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    left: false,
    right: false,
    pitchUp: false,
    pitchDown: false,
    throttleUp: false,
    throttleDown: false,
    // Mouse steering: -1..1 across the canvas, 0 when the mouse is centred.
    mouseX: 0,
    mouseY: 0,
    mouseActive: false,
    // Edge-triggered actions, consumed once by the game loop.
    pressed: new Set(),
    clicked: null,
  };

  function keyName(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (!e.repeat) state.pressed.add(k);
    keys.add(k);
    sync();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(keyName(e));
    sync();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    sync();
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
    state.mouseY = ((e.clientY - r.top) / r.height) * 2 - 1;
    state.mouseActive = true;
  });
  canvas.addEventListener('mouseleave', () => {
    state.mouseActive = false;
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    state.clicked = {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  });

  function sync() {
    // Pitch is the arrow keys only; throttle is W/S (and Shift/Ctrl), so
    // the two never fight each other on the same key.
    state.left = keys.has('ArrowLeft') || keys.has('a');
    state.right = keys.has('ArrowRight') || keys.has('d');
    state.pitchUp = keys.has('ArrowUp');
    state.pitchDown = keys.has('ArrowDown');
    state.throttleUp = keys.has('Shift') || keys.has('w');
    state.throttleDown = keys.has('Control') || keys.has('s');
  }

  // Read and clear the one-frame actions after the loop has used them.
  state.consumePressed = () => {
    const out = new Set(state.pressed);
    state.pressed.clear();
    return out;
  };
  state.consumeClick = () => {
    const out = state.clicked;
    state.clicked = null;
    return out;
  };
  return state;
}
