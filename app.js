import { announcement as data } from './invitation.js';
import { playWelcomeConfetti, studioConfetti } from './confetti.js';
import { onEnter, addEffect, drift, handwrite } from './motion.js';

// Always open at the top, where the greeting is, even on a reload or when coming back to the tab's
// history. (index.html also turns off the browser's own scroll restoration as early as it can.)
function toTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}
if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
toTop();
window.addEventListener('pageshow', (event) => { if (event.persisted) toTop(); });

const $ = (selector) => document.querySelector(selector);
const text = (selector, value) => document.querySelectorAll(selector).forEach((node) => { node.textContent = value; });
const make = (tag, className, value) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
};
const couple = `${data.groom.name} · ${data.bride.name}`;

document.title = `${couple}, 부부가 되었습니다`;
text('[data-signature]', `${couple} 드림`);
text('#english-names', `${data.groom.english} & ${data.bride.english}`);
text('#closing-line', data.closing.line);
// Each line of the headline and the letter is its own piece so it can arrive on its own beat.
$('#headline').replaceChildren(...data.headline.flatMap((line, index) => {
  const span = make('span', '', line);
  span.style.setProperty('--i', index);
  return index ? [document.createTextNode(' '), span] : [span];
}));
$('#letter-message').replaceChildren(...data.message.map((line, index) => {
  const span = make('span', 'rise', line || '\u00a0');
  span.style.setProperty('--i', index + 1);
  return span;
}));

// Photos: every id has a 640px and a 1280px WebP (see scripts/photos.mjs).
// Resolved against this script, not the page, so the same photos load from the page one folder down too.
const photoUrl = (id, width) => new URL(`./assets/photos/${id}-${width}.webp`, import.meta.url).href;
function photoImage(photo, sizes) {
  const img = new Image();
  img.alt = photo.alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.sizes = sizes;
  img.srcset = `${photoUrl(photo.id, 640)} 640w, ${photoUrl(photo.id, 1280)} 1280w`;
  img.src = photoUrl(photo.id, 1280);
  return img;
}
// A photo in its frame. Photos are looked at where they are on the page and are not handed out:
// pressing one does nothing, and styles.css keeps the browser from offering to save or drag it.
function photoFrame(photo, className, sizes) {
  const frame = make('div', className);
  const img = photoImage(photo, sizes);
  img.addEventListener('error', () => {
    frame.classList.add('photo-missing');
    frame.replaceChildren(make('span', '', '사진을 불러오지 못했습니다'));
  });
  frame.append(img);
  return frame;
}
// The same goes for the menu a long press or a right click would bring up over a photo.
document.addEventListener('contextmenu', (event) => {
  if (event.target.closest?.('.cover,.lead,.strip-photo,.print,.portrait-photo,.closing')) event.preventDefault();
});
const fullWidth = '(min-width: 480px) 480px, 100vw';
const halfWidth = '(min-width: 480px) 240px, 50vw';
const stripWidth = '(min-width: 480px) 260px, 54vw';
function makeStrip(photos, label, speed) {
  const strip = make('div', 'strip');
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', label);
  // Nothing inside the row takes focus, so the row itself does, and the arrow keys can move it.
  strip.tabIndex = 0;
  strip.append(...photos.map((photo) => photoFrame(photo, 'strip-photo', stripWidth)));
  drift(strip, speed);
  return strip;
}

for (const role of ['bride', 'groom']) {
  text(`[data-${role}]`, data[role].name);
  text(`[data-${role}-english]`, data[role].english);
  if (data[role].family) {
    text(`[data-${role}-family]`, data[role].family);
    $(`[data-${role}-family]`).hidden = false;
  }
}

// Introductions: the portraits turn over to the same two people in sunglasses, on a tap
// and once by themselves shortly after they come into view. The two always change together,
// because one person alone in sunglasses just looks odd.
function portrait(person) {
  if (!person.shades) return { button: photoFrame(person.portrait, 'portrait-photo', halfWidth), wear() {} };
  const button = make('button', 'portrait-photo');
  const shades = photoImage(person.shades, halfWidth);
  shades.className = 'shades';
  button.type = 'button';
  button.append(photoImage(person.portrait, halfWidth), shades);
  const wear = (on) => {
    button.classList.toggle('on', on);
    button.setAttribute('aria-pressed', on);
    button.setAttribute('aria-label', `${(on ? person.shades : person.portrait).alt}. 누르면 두 사람 사진이 함께 바뀝니다`);
    // Restart the turn even when it is already mid-way.
    button.classList.remove('turn');
    void button.offsetWidth;
    button.classList.add('turn');
  };
  wear(false);
  button.classList.remove('turn');
  return { button, wear };
}
const portraits = ['bride', 'groom'].map((role) => {
  const made = portrait(data[role]);
  $(`#portrait-${role}`).replaceWith(made.button);
  return made;
});
let wearing = false;
function wearTogether(on, first = portraits[0]) {
  wearing = on;
  first.wear(on);
  // The other follows a beat later, like a glance and then "me too".
  for (const other of portraits) if (other !== first) setTimeout(() => other.wear(wearing), 260);
}
for (const made of portraits) made.button.addEventListener('click', () => wearTogether(!wearing, made));
onEnter($('.portraits'), 0.6, () => setTimeout(() => wearTogether(true), 1300));

