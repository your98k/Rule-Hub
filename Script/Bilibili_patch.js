// Bilibili_patch.js — 播放页关联推荐广告过滤（Sparkle 未覆盖的 PlayerRelates 接口）
// bilibili.app.view.v1.PlayerRelatesReply { list=1 }
// bilibili.app.view.v1.Relate { title=3, goto=7, cm=28, unique_id=32 }
// 广告判定（对齐 Biliverse isLegacyRelateAd）：goto∈{cm,game} 或存在 cm 或 unique_id 非空
// 仅处理未压缩的 gRPC 帧（frame[0]===0）；gzip 帧直接放行（渐进增强，无风险）

function skipField(buf, pos, wt) {
  switch (wt) {
    case 0: {
      while (pos < buf.length && (buf[pos] & 0x80) !== 0) pos++;
      return pos + 1;
    }
    case 1: return pos + 8;
    case 5: return pos + 4;
    case 2: {
      let len = 0, sh = 1;
      while (pos < buf.length) {
        const b = buf[pos++];
        len += (b & 0x7f) * sh;
        if ((b & 0x80) === 0) break;
        sh *= 128;
      }
      return pos + len;
    }
    default: return buf.length; // 未知 wire type：终止解析
  }
}

function readLen(buf, pos) {
  let len = 0, sh = 1;
  while (pos < buf.length) {
    const b = buf[pos++];
    len += (b & 0x7f) * sh;
    if ((b & 0x80) === 0) break;
    sh *= 128;
  }
  return [len, pos];
}

function isAdRelate(entry) {
  let pos = 0;
  while (pos < entry.length) {
    let tag = 0, sh = 1;
    while (pos < entry.length) {
      const b = entry[pos++];
      tag += (b & 0x7f) * sh;
      if ((b & 0x80) === 0) break;
      sh *= 128;
    }
    const f = Math.floor(tag / 8), wt = tag % 8;
    if (f === 7 && wt === 2) {
      const r = readLen(entry, pos);
      const len = r[0]; pos = r[1];
      const s = String.fromCharCode.apply(null, entry.subarray(pos, pos + len));
      if (s === 'cm' || s === 'game') return true;
      pos += len;
    } else if (f === 28 && wt === 2) {
      return true; // cm 字段存在即广告
    } else if (f === 32 && wt === 2) {
      const r = readLen(entry, pos);
      const len = r[0]; pos = r[1];
      if (len > 0) return true; // unique_id 非空即广告
      pos += len;
    } else {
      pos = skipField(entry, pos, wt);
      if (pos > entry.length) return false;
    }
  }
  return false;
}

function filterList(pb) {
  const chunks = [];
  let pos = 0, removed = 0;
  while (pos < pb.length) {
    const start = pos;
    let tag = 0, sh = 1;
    while (pos < pb.length) {
      const b = pb[pos++];
      tag += (b & 0x7f) * sh;
      if ((b & 0x80) === 0) break;
      sh *= 128;
    }
    const f = Math.floor(tag / 8), wt = tag % 8;
    if (f === 1 && wt === 2) {
      const r = readLen(pb, pos);
      const len = r[0]; pos = r[1];
      const end = pos + len;
      const entry = pb.subarray(pos, end);
      if (isAdRelate(entry)) { removed++; pos = end; continue; }
      pos = end;
      chunks.push(pb.subarray(start, end));
    } else {
      pos = skipField(pb, pos, wt);
      if (pos > pb.length) return null;
      chunks.push(pb.subarray(start, pos));
    }
  }
  let total = 0;
  chunks.forEach(function (c) { total += c.length; });
  const out = new Uint8Array(total);
  let off = 0;
  chunks.forEach(function (c) { out.set(c, off); off += c.length; });
  return { bytes: out, removed: removed };
}

(function () {
  const body = $response.bodyBytes;
  if (!body || body.length < 6 || body[0] !== 0) { $done({}); return; }
  const pb = body.subarray(5);
  const result = filterList(pb);
  if (!result || result.removed === 0) { $done({}); return; }
  const len = result.bytes.length;
  const frame = new Uint8Array(5 + len);
  frame[1] = Math.floor(len / 16777216) % 256;
  frame[2] = Math.floor(len / 65536) % 256;
  frame[3] = Math.floor(len / 256) % 256;
  frame[4] = len % 256;
  frame.set(result.bytes, 5);
  $done({ bodyBytes: frame });
})();
