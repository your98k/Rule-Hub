// bilibili.mock.js — 对应 Surge [Map Local]（Stash request 脚本）
// 注意：不用顶层 return（部分引擎按顶层作用域执行会 SyntaxError），
// 逻辑包进 IIFE，用 finished 标志保证 $done 恰好调用一次。
let finished = false;
(function () {
  const url = $request.url;

  // grpc 二进制 mock（青少年模式 / 搜索默认词 / TF 提示）
  const grpcMock = [
    ['/bilibili\\.app\\.interface\\.v1\\.Teenagers/ModeStatus$', 'AAAAABMKEQgCEgl0ZWVuYWdlcnMgAioA'],
    ['/bilibili\\.app\\.interface\\.v1\\.Search/DefaultWords$', 'AAAAACEaHeaQnOe0ouinhumikeOAgeeVquWJp+aIlnVw5Li7KAE='],
    ['/bilibili\\.app\\.(?:view\\.v1\\.View/TFInfo|viewunite\\.v1\\.View/(?:PlayPause|ViewEndPage))$', 'AAAAAAA='],
  ];
  for (let i = 0; i < grpcMock.length; i++) {
    if (new RegExp(grpcMock[i][0]).test(url)) {
      const bin = atob(grpcMock[i][1]);
      const bytes = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      $done({
        response: {
          status: 200,
          headers: { 'content-type': 'application/grpc', 'grpc-status': '0' },
          bodyBytes: bytes,
        },
      });
      finished = true;
      return;
    }
  }

  const jsonResp = function (obj) {
    return { response: { status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(obj) } };
  };

  // 开屏广告
  if (/^https:\/\/app\.bilibili\.com\/x\/v2\/splash\/list\?/.test(url)) {
    $done(jsonResp({
      code: 0, message: 'OK', ttl: 1,
      data: { max_time: 0, min_interval: 31536000, pull_interval: 31536000, keep_ids: [], show: [], list: [{}], splash_request_id: '' },
    }));
    finished = true;
    return;
  }
  // 活动横幅 / 搜索广告 / VIP 广告素材
  if (/^https:\/\/ap[ip]\.bilibili\.com\/x\/(?:resource\/(?:top\/activity|patch\/tab(?:\/v2)?)|v2\/search\/square|vip\/ads\/materials)\?/.test(url)) {
    $done(jsonResp({ code: -404, message: '-404', ttl: 1, data: null }));
    finished = true;
    return;
  }
  // 番剧活动弹窗
  if (/^https:\/\/api\.bilibili\.com\/pgc\/activity\/deliver\/material\/receive\?/.test(url)) {
    $done(jsonResp({ code: 0, data: { closeType: 'close_win', container: [], showTime: '' }, message: 'success' }));
    finished = true;
    return;
  }
  // 直播购物车
  if (/^https:\/\/api\.live\.bilibili\.com\/xlive\/e-commerce-interface\/v1\/ecommerce-user\/get_shopping_info\?/.test(url)) {
    $done(jsonResp({}));
    finished = true;
    return;
  }
  // 游戏中心大卡片
  if (/^https:\/\/line3-h5-mobile-api\.biligame\.com\/game\/live\/large_card_material\?/.test(url)) {
    $done(jsonResp({ code: 0, message: 'success' }));
    finished = true;
    return;
  }
})();
if (!finished) $done({});