if (data.intro.lead) {
  const lead = photoFrame(data.intro.lead, 'lead', fullWidth);
  onEnter(lead, 0.9);
  $('#intro-lead').replaceWith(lead);
}
$('#intro-strip').replaceWith(makeStrip(data.intro.photos, '사진관에서 찍은 사진', 20));

// Each group: its title, one large photo with its own small effect, two prints tossed below it, then a drifting row.
data.gallery.forEach((group, index) => {
  const block = make('div', group.night ? 'gallery-group night' : 'gallery-group');
  if (group.title) {
    const heading = make('h3', 'chapter reveal');
    heading.append(make('span', 'chapter-title', group.title));
    if (group.place) {
      const place = make('span', 'chapter-place rise', group.place);
      place.style.setProperty('--i', 5);
      heading.append(document.createTextNode(' '), place);
    }
    block.append(heading);
  }
  const lead = photoFrame(group.lead, group.lead.wide ? 'lead lead-wide' : 'lead', fullWidth);
  addEffect(lead, group.lead.effect, group.lead.at);
  onEnter(lead, 0.9);
  const prints = make('div', 'prints');
  prints.append(...group.photos.slice(0, 2).map((photo) => photoFrame(photo, 'print', halfWidth)));
  onEnter(prints, 0.82);
  const label = group.title ? `사진 묶음 ${index + 1}: ${group.title}` : `사진 묶음 ${index + 1}`;
  block.append(lead, prints, makeStrip(group.photos.slice(2), label, index % 2 ? 24 : -24));
  $('#gallery').append(block);
});
$('#closing-photo').replaceWith(photoImage(data.closing, fullWidth));
// The two sign the last photo by hand, he a moment after she has begun. Her writing climbs across the photo
// and his comes down, so that the two notes lean in over them like a roof. The numbers are that slope in
// degrees (negative climbs), when the writing starts once the photo is reached, and how long it takes.
handwrite($('.thanks-bride'), { tilt: -17, start: 0.5, time: 1.7 });
handwrite($('.thanks-groom'), { tilt: 12, start: 1.2, time: 1.5 });

let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  text('#toast', message);
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}
async function copy(value, message) {
  try {
    await navigator.clipboard.writeText(value);
    toast(message);
  } catch {
    $('#copy-value').value = value;
    $('#copy-dialog').showModal();
    $('#copy-value').select();
  }
}
$('#close-copy').addEventListener('click', () => $('#copy-dialog').close());
function pageUrl() {
  const url = new URL(window.location.href);
  url.hash = '';
  return url.href;
}
$('#copy-link').addEventListener('click', () => copy(pageUrl(), '링크를 복사했습니다.'));
$('#share').addEventListener('click', async () => {
  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, text: '소중한 분들께 저희의 결혼 소식을 전합니다.', url: pageUrl() });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  await copy(pageUrl(), '링크를 복사했습니다.');
});

// Two links, one page: the accounts are offered only at <site>/<gift.path>, which the build publishes as the
// same page one folder down. (?mode=<gift.path> does the same where that folder does not exist, as in `npm run dev`.)
const gift = data.gift ?? {};
const folder = window.location.pathname.replace(/index\.html$/, '').replace(/\/+$/, '');
const giftLink = Boolean(gift.path) && (folder.endsWith(`/${gift.path}`)
  || new URLSearchParams(window.location.search).get('mode') === gift.path);
