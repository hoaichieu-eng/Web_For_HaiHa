const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');

test('album swipes navigate horizontally and ignore vertical scroll, mouse and canceled gestures', () => {
  const events = {};
  const changes = [];
  const context = vm.createContext({
    albumSlideshow: { open: true, querySelector: () => ({ addEventListener: (key, fn) => { events[key] = fn; } }) },
    changeAlbumPhoto: direction => changes.push(direction),
  });
  const start = source.indexOf('const albumSwipeStage');
  vm.runInContext(source.slice(start, source.indexOf('document.addEventListener("keydown"', start)), context);
  const down = { isPrimary: true, pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 100, timeStamp: 0, target: { closest: () => null } };
  events.pointerdown(down);
  events.pointerup({ pointerId: 1, clientX: 20, clientY: 105, timeStamp: 300 });
  events.pointerdown(down);
  events.pointerup({ pointerId: 1, clientX: 180, clientY: 105, timeStamp: 300 });
  assert.deepEqual(changes, [1, -1]);
  events.pointerdown(down);
  events.pointerup({ pointerId: 1, clientX: 90, clientY: 200, timeStamp: 300 });
  events.pointerdown({ ...down, pointerType: 'mouse' });
  events.pointerup({ pointerId: 1, clientX: 20, clientY: 100, timeStamp: 300 });
  events.pointerdown(down);
  events.pointercancel();
  events.pointerup({ pointerId: 1, clientX: 20, clientY: 100, timeStamp: 300 });
  assert.deepEqual(changes, [1, -1]);
});
const flush = async () => { for (let index = 0; index < 30; index++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function photo(path) {
  const image = { complete: false, naturalWidth: 0, decoded: 0, src: '',
    getAttribute() { return this.src; },
    async decode() {
      this.decoded++;
      if (this.fail) throw new Error('Network failure');
      this.complete = true;
      this.naturalWidth = 200;
    },
  };
  return { dataset: { cloudPath: path, album: 'cute' }, isConnected: true, image, querySelector: () => image };
}

function loader(photos) {
  const valid = new Map();
  const requests = [];
  const timers = [];
  const context = vm.createContext({ console, albumImageLoads: new WeakMap(), albumPhotos: photos,
    albumCategories: { cute: 'Cute' }, albumPreloadQueue: [], albumPreloadWorkers: 0, albumPreloadTimer: null,
    window: { setTimeout: callback => { timers.push(callback); }, clearTimeout() {}, appCloud: {
      isReady: true,
      isImageUrlCurrent: (path, url) => valid.get(path) === url,
      async imageUrl(path) { const url = `${path}?v=${requests.length}`; requests.push(path); valid.set(path, url); return url; },
    } },
  });
  vm.runInContext(source.slice(source.indexOf('function isAlbumImageReady'), source.indexOf('document.querySelectorAll(".album-box")')), context);
  return { context, valid, requests, timers };
}

test('returning to the tab skips all successfully preloaded images', async () => {
  const photos = [photo('a'), photo('b'), photo('c')];
  const app = loader(photos);
  vm.runInContext('preloadAlbumImages()', app.context);
  app.timers.shift()(); await flush();
  assert.equal(app.requests.length, 3);
  assert.ok(photos.every(photo => photo.image.decoded === 1));
  vm.runInContext('preloadAlbumImages()', app.context);
  app.timers.shift()(); await flush();
  assert.equal(app.requests.length, 3);
  assert.ok(photos.every(photo => photo.image.decoded === 1));
  app.valid.delete('b');
  vm.runInContext('preloadAlbumImages()', app.context);
  app.timers.shift()(); await flush();
  assert.deepEqual(app.requests, ['a', 'b', 'c', 'b']);
  assert.equal(photos[1].image.decoded, 2);
});

test('pending requests are shared and failed images can retry', async () => {
  const item = photo('retry');
  const app = loader([item]);
  item.image.fail = true;
  const first = vm.runInContext('loadAlbumImage(albumPhotos[0])', app.context);
  const second = vm.runInContext('loadAlbumImage(albumPhotos[0])', app.context);
  assert.equal(first, second);
  await assert.rejects(first);
  item.image.fail = false;
  await vm.runInContext('loadAlbumImage(albumPhotos[0])', app.context);
  assert.equal(item.image.decoded, 2);
  assert.equal(vm.runInContext('isAlbumImageReady(albumPhotos[0])', app.context), true);
});

test('album synchronization reuses loaded figures and replaces only changed paths', async () => {
  class Figure {
    constructor() { this.dataset = {}; this.children = []; }
    querySelector() { return this.children[0]; }
    append(child) {
      child.remove?.();
      this.children.push(child);
      child.parent = this;
    }
    remove() {
      if (!this.parent) return;
      const siblings = this.parent.children;
      siblings.splice(siblings.indexOf(this), 1);
      this.parent = null;
    }
  }
  const container = new Figure();
  const app = loader([]);
  app.context.document = {
    querySelector: () => container,
    querySelectorAll: selector => container.children.filter(item => !selector.includes('data-cloud-album') || item.dataset.cloudAlbum === 'cute'),
    createElement: tag => tag === 'figure' ? new Figure() : photo('unused').image,
  };
  app.context.updateAlbumCounts = () => {};
  app.context.albumSlideshow = { open: false };
  vm.runInContext(source.slice(source.indexOf('function renderSharedAlbum('), source.indexOf('function removeDeletedSamplePhotos(')), app.context);
  app.context.records = [{ id: 'a', path: 'a.jpg', name: 'A' }];
  vm.runInContext('renderSharedAlbum("cute", records)', app.context);
  const original = container.children[0];
  await vm.runInContext('loadAlbumImage(albumPhotos[0])', app.context);
  vm.runInContext('renderSharedAlbum("cute", records)', app.context);
  assert.equal(container.children[0], original);
  await vm.runInContext('loadAlbumImage(albumPhotos[0])', app.context);
  assert.equal(app.requests.length, 1);
  app.context.records = [{ id: 'a', path: 'replacement.jpg', name: 'A' }];
  vm.runInContext('renderSharedAlbum("cute", records)', app.context);
  assert.notEqual(container.children[0], original);
  await vm.runInContext('loadAlbumImage(albumPhotos[0])', app.context);
  assert.deepEqual(app.requests, ['a.jpg', 'replacement.jpg']);
});

function slideshow() {
  const timers = new Map();
  let nextTimer = 0;
  const loads = [deferred(), deferred()];
  const fade = deferred();
  const elements = () => ({ hidden: false, removeAttribute() {} });
  const photos = [photo('a'), photo('b')];
  const context = vm.createContext({
    albumRenderVersion: 0, albumPhotoReady: false, albumAutoplayTimer: null,
    activeAlbumPhotos: photos, albumPhotoIndex: 0, albumPaused: false,
    albumSlideshow: { open: true }, albumSlideshowImage: elements(), albumSlideshowOutgoing: elements(),
    albumSlideshowEmpty: elements(), albumSlideshowCaption: elements(), albumSlideshowControls: elements(),
    albumSlideshowPrevious: elements(), albumSlideshowNext: elements(), albumSlideshowDelete: elements(),
    albumSlideshowCount: elements(), albumSlideshowToggle: { ...elements(), setAttribute() {} },
    albumFade: null, albumTransition: Promise.resolve(),
    loadAlbumImage: item => loads[photos.indexOf(item)].promise,
    transitionAlbumImage: () => fade.promise,
    showImageUploadStatus: message => { throw new Error(message); },
    window: {
      clearTimeout(id) { timers.delete(id); },
      setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, {callback, delay}); return id; },
    },
  });
  vm.runInContext(source.slice(source.indexOf('function renderAlbumPhoto()'), source.indexOf('albumSlideshowPrevious.addEventListener')), context);
  return { context, timers, loads, fade };
}

