const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
const start = source.indexOf('const quizPacks =');
const end = source.indexOf('const wheelEntriesInput');

function game() {
  class Element {
    constructor() { this.hidden = false; this.style = {}; this.children = []; this.events = {}; this.textContent = ''; this.classList = { add() {} }; }
    addEventListener(name, callback) { this.events[name] = callback; }
    click() { this.events.click?.(); }
    focus() { this.focused = true; }
    replaceChildren() { this.children = []; }
    append(child) { this.children.push(child); }
    querySelectorAll() { return this.children; }
  }
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const packs = ['personal', 'interests'].map(id => {
    const button = new Element();
    button.dataset = { quizPack: id };
    button.querySelector = () => get(`count-${id}`);
    return button;
  });
  const changeButtons = [new Element(), new Element()];
  const context = vm.createContext({ document: {
    getElementById: get,
    createElement: () => new Element(),
    querySelectorAll: selector => selector === '[data-quiz-pack]' ? packs : changeButtons,
    querySelector: selector => packs.find(button => selector.includes(`"${button.dataset.quizPack}"`)),
  } });
  vm.runInContext(source.slice(start, end), context);
  return { get, packs, changeButtons, run: code => vm.runInContext(code, context) };
}

test('each topic has valid questions and its own count', () => {
  const app = game();
  for (const id of ['personal', 'interests']) {
    assert.equal(app.run(`quizPacks.${id}.questions.every(q => q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)`), true);
    const count = app.run(`quizPacks.${id}.questions.length`);
    assert.ok(count > 0);
    assert.ok(app.get(`count-${id}`).textContent.startsWith(String(count)));
  }
});

test('switching packs mid-game resets score, question and progress', () => {
  const app = game();
  app.packs[0].click();
  app.get('quiz-options').children[0].click();
  assert.equal(app.run('score'), 1);
  app.changeButtons[0].click();
  assert.equal(app.get('quiz-pack-picker').hidden, false);
  assert.equal(app.get('quiz-play').hidden, true);
  assert.equal(app.packs[0].focused, true);
  app.packs[1].click();
  assert.equal(app.run('score'), 0);
  assert.equal(app.run('questionIndex'), 0);
  assert.equal(app.get('quiz-progress').style.width, '0%');
  assert.equal(app.get('quiz-count').textContent, 'Câu 1 / 3');
});

test('answering cannot score twice or skip unanswered questions; replay retains chosen pack', () => {
  const app = game();
  app.packs[1].click();
  app.get('quiz-next').click();
  assert.equal(app.run('questionIndex'), 0);
  for (let i = 0; i < 3; i++) {
    const correct = app.run('questions[questionIndex].answer');
    const answer = app.get('quiz-options').children[correct];
    answer.click(); answer.click();
    app.get('quiz-next').click();
  }
  assert.equal(app.run('score'), 3);
  assert.equal(app.get('quiz-play').hidden, true);
  assert.equal(app.get('quiz-result').hidden, false);
  assert.equal(app.get('result-title').textContent, '3 / 3 câu đúng');
  assert.equal(app.get('quiz-progress').style.width, '100%');
  app.get('quiz-restart').click();
  assert.equal(app.run('activeQuizPack'), 'interests');
  assert.equal(app.run('score'), 0);
  assert.equal(app.get('quiz-result').hidden, true);
  assert.equal(app.get('quiz-play').hidden, false);
});
