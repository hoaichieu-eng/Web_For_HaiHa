const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
const wheelSource = source.slice(source.indexOf('const wheelEntriesInput'), source.indexOf('const motionPreference'));

function setup(storage = new Map(), blocked = false) {
  class Element {
    constructor() {
      this.value = ''; this.children = []; this.events = {}; this.attributes = {};
      this.style = { setProperty() {} }; this.classList = { remove() {}, add() {} };
    }
    addEventListener(key, fn) { this.events[key] = fn; }
    removeEventListener(key) { delete this.events[key]; }
    setAttribute(key, value) { this.attributes[key] = value; }
    replaceChildren(...children) { this.children = children; }
    append(child) { this.children.push(child); }
    focus() { this.focused = true; }
  }
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  get('wheel-count').value = '4';
  vm.runInNewContext(wheelSource, {
    document: { getElementById: get, createElement: () => new Element() },
    window: {
      clearTimeout() {}, setTimeout() { return 1; }, matchMedia: () => ({ matches: true }),
      localStorage: {
        getItem(key) { if (blocked) throw new Error('blocked'); return storage.get(key) ?? null; },
        setItem(key, value) { if (blocked) throw new Error('blocked'); storage.set(key, value); },
      },
    },
  });
  return { get, storage, entries: () => get('wheel-entries').children };
}

test('draft text, blank entries and count survive reload and count changes', () => {
  const app = setup();
  app.entries()[0].value = '  Đi xem phim  ';
  app.entries()[0].events.input();
  const reloaded = setup(app.storage);
  assert.equal(reloaded.entries().length, 4);
  assert.equal(reloaded.entries()[0].value, '  Đi xem phim  ');
  assert.equal(reloaded.entries()[1].value, '');
  reloaded.get('wheel-count').value = '6';
  reloaded.get('wheel-count').events.change();
  const again = setup(app.storage);
  assert.equal(again.entries().length, 6);
  assert.equal(again.entries()[0].value, '  Đi xem phim  ');
});

test('reset clears stored choices and the previous result, and is blocked during a spin', () => {
  const storage = new Map([['wheel:choices', JSON.stringify(['A', 'B'])]]);
  const app = setup(storage);
  app.get('wheel-spin').events.click();
  assert.equal(app.get('wheel-reset').disabled, true);
  app.get('wheel-reset').events.click();
  assert.equal(app.entries()[0].value, 'A');
  app.get('wheel').events.transitionend({ target: app.get('wheel'), propertyName: 'transform' });
  assert.equal(app.get('wheel-reset').disabled, false);
  app.get('wheel-reset').events.click();
  assert.equal(app.entries().every(entry => entry.value === ''), true);
  assert.equal(app.get('wheel-spin').disabled, true);
  assert.equal(app.entries()[0].focused, true);
  assert.equal(setup(storage).entries().every(entry => entry.value === ''), true);
});

test('invalid saved data and blocked storage leave the wheel usable', () => {
  for (const invalid of ['{', '{}', '[null,null]', '["A"]', JSON.stringify(Array(11).fill('A'))]) {
    const app = setup(new Map([['wheel:choices', invalid]]));
    assert.equal(app.entries().length, 4);
  }
  const app = setup(new Map(), true);
  app.entries().forEach(entry => { entry.value = 'Lựa chọn'; entry.events.input(); });
  assert.equal(app.get('wheel-spin').disabled, false);
  assert.match(app.get('wheel-storage-status').textContent, /chưa thể lưu/);
  app.get('wheel-reset').events.click();
  assert.equal(app.entries().every(entry => entry.value === ''), true);
});
