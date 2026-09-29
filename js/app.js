/* ---------- 应用层 ---------- */
(function () {
  'use strict';
  const D = window.FRACTION_DATA;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /** 干扰项策略：取数值最接近的候选中随机 3 个，制造易混选项 */
  function makeQuestion(pool, direction) {
    const target = pick(pool);
    const near = pool
      .filter((e) => e !== target)
      .sort((a, b) => Math.abs(a.value - target.value) - Math.abs(b.value - target.value))
      .slice(0, 10);
    const options = shuffle([target].concat(shuffle(near).slice(0, 3)));
    return {
      target,
      direction,
      options,
      answerIdx: options.indexOf(target),
    };
  }

  function promptOf(q) {
    const t = q.target;
    if (q.direction === 'p2f') {
      const p = D.pctText(t);
      return p.text + (p.approx ? ' ≈ ?' : ' = ?') + '<small>选择对应的分数</small>';
    }
    return t.fracText + ' = ?' + '<small>选择对应的百分数</small>';
  }

  function optionText(q, e) {
    return q.direction === 'p2f' ? e.fracText : D.pctText(e).text;
  }

  function relationText(e) {
    const p = D.pctText(e);
    return e.fracText + (p.approx ? ' ≈ ' : ' = ') + p.text;
  }

  // ---------- Tab 切换 ----------
  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      $$('.view').forEach((v) => v.classList.remove('active'));
      $('#view-' + btn.dataset.view).classList.add('active');
    });
  });

  // ---------- 速记表 ----------
  function chipGroup(selector, onPick) {
    const btns = $$(selector);
    btns.forEach((btn) => btn.addEventListener('click', () => {
      btns.forEach((b) => b.classList.toggle('active', b === btn));
      onPick(btn.dataset[Object.keys(btn.dataset)[0]]);
    }));
  }

  function fracItem(e) {
    const p = D.pctText(e);
    return '<div class="frac-item ' + e.type + '"><span class="frac">' + e.fracText + '</span>' +
      '<span class="rel">' + (p.approx ? '≈' : '=') + '</span>' +
      '<span class="pct">' + p.text + '</span></div>';
  }

  function tableCard(title, list) {
    return '<div class="table-card"><h3>' + title +
      '<span class="sub">共 ' + list.length + ' 条</span></h3><div class="frac-grid">' +
      list.map(fracItem).join('') + '</div></div>';
  }

  function renderTable(mode) {
    const all = D.entries;
    let html = '';
    if (mode === 'pct') {
      const sorted = all.slice().sort((a, b) => b.value - a.value);
      html = tableCard('按百分数从大到小', sorted);
    } else if (mode === 'group') {
      html =
        tableCard('基础 1/n', all.filter((e) => e.type === 'base').sort((a, b) => a.den - b.den)) +
        tableCard('高频衍生分数', all.filter((e) => e.type === 'derived').sort((a, b) => a.den - b.den || a.num - b.num));
    } else {
      const sorted = all.slice().sort((a, b) => a.den - b.den || a.num - b.num);
      html = tableCard('按分母分组', sorted);
    }
    $('#table-container').innerHTML = html;
  }

  chipGroup('[data-sort]', renderTable);
  renderTable('den');

  // ---------- 页头统计 ----------
  $('#stat-total').textContent = D.entries.length;
  $('#stat-base').textContent = D.entries.filter((e) => e.type === 'base').length;
  $('#stat-derived').textContent = D.entries.filter((e) => e.type === 'derived').length;

  // ---------- 普通练习 ----------
  const quiz = {
    direction: 'p2f',
    difficulty: 'easy',
    question: null,
    answered: false,
    total: 0,
    right: 0,
    streak: 0,
  };

  function quizPool() {
    return D.poolByDifficulty(quiz.difficulty);
  }

  function renderQuizMeta() {
    $('#quiz-streak').textContent = '连对 ' + quiz.streak;
    const rate = quiz.total === 0 ? '--' : Math.round((quiz.right / quiz.total) * 100) + '%';
    $('#quiz-score').textContent = '已答 ' + quiz.total + ' · 正确率 ' + rate;
  }

  function newQuizQuestion() {
    quiz.question = makeQuestion(quizPool(), quiz.direction);
    quiz.answered = false;
    $('#quiz-feedback').textContent = '';
    $('#quiz-feedback').className = 'feedback';
    $('#quiz-question').innerHTML = promptOf(quiz.question);
    const box = $('#quiz-options');
    box.innerHTML = '';
    quiz.question.options.forEach((e, i) => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.textContent = optionText(quiz.question, e);
      btn.addEventListener('click', () => answerQuiz(i, btn));
      box.appendChild(btn);
    });
  }

  function answerQuiz(idx, btn) {
    if (quiz.answered) return;
    quiz.answered = true;
    const q = quiz.question;
    const correct = idx === q.answerIdx;
    quiz.total++;
    if (correct) { quiz.right++; quiz.streak++; } else { quiz.streak = 0; }
    renderQuizMeta();
    const buttons = $$('#quiz-options .option');
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === q.answerIdx) b.classList.add('correct');
      else if (i === idx) b.classList.add('wrong');
    });
    const fb = $('#quiz-feedback');
    fb.textContent = (correct ? '✓ 回答正确  ' : '✗ 回答错误，正确答案：' + optionText(q, q.target) + '  ') + '｜' + relationText(q.target);
    fb.className = 'feedback ' + (correct ? 'ok' : 'err');
  }

  $('#quiz-next').addEventListener('click', newQuizQuestion);

  chipGroup('[data-qdir]', (v) => { quiz.direction = v; newQuizQuestion(); });
  chipGroup('[data-qdiff]', (v) => { quiz.difficulty = v; newQuizQuestion(); });

  newQuizQuestion();
  renderQuizMeta();

  // ---------- 计时挑战 ----------
  const CHALLENGE_SIZE = 50;
  const ch = {
    questions: [],
    idx: 0,
    startTime: 0,
    timerId: 0,
    records: [],   // { q, chosenIdx }
    lock: false,
  };

  function buildChallengeQuestions() {
    const pool = D.poolByDifficulty('all');
    const out = [];
    let bag = [];
    while (out.length < CHALLENGE_SIZE) {
      if (bag.length === 0) bag = shuffle(pool);
      const target = bag.pop();
      const direction = Math.random() < 0.5 ? 'p2f' : 'f2p';
      // 以选中的 target 为中心出题，保证题目均匀覆盖题池
      const near = pool
        .filter((e) => e !== target)
        .sort((a, b) => Math.abs(a.value - target.value) - Math.abs(b.value - target.value))
        .slice(0, 10);
      const options = shuffle([target].concat(shuffle(near).slice(0, 3)));
      out.push({ target, direction, options, answerIdx: options.indexOf(target) });
    }
    return out;
  }

  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function challengeShow(which) {
    $('#challenge-intro').classList.toggle('hidden', which !== 'intro');
    $('#challenge-running').classList.toggle('hidden', which !== 'running');
    $('#challenge-result').classList.toggle('hidden', which !== 'result');
  }

  function challengeRenderQuestion() {
    const q = ch.questions[ch.idx];
    ch.lock = false;
    $('#challenge-progress').textContent = '第 ' + (ch.idx + 1) + ' / ' + CHALLENGE_SIZE + ' 题';
    $('#challenge-question').innerHTML = promptOf(q);
    $('#challenge-feedback').textContent = '';
    const box = $('#challenge-options');
    box.innerHTML = '';
    q.options.forEach((e, i) => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.textContent = optionText(q, e);
      btn.addEventListener('click', () => challengeAnswer(i));
      box.appendChild(btn);
    });
  }

  function challengeAnswer(idx) {
    if (ch.lock) return;
    ch.lock = true;
    const q = ch.questions[ch.idx];
    const correct = idx === q.answerIdx;
    ch.records.push({ q, chosenIdx: idx });
    const buttons = $$('#challenge-options .option');
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === q.answerIdx) b.classList.add('correct');
      else if (i === idx) b.classList.add('wrong');
    });
    const rightCount = ch.records.filter((r) => r.chosenIdx === r.q.answerIdx).length;
    $('#challenge-right').textContent = '对 ' + rightCount;
    $('#challenge-wrong').textContent = '错 ' + (ch.records.length - rightCount);
    const fb = $('#challenge-feedback');
    fb.textContent = correct ? '✓' : '✗ 正确：' + relationText(q.target);
    fb.className = 'feedback ' + (correct ? 'ok' : 'err');
    setTimeout(() => {
      ch.idx++;
      if (ch.idx >= CHALLENGE_SIZE) finishChallenge();
      else challengeRenderQuestion();
    }, correct ? 350 : 1100);
  }

  function startChallenge() {
    ch.questions = buildChallengeQuestions();
    ch.idx = 0;
    ch.records = [];
    ch.startTime = Date.now();
    clearInterval(ch.timerId);
    ch.timerId = setInterval(() => {
      $('#challenge-timer').textContent = fmtTime(Date.now() - ch.startTime);
    }, 1000);
    $('#challenge-timer').textContent = '00:00';
    $('#challenge-right').textContent = '对 0';
    $('#challenge-wrong').textContent = '错 0';
    challengeShow('running');
    challengeRenderQuestion();
  }

  function finishChallenge() {
    clearInterval(ch.timerId);
    const used = Date.now() - ch.startTime;
    const wrongs = ch.records.filter((r) => r.chosenIdx !== r.q.answerIdx);
    const right = ch.records.length - wrongs.length;
    $('#challenge-summary').innerHTML =
      '<div class="big">' + fmtTime(used) + '</div>' +
      '<div>正确率 ' + Math.round((right / CHALLENGE_SIZE) * 100) + '% （' + right + ' / ' + CHALLENGE_SIZE + '）</div>';
    const box = $('#challenge-wrongs');
    if (wrongs.length === 0) {
      box.innerHTML = '<p class="wrong-empty">全部答对，太棒了！</p>';
    } else {
      box.innerHTML = wrongs.map((r) => {
        const mine = optionText(r.q, r.q.options[r.chosenIdx]);
        const rightText = optionText(r.q, r.q.target);
        return '<div class="wrong-item"><span class="q">' + promptOf(r.q).replace('<small>', '<span style="font-weight:400;color:#6b7280;font-size:12px">').replace('</small>', '</span>') + '</span>' +
          '<span class="mine">我的选择：' + mine + '</span><span class="right">正确：' + rightText + '（' + relationText(r.q.target) + '）</span></div>';
      }).join('');
    }
    challengeShow('result');
  }

  $('#challenge-start').addEventListener('click', startChallenge);
  $('#challenge-restart').addEventListener('click', startChallenge);
  $('#challenge-abort').addEventListener('click', () => {
    clearInterval(ch.timerId);
    challengeShow('intro');
  });
})();
