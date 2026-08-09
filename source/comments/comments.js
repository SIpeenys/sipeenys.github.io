/* ============================================================
 * 匿名评论区组件（Supabase 后端，审核模式）
 * 使用方法：在页面 HTML 中放置
 *   <div class="sc-wrap" id="sc-comments"></div>
 * 然后引入本脚本。
 * ============================================================ */

(function () {
  'use strict';

  // ★ 配置区（替换成你自己的 Supabase 项目信息）
  var SC_CONFIG = {
    supabaseUrl: 'https://mxurcwwkezdpyjmjqkmi.supabase.co', // Project URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dXJjd3drZXpkcHlqbWpxa21pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODA5NTAsImV4cCI6MjEwMTg1Njk1MH0.cilOOipzuD9LasFQgDLf5-vEJVdSnMgHXLfTUu_NtpE', // anon public key
  };

  var API = SC_CONFIG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/comments';
  var PATH = decodeURIComponent(window.location.pathname);
  var MIN_INTERVAL = 15000; // 两次提交最小间隔（毫秒）

  var wrap = document.getElementById('sc-comments');
  if (!wrap) return;

  /* ---------- 工具 ---------- */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function headers(json) {
    var h = {
      apikey: SC_CONFIG.anonKey,
      Authorization: 'Bearer ' + SC_CONFIG.anonKey,
    };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  function fmtTime(iso) {
    try {
      var d = new Date(iso);
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
        ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    } catch (e) { return ''; }
  }

  /* ---------- 状态 ---------- */
  var comments = []; // 已审核评论
  var replyTo = null; // 当前回复的评论 id

  /* ---------- 渲染 ---------- */
  function buildComment(c) {
    var box = el('div', 'sc-cmt');

    var meta = el('div', 'sc-cmt-meta');
    var avatar = el('div', 'sc-avatar', (c.nick || '匿').charAt(0).toUpperCase());
    var who = el('div', 'sc-cmt-who');
    var nick = el('span', 'sc-cmt-nick', c.nick || '匿名');
    var time = el('span', 'sc-cmt-time', fmtTime(c.created_at));
    who.appendChild(nick);
    who.appendChild(time);
    meta.appendChild(avatar);
    meta.appendChild(who);

    var body = el('div', 'sc-cmt-body', c.content);

    var foot = el('div', 'sc-cmt-foot');
    var replyBtn = el('button', 'sc-reply-btn', '回复');
    replyBtn.type = 'button';
    replyBtn.addEventListener('click', function () {
      replyTo = c.id;
      form.replyHint.textContent = '正在回复：' + (c.nick || '匿名') + '（点此处取消）';
      form.replyHint.style.display = 'block';
      form.content.focus();
    });
    foot.appendChild(replyBtn);

    box.appendChild(meta);
    box.appendChild(body);
    box.appendChild(foot);

    return box;
  }

  function render() {
    var root = el('div', 'sc-list');
    var children = {};
    comments.forEach(function (c) {
      (children[c.parent_id || ''] = children[c.parent_id || ''] || []).push(c);
    });

    function walk(parentId) {
      (children[parentId] || []).forEach(function (c) {
        var holder = el('div', c.parent_id ? 'sc-cmt-reply' : 'sc-cmt-root');
        holder.appendChild(buildComment(c));
        root.appendChild(holder);
        walk(c.id);
      });
    }
    walk('');

    if (!comments.length) {
      var empty = el('div', 'sc-empty', '还没有评论，来抢沙发～');
      root.appendChild(empty);
    }

    list.replaceChild(root, list.firstChild);
  }

  /* ---------- 数据 ---------- */
  function load() {
    var url = API +
      '?select=id,path,nick,content,parent_id,created_at' +
      '&path=eq.' + encodeURIComponent(PATH) +
      '&status=eq.approved' +
      '&order=created_at.asc' +
      '&limit=500';

    fetch(url, { headers: headers() })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        comments = Array.isArray(data) ? data : [];
        render();
      })
      .catch(function () {
        list.appendChild(el('div', 'sc-empty', '评论加载失败，请稍后刷新重试'));
      });
  }

  function submit(e) {
    e.preventDefault();
    var nick = form.nick.value.trim();
    var mail = form.mail.value.trim();
    var content = form.content.value.trim();

    if (!nick) { alert('请填写昵称'); return; }
    if (nick.length > 50) { alert('昵称最长 50 个字符'); return; }
    if (!content) { alert('请填写评论内容'); return; }
    if (content.length > 2000) { alert('评论最长 2000 个字符'); return; }

    // 客户端限流
    var last = Number(localStorage.getItem('sc_last_submit') || 0);
    if (Date.now() - last < MIN_INTERVAL) {
      alert('提交太频繁啦，请稍等片刻再试');
      return;
    }

    var btn = form.btn;
    btn.disabled = true;
    btn.textContent = '提交中...';

    fetch(API, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({
        path: PATH,
        nick: nick,
        mail: mail || null,
        content: content,
        parent_id: replyTo,
        status: 'pending',
      }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        localStorage.setItem('sc_last_submit', String(Date.now()));
        form.nick.value = '';
        form.mail.value = '';
        form.content.value = '';
        clearReply();
        form.note.style.display = 'block';
        form.note.textContent = '✅ 已收到！评论需审核通过后显示。';
      })
      .catch(function () {
        form.note.style.display = 'block';
        form.note.textContent = '❌ 提交失败，请稍后重试。';
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = '提交';
      });
  }

  function clearReply() {
    replyTo = null;
    form.replyHint.style.display = 'none';
  }

  /* ---------- 界面 ---------- */
  var title = el('h3', 'sc-title', '评论区');
  var list = el('div', 'sc-list');

  var form = document.createElement('form');
  form.className = 'sc-form';
  form.autocomplete = 'off';

  form.replyHint = el('div', 'sc-reply-hint');
  form.replyHint.style.display = 'none';
  form.replyHint.addEventListener('click', clearReply);

  var row = el('div', 'sc-form-row');
  var nickInput = el('input');
  nickInput.name = 'nick';
  nickInput.placeholder = '昵称 *';
  nickInput.maxLength = 50;
  var mailInput = el('input');
  mailInput.name = 'mail';
  mailInput.type = 'email';
  mailInput.placeholder = '邮箱（可选）';
  mailInput.maxLength = 100;
  row.appendChild(nickInput);
  row.appendChild(mailInput);

  var contentArea = el('textarea');
  contentArea.name = 'content';
  contentArea.placeholder = '写下你的评论…';
  contentArea.maxLength = 2000;
  contentArea.rows = 4;

  var btn = el('button', 'sc-submit', '提交');
  btn.type = 'submit';
  btn.name = 'btn';
  form.btn = btn;

  form.note = el('div', 'sc-note');

  form.appendChild(form.replyHint);
  form.appendChild(row);
  form.appendChild(contentArea);
  form.appendChild(btn);
  form.appendChild(form.note);
  form.addEventListener('submit', submit);

  wrap.appendChild(title);
  wrap.appendChild(list);
  wrap.appendChild(form);

  form.nick = nickInput;
  form.mail = mailInput;
  form.content = contentArea;

  load();
})();

