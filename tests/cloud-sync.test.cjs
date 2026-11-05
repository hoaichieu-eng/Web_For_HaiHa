const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../cloud.js'), 'utf8');
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function database(key, value) {
  const rows = new Map([[key, { key, value: clone(value), updated_at: '2026-01-01T00:00:00.000Z' }]]);
  let refusedUpdates = false;
  const client = { from() {
    const query = {
      method: 'read', filters: [],
      select() { return this; },
      eq(field, value) { this.filters.push([field, value]); return this; },
      update(record) { this.method = 'update'; this.record = record; return this; },
      insert(record) { this.method = 'insert'; this.record = record; return this; },
      maybeSingle() { return execute(this, true); },
      then(resolve, reject) { return execute(this, false).then(resolve, reject); },
    };
    return query;
  } };
  async function execute(query, single) {
    await new Promise(resolve => setImmediate(resolve));
    if (query.method === 'insert') {
      if (rows.has(query.record.key)) return { error: { code: '23505' } };
      rows.set(query.record.key, clone(query.record));
      return { error: null };
    }
    const matching = [...rows.values()].filter(row => query.filters.every(([field, value]) => row[field] === value));
    if (query.method === 'update') {
      if (refusedUpdates) return { data: [], error: null };
      matching.forEach(row => Object.assign(row, clone(query.record)));
      return { data: matching.map(row => ({ key: row.key })), error: null };
    }
    return { data: clone(single ? matching[0] || null : matching), error: null };
  }
  return { client, rows, refuseUpdates() { refusedUpdates = true; } };
}

function device(db, key, base) {
  const storage = new Map(base === undefined ? [] : [[key, JSON.stringify(base)]]);
  const statuses = [];
  const context = vm.createContext({
    injectedClient: db.client,
    window: { APP_CONFIG: {}, clearTimeout() {}, setTimeout() {} },
    document: { getElementById: () => ({}) },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    console,
  });
  const setup = source.slice(0, source.indexOf('  async function initialize()'))
    .replace('let client;', 'let client = injectedClient;')
    .replace('let activeUserId = "";', 'let activeUserId = "test-user";') + '\nwindow.restoreForTest = restoreAndMigrateData;\n})();';
  vm.runInContext(setup, context);
  return { api: context.window.appCloud, statuses, restore: context.window.restoreForTest };
}

test('two devices adding album images preserve both additions', async () => {
  const key = 'album:cute';
  const base = [{ id: 'old', path: 'old.jpg' }];
  const db = database(key, base);
  const a = device(db, key, base), b = device(db, key, base);
  const results = await Promise.all([
    a.api.set(key, [...base, { id: 'a', path: 'a.jpg' }]),
    b.api.set(key, [...base, { id: 'b', path: 'b.jpg' }]),
  ]);
  assert.deepEqual(results, [true, true]);
  assert.deepEqual(db.rows.get(key).value.map(item => item.id).sort(), ['a', 'b', 'old']);
});

test('dream completion and another device adding a dream both persist', async () => {
  const key = 'love-shared-dreams';
  const base = [{ id: 'old', text: 'Our dream' }];
  const db = database(key, base);
  const a = device(db, key, base), b = device(db, key, base);
  const results = await Promise.all([
    a.api.set(key, [{ ...base[0], completed: true }]),
    b.api.set(key, [...base, { id: 'new', text: 'Next dream', completed: false }]),
  ]);
  assert.deepEqual(results, [true, true]);
  const saved = db.rows.get(key).value;
  assert.equal(saved.find(dream => dream.id === 'old').completed, true);
  assert.equal(saved.find(dream => dream.id === 'new').text, 'Next dream');
});

test('different fields of an entertainment item merge', async () => {
  const key = 'entertainment:movies';
  const base = [{ id: 'movie', name: 'Before', rating: 5 }];
  const db = database(key, base);
  const a = device(db, key, base), b = device(db, key, base);
  assert.deepEqual(await Promise.all([
    a.api.set(key, [{ ...base[0], name: 'After' }]),
    b.api.set(key, [{ ...base[0], rating: 9.5 }]),
  ]), [true, true]);
  assert.deepEqual(db.rows.get(key).value, [{ id: 'movie', name: 'After', rating: 9.5 }]);
});

