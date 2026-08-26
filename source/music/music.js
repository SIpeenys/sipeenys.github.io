/* ============================================================
 * 博客音乐播放器（悬浮小播放器）
 * 用法：
 *   1) 主页音乐：改下面的 MUSIC_CONFIG.home（enable: true 开 / false 关）
 *   2) 文章音乐：在文章的 front-matter 里加（不设置 = 该文章无音乐）：
 *        music: /music/xxx.mp3                                     # 只要 URL
 *        music: { url: /music/xxx.mp3, title: 歌名, author: 歌手 }   # 带标题作者
 *   3) 音乐文件放在 source/music/ 文件夹，路径写 /music/xxx.mp3
 * ============================================================ */

(function () {
  'use strict';

  // ★ 配置区：主页音乐
  var MUSIC_CONFIG = {
    home: {
      enable: true, // false = 主页不显示播放器
      url: '/music/SoundHelix-Song-1.mp3', // 本地文件：放 source/music/ 里，写 /music/文件名
      title: 'Sample Song 1',
      author: 'SoundHelix',
    },
  };

  // ---------- 确定当前页面的音乐 ----------
  var music = null;

  var isHome = window.location.pathname === '/' || window.location.pathname === '/index.html';

  if (isHome) {
    // 主页：读配置
    if (MUSIC_CONFIG.home.enable && MUSIC_CONFIG.home.url) {
      music = MUSIC_CONFIG.home;
    }
  } else {
    // 文章页：读 #post-music（由模板从 front-matter 渲染）
    var postMusic = document.getElementById('post-music');
    if (postMusic && postMusic.getAttribute('data-url')) {
      music = {
        url: postMusic.getAttribute('data-url'),
        title: postMusic.getAttribute('data-title') || '',
        author: postMusic.getAttribute('data-author') || '',
      };
    }
  }

  if (!music) return;

  // 标题兜底：没给标题就用文件名
  function titleFromUrl(url) {
    try {
      var name = decodeURIComponent(url.split('/').pop().split('?')[0]);
      return name.replace(/\.[a-z0-9]+$/i, '');
    } catch (e) {
      return '';
    }
  }

  music.title = music.title || titleFromUrl(music.url) || '未知歌曲';

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
  var titleEl = el('span', 'music-title', music.title);
  var authorEl = el('span', 'music-author', music.author);
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
  var playBtn = el('button', 'music-play');
  playBtn.type = 'button';
  playBtn.innerHTML = '<i class="fas fa-play"></i>';
  var closeBtn = el('button', 'music-close');
  closeBtn.type = 'button';
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  btns.appendChild(playBtn);
  btns.appendChild(closeBtn);
  panel.appendChild(btns);

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  // ---------- 音频 ----------
  var audio = new Audio(music.url);
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
    playing = false;
    updatePlayBtn();
    fab.classList.remove('playing');
  });

  audio.addEventListener('error', function () {
    playBtn.classList.add('disabled');
    playBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    titleEl.textContent = '音频加载失败';
  });

  function updatePlayBtn() {
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

  // 面板里的播放/暂停
  playBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    togglePlay();
  });

  // 进度条跳转
  bar.addEventListener('click', function (e) {
    e.stopPropagation();
    seek(e);
  });

  // 关闭面板（音乐继续播放）
  closeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.classList.remove('open');
  });
})();