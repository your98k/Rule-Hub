// 滴滴出行 —— 可选增强项（Stash 参数化）
// Stash 的 url-rewrite / body-rewrite 不支持条件，故把上游 snippet 里两个风险较高的规则
// 改成由参数控制的脚本，默认关闭，由用户自行选择。
//
// 1) BlockDaijiaGateway：整段拦截 daijia.kuaidadi.com/gateway（代驾主网关）
//    上游 snippet 这么做，但该网关承载代驾主流程，整段拦截可能影响功能，
//    且会废掉本覆写里 apolloConfig / apolloToggle 两条 body-rewrite。
// 2) LegacyInTripFix：对 pInTripLayout 按数组下标删除第 9 个组件
//    上游写法是 del(.data.order_components[8].data)，响应结构一变就会删错对象。

const args = (() => {
  try {
    if (typeof $argument === 'undefined' || $argument === null || $argument === '') return {};
    const v = typeof $argument === 'string' ? JSON.parse($argument) : $argument;
    return v && typeof v === 'object' ? v : {};
  } catch (e) {
    return {};
  }
})();

const url = (typeof $request !== 'undefined' && $request.url) || '';
const isResponse = typeof $response !== 'undefined' && $response;

function emptyJson() {
  const headers = { 'Content-Type': 'application/json' };
  const body = '{}';
  // 双形态：Stash/Surge 读顶层，部分客户端读 response 包裹
  $done({ status: 200, headers, body, response: { status: 200, headers, body } });
}

if (!isResponse) {
  // 请求阶段：代驾主网关整段拦截（默认关）
  if (args.BlockDaijiaGateway === true && /\/gateway(\?|$)/.test(url)) {
    emptyJson();
  } else {
    $done({});
  }
} else {
  // 响应阶段：按下标删除组件（默认关）
  if (args.LegacyInTripFix !== true) {
    $done({});
  } else {
    const raw = typeof $response.body === 'string' ? $response.body : '';
    if (!raw) {
      $done({});
    } else {
      let obj;
      try {
        obj = JSON.parse(raw);
      } catch (e) {
        $done({});
        return;
      }
      try {
        const list = obj && obj.data && obj.data.order_components;
        if (Array.isArray(list) && list.length > 8 && list[8] && typeof list[8] === 'object') {
          delete list[8].data;
        }
      } catch (e) {
        $done({});
        return;
      }
      const headers = Object.assign({}, $response.headers || {});
      ['content-length', 'content-encoding', 'transfer-encoding', 'etag', 'digest', 'content-md5'].forEach((k) => {
        Object.keys(headers).forEach((h) => {
          if (h.toLowerCase() === k) delete headers[h];
        });
      });
      $done({ body: JSON.stringify(obj), headers });
    }
  }
}
