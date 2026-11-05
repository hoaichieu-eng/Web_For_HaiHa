const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../dreams.js'), 'utf8');

function garden(initial = [], reducedMotion = false, balloonConfig) {
  class Element {
    constructor() { this.children = []; this.events = {}; this.dataset = {}; this.style = { setProperty() {} }; this.textContent = ''; }
    append(...children) { children.forEach(child => { child.parent = this; this.children.push(child); }); }
    replaceChildren() { this.children = []; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
    setAttribute() {}
    addEventListener(type, handler) { this.events[type] = handler; }
    focus() { this.focused = true; }
    getBoundingClientRect() { return { left: 120, top: 300, width: 100, height: 140 }; }
    showModal() { this.open = true; }
    close() { this.open = false; this.events.close?.(); }
    querySelectorAll(selector) {
      return this.children.flatMap(child => [child, ...child.querySelectorAll(selector)])
        .filter(child => selector === 'button' ? child.tag === 'button' : child.className?.split(' ').includes(selector.slice(1)));
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    click() { return this.events.click?.(); }
  }
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const body = new Element();
  const submit = new Element(); submit.tag = 'button';
  get('shared-dream-form').append(submit);
  const listeners = new Map();
  const records = new Map([['love-shared-dreams', initial], ['love-dream-balloons', balloonConfig]]);
  const writes = [];
  const sizeWrites = [];
  const timers = [];
  let persist = async () => true;
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  vm.runInNewContext(source, {
    document: { getElementById: get, body, querySelector: selector => body.querySelector(selector),
      createElement: tag => { const element = new Element(); element.tag = tag; return element; } },
    window: { matchMedia: () => ({ matches: reducedMotion }), crypto: { randomUUID: () => 'new-dream' },
      setTimeout: callback => timers.push(callback), appCloud: {
        subscribe(key, callback) { listeners.set(key, callback); callback(clone(records.get(key))); },
        async set(key, value) {
          (key === 'love-shared-dreams' ? writes : sizeWrites).push(clone(value));
          const previous = records.get(key);
          records.set(key, clone(value)); listeners.get(key)(clone(value));
          const saved = await persist();
          if (!saved) { records.set(key, previous); listeners.get(key)(clone(previous)); }
          return saved;
        },
      },
    },
  });
  return { get, body, writes, sizeWrites, timers,
    setPersist: fn => { persist = fn; },
    sync: value => { records.set('love-shared-dreams', clone(value)); listeners.get('love-shared-dreams')(clone(value)); },
    syncSize: value => { records.set('love-dream-balloons', clone(value)); listeners.get('love-dream-balloons')(clone(value)); },
    bubbles: () => get('shared-dream-list').querySelectorAll('.dream-balloon'),
    open: index => get('shared-dream-list').querySelectorAll('.dream-balloon')[index].click(),
    submit: text => { get('shared-dream-input').value = text; return get('shared-dream-form').events.submit({ preventDefault() {} }); },
  };
}

test('legacy dreams render as pending, remote completion restores without fireworks', () => {
  const app = garden([{ id: 'a', text: '<b>Our dream</b>' }]);
  assert.equal(app.bubbles().length, 6);
  assert.equal(app.bubbles()[0].children[0].textContent, '<b>Our dream</b>');
  app.open(0);
  assert.equal(app.get('shared-dream-input').value, '<b>Our dream</b>');
  app.sync([{ id: 'a', text: 'Our dream', completed: true }]);
  assert.ok(app.bubbles()[0].className.includes('is-complete'));
  assert.equal(app.body.children.length, 0);
});

test('empty balloons show no label and the editor accepts input after growth stops', async () => {
  const app = garden();
  assert.equal(app.bubbles().every(button => button.children[0].textContent === ''), true);
  const editor = app.get('dream-editor');
  const form = app.get('shared-dream-form');
  app.bubbles()[2].getBoundingClientRect = () => ({ left: 100, top: 100, width: 100, height: 140 });
  editor.getBoundingClientRect = () => ({ left: 200, top: 200, width: 500, height: 500 });
  let finish;
  editor.animate = (frames, options) => {
    assert.equal(frames.at(-1).transform, 'translate(0, 0) rotate(0deg) scale(1)');
    // A single scale value preserves the balloon's original proportions.
    assert.match(frames[0].transform, /scale\([\d.]+\)$/);
    assert.ok(options.duration > 0);
    return { finished: new Promise(resolve => { finish = resolve; }), cancel() {} };
  };
  app.open(2);
  assert.equal(editor.dataset.opening, 'true');
  assert.equal(form.inert, true);
  finish(); await Promise.resolve();
  assert.equal(editor.dataset.opening, 'false');
  assert.equal(form.inert, false);
  assert.equal(editor.style.transform, 'rotate(0deg)');
  assert.equal(app.get('shared-dream-input').focused, true);
});

test('closing during growth cancels animation and resets input state', () => {
  const app = garden();
  const editor = app.get('dream-editor');
  const bounds = () => ({ left: 0, top: 0, width: 100, height: 100 });
  app.bubbles()[0].getBoundingClientRect = editor.getBoundingClientRect = bounds;
  let cancelled = false;
  editor.animate = () => ({ finished: new Promise(() => {}), cancel() { cancelled = true; } });
  app.open(0);
  app.get('dream-editor-close').click();
  assert.equal(cancelled, true);
  assert.equal(editor.open, false);
  assert.equal(app.get('shared-dream-form').inert, false);
});

test('blank input is ignored and a successful addition preserves other dreams', async () => {
  const app = garden([{ id: 'a', text: 'Existing' }]);
  app.open(5);
  assert.equal(app.get('dream-editor').open, true);
  assert.equal(app.get('shared-dream-input').value, '');
  await app.submit('   ');
  assert.equal(app.writes.length, 0);
  await app.submit('  New dream  ');
  assert.equal(app.writes[0].length, 2);
  assert.deepEqual(app.writes[0][1], { id: 'new-dream', text: 'New dream', completed: false, slot: 5 });
  assert.equal(app.get('dream-editor').open, false);
  assert.equal(app.bubbles()[5].dataset.dreamId, 'new-dream');
  app.open(5);
  assert.equal(app.get('shared-dream-input').value, 'New dream');
  assert.equal(app.get('shared-dream-empty').hidden, true);
});

test('failed saving retains the draft and rolls back completion without fireworks', async () => {
  const app = garden([{ id: 'a', text: 'Existing' }]);
  app.setPersist(async () => false);
  app.open(1);
  await app.submit('Keep this draft');
  assert.equal(app.get('shared-dream-input').value, 'Keep this draft');
  assert.equal(app.get('dream-editor').open, true);
  app.open(0);
  await app.get('dream-editor-complete').click();
  assert.equal(app.bubbles()[0].className.includes('is-complete'), false);
  assert.equal(app.body.children.length, 0);
});

test('completion waits for persistence, blocks double clicks and cleans up fireworks', async () => {
  const app = garden([{ id: 'a', text: 'Existing' }]);
  let resolve;
  app.setPersist(() => new Promise(done => { resolve = done; }));
  app.open(0);
  const button = app.get('dream-editor-complete');
  const saving = button.click();
  await button.click();
  assert.equal(app.writes.length, 1);
  assert.equal(app.body.children.length, 0);
  resolve(true); await saving;
  assert.ok(app.bubbles()[0].className.includes('is-complete'));
  assert.ok(app.body.children[0].children.length > 100);
  assert.ok(app.body.children[0].children.some(child => child.className?.includes('dream-release-balloon')));
  app.timers[0]();
  assert.equal(app.body.children.length, 0);
  app.setPersist(async () => true);
  app.open(0);
  await app.get('dream-editor-complete').click();
  assert.equal(app.writes[1][0].completed, false);
  assert.equal(app.body.children.length, 0);
});

test('reduced motion celebrates with a message and deletion shows empty state', async () => {
  const app = garden([{ id: 'a', text: 'Existing' }], true);
  app.open(0);
  await app.get('dream-editor-complete').click();
  assert.equal(app.body.children[0].children.length, 1);
  app.open(0);
  await app.get('dream-editor-delete').click();
  assert.equal(app.bubbles().length, 6);
  assert.equal(app.bubbles().every(button => !button.dataset.dreamId), true);
  assert.equal(app.get('shared-dream-empty').hidden, false);
});

test('editing one balloon preserves completion and the other dreams', async () => {
  const app = garden([{ id: 'a', text: 'First', completed: true, slot: 4 }, { id: 'b', text: 'Second', slot: 2 }]);
  app.open(4);
  await app.submit('Updated first');
  assert.deepEqual(app.writes[0], [{ id: 'a', text: 'Updated first', completed: true, slot: 4 }, { id: 'b', text: 'Second', slot: 2 }]);
  assert.equal(app.bubbles()[4].dataset.dreamId, 'a');
  assert.equal(app.bubbles()[2].dataset.dreamId, 'b');
});

test('filling six balloons preserves saved positions and lets the user add another', async () => {
  const values = Array.from({ length: 6 }, (_, slot) => ({ id: String(slot), text: 'Dream ' + slot, slot }));
  const app = garden(values);
  assert.equal(app.bubbles().length, 6);
  assert.equal(app.get('dream-balloon-less').disabled, true);
  await app.get('dream-balloon-more').click();
  assert.equal(app.bubbles().length, 7);
  await app.get('dream-balloon-less').click();
  app.sync(values.filter(dream => dream.slot !== 2));
  assert.equal(app.bubbles().length, 6);
  assert.equal(app.bubbles()[2].dataset.dreamId, '');
  assert.equal(app.bubbles()[5].dataset.dreamId, '5');
});

test('removing skips filled balloons, retains one minimum and restores the saved count', async () => {
  const app = garden([{ id: 'a', text: 'Keep me', slot: 5 }]);
  await app.get('dream-balloon-less').click();
  assert.equal(app.bubbles().length, 5);
  assert.equal(app.bubbles().at(-1).dataset.dreamId, 'a');
  assert.equal(app.sizeWrites[0].some(balloon => balloon.slot === 4), false);
  assert.equal(app.sizeWrites[0].some(balloon => balloon.slot === 5), true);
  const reload = garden([{ id: 'a', text: 'Keep me', slot: 5 }], false, app.sizeWrites[0]);
  assert.equal(reload.bubbles().length, 5);
  for (let i = 0; i < 6; i++) await reload.get('dream-balloon-less').click();
  assert.equal(reload.bubbles().length, 1);
  assert.equal(reload.bubbles()[0].dataset.dreamId, 'a');
  assert.equal(reload.get('dream-balloon-less').disabled, true);
});

test('failed resizing rolls back and rapid clicks do not issue duplicate writes', async () => {
  const app = garden();
  let resolve;
  app.setPersist(() => new Promise(done => { resolve = done; }));
  const pending = app.get('dream-balloon-more').click();
  await app.get('dream-balloon-more').click();
  assert.equal(app.sizeWrites.length, 1);
  assert.equal(app.get('dream-balloon-more').disabled, true);
  resolve(false); await pending;
  assert.equal(app.bubbles().length, 6);
  assert.equal(app.get('dream-balloon-more').disabled, false);
});

test('remote resizing never hides a concurrently saved dream', () => {
  const app = garden([{ id: 'a', text: 'Keep me', slot: 5 }]);
  app.syncSize([{ id: 'balloon-0', slot: 0 }]);
  assert.equal(app.bubbles().length, 2);
  assert.equal(app.bubbles().at(-1).dataset.dreamId, 'a');
  assert.equal(app.get('dream-balloon-count').textContent, '2 bóng bay');
});

test('one bouquet holds twelve balloons and the thirteenth starts a new bouquet', async () => {
  const config = Array.from({ length: 12 }, (_, slot) => ({ id: 'balloon-' + slot, slot }));
  const app = garden([{ id: 'last', text: 'Twelfth dream', slot: 11 }], false, config);
  assert.equal(app.bubbles().length, 12);
  assert.equal(app.get('shared-dream-list').children.length, 1);
  assert.equal(app.bubbles()[11].dataset.dreamId, 'last');
  await app.get('dream-balloon-more').click();
  assert.equal(app.bubbles().length, 13);
  const bouquets = app.get('shared-dream-list').children;
  assert.equal(bouquets.length, 2);
  assert.equal(bouquets[0].querySelectorAll('.dream-balloon').length, 12);
  assert.equal(bouquets[1].querySelectorAll('.dream-balloon').length, 1);
  assert.equal(app.bubbles()[11].dataset.dreamId, 'last');
});

test('a remote deletion does not resurrect an edited dream and retains draft', async () => {
  const app = garden([{ id: 'a', text: 'First' }]);
  app.open(0);
  app.sync([]);
  await app.submit('My pending edit');
  assert.equal(app.writes.length, 0);
  assert.equal(app.get('dream-editor').open, true);
  assert.equal(app.get('shared-dream-input').value, 'My pending edit');
});