test('autoplay waits for both download and completed fade before counting 3 seconds', async () => {
  const app = slideshow();
  vm.runInContext('renderAlbumPhoto(); setAlbumPaused(false);', app.context);
  assert.equal(app.timers.size, 0, 'no timer while image is loading');
  app.loads[0].resolve('a'); await flush();
  assert.equal(app.timers.size, 0, 'no timer during fade');
  app.fade.resolve(); await flush();
  assert.equal(app.timers.size, 1);
  const timer = [...app.timers.values()][0];
  assert.equal(timer.delay, 3000);
  timer.callback(); await flush();
  assert.equal(app.context.albumPhotoIndex, 1);
  assert.equal(app.timers.size, 0, 'next slow image has no countdown');
});

test('pausing during load prevents autoplay after image becomes ready', async () => {
  const app = slideshow();
  vm.runInContext('renderAlbumPhoto(); setAlbumPaused(true);', app.context);
  app.loads[0].resolve('a'); app.fade.resolve(); await flush();
  assert.equal(app.timers.size, 0);
  vm.runInContext('setAlbumPaused(false)', app.context);
  assert.equal([...app.timers.values()][0].delay, 3000);
});

test('outdated load completion cannot start a countdown for a newer selection', async () => {
  const app = slideshow();
  vm.runInContext('renderAlbumPhoto(); changeAlbumPhoto(1);', app.context);
  app.loads[0].resolve('a'); await flush();
  assert.equal(app.timers.size, 0);
  assert.equal(app.context.albumPhotoReady, false);
  app.loads[1].resolve('b'); app.fade.resolve(); await flush();
  assert.equal(app.timers.size, 1);
});
