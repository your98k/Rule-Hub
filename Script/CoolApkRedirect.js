/**
 * CoolApkRedirect.js —— 酷安中间跳转链接直连目标（Stash 原生脚本）
 *
 * 酷安的 /link 页会把目标塞在查询参数里，这里把它取出来直接改写请求，
 * 省掉一次中转页。参数名不固定，按「查询串里第一个外部 http 链接」兜底。
 */
(function () {
  'use strict';
  var u = $request.url || '';
  if (u.indexOf('coolapk.com/link') === -1) return $done({});

  var q = u.slice(u.indexOf('?') + 1);
  var decoded = q;
  try { decoded = decodeURIComponent(q); } catch (e) {}

  var m = decoded.match(/https?:\/\/[^\s&"'<>]+/i);
  if (m && m[0].indexOf('coolapk.com') === -1) return $done({ url: m[0] });
  $done({});
})();