const showGift = Boolean(gift.accounts?.length) && giftLink;
// The page behind the photos takes its colours from them (each group's tone), and the gallery runs through
// them as one sky: a group starts on its own first colour and ends on the first colour of the group after it.
// A night group at the very end thins into the morning sky of the last photo. On the link with the accounts
// the night ends as it is, and it is the accounts, on a sheet of paper of their own, that the morning comes up behind.
const tones = data.gallery.map((group) => [group.tone ?? []].flat());
const groups = [...$('#gallery').children];
const lastGroup = groups.at(-1);
const dawn = Boolean(lastGroup?.matches('.night')) && !showGift;
groups.forEach((block, index) => {
  if (!tones[index].length) return;
  const colours = [...tones[index], tones[index + 1]?.[0] ?? tones[index].at(-1)];
  // The morning takes only the last stretch of the night, below its photos.
  if (index === groups.length - 1 && dawn) colours.splice(-1, 1, `${colours.at(-1)} calc(100% - 190px)`, 'var(--sky-top)');
  block.style.setProperty('--ground', `linear-gradient(${colours.join(',')})`);
  // Room below the photos for the day to finish turning into night.
  if (data.gallery[index + 1]?.night && !data.gallery[index].night) block.classList.add('into-night');
});
if (tones[0]?.length) $('.gallery').style.setProperty('--first', tones[0][0]);
if (lastGroup?.matches('.night')) {
  if (showGift) {
    $('#gift').classList.add('after-night');
    if (tones.at(-1).length) $('#gift').style.setProperty('--from', tones.at(-1).at(-1));
  } else lastGroup.classList.add('dawn');
}
if (showGift) {
  text('#gift-title', gift.title);
  text('#gift-note', gift.note);
  // Whose account each one is can be read straight away. The number is not laid out in the open:
  // each has its own button, so someone on the groom's side or the bride's opens only the one they need.
  gift.accounts.forEach((account, index) => {
    const item = make('li');
    const head = make('div', 'account-head');
    const fold = make('div', 'account-fold');
    const body = make('div', 'account-body');
    const toggle = make('button', 'account-toggle');
    const copyButton = make('button', 'account-copy', '복사');
    fold.id = `account-${index + 1}`;
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', fold.id);
    const show = (open) => {
      item.classList.toggle('open', open);
      toggle.textContent = open ? '계좌 접기' : '계좌 보기';
      toggle.setAttribute('aria-label', `${account.label} ${toggle.textContent}`);
      toggle.setAttribute('aria-expanded', open);
    };
    show(false);
    toggle.addEventListener('click', () => show(!item.classList.contains('open')));
    copyButton.type = 'button';
    copyButton.setAttribute('aria-label', `${account.label} 계좌번호 복사`);
    copyButton.addEventListener('click', () => copy(`${account.bank} ${account.number}`, '계좌번호를 복사했습니다.'));
    head.append(make('span', 'account-label', account.label), toggle);
    body.append(make('span', 'account-bank', account.bank), make('span', 'account-number', account.number));
    if (account.holder) body.append(make('span', 'account-holder', `예금주 ${account.holder}`));
    body.append(copyButton);
    // The extra wrapper is what lets the fold close to nothing (see .account-fold in styles.css).
    const inner = make('div');
    inner.append(body);
    fold.append(inner);
    item.append(head, fold);
    $('#account-list').append(item);
  });
  $('#gift').hidden = false;
}

// Sections arrive as they are scrolled to.
const confetti = data.welcomeConfetti !== false;
for (const node of document.querySelectorAll('.reveal')) {
  if (node.matches('.closing')) onEnter(node, 0.5);
  else onEnter(node, node.matches('.letter') ? 0.72 : 0.86);
}

// Opening: confetti, round like the pieces in the photo, goes off the moment the page opens,
// and the greeting is written above the two as soon as the brush lettering has loaded.
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const cover = $('#cover-photo');
const photoReady = cover.complete ? Promise.resolve() : new Promise((resolve) => {
  cover.addEventListener('load', resolve, { once: true });
  cover.addEventListener('error', resolve, { once: true });
});
const letteringReady = document.fonts?.load ? document.fonts.load('1em "Nanum Brush Script"', data.headline.join('')).catch(() => {}) : Promise.resolve();
if (confetti) {
  // The burst belongs with the photo, so give the photo a blink to arrive, but no longer than that.
  // A page opened in a background tab saves it for when the tab is first looked at.
  const seen = document.hidden
    ? new Promise((resolve) => document.addEventListener('visibilitychange', resolve, { once: true }))
    : Promise.resolve();
  Promise.all([seen, Promise.race([photoReady, pause(350)])]).then(() => {
    if (window.scrollY < window.innerHeight / 2) playWelcomeConfetti(studioConfetti);
  });
}
Promise.race([Promise.all([photoReady, letteringReady]), pause(2500)]).then(() => $('.cover').classList.add('ready'));

// Everything is set up; index.html's fallback timer can stand down.
document.documentElement.classList.add('started');
