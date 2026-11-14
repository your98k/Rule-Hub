/**
 * 水印猫 /user/info 会员信息覆写（Stash 脚本接口版）
 * 原始脚本：89996462/Quantumult-X → ycdz/sym.js（作者：彭于晏💞）
 * 适配：仅改动响应正文中的 4 个字段，结构与字段顺序无关；
 *      改写后清理 Content-Length / Content-Encoding 等失效头，交给引擎重算。
 */

const VIP_INFO = '{"subscribeCycle":-1,"beginTime":"2025-09-09 09:09:09","firstOpenTime":"2025-09-09 09:09:09","freeTimes":0,"userSign":"D-ej8OAp7SY","expireTime":"2999-09-09 09:09:09","typeName":"终身会员","remainDays":9,"sign":"wa44coNPDkg","createTime":"2025-09-09 09:09:09"}';

// 把 text 中所有 "field":<任意 JSON 值> 的“值”整体替换为 valueJson，
// 值可以是字符串、数字、对象、数组或 null，靠括号配对定位结束位置。
function replaceJsonField(text, field, valueJson) {
  const key = '"' + field + '":';
  let out = '';
  let i = 0;
  while (i < text.length) {
    const idx = text.indexOf(key, i);
    if (idx < 0) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, idx) + key + valueJson;
    let p = idx + key.length;
    let depth = 0;
    let inString = false;
    let escaped = false;
    while (p < text.length) {
      const c = text[p];
      if (inString) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === '"') inString = false;
      } else if (c === '"') {
        inString = true;
      } else if (c === '{' || c === '[') {
        depth += 1;
      } else if (c === '}' || c === ']') {
        if (depth === 0) break;
        depth -= 1;
      } else if (c === ',' && depth === 0) {
        break;
      }
      p += 1;
    }
    i = p;
  }
  return out;
}

function cleanHeaders(headers) {
  const drop = ['content-length', 'content-encoding', 'transfer-encoding', 'etag', 'digest', 'content-md5'];
  const out = {};
  const src = headers || {};
  for (const k of Object.keys(src)) {
    if (drop.indexOf(k.toLowerCase()) < 0) out[k] = src[k];
  }
  return out;
}

(function () {
  let body = $response && $response.body;
  if (typeof body !== 'string' || body === '') {
    $done({});
    return;
  }

  let out = replaceJsonField(body, 'isPurchasedSubscribe', '1');
  out = replaceJsonField(out, 'waterVipInfo', VIP_INFO);
  out = replaceJsonField(out, 'maskMobile', '"彭于晏Crack"');
  out = replaceJsonField(out, 'nickName', '"彭于晏Crack"');

  if (out === body) {
    $done({});
    return;
  }
  $done({ body: out, headers: cleanHeaders($response.headers) });
})();