test('conflicting changes to the same field are rejected and latest data is restored', async () => {
  const key = 'entertainment:movies';
  const base = [{ id: 'movie', name: 'Before', rating: 5 }];
  const db = database(key, base);
  const a = device(db, key, base), b = device(db, key, base);
  assert.equal(await a.api.set(key, [{ ...base[0], rating: 8 }]), true);
  assert.equal(await b.api.set(key, [{ ...base[0], rating: 9 }]), false);
  assert.equal(db.rows.get(key).value[0].rating, 8);
  assert.equal(b.api.get(key)[0].rating, 8);
});

test('deletion does not silently erase a concurrent edit', async () => {
  const key = 'love-shared-dreams';
  const base = [{ id: 'dream', text: 'Before' }];
  const db = database(key, base);
  const a = device(db, key, base), b = device(db, key, base);
  await a.api.set(key, [{ id: 'dream', text: 'After' }]);
  assert.equal(await b.api.set(key, []), false);
  assert.equal(db.rows.get(key).value[0].text, 'After');
});

test('string lists preserve duplicate occurrences and concurrent additions', async () => {
  const key = 'love-my-dreams';
  const base = ['repeat', 'repeat'];
  const db = database(key, base);
  const a = device(db, key, base), b = device(db, key, base);
  await a.api.set(key, [...base, 'new']);
  assert.equal(await b.api.set(key, ['repeat']), true);
  assert.deepEqual(db.rows.get(key).value, ['repeat', 'new']);
});

test('writes from the same device are serialized without losing local additions', async () => {
  const key = 'album:outing';
  const db = database(key, []);
  const a = device(db, key, []);
  const first = a.api.set(key, [{ id: 'a' }]);
  const second = a.api.set(key, [...a.api.get(key), { id: 'b' }]);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.deepEqual(db.rows.get(key).value.map(item => item.id), ['a', 'b']);
});

test('simultaneous first writes retry a duplicate-key insert', async () => {
  const key = 'album:funny';
  const db = database(key, []);
  db.rows.clear();
  const a = device(db, key), b = device(db, key);
  assert.deepEqual(await Promise.all([a.api.set(key, [{ id: 'a' }]), b.api.set(key, [{ id: 'b' }])]), [true, true]);
  assert.deepEqual(db.rows.get(key).value.map(item => item.id).sort(), ['a', 'b']);
});

test('repeated version conflicts stop without overwriting the server', async () => {
  const key = 'album:outing';
  const db = database(key, []);
  db.refuseUpdates();
  const a = device(db, key, []);
  assert.equal(await a.api.set(key, [{ id: 'a' }]), false);
  assert.deepEqual(db.rows.get(key).value, []);
  assert.deepEqual(clone(a.api.get(key)), []);
});

test('profile deletion persists across reload and blocks stale local-data migration', async () => {
  const key = 'image:profile:me';
  const old = { path: 'old-profile.jpg', name: 'Old profile' };
  const db = database(key, old);
  const a = device(db, key, old);
  assert.equal(await a.api.delete(key), true);
  assert.deepEqual(db.rows.get(key).value, { deleted: true });
  const staleDevice = device(db, key, old);
  await staleDevice.restore();
  assert.deepEqual(clone(staleDevice.api.get(key)), { deleted: true });
  assert.deepEqual(db.rows.get(key).value, { deleted: true });
});

test('a new profile image can replace the deletion marker', async () => {
  const key = 'image:profile:her';
  const marker = { deleted: true };
  const db = database(key, marker);
  const a = device(db, key, marker);
  assert.equal(await a.api.set(key, { path: 'new-profile.webp', name: 'New profile' }), true);
  assert.equal(db.rows.get(key).value.path, 'new-profile.webp');
});

test('stale deletion cannot remove a new profile image uploaded elsewhere', async () => {
  const key = 'image:profile:me';
  const old = { path: 'old-profile.jpg' };
  const db = database(key, old);
  const a = device(db, key, old), b = device(db, key, old);
  await a.api.set(key, { path: 'new-profile.webp' });
  assert.equal(await b.api.delete(key), false);
  assert.equal(db.rows.get(key).value.path, 'new-profile.webp');
});
