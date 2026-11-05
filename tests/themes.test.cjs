const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const script = read('theme.js');
const colors = { rose: '#fbf5ef', sage: '#f5f7f1', lavender: '#f8f5fc', ocean: '#f2f8fb', caramel: '#faf4eb' };

function setup(stored, blocked = false) {
  const events = {}, writes = [];
  const inputs = Object.keys(colors).map(value => ({ value, checked: false, addEventListener(event, callback) { this[event] = callback; } }));
  const summary = { focused: false, focus() { this.focused = true; } };
  const picker = { open: true, querySelector: () => summary, querySelectorAll: () => inputs, contains: target => target === summary,
    addEventListener(event, callback) { this[event] = callback; } };
  const meta = {};
  const doc = { documentElement: { dataset: {} }, querySelector: () => meta, getElementById: () => picker,
    addEventListener: (event, callback) => { events[event] = callback; } };
  const storage = { getItem() { if (blocked) throw Error('Storage blocked'); return stored; },
    setItem(key, value) { if (blocked) throw Error('Storage blocked'); writes.push([key, value]); } };
  vm.runInNewContext(script, { document: doc, localStorage: storage });
  return { doc, meta, events, inputs, picker, summary, writes };
}

test('all saved palettes restore before DOMContentLoaded without rewriting preferences', () => {
  for (const [theme, background] of Object.entries(colors)) {
    const app = setup(theme);
    assert.equal(app.doc.documentElement.dataset.theme, theme);
    assert.equal(app.meta.content, background);
    assert.equal(app.writes.length, 0);
    app.events.DOMContentLoaded();
    assert.equal(app.inputs.filter(input => input.checked).length, 1);
    assert.equal(app.inputs.find(input => input.checked).value, theme);
  }
});

test('selecting a palette updates colors, persists preference and returns keyboard focus', () => {
  const app = setup('rose');
  app.events.DOMContentLoaded();
  for (const input of app.inputs) {
    input.checked = true;
    app.picker.open = true;
    input.change();
    assert.equal(app.doc.documentElement.dataset.theme, input.value);
    assert.equal(app.meta.content, colors[input.value]);
    assert.equal(app.writes.at(-1)[1], input.value);
    assert.equal(app.picker.open, false);
    assert.equal(app.summary.focused, true);
  }
});

test('invalid or blocked saved preferences fall back safely and switching still works', () => {
  for (const value of [null, 'unknown', '__proto__']) {
    assert.equal(setup(value).doc.documentElement.dataset.theme, 'rose');
  }
  const app = setup(null, true);
  app.events.DOMContentLoaded();
  app.inputs[1].checked = true;
  app.inputs[1].change();
  assert.equal(app.doc.documentElement.dataset.theme, 'sage');
});

test('outside click and Escape close the palette picker', () => {
  const app = setup('rose');
  app.events.DOMContentLoaded();
  app.events.click({ target: app.summary });
  assert.equal(app.picker.open, true);
  app.events.click({ target: {} });
  assert.equal(app.picker.open, false);
  app.picker.open = true;
  let prevented = false;
  app.picker.keydown({ key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(app.picker.open, false);
  assert.equal(app.summary.focused, true);
});

test('each palette resolves color roles for page, story, album and wheel without cycles', () => {
  const css = read('themes.css');
  const parse = block => Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(match => [match[1], match[2].trim()]));
  const original = parse(read('style.css').match(/:root\s*\{([^}]+)\}/)[1]);
  const defaults = parse(css.match(/:root\s*\{([^}]+)\}/)[1]);
  const shared = parse(css.match(/:root\[data-theme\]:not\(\[data-theme="rose"\]\)\s*\{([^}]+)\}/)[1]);
  for (const [theme, background] of Object.entries(colors)) {
    const specific = theme === 'rose' ? {} : parse(css.match(new RegExp(':root\\[data-theme="' + theme + '"\\]\\s*\\{([^}]+)\\}'))[1]);
    const variables = { ...original, ...defaults, ...specific, ...(theme === 'rose' ? {} : shared) };
    function resolve(name, chain = []) {
      assert.ok(!chain.includes(name), 'Cyclic color variable: ' + name);
      assert.ok(variables[name], 'Missing color variable: ' + name);
      return variables[name].replace(/var\((--[\w-]+)\)/g, (_, next) => resolve(next, [...chain, name]));
    }
    assert.equal(resolve('--paper'), background);
    for (const name of ['--ink', '--muted', '--rose', '--rose-dark', '--section', '--book-page', '--book-photo', '--stage-start', '--stage-end', '--dialog-mid', '--counter-surface', '--closing-text', '--wheel-1', '--wheel-6']) {
      assert.match(resolve(name), /^#[0-9a-f]{6}$/);
    }
  }
});

test('theme script loads before styles and radio controls have unique valid options', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('src="theme.js"') < html.indexOf('href="style.css"'));
  assert.deepEqual([...html.matchAll(/name="site-theme" value="([^"]+)"/g)].map(match => match[1]), Object.keys(colors));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});
