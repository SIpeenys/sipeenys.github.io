/* ============================================================
 * 博客音乐播放器（悬浮小播放器，支持歌单）
 * 用法：
 *   1) 主页歌单：改下面 MUSIC_CONFIG.home.list（enable: true 开 / false 关）
 *      每首歌一个对象 { url, title, author }，url 写本地 /music/xxx.mp3 或外链
 *   2) 文章音乐：front-matter 加（不设置 = 该文章无音乐）：
 *        music: /music/xxx.mp3                                     # 只要 URL
 *        music: { url: /music/xxx.mp3, title: 歌名, author: 歌手 }   # 带标题作者
 *      文章只支持单曲，没有歌单切换。
 *   3) 本地音乐文件放 source/music/ 文件夹，路径写 /music/xxx.mp3
 * ============================================================ */

(function () {
  'use strict';

  // ★ 配置区：主页歌单
  var MUSIC_CONFIG = {
    home: {
      enable: true, // false = 主页不显示播放器
      list: [
        { url: '/music/knight-of-king.mp3', title: '騎士王の誇り（骑士王的荣耀）', author: '川井宪次' },
        { url: "/music/niaozhishi.mp3", title: 'Sample Song 1', author: 'SoundHelix' },
      ],
    },
  };

  // ---------- 确定当前页面的歌单 ----------
  var playlist = [];

  var isHome = window.location.pathname === '/' || window.location.pathname === '/index.html';

  if (isHome) {
    // 主页：读配置（list 歌单；兼容旧格式 url 单曲）
    if (MUSIC_CONFIG.home.enable) {
      if (Array.isArray(MUSIC_CONFIG.home.list)) {
        playlist = MUSIC_CONFIG.home.list.slice();
      } else if (MUSIC_CONFIG.home.url) {
        playlist = [{ url: MUSIC_CONFIG.home.url, title: MUSIC_CONFIG.home.title, author: MUSIC_CONFIG.home.author }];
      }
    }
  } else {
    // 文章页：读 #post-music（单曲）
    var postMusic = document.getElementById('post-music');
    if (postMusic && postMusic.getAttribute('data-url')) {
      playlist = [{
        url: postMusic.getAttribute('data-url'),
        title: postMusic.getAttribute('data-title') || '',
        author: postMusic.getAttribute('data-author') || '',
      }];
    }
  }

  playlist = playlist.filter(function (s) { return s && s.url; });
  if (!playlist.length) return;

  // 标题兜底：没给标题就用文件名
  function titleFromUrl(url) {
    try {
      var name = decodeURIComponent(url.split('/').pop().split('?')[0]);
      return name.replace(/\.[a-z0-9]+$/i, '');
    } catch (e) {
      return '';
    }
  }

  playlist.forEach(function (s) {
    s.title = s.title || titleFromUrl(s.url) || '未知歌曲';
    s.author = s.author || '';
  });

  var isPlaylist = playlist.length > 1;
  var currentIndex = 0;

  // ---------- 工具 ----------
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    sec = Math.floor(sec);
    return Math.floor(sec / 60) + ':' + (sec % 60 < 10 ? '0' : '') + (sec % 60);
  }

  // ---------- 播放器 UI ----------
  // 悬浮按钮（左下角）
  var fab = el('div', 'music-fab');
  fab.title = '音乐';
  fab.innerHTML = '<i class="fas fa-music"></i><span class="music-eq"><i></i><i></i><i></i></span>';

  // 展开面板
  var panel = el('div', 'music-panel');

  var info = el('div', 'music-info');
  var titleEl = el('span', 'music-title', '');
  var authorEl = el('span', 'music-author', '');
  info.appendChild(titleEl);
  info.appendChild(authorEl);
  panel.appendChild(info);

  var progress = el('div', 'music-progress');
  var curEl = el('span', 'music-time', '0:00');
  var bar = el('div', 'music-bar');
  var fill = el('div', 'music-bar-fill');
  bar.appendChild(fill);
  var durEl = el('span', 'music-time', '0:00');
  progress.appendChild(curEl);
  progress.appendChild(bar);
  progress.appendChild(durEl);
  panel.appendChild(progress);

  var btns = el('div', 'music-btns');

  var prevBtn = el('button', 'music-prev');
  prevBtn.type = 'button';
  prevBtn.title = '上一首';
  prevBtn.innerHTML = '<i class="fas fa-step-backward"></i>';

  var playBtn = el('button', 'music-play');
  playBtn.type = 'button';
  playBtn.title = '播放/暂停';
  playBtn.innerHTML = '<i class="fas fa-play"></i>';

  var nextBtn = el('button', 'music-next');
  nextBtn.type = 'button';
  nextBtn.title = '下一首';
  nextBtn.innerHTML = '<i class="fas fa-step-forward"></i>';

  var listBtn = el('button', 'music-list-btn');
  listBtn.type = 'button';
  listBtn.title = '歌单';
  listBtn.innerHTML = '<i class="fas fa-list-ul"></i>';

  var closeBtn = el('button', 'music-close');
  closeBtn.type = 'button';
  closeBtn.title = '收起';
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';

  if (isPlaylist) {
    btns.appendChild(prevBtn);
  }
  btns.appendChild(playBtn);
  if (isPlaylist) {
    btns.appendChild(nextBtn);
    btns.appendChild(listBtn);
  }
  btns.appendChild(closeBtn);
  panel.appendChild(btns);

  // 歌单列表（仅多曲时显示）
  var listBox = el('div', 'music-listbox');
  var listItems = [];
  if (isPlaylist) {
    playlist.forEach(function (song, i) {
      var item = el('div', 'music-list-item');
      var idx = el('span', 'music-list-idx', String(i + 1));
      var name = el('span', 'music-list-name', song.title + (song.author ? ' - ' + song.author : ''));
      var eq = el('span', 'music-list-eq');
      eq.innerHTML = '<i></i><i></i><i></i>';
      item.appendChild(idx);
      item.appendChild(name);
      item.appendChild(eq);
      item.addEventListener('click', function () {
        var wasPlaying = !audio.paused;
        loadSong(i, wasPlaying);
      });
      listItems.push(item);
      listBox.appendChild(item);
    });
    panel.appendChild(listBox);
  }

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  // ---------- 音频 ----------
  var audio = new Audio();
  audio.preload = 'metadata';
  var playing = false;

  audio.addEventListener('loadedmetadata', function () {
    durEl.textContent = fmtTime(audio.duration);
  });

  audio.addEventListener('timeupdate', function () {
    curEl.textContent = fmtTime(audio.currentTime);
    if (audio.duration) {
      fill.style.width = (audio.currentTime / audio.duration * 100) + '%';
    }
  });

  audio.addEventListener('ended', function () {
    if (isPlaylist) {
      // 自动切下一首（播完循环）
      loadSong(currentIndex + 1, true);
    } else {
      playing = false;
      updatePlayBtn();
      fab.classList.remove('playing');
      curEl.textContent = '0:00';
      fill.style.width = '0%';
    }
  });

  audio.addEventListener('error', function () {
    playBtn.classList.add('disabled');
    titleEl.textContent = '音频加载失败（歌曲可能已失效）';
    authorEl.textContent = '';
    if (isPlaylist && currentIndex + 1 < playlist.length) {
      // 失败自动跳到下一首
      loadSong(currentIndex + 1, playing);
    }
  });

  function updatePlayBtn() {
    playBtn.classList.remove('disabled');
    playBtn.innerHTML = playing
      ? '<i class="fas fa-pause"></i>'
      : '<i class="fas fa-play"></i>';
  }

  function togglePlay() {
    if (playBtn.classList.contains('disabled')) return;
    if (audio.paused) {
      audio.play().catch(function () {});
      playing = true;
    } else {
      audio.pause();
      playing = false;
    }
    updatePlayBtn();
    fab.classList.toggle('playing', playing);
    updateListState();
  }

  function loadSong(i, autoplay) {
    if (i < 0) i = playlist.length - 1;
    if (i >= playlist.length) i = 0;
    currentIndex = i;
    var song = playlist[i];
    audio.src = song.url;
    titleEl.textContent = song.title;
    authorEl.textContent = song.author;
    curEl.textContent = '0:00';
    durEl.textContent = '0:00';
    fill.style.width = '0%';
    updatePlayBtn();
    updateListState();
    if (autoplay) {
      audio.play().catch(function () {});
      playing = true;
      fab.classList.add('playing');
      updatePlayBtn();
      updateListState();
    } else {
      audio.pause();
      playing = false;
      fab.classList.remove('playing');
    }
  }

  function updateListState() {
    if (!isPlaylist) return;
    listItems.forEach(function (item, i) {
      item.classList.toggle('active', i === currentIndex);
      item.classList.toggle('playing', i === currentIndex && playing);
    });
  }

  function seek(e) {
    if (!audio.duration) return;
    var rect = bar.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    ratio = Math.min(1, Math.max(0, ratio));
    audio.currentTime = ratio * audio.duration;
  }

  // ---------- 交互 ----------
  // 悬浮按钮：点击播放/暂停，播放时展开面板
  fab.addEventListener('click', function () {
    togglePlay();
    if (playing) panel.classList.add('open');
  });

  playBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    togglePlay();
  });

  prevBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var wasPlaying = !audio.paused;
    loadSong(currentIndex - 1, wasPlaying);
  });

  nextBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var wasPlaying = !audio.paused;
    loadSong(currentIndex + 1, wasPlaying);
  });

  listBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    listBox.classList.toggle('open');
  });

  bar.addEventListener('click', function (e) {
    e.stopPropagation();
    seek(e);
  });

  closeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.classList.remove('open');
  });

  // ---------- 启动 ----------
  loadSong(0, false);
})();