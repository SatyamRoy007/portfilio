/* Local-device journal only. No network requests, public guestbook or global analytics.
 * All methods are synchronous; returned records are detached copies. Browser storage
 * is optional. A failed/invalid store falls back to this page's memory without
 * overwriting that store. Reload-safe session counts require sessionStorage.
 */
(() => {
  'use strict';
  if (window.villageJournal) return;

  const KEY = 'akhil.pixelVillage.journal.v1';
  const SESSION_KEY = 'akhil.pixelVillage.journal.session.v1';
  const MAX_BYTES = 200000, MAX_TREES = 6, MAX_NOTES = 12, MAX_HISTORY = 90;
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  const weathers = ['clear', 'rain', 'snow'];
  const now = () => new Date().toISOString();
  const clone = value => JSON.parse(JSON.stringify(value));
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const integer = (value, lo, hi) => Number.isInteger(value) && value >= lo && value <= hi;
  const length = text => Array.from(text).length;
  const shortText = (value, max) => typeof value === 'string' && length(value) >= 1 && length(value) <= max && value === value.trim() && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
  const timestamp = value => typeof value === 'string' && value.length === 24 && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
  const validInitials = value => typeof value === 'string' && /^[\p{L}\p{N}]{1,3}$/u.test(value) && value === value.normalize('NFC').toUpperCase();
  const blank = () => ({ version: 1, visits: 0, firstVisit: now(), trees: [], notes: [], history: [] });
  let state = blank(), storageAvailable = true, sessionCounted = false, replayActive = false, lastKnown = null;

  function treeRecord(value) {
    if (!object(value) || !identifier(value.id) || !validInitials(value.initials) || !integer(value.plot, 0, 5) || !timestamp(value.plantedAt) || !integer(value.day, 1, 99999)) return null;
    return { id: value.id, initials: value.initials, plot: value.plot, plantedAt: value.plantedAt, day: value.day };
  }
  function treeList(value) {
    if (!Array.isArray(value) || value.length > MAX_TREES) return null;
    const result = value.map(treeRecord);
    if (result.some(item => !item) || new Set(result.map(item => item.id)).size !== result.length || new Set(result.map(item => item.plot)).size !== result.length) return null;
    return result.sort((a, b) => a.plot - b.plot);
  }
  function noteRecord(value) {
    if (!object(value) || !identifier(value.id) || !shortText(value.name, 24) || !shortText(value.message, 140) || !timestamp(value.createdAt)) return null;
    return { id: value.id, name: value.name, message: value.message, createdAt: value.createdAt };
  }
  function worldRecord(value) {
    if (!object(value) || !integer(value.day, 1, 99999) || !integer(value.stage, 0, 2) || !integer(value.wood, 0, 999) || !integer(value.population, 0, 999) || !seasons.includes(value.season) || !weathers.includes(value.weather) || typeof value.night !== 'boolean') return null;
    return { day: value.day, stage: value.stage, wood: value.wood, population: value.population, season: value.season, weather: value.weather, night: value.night };
  }
  function historyRecord(value) {
    const world = worldRecord(value), trees = object(value) ? treeList(value.trees) : null;
    if (!world || !trees || !timestamp(value.at) || !shortText(value.label, 180)) return null;
    return { ...world, trees, at: value.at, label: value.label };
  }
  function validated(value) {
    if (!object(value) || value.version !== 1 || !integer(value.visits, 0, 1000000000) || !timestamp(value.firstVisit)) return null;
    const trees = treeList(value.trees);
    if (!trees || !Array.isArray(value.notes) || value.notes.length > MAX_NOTES || !Array.isArray(value.history) || value.history.length > MAX_HISTORY) return null;
    const notes = value.notes.map(noteRecord), history = value.history.map(historyRecord);
    if (notes.some(item => !item) || history.some(item => !item) || new Set(notes.map(item => item.id)).size !== notes.length) return null;
    return { version: 1, visits: value.visits, firstVisit: value.firstVisit, trees, notes, history };
  }

  // Refresh before each mutation so sequential changes from another tab survive.
  // localStorage has no atomic transactions; this is best-effort across tabs.
  function refresh() {
    if (!storageAvailable) return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw === null) return;
      if (typeof raw !== 'string' || raw.length > MAX_BYTES) throw new Error('Journal exceeds its storage bound');
      const saved = validated(JSON.parse(raw));
      if (!saved) throw new Error('Invalid journal schema');
      state = saved;
    } catch (_) { storageAvailable = false; }
  }
  function persist() {
    if (!storageAvailable) return false;
    try {
      const raw = JSON.stringify(state);
      if (raw.length > MAX_BYTES) throw new Error('Journal exceeds its storage bound');
      window.localStorage.setItem(KEY, raw);
      return true;
    } catch (_) { storageAvailable = false; return false; }
  }
  function notify(type) {
    document.dispatchEvent(new CustomEvent('journalchange', { detail: { type, storageAvailable } }));
  }
  function outcome(ok, extra = {}) { return { ok, ...extra, persistent: storageAvailable, storageAvailable }; }
  function newId(prefix) {
    const uuid = window.crypto?.randomUUID?.();
    return prefix + '-' + (uuid || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12));
  }
  function readWorld() {
    try { return window.villageWorld?.getState?.() || null; } catch (_) { return null; }
  }
  function replaying(incoming) {
    const current = readWorld();
    return replayActive || incoming?.replay === true || current?.replay === true || window.worldreplay?.active === true;
  }
  function describe(previous, next) {
    if (!previous) return 'First village snapshot';
    const labels = [];
    if (previous.day !== next.day) labels.push('Day ' + next.day);
    if (previous.stage !== next.stage) labels.push(['A new beginning', 'Storehouse built', 'New home built'][next.stage]);
    if (previous.season !== next.season) labels.push(next.season[0].toUpperCase() + next.season.slice(1) + ' arrives');
    if (previous.weather !== next.weather) labels.push({ clear: 'Skies clear', rain: 'Rain begins', snow: 'Snow falls' }[next.weather]);
    if (previous.night !== next.night) labels.push(next.night ? 'Night falls' : 'Morning returns');
    return labels.join(' · ');
  }
  function appendHistory(snapshot, label) {
    state.history.push({ ...snapshot, trees: clone(state.trees), at: now(), label });
    if (state.history.length > MAX_HISTORY) state.history = [state.history[0], ...state.history.slice(-(MAX_HISTORY - 1))];
  }
  function capture(incoming, forcedLabel) {
    if (replaying(incoming)) return false;
    const snapshot = worldRecord(incoming) || lastKnown;
    if (!snapshot) return false;
    lastKnown = clone(snapshot);
    refresh();
    const label = forcedLabel || describe(state.history[state.history.length - 1], snapshot);
    if (!label) return false;
    appendHistory(snapshot, label);
    persist(); notify('history');
    return true;
  }

  refresh();
  if (state.history.length) lastKnown = worldRecord(state.history[state.history.length - 1]);
  // A tab session is counted once, including its reloads; this is not a unique
  // person or a global visitor count. If sessionStorage is blocked, do not guess.
  try {
    const seen = window.sessionStorage.getItem(SESSION_KEY);
    if (seen !== '1') {
      window.sessionStorage.setItem(SESSION_KEY, '1');
      state.visits = Math.min(1000000000, state.visits + 1);
    }
    sessionCounted = true;
  } catch (_) { sessionCounted = false; }
  persist();

  window.villageJournal = Object.freeze({
    getInfo() {
      refresh();
      return { visits: state.visits, firstVisit: state.firstVisit, storageAvailable, sessionCounted, scope: 'This browser on this device only; visits count tab sessions, not unique people or global traffic.' };
    },
    getTrees() { refresh(); return clone(state.trees); },
    plantTree(initials) {
      if (typeof initials !== 'string' || initials.length > 32) return outcome(false, { reason: 'Use 1–3 letters or digits for your initials.' });
      const normalized = initials.trim().normalize('NFC').toUpperCase();
      if (!validInitials(normalized)) return outcome(false, { reason: 'Use 1–3 letters or digits for your initials.' });
      refresh();
      if (state.trees.length >= MAX_TREES) return outcome(false, { reason: 'All six local tree plots are planted.' });
      const current = readWorld(), inReplay = replaying(current);
      const snapshot = (!inReplay && worldRecord(current)) || lastKnown;
      if (!inReplay && snapshot) lastKnown = clone(snapshot);
      const used = new Set(state.trees.map(tree => tree.plot));
      const plot = [0, 1, 2, 3, 4, 5].find(value => !used.has(value));
      const tree = { id: newId('tree'), initials: normalized, plot, plantedAt: now(), day: snapshot?.day || 1 };
      state.trees.push(tree);
      state.trees.sort((a, b) => a.plot - b.plot);
      if (!inReplay && snapshot) appendHistory(snapshot, 'Tree planted by ' + normalized);
      persist(); notify('tree');
      if (!inReplay && snapshot) notify('history');
      return outcome(true, { tree: clone(tree) });
    },
    getNotes() { refresh(); return clone(state.notes); },
    addNote(name, message) {
      if (typeof name !== 'string' || typeof message !== 'string' || name.length > 100 || message.length > 1000) return outcome(false, { reason: 'Add a name of 1–24 characters and a note of 1–140 characters.' });
      name = name.trim(); message = message.trim();
      if (!shortText(name, 24) || !shortText(message, 140)) return outcome(false, { reason: 'Add a name of 1–24 characters and a note of 1–140 characters.' });
      refresh();
      if (state.notes.length >= MAX_NOTES) return outcome(false, { reason: 'Your local journal holds 12 notes. Delete one before adding another.' });
      // Text is stored as text, never interpreted as HTML. UI must use textContent.
      const note = { id: newId('note'), name, message, createdAt: now() };
      state.notes.push(note);
      persist(); notify('note');
      return outcome(true, { note: clone(note) });
    },
    deleteNote(id) {
      if (!identifier(id)) return false;
      refresh();
      const index = state.notes.findIndex(note => note.id === id);
      if (index < 0) return false;
      state.notes.splice(index, 1);
      persist(); notify('delete');
      return true;
    },
    getHistory() { refresh(); return clone(state.history); }
  });

  document.addEventListener('worldchange', event => capture(event.detail || readWorld()));
  document.addEventListener('worldreplay', event => {
    if (typeof event.detail?.active === 'boolean') replayActive = event.detail.active;
    else if (typeof event.detail?.replay === 'boolean') replayActive = event.detail.replay;
  });
  window.addEventListener('storage', event => {
    if (event.key !== KEY) return;
    const before = JSON.stringify(state), wasAvailable = storageAvailable;
    if (event.newValue === null && storageAvailable) state = blank();
    else refresh();
    if (JSON.stringify(state) !== before || storageAvailable !== wasAvailable) { notify('tree'); notify('note'); notify('history'); }
  });
  const initialWorld = readWorld();
  if (initialWorld) capture(initialWorld);
})();
