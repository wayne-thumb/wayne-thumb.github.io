// Scroll reveals and the small effects that make the photographs feel alive.
// Everything here is decoration: none of it runs when the visitor asks for reduced motion,
// and the page reads the same without it.
// index.html makes the decision (the .motion class on <html>) before the first paint, so that
// what is about to be animated in is never seen sitting there first.
export const motion = document.documentElement.classList.contains('motion');

const element = (tag, className) => {
  const node = document.createElement(tag);
  node.className = className;
  return node;
};
const random = (min, max) => min + Math.random() * (max - min);

// Adds .in the first time the node's top edge rises past `line`
// (a fraction of the viewport height, measured from the top).
// Entrances play only on the way down. A node first met while scrolling back up is marked .settled,
// so it is simply in place, and its callback is skipped.
const waiting = new Map();
let scrolledTo = window.scrollY;
let goingDown = true;
export function onEnter(node, line = 0.86, callback) {
  if (!motion) return;
  const enter = (animated = true) => {
    observer.disconnect();
    waiting.delete(node);
    if (!animated) node.classList.add('settled');
    node.classList.add('in');
    if (animated) callback?.();
  };
  const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) enter(goingDown); },
    { rootMargin: `0px 0px -${Math.round((1 - line) * 100)}% 0px` });
  observer.observe(node);
  waiting.set(node, enter);
}
window.addEventListener('scroll', () => {
  if (window.scrollY !== scrolledTo) goingDown = window.scrollY > scrolledTo;
  scrolledTo = window.scrollY;
  // On a very tall screen the last parts can never climb past their line,
  // so reaching the end of the page brings in whatever is on screen.
  if (!waiting.size || window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 4) return;
  for (const [node, enter] of [...waiting]) {
    const { top, bottom } = node.getBoundingClientRect();
    if (top < window.innerHeight && bottom > 0) enter();
  }
}, { passive: true });

// Keeps .live on the node only while it is on screen, so effects rest when nobody is looking.
function whileVisible(node, onChange) {
  new IntersectionObserver(([entry]) => {
    node.classList.toggle('live', entry.isIntersecting);
    onChange?.(entry.isIntersecting);
  }).observe(node);
}

// Heart balloons, like the ones in the photos, float up across the whole screen.
let flights = 0;
export function releaseBalloons(count) {
  if (!motion || flights >= 3) return;
  flights++;
  const layer = element('div', 'balloons');
  layer.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < count; index++) {
    const balloon = element('span', Math.random() < 0.25 ? 'balloon balloon-clear' : 'balloon');
    balloon.style.cssText = `--x:${random(3, 84)}%;--size:${random(38, 70)}px;--drift:${random(-50, 50)}px;--time:${random(4.6, 7.4)}s;--delay:${random(0, 1.1)}s`;
    balloon.append(element('i', ''));
    layer.append(balloon);
  }
  document.body.append(layer);
  setTimeout(() => { layer.remove(); flights--; }, 9500);
}

// A photo's own small weather: balloons, soap bubbles, or ginkgo leaves drifting through it,
// or sparks crackling where the sparkler is. `at` is [x, y] within the photo, 0 to 1.
const pieces = { balloons: 4, bubbles: 11, leaves: 8 };
export function addEffect(frame, effect, at) {
  if (!motion || !effect) return;
  const layer = element('span', `effect effect-${effect}`);
  layer.setAttribute('aria-hidden', 'true');
  frame.append(layer);
  if (effect === 'sparks') {
    crackle(frame, layer, at);
    return;
  }
  for (let index = 0; index < pieces[effect]; index++) {
    const piece = element('i', '');
    const time = effect === 'balloons' ? random(9, 14) : random(6, 11);
    // A negative delay starts every piece mid-flight instead of all at the edge.
    piece.style.cssText = `--x:${random(2, 92)}%;--size:${random(0.5, 1)};--drift:${random(-40, 40)}px;--spin:${random(-420, 420)}deg;--time:${time}s;--delay:-${random(0, time)}s`;
    layer.append(piece);
  }
  whileVisible(frame);
}

