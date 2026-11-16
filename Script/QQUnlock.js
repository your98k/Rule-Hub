/**
 * QQUnlock.js —— QQ 内链接解锁（Stash 原生脚本）
 *
 * 原 Loon 插件用 urlMatch 捕获组重建目标地址后 307 跳转；
 * Stash 的 url-rewrite 不支持捕获组回填，这里改为请求阶段直接把请求
 * 透明改写到真实目标地址，效果等价（不经过 QQ 的中转提示页）。
 *
 * 匹配的入口页会把真实地址放在 pfurl / url 查询参数里，
 * 部分链接经过一次额外编码，需要多解码一次。
 */
(function () {
  'use strict';

  function decodeOnce(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  function pickTarget(u) {
    var m = u.match(/[?&](?:pfurl|url)=([^&#]+)/i);
    if (!m) return null;
    var v = decodeOnce(m[1]);
    // 少数入口把 & 与 = 也编码了，再解一次
    if (v.indexOf('%3') !== -1 || v.indexOf('%2') !== -1) {
      v = decodeOnce(v);
    }
    if (!/^https?:\/\//i.test(v)) return null;
    return v;
  }

  var target = pickTarget($request.url || '');
  if (target) {
    $done({ url: target });
  } else {
    $done({});
  }
})();
