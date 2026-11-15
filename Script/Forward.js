/**
 * Forward.js —— 订阅接口转发（Stash 原生脚本）
 *
 * 原 Loon 插件用 url.replace 把 fluxapi.vvebo.vip 的订阅接口
 * 改写为 mock.forward1.workers.dev/forward/...；Stash 的 url-rewrite
 * 目标地址是静态的，会丢掉原始查询串，故用脚本按前缀替换，保留 query。
 */
(function () {
  'use strict';
  var SRC = 'https://fluxapi.vvebo.vip/v1/';
  var DST = 'https://mock.forward1.workers.dev/forward/v1/';
  var u = $request.url || '';
  if (u.indexOf(SRC) === 0) {
    $done({ url: DST + u.slice(SRC.length) });
  } else {
    $done({});
  }
})();
