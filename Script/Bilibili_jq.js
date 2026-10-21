// bilibili.jq.js — 对应 Surge [Body Rewrite] http-response-jq（Stash response 脚本）
// 不用顶层 return，逻辑包进 IIFE。
(function () {
  const url = $request.url;
  let data;
  try {
    data = JSON.parse($response.body);
  } catch (e) {
    $done({});
    return;
  }
  const finish = function () { $done({ body: JSON.stringify(data) }); };

  // tracker conf → 强制走自建 wss，屏蔽 P2P 上传
  if (/^https:\/\/api\.live\.bilibili\.com\/xlive\/open-interface\/v2\/tracker\/conf\?/.test(url)) {
    if (data.data) data.data.domains = ['wss://tracker.chat.bilibili.com'];
    return finish();
  }
  // pd-proxy tracker → 指向 stun，屏蔽 P2P 上传
  if (/^https:\/\/api\.bilibili\.com\/x\/pd-proxy\/tracker\?/.test(url)) {
    if (Array.isArray(data.data)) {
      data.data.forEach(function (row) {
        if (Array.isArray(row)) row.forEach(function (_, j) { row[j] = 'stun.chat.bilibili.com:3478'; });
      });
    }
    return finish();
  }
  // 番剧详情 → 删除 payment 字段
  if (/^https:\/\/api\.bilibili\.com\/pgc\/view\/v2\/app\/season\?/.test(url)) {
    if (data.data) delete data.data.payment;
    return finish();
  }
  // 番剧频道页 → 过滤 TIP 提示模块与黑板上 banner
  if (/^https:\/\/api\.bilibili\.com\/pgc\/page\/channel\?/.test(url)) {
    if (data.data && Array.isArray(data.data.modules)) {
      data.data.modules = data.data.modules
        .filter(function (m) { return m.type !== 'TIP'; })
        .map(function (m) {
          if (m.type === 'BANNER' && m.module_data && Array.isArray(m.module_data.items)) {
            m.module_data.items = m.module_data.items.filter(function (it) {
              return !(it.url && it.url.startsWith('https://www.bilibili.com/blackboard/era/'));
            });
          }
          return m;
        });
    }
    return finish();
  }
  // 我的页 → 兜底删除新版客户端漏网的服务入口（哔哩万象 / NFT 等）
  if (/^https:\/\/app\.bilibili\.com\/x\/v2\/account\/mine(\/ipad)?\?/.test(url)) {
    const EXCLUDE = /哔哩万象|Biliverse|我的\s?NFT|数字藏品/;
    const walk = function (o) {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o && typeof o === 'object') {
        for (const k of Object.keys(o)) {
          const v = o[k];
          if (Array.isArray(v)) {
            const filtered = v.filter(function (it) { return !(it && typeof it === 'object' && typeof it.title === 'string' && EXCLUDE.test(it.title)); });
            if (filtered.length !== v.length) o[k] = filtered;
            else v.forEach(walk);
          } else if (v && typeof v === 'object') {
            walk(v);
          }
        }
      }
    };
    walk(data);
    return finish();
  }
  // 未匹配：放行
  $done({});
})();
