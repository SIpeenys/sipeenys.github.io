/* ============================================================
 * 评论管理后台（Supabase Auth 登录 + 一键审核/删除）
 * 前置（需在 Supabase 后台做一次）：
 *   1) Authentication → Users → Add user 创建管理员账号（邮箱+密码）
 *   2) SQL Editor 执行 supabase-admin-policies.sql（把邮箱换成你的）
 *   3) 推荐：Authentication → Settings 关闭 "Allow new users to sign up"
 * 然后访问 /admin/ 用邮箱密码登录。
 * ============================================================ */

(function () {
  'use strict';

  // ★ 配置区（与 source/comments/comments.js 相同）
  var SC_CONFIG = {
    supabaseUrl: 'https://mxurcwwkezdpyjmjqkmi.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dXJjd3drZXpkcHlqbWpxa21pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODA5NTAsImV4cCI6MjEwMTg1Njk1MH0.cilOOipzuD9LasFQgDLf5-vEJVdSnMgHXLfTUu_NtpE',
  };

  // 管理员邮箱（与 Supabase 后台创建的一致；留空 = 跳过前端邮箱校验，仍由 RLS 兜底）
  var ADMIN_EMAIL = '';

  var API = SC_CONFIG.supabaseUrl.replace(/\/$/, '');
  var AUTH_URL = API + '/auth/v1';
  var COMMENTS_URL = API + '/rest/v1/comments';
  var SESSION_KEY = 'sc_admin_session';

  var app = document.getElementById('admin-app');
  if (!app) return;

  var currentFilter = 'all';
  var allComments = [];

  /* ---------- 工具 ---------- */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function fmtTime(iso) {
    try {
      var d = new Date(iso);
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    } catch (e) { return ''; }
  }

  /* ---------- 会话 ---------- */
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
  }

  function setSession(s) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function authHeaders(json) {
    var s = getSession();
    var h = {
      apikey: SC_CONFIG.anonKey,
      Authorization: 'Bearer ' + (s ? s.access_token : ''),
    };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  function authFetch(url, opts) {
    return fetch(url, opts).then(function (r) {
      if (r.status === 401) {
        clearSession();
        renderLogin('登录已过期，请重新登录');
        throw new Error('unauthorized');
      }
      if (!r.ok) throw new Error('请求失败 HTTP ' + r.status);
      return r;
    });
  }

  /* ---------- 认证 ---------- */
  function login(email, password) {
    return fetch(AUTH_URL + '/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: SC_CONFIG.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.access_token) {
        setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token || '',
          expires_at: Date.now() + (data.expires_in || 3600) * 1000,
          email: (data.user && data.user.email) || '',
        });
        return true;
      }
      throw new Error(data.error_description || data.msg || '登录失败，请检查邮箱和密码');
    });
  }

  function refreshSession(s) {
    return fetch(AUTH_URL + '/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: SC_CONFIG.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.access_token) {
        setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token || s.refresh_token,
          expires_at: Date.now() + (data.expires_in || 3600) * 1000,
          email: (data.user && data.user.email) || s.email,
        });
        return true;
      }
      clearSession();
      return false;
    }).catch(function () { clearSession(); return false; });
  }

  function doLogout() {
    var s = getSession();
    if (s && s.access_token) {
      fetch(AUTH_URL + '/logout', { method: 'POST', headers: authHeaders() }).catch(function () {});
    }
    clearSession();
    renderLogin();
  }

  /* ---------- 评论操作 ---------- */
  function loadComments() {
    return authFetch(COMMENTS_URL + '?select=id,path,nick,mail,content,parent_id,status,created_at&order=created_at.desc', {
      headers: authHeaders(),
    }).then(function (r) { return r.json(); }).then(function (data) {
      allComments = Array.isArray(data) ? data : [];
      renderList();
    });
  }

  function setStatus(id, status) {
    return authFetch(COMMENTS_URL + '?id=eq.' + id, {
      method: 'PATCH',
      headers: authHeaders(true),
      body: JSON.stringify({ status: status }),
    }).then(function () {
      allComments.forEach(function (c) { if (c.id === id) c.status = status; });
      renderList();
    }).catch(function (e) { if (e.message !== 'unauthorized') alert(e.message); });
  }

  function delComment(id) {
    if (!confirm('确定删除这条评论吗？此操作不可恢复。')) return;
    return authFetch(COMMENTS_URL + '?id=eq.' + id, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(function () {
      allComments = allComments.filter(function (c) { return c.id !== id; });
      renderList();
    }).catch(function (e) { if (e.message !== 'unauthorized') alert(e.message); });
  }

  /* ---------- UI：登录页 ---------- */
  function renderLogin(errMsg) {
    app.innerHTML = '';

    var card = el('div', 'adm-login');
    card.appendChild(el('h2', null, '评论管理后台'));

    var emailInput = el('input');
    emailInput.type = 'email';
    emailInput.placeholder = '管理员邮箱';
    emailInput.autocomplete = 'username';
    card.appendChild(emailInput);

    var pwdInput = el('input');
    pwdInput.type = 'password';
    pwdInput.placeholder = '密码';
    pwdInput.autocomplete = 'current-password';
    card.appendChild(pwdInput);

    var btn = el('button', 'adm-btn', '登 录');
    btn.type = 'button';
    card.appendChild(btn);

    var note = el('div', 'adm-note', '还没有管理员账号？请在 Supabase 后台 Authentication → Users 里创建，并在 SQL Editor 执行 supabase-admin-policies.sql。');
    card.appendChild(note);

    if (errMsg) card.appendChild(el('div', 'adm-error', errMsg));

    app.appendChild(card);

    var submit = function () {
      var email = emailInput.value.trim();
      var pwd = pwdInput.value;
      if (!email || !pwd) { showLoginError(card, '请填写邮箱和密码'); return; }
      btn.disabled = true;
      btn.textContent = '登录中...';
      login(email, pwd).then(function () {
        checkAdminAndLoad();
      }).catch(function (e) {
        btn.disabled = false;
        btn.textContent = '登 录';
        showLoginError(card, e.message);
      });
    };

    btn.addEventListener('click', submit);
    pwdInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  }

  function showLoginError(card, msg) {
    var old = card.querySelector('.adm-error');
    if (old) old.remove();
    card.appendChild(el('div', 'adm-error', msg));
  }

  /* ---------- UI：管理页 ---------- */
  function checkAdminAndLoad() {
    var s = getSession();
    if (ADMIN_EMAIL && s.email && s.email !== ADMIN_EMAIL) {
      clearSession();
      renderLogin('该账号无权访问管理后台');
      return;
    }
    renderAdmin();
  }

  function renderAdmin() {
    app.innerHTML = '';

    var bar = el('div', 'adm-bar');
    bar.appendChild(el('h2', null, '评论管理'));

    var tabs = el('div', 'adm-tabs');
    [['all', '全部'], ['pending', '待审核'], ['approved', '已通过'], ['rejected', '已拒绝']].forEach(function (t) {
      var b = el('button', 'adm-tab' + (currentFilter === t[0] ? ' active' : ''), t[1]);
      b.type = 'button';
      b.addEventListener('click', function () { currentFilter = t[0]; renderList(); });
      tabs.appendChild(b);
    });
    bar.appendChild(tabs);

    var refreshBtn = el('button', 'adm-refresh', '刷新');
    refreshBtn.type = 'button';
    refreshBtn.addEventListener('click', function () { refreshBtn.textContent = '加载中...'; loadComments().catch(function () {}); });
    bar.appendChild(refreshBtn);

    var logoutBtn = el('button', 'adm-logout', '退出登录');
    logoutBtn.type = 'button';
    logoutBtn.addEventListener('click', doLogout);
    bar.appendChild(logoutBtn);

    var list = el('div', 'adm-list');

    app.appendChild(bar);
    app.appendChild(list);

    loadComments().catch(function () {});
  }

  function renderList() {
    var list = app.querySelector('.adm-list');
    if (!list) return;
    list.innerHTML = '';

    var items = allComments.filter(function (c) {
      return currentFilter === 'all' || c.status === currentFilter;
    });

    if (!items.length) {
      list.appendChild(el('div', 'adm-empty', currentFilter === 'pending' ? '没有待审核的留言 🎉' : '暂无评论'));
      return;
    }

    items.forEach(function (c) {
      list.appendChild(buildCommentCard(c));
    });
  }

  function buildCommentCard(c) {
    var card = el('div', 'adm-cmt');

    var head = el('div', 'adm-cmt-head');
    head.appendChild(el('span', 'adm-nick', c.nick || '匿名'));
    head.appendChild(el('span', 'adm-time', fmtTime(c.created_at)));
    var status = el('span', 'adm-status ' + (c.status || 'pending'), statusLabel(c.status));
    head.appendChild(status);
    card.appendChild(head);

    card.appendChild(el('div', 'adm-path', (c.parent_id ? '[回复] ' : '') + (c.path || '')));
    card.appendChild(el('div', 'adm-body', c.content || ''));

    var actions = el('div', 'adm-actions');
    if (c.status !== 'approved') {
      var okBtn = el('button', 'adm-ok', '通过');
      okBtn.type = 'button';
      okBtn.addEventListener('click', function () { setStatus(c.id, 'approved'); });
      actions.appendChild(okBtn);
    }
    if (c.status !== 'rejected') {
      var rejBtn = el('button', 'adm-rej', '拒绝');
      rejBtn.type = 'button';
      rejBtn.addEventListener('click', function () { setStatus(c.id, 'rejected'); });
      actions.appendChild(rejBtn);
    }
    var delBtn = el('button', 'adm-del', '删除');
    delBtn.type = 'button';
    delBtn.addEventListener('click', function () { delComment(c.id); });
    actions.appendChild(delBtn);
    card.appendChild(actions);

    return card;
  }

  function statusLabel(s) {
    return s === 'approved' ? '已通过' : s === 'rejected' ? '已拒绝' : '待审核';
  }

  /* ---------- 启动 ---------- */
  function init() {
    var s = getSession();
    if (!s || !s.access_token) {
      renderLogin();
      return;
    }
    if (Date.now() >= s.expires_at - 60000) {
      refreshSession(s).then(function (ok) {
        if (ok) checkAdminAndLoad(); else renderLogin();
      });
    } else {
      checkAdminAndLoad();
    }
  }

  init();
})();