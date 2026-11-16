/**
 * BiliIntlRedirect.js —— 哔哩哔哩国际版区域参数改写（Stash 原生脚本）
 *
 * 把请求里的 s_locale / sim_code 换成目标区域值，替代需要捕获组回填的
 * 重定向写法；Stash 的 url-rewrite 无法引用捕获组，故用请求改写实现。
 */
(function () {
  'use strict';
  var u = $request.url || '';
  if (!/^(https?:\/\/(?:app|passport)\.biliintl\.com)\//i.test(u)) {
    return $done({});
  }
  var out = u
    .replace(/([?&])s_locale=[^&]*/gi, '$1s_locale=zh-Hans_PH')
    .replace(/([?&])sim_code=[^&]*/gi, '$1sim_code=51503');
  $done(out === u ? {} : { url: out });
})();
