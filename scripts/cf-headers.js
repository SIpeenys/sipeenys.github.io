// 生成 Cloudflare Pages 的 _headers（控制缓存策略）
// 页面(HTML)不缓存→更新即时生效；静态资源缓存1天；音乐缓存7天
'use strict';

var content = [
  '/*',
  '  Cache-Control: no-cache',
  '',
  '/css/*',
  '  Cache-Control: public, max-age=86400',
  '',
  '/js/*',
  '  Cache-Control: public, max-age=86400',
  '',
  '/img/*',
  '  Cache-Control: public, max-age=86400',
  '',
  '/images/*',
  '  Cache-Control: public, max-age=86400',
  '',
  '/music/*',
  '  Cache-Control: public, max-age=604800',
  '',
].join('\n');

hexo.extend.filter.register('after_generate', function () {
  hexo.route.set('_headers', content);
});