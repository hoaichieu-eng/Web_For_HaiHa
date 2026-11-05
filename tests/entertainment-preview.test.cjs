const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
const start = source.indexOf('document.querySelectorAll("[data-entertainment]")');
const end = source.indexOf('// MINIGAME:', start);

function setup(initial = [], options = {}) {
  const animations = [];
  class Element {
    constructor() {
      this.children = []; this.events = {}; this.attributes = {}; this.value = ''; this.hidden = false; this.validity = { valid: true };
      if (options.animate) this.animate = () => {
        let finish;
        const animation = { finished: new Promise(resolve => { finish = resolve; }), cancel() {}, finish: () => finish() };
        animations.push(animation);
        return animation;
      };
    }
    getBoundingClientRect() { return { height: 50 }; }
    append(...elements) { elements.forEach(element => this.insertBefore(element, null)); }
    insertBefore(element, before) {
      element.remove();
      const index = before ? this.children.indexOf(before) : this.children.length;
      this.children.splice(index, 0, element);
      element.parent = this;
    }
    remove() {
      if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
      this.parent = null;
    }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener(name, fn) { this.events[name] = fn; }
    setCustomValidity() {}
    reportValidity() { return true; }
    focus() {}
  }
  const card = new Element();
  card.dataset = { entertainment: 'movies', itemLabel: 'Tên phim' };
  const form = new Element();
  const list = new Element();
  const submit = new Element();
  const inputs = { name: new Element(), rating: new Element() };
  form.elements = { namedItem: key => inputs[key] };
  form.querySelector = () => submit;
  form.reset = () => { inputs.name.value = ''; inputs.rating.value = ''; };
  card.querySelector = selector => selector === 'form' ? form : list;
  card.append(form, list);
  const data = { 'entertainment:movies': initial };
  const listeners = {};
  const writes = [];
  function update(items) {
    data['entertainment:movies'] = items;
    listeners['entertainment:movies']();
  }
  vm.runInNewContext(source.slice(start, end), {
    document: { querySelectorAll: () => [card], createElement: () => new Element(), activeElement: null },
    window: { matchMedia: () => ({ matches: false }), appCloud: {
      get: key => data[key],
      subscribe: (key, fn) => { listeners[key] = fn; fn(); },
      set: async (key, value) => {
        writes.push({ key, value });
        if (options.save && !await options.save()) return false;
        update(value);
        return true;
      },
    } },
  });
  const find = className => card.children.find(element => element.className === className);
  return { list, form, inputs, update, writes, animations, more: find('entertainment-more'), count: find('entertainment-count'), empty: find('entertainment-empty'), status: find('entertainment-status') };
}

const items = Array.from({ length: 5 }, (_, i) => ({ id: String(i), name: `Phim ${i}`, rating: i === 0 ? 0 : 8.5 }));
const visibleNames = app => app.list.children.filter(row => !row.hidden).map(row => row.children[0].value);

test('preview shows three most recently added items without changing stored data', () => {
  const app = setup(items);
  assert.deepEqual(visibleNames(app), ['Phim 4', 'Phim 3', 'Phim 2']);
  assert.equal(app.count.textContent, '5 trải nghiệm đã lưu');
  assert.equal(app.more.hidden, false);
  assert.equal(app.empty.hidden, true);
  assert.equal(app.writes.length, 0);
  app.more.events.click();
  assert.equal(visibleNames(app).length, 5);
  assert.equal(app.more.attributes['aria-expanded'], 'true');
  assert.equal(app.list.children[4].children[1].children[2].value, 0);
  app.more.events.click();
  assert.equal(visibleNames(app).length, 3);
});

test('remote updates refresh counts, preview and empty state while retaining existing rows', () => {
  const app = setup(items);
  const retained = app.list.children[0];
  app.update([...items, { id: 'new', name: 'Phim mới', rating: null }]);
  assert.deepEqual(visibleNames(app), ['Phim mới', 'Phim 4', 'Phim 3']);
  assert.equal(app.list.children[1], retained);
  assert.equal(app.list.children[0].children[1].children[2].value, '');
  app.update([]);
  assert.equal(app.list.children.length, 0);
  assert.equal(app.more.hidden, true);
  assert.equal(app.empty.hidden, false);
  assert.equal(app.count.textContent, '0 trải nghiệm đã lưu');
});

test('adding and editing a preview item preserve every item and cloud storage order', async () => {
  const app = setup(items);
  app.inputs.name.value = 'Phim vừa xem';
  app.inputs.rating.value = '9.5';
  await app.form.events.submit({ preventDefault() {} });
  assert.equal(app.writes[0].value.length, 6);
  assert.equal(app.writes[0].value[0].id, '0');
  assert.equal(visibleNames(app)[0], 'Phim vừa xem');
  const name = app.list.children[0].children[0];
  name.value = 'Tên đã sửa';
  await name.events.change();
  assert.equal(app.writes[1].value.length, 6);
  assert.equal(app.writes[1].value[5].name, 'Tên đã sửa');
  assert.equal(app.writes[1].value[5].rating, 9.5);
});

test('deleting an item preserves other records and fills the preview from remaining items', async () => {
  const app = setup(items);
  await app.list.children[0].children[2].events.click();
  assert.deepEqual(Array.from(app.writes[0].value, item => item.id), ['0', '1', '2', '3']);
  assert.deepEqual(visibleNames(app), ['Phim 3', 'Phim 2', 'Phim 1']);
  assert.equal(app.count.textContent, '4 trải nghiệm đã lưu');
  assert.equal(app.status.textContent, 'Đã xóa trải nghiệm.');
  const last = setup([items[0]]);
  await last.list.children[0].children[2].events.click();
  assert.equal(last.empty.hidden, false);
  assert.equal(last.list.children.length, 0);
  assert.equal(last.more.hidden, true);
});

test('failed deletion retains the item and duplicate clicks cannot submit while saving', async () => {
  let finish;
  const app = setup(items, { save: () => new Promise(resolve => { finish = resolve; }) });
  const row = app.list.children[0];
  const remove = row.children[2];
  const pending = remove.events.click();
  assert.equal(remove.disabled, true);
  assert.equal(row.children[0].disabled, true);
  await remove.events.click();
  assert.equal(app.writes.length, 1);
  finish(false);
  await pending;
  assert.equal(app.list.children.length, 5);
  assert.equal(remove.disabled, false);
  assert.equal(row.children[0].disabled, false);
  assert.equal(app.status.textContent, 'Chưa thể xóa. Cậu thử lại nhé.');
});

test('deletion animation waits for persistence and only removes the row when animation ends', async () => {
  let finish;
  const app = setup(items, { animate: true, save: () => new Promise(resolve => { finish = resolve; }) });
  const row = app.list.children[0];
  const pending = row.children[2].events.click();
  assert.equal(app.animations.length, 0);
  finish(true);
  await pending;
  assert.equal(app.animations.length, 1);
  assert.equal(app.list.children.length, 5);
  app.animations[0].finish();
  await Promise.resolve();
  assert.equal(app.list.children.length, 4);
});
