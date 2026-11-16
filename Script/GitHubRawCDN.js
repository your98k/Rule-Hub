/**
 * GitHubRawCDN.js —— raw.githubusercontent.com 走镜像加速（Stash 原生脚本）
 *
 * 只替换主机名、保留原始路径，镜像站与 raw 的路径结构一致。
 * 想换镜像时改 MIRROR 一处即可。
 */
(function () {
  'use strict';
  var MIRROR = 'raw.gitmirror.com';
  var u = $request.url || '';
  if (u.indexOf('//raw.githubusercontent.com/') === -1) return $done({});
  $done({ url: u.replace('//raw.githubusercontent.com/', '//' + MIRROR + '/') });
})();
