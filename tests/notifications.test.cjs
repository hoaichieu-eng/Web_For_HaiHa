const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../notifications.js'), 'utf8');

function setup(reducedMotion = false) {
  class Element {
    constructor() { this.events = {}; this.attributes = {}; this.children = []; this.hidden = false; this.disabled = false; }
    addEventListener(key, fn) { this.events[key] = fn; }
    setAttribute(key, value) { this.attributes[key] = value; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    showModal() { this.open = true; }
    close() { this.open = false; this.events.close?.(); }
    focus() { this.focused = true; }
  }
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const calls = [];
  const events = {};
  let result = { items: [], unread: 0 };
  let response;
  let markFails = false;
  let marks = 0;
  const api = {
    isReady: true,
    async notifications(before) { calls.push(before); return response ? response() : result; },
    async markNotificationsRead() {
      marks++;
      if (markFails) throw new Error('offline');
      result = { items: result.items.map(item => ({ ...item, read: true })), unread: 0 };
    },
  };
  vm.runInNewContext(source, {
    document: { getElementById: get, createElement: () => new Element(), addEventListener() {} },
    window: { appCloud: api, matchMedia: () => ({ matches: reducedMotion }), addEventListener: (key, fn) => { events[key] = fn; } },
  });
  return { get, api, calls, events, setResult: next => { result = next; }, setResponse: next => { response = next; }, failMark: () => { markFails = true; }, marks: () => marks };
}
const item = (id, key = 'entertainment:movies') => ({ id, key, action: 'added', created_at: '2026-11-04T05:00:00Z', read: false });

test('bell rings once for new activity, skips initial history, repeated refresh and reduced motion', async () => {
  for (const reduced of [false, true]) {
    const app = setup(reduced);
    let rings = 0;
    app.get('notification-toggle').animate = () => { rings++; };
    app.setResult({ items: [item(1)], unread: 1 });
    await app.events['app-cloud-ready']();
    assert.equal(rings, 0);
    app.setResult({ items: [item(2)], unread: 2 });
    await app.events['app-activity-changed']();
    await app.events.focus();
    assert.equal(rings, reduced ? 0 : 1);
  }
});

test('loading persistent notifications shows unread badge, section links and no automatic read', async () => {
  const app = setup();
  app.setResult({ items: [item(1)], unread: 1 });
  await app.events['app-cloud-ready']();
  assert.equal(app.get('notification-badge').hidden, false);
  assert.equal(app.get('notification-badge').textContent, '1');
  const row = app.get('notification-list').children[0];
  assert.equal(row.className, 'notification-item is-unread');
  assert.equal(row.children[0].href, '#entertainment');
  assert.match(row.children[0].children[0].textContent, /danh sách phim/);
  assert.equal(app.marks(), 0);
  await app.get('notification-read').events.click();
  assert.equal(app.marks(), 1);
  assert.equal(app.get('notification-badge').hidden, true);
  assert.equal(app.get('notification-list').children[0].className, 'notification-item');
});

test('older notifications paginate, retain loaded items and avoid duplicates', async () => {
  const app = setup();
  app.setResult({ items: Array.from({ length: 30 }, (_, i) => item(60 - i)), unread: 100 });
  await app.events['app-cloud-ready']();
  assert.equal(app.get('notification-badge').textContent, '99+');
  assert.equal(app.get('notification-load').hidden, false);
  app.setResult({ items: [item(31), item(30)], unread: 100 });
  await app.get('notification-load').events.click();
  assert.equal(app.calls[1], 31);
  assert.equal(app.get('notification-list').children.length, 31);
  assert.equal(app.get('notification-load').hidden, true);
});

test('failed loading and read marking preserve unread state and allow retry', async () => {
  const app = setup();
  app.setResult({ items: [item(1)], unread: 1 });
  await app.events['app-cloud-ready']();
  app.failMark();
  await app.get('notification-read').events.click();
  assert.equal(app.get('notification-badge').hidden, false);
  assert.equal(app.get('notification-read').disabled, false);
  assert.match(app.get('notification-message').textContent, /Chưa lưu/);
  app.setResponse(() => { throw new Error('offline'); });
  await app.events.focus();
  assert.match(app.get('notification-message').textContent, /Chưa tải/);
  assert.equal(app.get('notification-list').children.length, 1);
});

test('logout clears private activity and discards in-flight results', async () => {
  const app = setup();
  let resolve;
  app.setResponse(() => new Promise(done => { resolve = done; }));
  const pending = app.events['app-cloud-ready']();
  app.api.isReady = false;
  app.events['app-cloud-locked']();
  resolve({ items: [item(1)], unread: 1 });
  await pending;
  assert.equal(app.get('notification-list').children.length, 0);
  assert.equal(app.get('notification-badge').hidden, true);
  await app.events.focus();
  assert.equal(app.calls.length, 1);
});

test('a delayed older response cannot overwrite newer realtime activity', async () => {
  const app = setup();
  let resolve;
  app.setResponse(() => new Promise(done => { resolve = done; }));
  const pending = app.events['app-cloud-ready']();
  app.setResponse(null);
  app.setResult({ items: [item(2, 'love-shared-dreams')], unread: 2 });
  await app.events['app-activity-changed']();
  resolve({ items: [item(1)], unread: 1 });
  await pending;
  assert.equal(app.get('notification-badge').textContent, '2');
  assert.equal(app.get('notification-list').children[0].children[0].href, '#dreams');
});

function cloudAPI() {
  const calls = [];
  let error = null;
  const client = {
    from(table) {
      calls.push(['from', table]);
      const query = { then(resolve) { return Promise.resolve({ data: [{ ...item(30), activity_reads: [{ event_id: 30 }] }], error }).then(resolve); } };
      for (const method of ['select', 'or', 'order', 'limit', 'lt']) {
        query[method] = (...args) => { calls.push([method, ...args]); return query; };
      }
      return query;
    },
    async rpc(name) { calls.push(['rpc', name]); return { data: '42', error }; },
  };
  const cloud = fs.readFileSync(path.join(__dirname, '../cloud.js'), 'utf8');
  const code = cloud.slice(0, cloud.indexOf('  async function initialize()'))
    .replace('let client;', 'let client = injectedClient;')
    .replace('let activeUserId = "";', 'let activeUserId = "user-a";')
    .replace('let deviceId = "";', 'let deviceId = "device-a";') + '\nwindow.lockForTest = () => { activeUserId = ""; };\n})();';
  const window = { APP_CONFIG: {} };
  vm.runInNewContext(code, { window, document: { getElementById() {} }, injectedClient: client });
  return { api: window.appCloud, calls, fail: () => { error = new Error('offline'); }, lock: window.lockForTest };
}

test('cloud feed excludes the current actor/device, paginates and maps persisted read receipts', async () => {
  const app = cloudAPI();
  const result = await app.api.notifications(31);
  assert.equal(result.unread, 42);
  assert.equal(result.items[0].read, true);
  assert.ok(app.calls.some(call => call[0] === 'or' && call[1] === 'actor_id.neq.user-a,actor_device.neq.device-a'));
  assert.ok(app.calls.some(call => call[0] === 'lt' && call[1] === 'id' && call[2] === 31));
  await app.api.markNotificationsRead();
  assert.ok(app.calls.some(call => call[0] === 'rpc' && call[1] === 'mark_activity_read'));
});

test('cloud notification failures surface to UI and signed-out calls do not query private data', async () => {
  const app = cloudAPI();
  app.fail();
  await assert.rejects(app.api.notifications(), /offline/);
  await assert.rejects(app.api.markNotificationsRead(), /offline/);
  app.lock();
  const count = app.calls.length;
  await assert.rejects(app.api.notifications(), /đăng nhập/);
  await assert.rejects(app.api.markNotificationsRead(), /đăng nhập/);
  assert.equal(app.calls.length, count);
});
