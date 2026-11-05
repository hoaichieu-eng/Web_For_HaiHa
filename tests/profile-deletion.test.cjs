const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');

test('deleted profile renders the default avatar without requesting an image URL', async () => {
  const placeholder = { svg: true };
  const avatar = { child: { src: 'old-profile.jpg' }, replaceChildren(child) { this.child = child; } };
  const button = { hidden: false };
  const context = vm.createContext({
    window: { appCloud: { isReady: true } },
    document: { querySelector: selector => selector.includes('data-image-remove') ? button : avatar },
    profileDefaults: new Map([['me', { cloneNode: () => placeholder }]]),
    setCloudImage() { throw new Error('Deleted images must not be requested'); },
  });
  vm.runInContext(source.slice(source.indexOf('async function displayUploadedSlot('), source.indexOf('function renderSharedAlbum(')), context);
  await vm.runInContext('displayUploadedSlot("profile:me", { deleted: true })', context);
  assert.equal(avatar.child, placeholder);
  assert.equal(button.hidden, true);
});

function migration(initial, onUpload) {
  const data = new Map(initial === undefined ? [] : [['image:profile:me', initial]]);
  const uploads = [], writes = [], removed = [];
  function request(result) {
    const value = { result };
    queueMicrotask(() => value.onsuccess());
    return value;
  }
  const database = {
    objectStoreNames: { contains: () => true }, close() {},
    transaction: () => ({ objectStore: () => ({ getAll: () => request([
      { id: 'slot:profile:me', name: 'old.jpg', blob: {} },
    ]) }) }),
  };
  const context = vm.createContext({
    albumCategories: {}, makeImagePath: () => 'legacy/new-upload.jpg',
    window: {
      indexedDB: { open: () => request(database) },
      appCloud: {
        get: key => data.get(key),
        async uploadImage(file) { uploads.push(file); onUpload?.(data); },
        async set(key, value) { writes.push(value); data.set(key, value); return true; },
        async deleteImages(paths) { removed.push(...paths); },
      },
    },
  });
  vm.runInContext(source.slice(source.indexOf('let legacyImagesMigrated'), source.indexOf('window.addEventListener("app-cloud-ready", () => {\n  refreshSharedImages();')), context);
  return { run: () => vm.runInContext('migrateLegacyImages()', context), data, uploads, writes, removed };
}

test('legacy IndexedDB photos cannot overwrite a deletion marker after reload', async () => {
  const app = migration({ deleted: true });
  await app.run();
  assert.equal(app.uploads.length, 0);
  assert.equal(app.writes.length, 0);
});

test('deletion during legacy upload is respected and the unused file is cleaned up', async () => {
  const app = migration(undefined, data => data.set('image:profile:me', { deleted: true }));
  await app.run();
  assert.equal(app.uploads.length, 1);
  assert.equal(app.writes.length, 0);
  assert.deepEqual(app.removed, ['legacy/new-upload.jpg']);
  assert.equal(app.data.get('image:profile:me').deleted, true);
});

test('a genuine unmigrated profile image is still transferred', async () => {
  const app = migration();
  await app.run();
  assert.equal(app.uploads.length, 1);
  assert.equal(app.writes.length, 1);
  assert.equal(app.data.get('image:profile:me').path, 'legacy/new-upload.jpg');
});