// A sparkler, alive: a steady fizz of sparks with a stronger burst every half second or so.
// Sparks leave streaks, slow in the air and arc downward, some split into smaller ones partway out,
// and the glow around the sparkler swells with each burst. The canvas is blended onto the photo as light
// (see .effect-sparks in styles.css), so the glow falls on the two faces the way the real one does.
function crackle(frame, layer, [x, y]) {
  const canvas = element('canvas', '');
  const context = canvas.getContext('2d');
  if (!context) return;
  layer.append(canvas);
  const sparks = [];
  let width, height, scale, running = false, last = 0, nextBurst = 0, heat = 0;
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = frame.clientWidth;
    height = frame.clientHeight;
    scale = width / 390;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function spark(fromX, fromY, speed, life, size, splits) {
    const angle = random(0, Math.PI * 2);
    sparks.push({ x: fromX, y: fromY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life, size, splits });
  }
  function glow(centreX, centreY, radius, colour) {
    const gradient = context.createRadialGradient(centreX, centreY, 0, centreX, centreY, radius);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(1, 'rgba(255,150,60,0)');
    context.fillStyle = gradient;
    context.fillRect(centreX - radius, centreY - radius, radius * 2, radius * 2);
  }
  function draw(now) {
    if (!running) return;
    const step = Math.min((now - last) / 1000, 0.05);
    last = now;
    const originX = x * width, originY = y * height;

    // The fizz never stops; a burst throws many more sparks, faster and farther, and heats the glow.
    let count = 4;
    if (now >= nextBurst) {
      count += Math.round(random(26, 48));
      nextBurst = now + random(280, 900);
      heat = 1;
    }
    heat = Math.max(0, heat - step * 2.4);
    if (sparks.length < 700) {
      for (let index = 0; index < count; index++) {
        spark(originX + random(-2, 2) * scale, originY + random(-2, 2) * scale,
          random(70, 300 + 280 * heat) * scale, random(0.22, 0.8), random(0.9, 2), Math.random() < 0.24);
      }
    }

    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';
    glow(originX, originY, (110 + 80 * heat + random(0, 16)) * scale, `rgba(255,170,80,${0.1 + 0.12 * heat})`);
    glow(originX, originY, (20 + 18 * heat + random(0, 8)) * scale, 'rgba(255,244,214,.9)');
    context.lineCap = 'round';
    const drag = Math.exp(-2.2 * step);
    for (let index = sparks.length - 1; index >= 0; index--) {
      const one = sparks[index];
      one.age += step;
      if (one.age >= one.life) { sparks.splice(index, 1); continue; }
      one.vx *= drag;
      one.vy = one.vy * drag + 190 * scale * step;
      one.x += one.vx * step;
      one.y += one.vy * step;
      const left = 1 - one.age / one.life;
      if (one.splits && left < 0.55) {
        one.splits = false;
        for (let child = 0; child < 3; child++) spark(one.x, one.y, random(60, 180) * scale, random(0.12, 0.3), 0.8, false);
      }
      // White-hot at first, then yellow, then orange as it cools; the streak trails the way it came.
      context.strokeStyle = `rgba(255,${190 + Math.round(60 * left)},${90 + Math.round(150 * left * left)},${Math.min(1, left * 1.6)})`;
      context.lineWidth = Math.max(0.4, one.size * scale * left);
      context.beginPath();
      context.moveTo(one.x - one.vx * 0.045, one.y - one.vy * 0.045);
      context.lineTo(one.x, one.y);
      context.stroke();
    }
    requestAnimationFrame(draw);
  }
  whileVisible(frame, (visible) => {
    if (visible === running) return;
    running = visible;
    if (!visible) return;
    resize();
    last = performance.now();
    nextBurst = last + 200;
    requestAnimationFrame(draw);
  });
}

// Rows of photos drift sideways on their own, and keep drifting while the page is scrolled past them.
// Only moving a row by hand takes over (a sideways swipe, a sideways wheel, the keyboard);
// a moment after it is let go, the row drifts on from wherever it was left.
const RESUME_AFTER = 1800;
const drifting = [];
export function drift(strip, speed) {
  if (!motion) return;
  const row = { strip, speed, position: 0, applied: 0, visible: false, swiping: false, focused: false, restUntil: 0 };
  let touch;
  strip.addEventListener('touchstart', (event) => { touch = event.touches[0]; }, { passive: true });
  strip.addEventListener('touchmove', (event) => {
    if (!touch || row.swiping) return;
    const across = Math.abs(event.touches[0].clientX - touch.clientX);
    const down = Math.abs(event.touches[0].clientY - touch.clientY);
    // A finger travelling down the page is scrolling the page, not this row.
    if (across > 6 && across > down) row.swiping = true;
  }, { passive: true });
  const letGo = () => {
    if (row.swiping) row.restUntil = performance.now() + RESUME_AFTER;
    row.swiping = false;
    touch = undefined;
  };
  strip.addEventListener('touchend', letGo, { passive: true });
  strip.addEventListener('touchcancel', letGo, { passive: true });
  strip.addEventListener('wheel', (event) => {
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) row.restUntil = performance.now() + RESUME_AFTER;
  }, { passive: true });
  // Someone tabbing through the photos should not have them slide out from under the focus ring.
  strip.addEventListener('focusin', (event) => { row.focused = event.target.matches(':focus-visible'); });
  strip.addEventListener('focusout', () => { row.focused = false; });
  strip.classList.add('drifting');
  new IntersectionObserver(([entry]) => {
    row.visible = entry.isIntersecting;
    if (row.visible) row.position = row.applied = strip.scrollLeft;
  }).observe(strip);
  drifting.push(row);
  if (drifting.length === 1) requestAnimationFrame(glide);
}
let glidedAt = 0;
function glide(now) {
  const step = Math.min((now - glidedAt) / 1000, 0.05);
  glidedAt = now;
  for (const row of drifting) {
    if (!row.visible) continue;
    const end = row.strip.scrollWidth - row.strip.clientWidth;
    if (end <= 0) continue;
    // If the row is not where it was last put, a hand moved it (swipe momentum, scrollbar, keyboard).
    const actual = row.strip.scrollLeft;
    if (Math.abs(actual - row.applied) > 2) row.restUntil = now + RESUME_AFTER;
    if (row.swiping || row.focused || now < row.restUntil) {
      row.position = row.applied = actual;
      continue;
    }
    row.position += row.speed * step;
    if (row.position >= end || row.position <= 0) {
      row.position = Math.max(0, Math.min(end, row.position));
      row.speed = -row.speed;
    }
    row.strip.scrollLeft = row.position;
    row.applied = row.strip.scrollLeft;
  }
  requestAnimationFrame(glide);
}
