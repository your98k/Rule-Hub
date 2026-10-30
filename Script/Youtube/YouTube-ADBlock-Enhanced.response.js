/* Stash compatibility prelude: Base64 helpers used by the upstream scripts. */
(function () {
  if (typeof Uint8Array.fromBase64 !== "function") {
    Object.defineProperty(Uint8Array, "fromBase64", {
      configurable: true,
      writable: true,
      value: function (input) {
        var text = String(input == null ? "" : input).replace(/\s/g, "");
        while (text.length % 4) text += "=";
        var binary = atob(text);
        var output = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) output[i] = binary.charCodeAt(i);
        return output;
      }
    });
  }
  if (typeof Uint8Array.prototype.toBase64 !== "function") {
    Object.defineProperty(Uint8Array.prototype, "toBase64", {
      configurable: true,
      writable: true,
      value: function () {
        var binary = "";
        var chunk = 0x8000;
        for (var i = 0; i < this.length; i += chunk) {
          binary += String.fromCharCode.apply(null, this.subarray(i, i + chunk));
        }
        return btoa(binary);
      }
    });
  }
})();

(function () {
  var __stashRealDone = $done;
  var __stashRealConsole = console;
  var __stashFinished = false;
  var __stashArgument = typeof $argument === "undefined" ? "" : $argument;
  var __stashRequest = $request;
  var __stashResponse = typeof $response === "undefined" ? undefined : $response;
  function __stashBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }
    return null;
  }
  function __stashOption(name, fallback) {
    var parsed = null;
    try {
      parsed = typeof __stashArgument === "string" ? JSON.parse(__stashArgument) : __stashArgument;
    } catch (error) {
      parsed = null;
    }
    if (!parsed || typeof parsed !== "object") return fallback;
    var value = parsed[name];
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "string") return !/^(?:false|0|off|no)$/i.test(value.trim());
    return Boolean(value);
  }
  function __stashStringOption(name, fallback) {
    var parsed = null;
    try {
      parsed = typeof __stashArgument === "string" ? JSON.parse(__stashArgument) : __stashArgument;
    } catch (error) {
      parsed = null;
    }
    if (!parsed || typeof parsed !== "object") return fallback;
    var value = parsed[name];
    if (typeof value !== "string") return fallback;
    value = value.trim();
    return value || fallback;
  }

  function __stashPatch(bytes) {
    var output = null;
    function __stashPatchDone(value) {
      if (output === null && value && value.body) output = value.body;
    }
    try {
      (function ($response, $done, console) {
/*
 * YouTube iOS 首页 Feed Sponsored 广告补丁 v9
 * 稳定版：仅处理 /browse 中 field #49399797 下的 field #1/#32。
 */
(() => {
  const TARGET = 49399797;
  const MAX_SEARCH_DEPTH = 8;
  const ABOUT = 'www.youtube.com/aboutthisad';
  const OLD_CORE = ['googleadservices.com/pagead/aclk','www.youtube.com/pagead/adview','www.youtube.com/pagead/interaction'];
  const BROAD = ['www.youtube.com/pagead/','googleads.g.doubleclick.net/pagead/','yt3.ggpht.com/proxy'];
  const TINY_LAYOUT='video_display_button_group_layout.eml-fe', PROMINENCE='home_vertical_feed_prominence_group_key', DIVIDER='cell_divider.eml-fe', NORMAL_THUMB='i.ytimg.com/vi/';
  function ascii(s){const o=new Uint8Array(s.length);for(let i=0;i<s.length;i++)o[i]=s.charCodeAt(i)&255;return o;}
  const aboutBytes=ascii(ABOUT),oldBytes=OLD_CORE.map(ascii),broadBytes=BROAD.map(ascii),tinyLayoutBytes=ascii(TINY_LAYOUT),prominenceBytes=ascii(PROMINENCE),dividerBytes=ascii(DIVIDER),normalThumbBytes=ascii(NORMAL_THUMB);
  function readVarint(a,i,end){let v=0,shift=0;while(i<end&&shift<56){const c=a[i++];v+=(c&127)*Math.pow(2,shift);if(c<128)return[v,i];shift+=7;}throw new Error('bad varint');}
  function varintBytes(v){const r=[];while(v>=128){r.push((v%128)|128);v=Math.floor(v/128);}r.push(v);return new Uint8Array(r);}
  function containsRange(a,s,e,n){if(e-s<n.length)return false;outer:for(let i=s;i<=e-n.length;i++){for(let j=0;j<n.length;j++)if(a[i+j]!==n[j])continue outer;return true;}return false;}
  function adEvidence(a,s,e){if(containsRange(a,s,e,aboutBytes))return{ad:true,hits:4,reason:'aboutthisad'};let hits=0;for(const n of oldBytes)if(containsRange(a,s,e,n))hits++;for(const n of broadBytes)if(containsRange(a,s,e,n))hits++;return{ad:hits>=2,hits,reason:'markers'};}
  function parseFields(a,s,e){const f=[];let i=s;try{while(i<e){const fs=i,kv=readVarint(a,i,e),key=kv[0],ke=kv[1],no=Math.floor(key/8),wt=key&7;if(!no||![0,1,2,5].includes(wt))return null;let ps=ke,pe,fe;if(wt===0){const q=readVarint(a,ke,e);pe=fe=q[1];}else if(wt===1)pe=fe=ke+8;else if(wt===5)pe=fe=ke+4;else{const q=readVarint(a,ke,e);ps=q[1];pe=ps+q[0];fe=pe;}if(fe>e)return null;f.push({no,wt,start:fs,keyEnd:ke,ps,pe,end:fe});i=fe;}return i===e?f:null;}catch(_){return null;}}
  const rangeSeg=(s,e)=>({s,e}),bytesSeg=b=>({b}),segLen=x=>x.b?x.b.length:x.e-x.s;
  function totalLen(s){let n=0;for(const x of s)n+=segLen(x);return n;}
  function emit(a,segs,len){const o=new Uint8Array(len);let p=0;for(const x of segs){if(x.b){o.set(x.b,p);p+=x.b.length;}else{const v=a.subarray(x.s,x.e);o.set(v,p);p+=v.length;}}return o;}
  function isShell(a,x){const z=x.pe-x.ps;if(x.no!==1||z>8192||containsRange(a,x.ps,x.pe,normalThumbBytes))return false;return containsRange(a,x.ps,x.pe,tinyLayoutBytes)&&containsRange(a,x.ps,x.pe,prominenceBytes);}
  function rewriteFeedContainer(a,s,e){const f=parseFields(a,s,e);if(!f)return null;const drop={};let ads=0,shells=0,dividers=0;for(let i=0;i<f.length;i++){const x=f[i];if(x.wt!==2)continue;if(x.no===1||x.no===32){const ev=adEvidence(a,x.ps,x.pe);if(ev.ad){drop[i]=true;ads++;continue;}}if(isShell(a,x)){drop[i]=true;shells++;}}
    for(let i=0;i<f.length;i++){if(drop[i])continue;const x=f[i];if(x.wt===2&&x.no===1&&x.pe-x.ps<=3000&&containsRange(a,x.ps,x.pe,dividerBytes)&&drop[i-1]){drop[i]=true;dividers++;}}
    if(!ads&&!shells)return{changed:false,segs:[rangeSeg(s,e)],len:e-s,ads:0,shells:0,dividers:0};const segs=[];for(let i=0;i<f.length;i++)if(!drop[i])segs.push(rangeSeg(f[i].start,f[i].end));return{changed:true,segs,len:totalLen(segs),ads,shells,dividers};}
  function rewriteSearch(a,s,e,d){const f=parseFields(a,s,e);if(!f)return null;let changed=false,ads=0,shells=0,dividers=0;const segs=[];for(const x of f){let child=null;if(x.wt===2&&x.no===TARGET)child=rewriteFeedContainer(a,x.ps,x.pe);else if(x.wt===2&&d<MAX_SEARCH_DEPTH&&parseFields(a,x.ps,x.pe))child=rewriteSearch(a,x.ps,x.pe,d+1);if(child&&child.changed){segs.push(rangeSeg(x.start,x.keyEnd),bytesSeg(varintBytes(child.len)),...child.segs);changed=true;ads+=child.ads;shells+=child.shells;dividers+=child.dividers;}else segs.push(rangeSeg(x.start,x.end));}return{changed,segs,len:totalLen(segs),ads,shells,dividers};}
  try{const input=$response.body instanceof Uint8Array?$response.body:new Uint8Array($response.body);const plan=rewriteSearch(input,0,input.length,0);if(plan&&plan.changed){const out=emit(input,plan.segs,plan.len);console.log(`[YT HomeFeed v9] DONE ads=${plan.ads} shells=${plan.shells} ${input.length}->${out.length}`);$done({body:out});}else $done({});}catch(e){console.log(`[YT HomeFeed v9] ERROR ${e}`);$done({});}
})();
      })({ body: bytes }, __stashPatchDone, __stashRealConsole);
    } catch (error) {
      __stashRealConsole.log("YouTube Stash home feed patch: " + error);
    }
    var patched = __stashBytes(output);
    return patched || bytes;
  }
/* Stash translation pass: YouTube translated captions + YouTube Music lyrics. */
var __stashTrEncoder = new TextEncoder();
var __stashTrDecoder = new TextDecoder("utf-8", { fatal: false });
var __stashTrLanguages = [
  ["de", "Deutsch"],
  ["ru", "Русский"],
  ["fr", "Français"],
  ["fil", "Filipino"],
  ["ko", "한국어"],
  ["ja", "日本語"],
  ["en", "English"],
  ["vi", "Tiếng Việt"],
  ["zh-Hant", "中文（繁體）"],
  ["zh-Hans", "中文（简体）"],
  ["und", "@VirgilClyne"]
];

function __stashTrReadVarint(bytes, index, end) {
  var value = 0;
  var shift = 0;
  while (index < end && shift < 56) {
    var byte = bytes[index++];
    value += (byte & 127) * Math.pow(2, shift);
    if (!(byte & 128)) return [value, index];
    shift += 7;
  }
  return null;
}

function __stashTrWriteVarint(value) {
  var output = [];
  do {
    var byte = value % 128;
    value = Math.floor(value / 128);
    output.push(byte | (value ? 128 : 0));
  } while (value);
  return new Uint8Array(output);
}

function __stashTrConcat(chunks) {
  var length = 0;
  for (var i = 0; i < chunks.length; i++) length += chunks[i].length;
  var output = new Uint8Array(length);
  var offset = 0;
  for (var j = 0; j < chunks.length; j++) {
    output.set(chunks[j], offset);
    offset += chunks[j].length;
  }
  return output;
}

function __stashTrParse(bytes, start, end) {
  var fields = [];
  var index = start;
  while (index < end) {
    var fieldStart = index;
    var keyPair = __stashTrReadVarint(bytes, index, end);
    if (!keyPair) return null;
    var key = keyPair[0];
    index = keyPair[1];
    var number = Math.floor(key / 8);
    var wire = key & 7;
    if (!number) return null;
    var dataStart;
    var dataEnd;
    var fieldEnd;
    var value;
    if (wire === 0) {
      var valuePair = __stashTrReadVarint(bytes, index, end);
      if (!valuePair) return null;
      value = valuePair[0];
      dataStart = index;
      dataEnd = fieldEnd = valuePair[1];
    } else if (wire === 1) {
      dataStart = index;
      dataEnd = fieldEnd = index + 8;
    } else if (wire === 2) {
      var lengthPair = __stashTrReadVarint(bytes, index, end);
      if (!lengthPair) return null;
      dataStart = lengthPair[1];
      dataEnd = dataStart + lengthPair[0];
      fieldEnd = dataEnd;
    } else if (wire === 5) {
      dataStart = index;
      dataEnd = fieldEnd = index + 4;
    } else {
      return null;
    }
    if (fieldEnd > end) return null;
    fields.push({
      no: number,
      wire: wire,
      start: fieldStart,
      keyEnd: index,
      dataStart: dataStart,
      dataEnd: dataEnd,
      end: fieldEnd,
      raw: bytes.subarray(fieldStart, fieldEnd),
      value: value
    });
    index = fieldEnd;
  }
  return fields;
}

function __stashTrField(number, payload) {
  var tag = __stashTrWriteVarint(number * 8 + 2);
  var length = __stashTrWriteVarint(payload.length);
  var output = new Uint8Array(tag.length + length.length + payload.length);
  output.set(tag, 0);
  output.set(length, tag.length);
  output.set(payload, tag.length + length.length);
  return output;
}

function __stashTrVarintField(number, value) {
  var tag = __stashTrWriteVarint(number * 8);
  var payload = __stashTrWriteVarint(value);
  var output = new Uint8Array(tag.length + payload.length);
  output.set(tag, 0);
  output.set(payload, tag.length);
  return output;
}

function __stashTrEncode(text) {
  return __stashTrEncoder.encode(String(text));
}

function __stashTrStringField(number, text) {
  return __stashTrField(number, __stashTrEncode(text));
}

function __stashTrStringOf(message, field) {
  return __stashTrDecoder.decode(message.subarray(field.dataStart, field.dataEnd));
}

function __stashTrTextMessage(text) {
  return __stashTrField(1, __stashTrStringField(1, text));
}

function __stashTrSame(left, right) {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  for (var i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
  return true;
}

function __stashTrSetVarint(message, number, value) {
  var fields = __stashTrParse(message, 0, message.length);
  if (!fields) return null;
  var output = [];
  var done = false;
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (field.no === number && field.wire === 0) {
      if (!done) {
        output.push(__stashTrVarintField(number, value));
        done = true;
      }
    } else {
      output.push(field.raw);
    }
  }
  if (!done) output.push(__stashTrVarintField(number, value));
  return __stashTrConcat(output);
}

function __stashTrSetString(message, number, value) {
  var fields = __stashTrParse(message, 0, message.length);
  if (!fields) return null;
  var output = [];
  var done = false;
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (field.no === number && field.wire === 2) {
      if (!done) {
        output.push(__stashTrStringField(number, value));
        done = true;
      }
    } else {
      output.push(field.raw);
    }
  }
  if (!done) output.push(__stashTrStringField(number, value));
  return __stashTrConcat(output);
}

function __stashTrAppendVarint(message, number, value) {
  var fields = __stashTrParse(message, 0, message.length);
  if (!fields) return null;
  var output = fields.map(function (field) { return field.raw; });
  output.push(__stashTrVarintField(number, value));
  return __stashTrConcat(output);
}

function __stashTrAppendText(message, suffix) {
  var fields = __stashTrParse(message, 0, message.length);
  if (!fields) return message;
  var firstRun = null;
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].no === 1 && fields[i].wire === 2) {
      firstRun = fields[i];
      break;
    }
  }
  if (!firstRun) return message;
  var run = message.subarray(firstRun.dataStart, firstRun.dataEnd);
  var oldText = "";
  var runFields = __stashTrParse(run, 0, run.length);
  if (!runFields) return message;
  for (var j = 0; j < runFields.length; j++) {
    if (runFields[j].no === 1 && runFields[j].wire === 2) {
      oldText = __stashTrStringOf(run, runFields[j]);
      break;
    }
  }
  var updatedRun = __stashTrSetString(run, 1, oldText + suffix);
  if (!updatedRun) return message;
  var output = [];
  var replaced = false;
  for (var k = 0; k < fields.length; k++) {
    if (fields[k].no === 1 && fields[k].wire === 2 && !replaced) {
      output.push(__stashTrField(1, updatedRun));
      replaced = true;
    } else {
      output.push(fields[k].raw);
    }
  }
  return __stashTrConcat(output);
}

function __stashTrCaptionTrack(baseUrl, language) {
  return __stashTrConcat([
    __stashTrStringField(1, baseUrl + "&tlang=" + encodeURIComponent(language)),
    __stashTrField(2, __stashTrTextMessage("@Enhance (" + language + ")")),
    __stashTrStringField(3, "." + language),
    __stashTrStringField(4, language),
    __stashTrVarintField(7, 1)
  ]);
}

function __stashTrAudioTrack(message, chosen) {
  var fields = __stashTrParse(message, 0, message.length);
  if (!fields) return message;
  var indices = [];
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (field.no !== 2) continue;
    if (field.wire === 0) {
      indices.push(field.value);
    } else if (field.wire === 2) {
      var index = field.dataStart;
      while (index < field.dataEnd) {
        var pair = __stashTrReadVarint(message, index, field.dataEnd);
        if (!pair) break;
        indices.push(pair[0]);
        index = pair[1];
      }
    }
  }
  var output = message;
  if (indices.indexOf(chosen) < 0) {
    output = __stashTrAppendVarint(output, 2, chosen) || output;
  }
  output = __stashTrSetVarint(output, 3, chosen) || output;
  output = __stashTrSetVarint(output, 11, 3) || output;
  return output;
}

function __stashTrCaptions(renderer, language) {
  var fields = __stashTrParse(renderer, 0, renderer.length);
  if (!fields) return null;
  var trackFields = [];
  var audioFields = [];
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].no === 1 && fields[i].wire === 2) trackFields.push(fields[i]);
    else if (fields[i].no === 2 && fields[i].wire === 2) audioFields.push(fields[i]);
  }
  if (!trackFields.length) return null;
  var tracks = [];
  var chosen = -1;
  var bestScore = -1;
  for (var t = 0; t < trackFields.length; t++) {
    var trackField = trackFields[t];
    var track = renderer.subarray(trackField.dataStart, trackField.dataEnd);
    var trackParts = __stashTrParse(track, 0, track.length);
    var baseUrl = "";
    var languageCode = "";
    if (trackParts) {
      for (var p = 0; p < trackParts.length; p++) {
        if (trackParts[p].no === 1 && trackParts[p].wire === 2) baseUrl = __stashTrStringOf(track, trackParts[p]);
        else if (trackParts[p].no === 4 && trackParts[p].wire === 2) languageCode = __stashTrStringOf(track, trackParts[p]);
      }
    }
    var updatedTrack = __stashTrSetVarint(track, 7, 1) || track;
    tracks.push({ data: updatedTrack, baseUrl: baseUrl, languageCode: languageCode });
    var score = languageCode === language ? 2 : languageCode === "en" ? 1 : 0;
    if (score > bestScore) {
      bestScore = score;
      chosen = t;
    }
  }
  if (chosen < 0) return null;
  if (!tracks[chosen].baseUrl) {
    for (var b = 0; b < tracks.length; b++) {
      if (tracks[b].baseUrl) {
        chosen = b;
        break;
      }
    }
  }
  if (!tracks[chosen].baseUrl) return null;
  if (bestScore !== 2) {
    tracks.push({ data: __stashTrCaptionTrack(tracks[chosen].baseUrl, language), baseUrl: "", languageCode: language });
    chosen = tracks.length - 1;
  }
  var audioData = [];
  for (var a = 0; a < audioFields.length; a++) {
    var audio = renderer.subarray(audioFields[a].dataStart, audioFields[a].dataEnd);
    audioData.push(__stashTrAudioTrack(audio, chosen));
  }
  var output = [];
  var trackIndex = 0;
  var audioIndex = 0;
  for (var f = 0; f < fields.length; f++) {
    var field = fields[f];
    if (field.no === 1 && field.wire === 2) {
      if (trackIndex < tracks.length) output.push(__stashTrField(1, tracks[trackIndex++].data));
    } else if (field.no === 2 && field.wire === 2) {
      if (audioIndex < audioData.length) output.push(__stashTrField(2, audioData[audioIndex++]));
    } else if (field.no === 3 && field.wire === 2) {
      /* Replace the translation language list below. */
    } else {
      output.push(field.raw);
    }
  }
  while (trackIndex < tracks.length) output.push(__stashTrField(1, tracks[trackIndex++].data));
  for (var l = 0; l < __stashTrLanguages.length; l++) {
    var item = __stashTrLanguages[l];
    output.push(__stashTrField(3, __stashTrConcat([
      __stashTrStringField(1, item[0]),
      __stashTrField(2, __stashTrTextMessage(item[1]))
    ])));
  }
  var result = __stashTrConcat(output);
  return __stashTrSetVarint(result, 6, chosen) || result;
}

function __stashTrSameLanguage(source, target) {
  var base = String(target || "").split("-")[0].toLowerCase();
  return !!base && String(source || "").toLowerCase().indexOf(base) >= 0;
}

function __stashTrSplit(text, size) {
  var lines = String(text).split("\n");
  var chunks = [];
  var current = "";
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var candidate = current ? current + "\n" + line : line;
    if (candidate.length > size && current) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
    while (current.length > size) {
      chunks.push(current.slice(0, size));
      current = current.slice(size);
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [String(text)];
}

function __stashTrShift(value, magic) {
  var alpha = "a";
  var plus = "+";
  var delta;
  for (var i = 0; i < magic.length - 2; i += 3) {
    delta = magic.charAt(i + 2);
    delta = delta >= alpha ? delta.charCodeAt(0) - 87 : Number(delta);
    delta = magic.charAt(i + 1) === plus ? value >>> delta : value << delta;
    value = magic.charAt(i) === plus ? (value + delta) & 4294967295 : value ^ delta;
  }
  return value;
}

function __stashTrToken(text) {
  var bytes = [];
  for (var i = 0, j = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    if (code < 128) {
      bytes[j++] = code;
    } else if (code < 2048) {
      bytes[j++] = (code >> 6) | 192;
      bytes[j++] = (code & 63) | 128;
    } else if ((code & 64512) === 55296 && i + 1 < text.length && (text.charCodeAt(i + 1) & 64512) === 56320) {
      code = 65536 + ((code & 1023) << 10) + (text.charCodeAt(++i) & 1023);
      bytes[j++] = (code >> 18) | 240;
      bytes[j++] = ((code >> 12) & 63) | 128;
      bytes[j++] = ((code >> 6) & 63) | 128;
      bytes[j++] = (code & 63) | 128;
    } else {
      bytes[j++] = (code >> 12) | 224;
      bytes[j++] = ((code >> 6) & 63) | 128;
      bytes[j++] = (code & 63) | 128;
    }
  }
  var value = 406644;
  for (var k = 0; k < bytes.length; k++) value = __stashTrShift(value + bytes[k], "+-a^+6");
  value = __stashTrShift(value, "+-3^+b+-f");
  value ^= 3293161072;
  if (value < 0) value = (value & 2147483647) + 2147483648;
  value %= 1000000;
  return value.toString() + "." + (value ^ 406644);
}

function __stashTrTranslateUrl(text, language) {
  var target = language === "zh-Hans" ? "zh-CN" : language === "zh-Hant" ? "zh-TW" : language;
  return "https://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=" +
    encodeURIComponent(target) +
    "&hl=zh-CN&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&source=bh&ssel=0&tsel=0&kc=1&tk=" +
    __stashTrToken(text) + "&q=" + encodeURIComponent(text);
}

function __stashTrHttpGet(url, httpClient) {
  return new Promise(function (resolve) {
    if (!httpClient || typeof httpClient.get !== "function") return resolve(null);
    var isStash = typeof $environment !== "undefined" && $environment && $environment["stash-version"];
    var isLoon = !isStash && typeof $loon === "string";
    var requestTimeout = isLoon ? 8000 : 8;
    var settled = false;
    var timer = 0;
    if (typeof setTimeout === "function") {
      timer = setTimeout(function () {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 9000);
    }
    try {
      httpClient.get({
        url: url,
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          "Accept": "*/*"
        },
        timeout: requestTimeout
      }, function (error, response, data) {
        if (settled) return;
        settled = true;
        if (timer && typeof clearTimeout === "function") clearTimeout(timer);
        if (error || !response || Number(response.status) !== 200) return resolve(null);
        if (typeof data === "string") return resolve(data);
        if (data && typeof data === "object") {
          if (typeof data.body === "string") return resolve(data.body);
          if (typeof data.body !== "undefined" && data.body && typeof data.body.length === "number") {
            try {
              return resolve(__stashTrDecoder.decode(data.body));
            } catch (decodeError) {}
          }
        }
        resolve(data ? String(data) : null);
      });
    } catch (error) {
      if (!settled) {
        settled = true;
        if (timer && typeof clearTimeout === "function") clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

async function __stashTrTranslateText(text, language, httpClient, logger) {
  if (!httpClient || !text || !text.trim()) return null;
  var chunks = __stashTrSplit(text, 1800);
  var segments = [];
  var source = "";
  var started = Date.now();
  for (var i = 0; i < chunks.length; i++) {
    if (Date.now() - started > 20000) return null;
    var body = await __stashTrHttpGet(__stashTrTranslateUrl(chunks[i], language), httpClient);
    if (!body) return null;
    var data;
    try {
      data = JSON.parse(body);
    } catch (error) {
      if (logger && logger.log) logger.log("YouTube Stash translate: invalid response");
      return null;
    }
    if (!data || !Array.isArray(data[0])) return null;
    for (var j = 0; j < data[0].length; j++) {
      var part = data[0][j];
      segments.push(Array.isArray(part) && typeof part[0] === "string" ? part[0] : "");
    }
    if (!source && typeof data[2] === "string") source = data[2];
  }
  if (!segments.length) return null;
  return { segments: segments, source: source };
}

async function __stashTrTimedLyrics(renderer, language, httpClient, logger) {
  var fields = __stashTrParse(renderer, 0, renderer.length);
  if (!fields) return null;
  var contentField = null;
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].no === 4 && fields[i].wire === 2) contentField = fields[i];
  }
  if (!contentField) return null;
  var content = renderer.subarray(contentField.dataStart, contentField.dataEnd);
  var contentFields = __stashTrParse(content, 0, content.length);
  if (!contentFields) return null;
  var runFields = [];
  for (var r = 0; r < contentFields.length; r++) {
    if (contentFields[r].no === 1 && contentFields[r].wire === 2) runFields.push(contentFields[r]);
  }
  if (!runFields.length) return null;
  var runs = [];
  var original = [];
  for (var q = 0; q < runFields.length; q++) {
    var run = content.subarray(runFields[q].dataStart, runFields[q].dataEnd);
    var runParts = __stashTrParse(run, 0, run.length);
    if (!runParts) return null;
    var runText = "";
    for (var p = 0; p < runParts.length; p++) {
      if (runParts[p].no === 1 && runParts[p].wire === 2) {
        runText = __stashTrStringOf(run, runParts[p]);
        break;
      }
    }
    runs.push({ data: run, text: runText });
    original.push(runText);
  }
  var text = original.join("\n");
  if (!text.trim()) return null;
  var translated = await __stashTrTranslateText(text, language, httpClient, logger);
  if (!translated || translated.segments.length < runs.length) return null;
  var same = __stashTrSameLanguage(translated.source, language);
  var changed = false;
  var updatedRuns = [];
  for (var u = 0; u < runs.length; u++) {
    var segment = translated.segments[u];
    if (!segment) {
      updatedRuns.push(runs[u].data);
      continue;
    }
    var newText = same ? segment : runs[u].text + "\n" + segment;
    if (newText !== runs[u].text) {
      var updated = __stashTrSetString(runs[u].data, 1, newText);
      if (updated) {
        updatedRuns.push(updated);
        changed = true;
        continue;
      }
    }
    updatedRuns.push(runs[u].data);
  }
  if (!changed) return null;
  var output = [];
  var runIndex = 0;
  for (var c = 0; c < contentFields.length; c++) {
    if (contentFields[c].no === 1 && contentFields[c].wire === 2) {
      output.push(__stashTrField(1, updatedRuns[runIndex++]));
    } else {
      output.push(contentFields[c].raw);
    }
  }
  var newContent = __stashTrConcat(output);
  var footer = "";
  for (var f = 0; f < contentFields.length; f++) {
    if (contentFields[f].no === 2 && contentFields[f].wire === 2) {
      footer = __stashTrStringOf(content, contentFields[f]);
      break;
    }
  }
  newContent = __stashTrSetString(newContent, 2, footer + " & Translated by Google") || newContent;
  var outputRenderer = [];
  for (var g = 0; g < fields.length; g++) {
    if (fields[g].no === 4 && fields[g].wire === 2) {
      outputRenderer.push(__stashTrField(4, newContent));
    } else {
      outputRenderer.push(fields[g].raw);
    }
  }
  return __stashTrConcat(outputRenderer);
}

async function __stashTrDescription(renderer, language, httpClient, logger) {
  var fields = __stashTrParse(renderer, 0, renderer.length);
  if (!fields) return null;
  var descriptionField = null;
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].no === 3 && fields[i].wire === 2) descriptionField = fields[i];
  }
  if (!descriptionField) return null;
  var description = renderer.subarray(descriptionField.dataStart, descriptionField.dataEnd);
  var descriptionFields = __stashTrParse(description, 0, description.length);
  if (!descriptionFields) return null;
  var runFields = [];
  for (var r = 0; r < descriptionFields.length; r++) {
    if (descriptionFields[r].no === 1 && descriptionFields[r].wire === 2) runFields.push(descriptionFields[r]);
  }
  if (!runFields.length) return null;
  var runs = [];
  var original = [];
  for (var q = 0; q < runFields.length; q++) {
    var run = description.subarray(runFields[q].dataStart, runFields[q].dataEnd);
    var runParts = __stashTrParse(run, 0, run.length);
    if (!runParts) return null;
    var runText = "";
    for (var p = 0; p < runParts.length; p++) {
      if (runParts[p].no === 1 && runParts[p].wire === 2) {
        runText = __stashTrStringOf(run, runParts[p]);
        break;
      }
    }
    runs.push({ data: run, text: runText });
    original.push(runText);
  }
  var text = original.join("\n");
  if (!text.trim()) return null;
  var translated = await __stashTrTranslateText(text, language, httpClient, logger);
  if (!translated || translated.segments.length < runs.length) return null;
  var same = __stashTrSameLanguage(translated.source, language);
  var changed = false;
  var updatedRuns = [];
  for (var u = 0; u < runs.length; u++) {
    var segment = translated.segments[u];
    if (!segment) {
      updatedRuns.push(runs[u].data);
      continue;
    }
    var newText = same ? segment : runs[u].text + "\n" + segment;
    if (newText !== runs[u].text) {
      var updated = __stashTrSetString(runs[u].data, 1, newText);
      if (updated) {
        updatedRuns.push(updated);
        changed = true;
        continue;
      }
    }
    updatedRuns.push(runs[u].data);
  }
  if (!changed) return null;
  var outputDescription = [];
  var runIndex = 0;
  for (var c = 0; c < descriptionFields.length; c++) {
    if (descriptionFields[c].no === 1 && descriptionFields[c].wire === 2) {
      outputDescription.push(__stashTrField(1, updatedRuns[runIndex++]));
    } else {
      outputDescription.push(descriptionFields[c].raw);
    }
  }
  var newDescription = __stashTrConcat(outputDescription);
  var output = [];
  var footerDone = false;
  for (var f = 0; f < fields.length; f++) {
    if (fields[f].no === 3 && fields[f].wire === 2) {
      output.push(__stashTrField(3, newDescription));
    } else if (fields[f].no === 10 && fields[f].wire === 2) {
      if (!footerDone) {
        output.push(__stashTrField(10, __stashTrAppendText(renderer.subarray(fields[f].dataStart, fields[f].dataEnd), " & Translated by Google")));
        footerDone = true;
      }
    } else {
      output.push(fields[f].raw);
    }
  }
  if (!footerDone) output.push(__stashTrField(10, __stashTrTextMessage(" & Translated by Google")));
  return __stashTrConcat(output);
}

function __stashTrRewriteSync(bytes, target, transform, depth, maxDepth) {
  var fields = __stashTrParse(bytes, 0, bytes.length);
  if (!fields) return { bytes: bytes, changed: false };
  var changed = false;
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (field.wire !== 2) continue;
    var payload = bytes.subarray(field.dataStart, field.dataEnd);
    if (field.no === target) {
      var output = null;
      try {
        output = transform(payload);
      } catch (error) {}
      if (output && !__stashTrSame(output, payload)) {
        field.raw = __stashTrField(field.no, output);
        changed = true;
      }
    } else if (depth < maxDepth) {
      var nested = __stashTrRewriteSync(payload, target, transform, depth + 1, maxDepth);
      if (nested.changed) {
        field.raw = __stashTrField(field.no, nested.bytes);
        changed = true;
      }
    }
  }
  return {
    bytes: changed ? __stashTrConcat(fields.map(function (field) { return field.raw; })) : bytes,
    changed: changed
  };
}

async function __stashTrRewriteAsync(bytes, target, transform, depth, maxDepth) {
  var fields = __stashTrParse(bytes, 0, bytes.length);
  if (!fields) return { bytes: bytes, changed: false };
  var changed = false;
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (field.wire !== 2) continue;
    var payload = bytes.subarray(field.dataStart, field.dataEnd);
    if (field.no === target) {
      var output = null;
      try {
        output = await transform(payload);
      } catch (error) {}
      if (output && !__stashTrSame(output, payload)) {
        field.raw = __stashTrField(field.no, output);
        changed = true;
      }
    } else if (depth < maxDepth) {
      var nested = await __stashTrRewriteAsync(payload, target, transform, depth + 1, maxDepth);
      if (nested.changed) {
        field.raw = __stashTrField(field.no, nested.bytes);
        changed = true;
      }
    }
  }
  return {
    bytes: changed ? __stashTrConcat(fields.map(function (field) { return field.raw; })) : bytes,
    changed: changed
  };
}

function __stashTrContainsAscii(bytes, text) {
  var needle = __stashTrEncode(text);
  if (!needle.length) return true;
  var limit = bytes.length - needle.length;
  outer: for (var i = 0; i <= limit; i++) {
    for (var j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

function __stashTrNormalizeLanguage(value) {
  var text = String(value == null ? "" : value).trim();
  var map = {
    "关闭翻译": "off",
    "关闭": "off",
    "off": "off",
    "简体中文": "zh-Hans",
    "简中": "zh-Hans",
    "zh-Hans": "zh-Hans",
    "繁體中文": "zh-Hant",
    "繁体中文": "zh-Hant",
    "繁中": "zh-Hant",
    "zh-Hant": "zh-Hant",
    "英语": "en",
    "英文": "en",
    "en": "en",
    "日语": "ja",
    "日文": "ja",
    "ja": "ja",
    "韩语": "ko",
    "韩文": "ko",
    "ko": "ko"
  };
  return map[text] || text || "off";
}

async function __stashTranslateBody(bytes, options, url, httpClient, logger) {
  if (!(bytes instanceof Uint8Array) || !bytes.length) return bytes;
  var captionLanguage = __stashTrNormalizeLanguage(options && options.captionLang);
  var lyricLanguage = __stashTrNormalizeLanguage(options && options.lyricLang);
  var output = bytes;
  try {
    if (captionLanguage && captionLanguage !== "off" && /\/(?:player|next|get_watch)(?:\?|$)/.test(url)) {
      var captions = __stashTrRewriteSync(output, 51621377, function (payload) {
        return __stashTrCaptions(payload, captionLanguage);
      }, 0, 12);
      if (captions.changed) output = captions.bytes;
    }
    if (lyricLanguage && lyricLanguage !== "off" && /\/browse(?:\?|$)/.test(url) && __stashTrContainsAscii(output, "MPLYt")) {
      var lyrics = await __stashTrRewriteAsync(output, 465160965, function (payload) {
        return __stashTrTimedLyrics(payload, lyricLanguage, httpClient, logger);
      }, 0, 12);
      if (lyrics.changed) {
        output = lyrics.bytes;
      } else {
        var description = await __stashTrRewriteAsync(output, 221496734, function (payload) {
          return __stashTrDescription(payload, lyricLanguage, httpClient, logger);
        }, 0, 12);
        if (description.changed) output = description.bytes;
      }
    }
  } catch (error) {
    if (logger && logger.log) logger.log("YouTube Stash translate: " + error);
  }
  return output;
}

  async function __stashFinal(value) {
    if (__stashFinished) return;
    __stashFinished = true;
    var result = value && typeof value === "object" ? value : {};
    try {
      var url = (__stashRequest && __stashRequest.url) || "";
      var isBrowse = /^https?:\/\/youtubei\.googleapis\.com\/youtubei\/v1\/browse(?:\?.*)?$/i.test(url);
      if (isBrowse && __stashOption("homeFeedPatch", true)) {
        var body = __stashBytes(result.body) || __stashBytes(__stashResponse && __stashResponse.body);
        if (body) {
          var patched = __stashPatch(body);
          if (patched !== body) result = Object.assign({}, result, { body: patched });
        }
      }
    } catch (error) {
      __stashRealConsole.log("YouTube Stash response wrapper: " + error);
    }
    try {
      var translateUrl = (__stashRequest && __stashRequest.url) || "";
      var captionLanguage = __stashStringOption("captionLang", "off");
      var lyricLanguage = __stashStringOption("lyricLang", "off");
      if (captionLanguage !== "off" || lyricLanguage !== "off") {
        var translateBody = __stashBytes(result.body) || __stashBytes(__stashResponse && __stashResponse.body);
        var translateStatus = __stashResponse ? Number(__stashResponse.status) : 200;
        if (translateBody && !(translateStatus >= 300)) {
          var translated = await __stashTranslateBody(
            translateBody,
            { captionLang: captionLanguage, lyricLang: lyricLanguage },
            translateUrl,
            typeof $httpClient === "undefined" ? null : $httpClient,
            __stashRealConsole
          );
          if (translated && translated !== translateBody) {
            result = Object.assign({}, result, { body: translated });
          }
        }
      }
    } catch (error) {
      __stashRealConsole.log("YouTube Stash translation wrapper: " + error);
    }
    __stashRealDone(result);
  }
  try {
    (function ($done, $argument, $request, $response, $persistentStore, console) {
// Generated from modules/youtube/src/ and assets/; run npm run build --workspace youtube.
(() => {
  const ON_THE_GO_BUNDLE_TEMPLATE = "on_the_go_controls.eml-fe|f87c8ecdb154dadd";
  const ON_THE_GO_RESOURCES_BASE64 =
    "CteBAdqBiO8Fz4EBCj5lbmdhZ2VtZW50X3BhbmVsX2xhcmdlX3BsYXllcl9jb250cm9scy5lbWwtZmV8ZWFhNmUwNWM5MmU2ZWU3OBKJgQGyx86HBYGBARLzgAEKBAgGEAkKBAgHEAUKBAgKEAgKBAgYEA4KBAgZEAIKBAgfEA4KBAggEA4KBAgoEA4KBAgtEA4KBAgwEA4KBAgxEA4KBAgyEA4KBAg0EA4KBAg6EA4KBAg/EA4KBAhMEA4KBAhREA4KBAhUEA4KBAhVEA4KBAhZEA4SBAgBGAESiGIIAhgCIoFiGv5hChEIARINGgsKCQjEyOFMEgIaAAofCAISGxoZChcI65i9UBIQGg4KDAgHEggILTIECgIIAwrHYQgDEsJhWr9hCAESumEat2EKEQgBEg0aCwoJCKeU3EsSAhoACoEBCAISfRp7CnkIhIu9UBJyGnAKDAgKEggIMDIECgIIAQoMCAsSCAgxMgQKAggFCgwIDBIICDIyBAoCCAQKEAgCEgwaCgoICAESBBICCBAKDAgTEggINDIECgIIAQokCAkSIBoeChwIBxIYGhYKFAgBEhASDggEEgIIBBICCAESAggECp1gCAMSmGBalWAIARK6FiK3Fgq0FgoKUggIARIEEgIIFRKlFhqiFgoRCAESDRoLCgkIp5TcSxICGgAKLQgCEikaJwolCISLvVASHhocCgwIChIICDAyBAoCCAMKDAgMEggIMjIECgIIBArdFQgDEtgVWtUVCAES0BUazRUKtREIARKwERqtEQqqEQi5lNxLEqIRGp8RCpwRCAESlxEalBEKDAgCEggIOjIECgIIAgqzCQgBEq4JIqsJCjwKKFImCAESIkogCAESCAgHMgQKAggAGhJSEAgCEgwSCggGEgIIARICCDMSEBIOCAYSAggBEgIIMxICCAES6gha5wgIARLiCCLfCArmBwrMBlrJBggCEp0GWpoGCAISgQFafwgCEmBaXggCEiwSKggBEgIIAxICCAESDhoMCAcyCAoGCKPTn44CEgIIARIKGggIBzIECgIIBhIsEioIARICCAMSAggBEg0aCwgHMgcKBQie2L9GEgIIARILGgkIBzIFCgMI6gcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIigISkQVajgUIAxLOBFrLBAgDEosEWogECAMSyANaxQMIAxKFA1qCAwgDEsICWr8CCAMS/wFa/AEIAxK8AVq5AQgDEnpaeAgDEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAESGRIXCAESAggHEgYIiJfhpwESAggBEgMIpgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIAhIZEhcIARICCAcSBgiIl+GnARICCAESAwipAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggDEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKoCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAQSGRIXCAESAggHEgYIiJfhpwESAggBEgMIswISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBRIZEhcIARICCAcSBgiIl+GnARICCAESAwi9AhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggGEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL8CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxAISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIICBIZEhcIARICCAcSBgiIl+GnARICCAESAwjFAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggJEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMYCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAoSGRIXCAESAggHEgYIiJfhpwESAggBEgMI4QISJVIjCAESH0odCAESCAgHMgQKAggAGg9SDQgCEgkIKDIFCgMIgwMSlAEikQEKjgEKYFpeCAISLBIqCAESAggDEgIIARIOGgwIBzIICgYIo9OfjgISAggBEgoaCAgHMgQKAggGEiwSKggBEgIIAxICCAESDRoLCAcyBwoFCJ7Yv0YSAggBEgsaCQgHMgUKAwjqBxIqGigKJggGEiIaIAoeCOoHEhkaFwoVCAESERoPCg0IARIJCCgyBQoDCIMDEnQacgpwCAMSbBpqChAIAhIMEgoIBhICCAESAggCCiIIAxIeIhwKFAoMEgoIARICCAQSAggLEgQSAggIEgQSAggLCjIIARIuIiwKKgoeUhwIARIYShYIARIICAYyBAoCCgAaCAgGMgQKAgoAEggIBjIECgIKAArNBwgDEsgHGsUHCsIHCPmj3EkSugcatwcKtAcIBhKvByKsBwqpBwr+Blr7BggDEihSJggBEiJKIAgBEggIBzIECgIIABoSUhAIAhIMEgoIBhICCAESAggzEswGWskGCAISnQZamgYIAhKBAVp/CAISYFpeCAISLBIqCAESAggDEgIIARIOGgwIBzIICgYIo9OfjgISAggBEgoaCAgHMgQKAggGEiwSKggBEgIIAxICCAESDRoLCAcyBwoFCJ7Yv0YSAggBEgsaCQgHMgUKAwjqBxIZEhcIARICCAcSBgiIl+GnARICCAESAwiKAhKRBVqOBQgDEs4EWssECAMSiwRaiAQIAxLIA1rFAwgDEoUDWoIDCAMSwgJavwIIAxL/AVr8AQgDErwBWrkBCAMSelp4CAMSOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIARIZEhcIARICCAcSBgiIl+GnARICCAESAwimAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggCEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKkCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAMSGRIXCAESAggHEgYIiJfhpwESAggBEgMIqgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBBIZEhcIARICCAcSBgiIl+GnARICCAESAwizAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggFEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL0CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAYSGRIXCAESAggHEgYIiJfhpwESAggBEgMIvwISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBxIZEhcIARICCAcSBgiIl+GnARICCAESAwjEAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggIEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMUCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAkSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIChIZEhcIARICCAcSBgiIl+GnARICCAESAwjhAhIlUiMIARIfSh0IARIICAcyBAoCCAAaD1INCAISCQgoMgUKAwiDAxImGiQKIggBEh4iHAoUCgwSCggBEgIIBBICCAsSBBICCAgSBBICCAsKkgQIAhKNBBqKBApcCISLvVASVRpTChgIAhIUGhIKEAgBEgxSCggFEgYIBxICCAMKGAgDEhQaEgoQCAESDFIKCAUSBggHEgIIAwoPCA4SCwgZMgcKBQ0AAAAACgwIEBIICDIyBAoCCAIKzQEIuZe9UBLFARrCAQq/AQgBEroBIrcBCrQBCgwSCggBEgIIBBICCAsSowEaoAEKnQEI4KqfURKVARqSAQqPAQgBEooBWocBCAESdSJzCnEKLhIsCAESAggDEgIIARINGgsIBzIHCgUI/5zcexICCAESDRoLCAcyBwoFCJuNpXMSPxo9CjsIm42lcxI0GjIKDAgBEggITDIECgIIAQoQCAMSDBIKCAYSAggBEgIIBgoQCAISDBIKCAYSAggBEgIICBIMEgoIBhICCAESAggECj4IlZe9UBI3GjUKMwgGEi8aLQorCNygiloSJBoiCggIAhIEEgIIAwoMCAMSCAgKMgQKAggACggIARIEEgIICgp9COuYvVASdhp0CkAIBRI8IjoKHgoMEgoIARICCAQSAggLEg5aDAgBEggIUTIECgIIAhIYWhYIARIICFEyBAoCCAISCAhRMgQKAggHChAIARIMEgoIBhICCAESAggFChAIBBIMEgoIBhICCAESAggRCgwIBhIICAoyBAoCCAEKGwiWkelQEhQaEgoQCAESDBIKCAYSAggBEgIICBLfFSLcFQrZFQoKUggIARIEEgIIFRLKFRrHFQoRCAESDRoLCgkIp5TcSxICGgAKLQgCEikaJwolCISLvVASHhocCgwIChIICDAyBAoCCAMKDAgMEggIMjIECgIIBAqCFQgDEv0UWvoUCAES9RQa8hQK6hAIARLlEBriEArfEAi5lNxLEtcQGtQQCtEQCAESzBAayRAKDAgCEggIOjIECgIIAgqHCQgBEoIJIv8ICjwKKFImCAESIkogCAESCAgHMgQKAggAGhJSEAgCEgwSCggGEgIIAhICCDMSEBIOCAYSAggCEgIIMxICCAESvghauwgIARK2CCKzCArcBwrHBlrEBggCEp0GWpoGCAISgQFafwgCEmBaXggCEiwSKggBEgIIAxICCAESDhoMCAcyCAoGCKPTn44CEgIIARIKGggIBzIECgIIBhIsEioIARICCAMSAggBEg0aCwgHMgcKBQie2L9GEgIIARILGgkIBzIFCgMI6gcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIigISkQVajgUIAxLOBFrLBAgDEosEWogECAMSyANaxQMIAxKFA1qCAwgDEsICWr8CCAMS/wFa/AEIAxK8AVq5AQgDEnpaeAgDEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAESGRIXCAESAggHEgYIiJfhpwESAggBEgMIpgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIAhIZEhcIARICCAcSBgiIl+GnARICCAESAwipAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggDEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKoCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAQSGRIXCAESAggHEgYIiJfhpwESAggBEgMIswISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBRIZEhcIARICCAcSBgiIl+GnARICCAESAwi9AhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggGEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL8CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxAISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIICBIZEhcIARICCAcSBgiIl+GnARICCAESAwjFAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggJEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMYCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAoSGRIXCAESAggHEgYIiJfhpwESAggBEgMI4QISIFIeCAESGkoYCAESCAgHMgQKAggAGgpSCAgCEgQSAggZEo8BIowBCokBCmBaXggCEiwSKggBEgIIAxICCAESDhoMCAcyCAoGCKPTn44CEgIIARIKGggIBzIECgIIBhIsEioIARICCAMSAggBEg0aCwgHMgcKBQie2L9GEgIIARILGgkIBzIFCgMI6gcSJRojCiEIBhIdGhsKGQjqBxIUGhIKEAgBEgwaCgoICAESBBICCBkSUhpQCk4IAxJKGkgKCAgCEgQSAggYCggIAxIEEgIICAoyCAESLiIsCioKHlIcCAESGEoWCAESCAgGMgQKAgoAGggIBjIECgIKABIICAYyBAoCCgAKrgcIAxKpBxqmBwqjBwj5o9xJEpsHGpgHCpUHCAYSkAcijQcKigcK+QZa9gYIAxIoUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAYSAggCEgIIMxLHBlrEBggCEp0GWpoGCAISgQFafwgCEmBaXggCEiwSKggBEgIIAxICCAESDhoMCAcyCAoGCKPTn44CEgIIARIKGggIBzIECgIIBhIsEioIARICCAMSAggBEg0aCwgHMgcKBQie2L9GEgIIARILGgkIBzIFCgMI6gcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIigISkQVajgUIAxLOBFrLBAgDEosEWogECAMSyANaxQMIAxKFA1qCAwgDEsICWr8CCAMS/wFa/AEIAxK8AVq5AQgDEnpaeAgDEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAESGRIXCAESAggHEgYIiJfhpwESAggBEgMIpgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIAhIZEhcIARICCAcSBgiIl+GnARICCAESAwipAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggDEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKoCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAQSGRIXCAESAggHEgYIiJfhpwESAggBEgMIswISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBRIZEhcIARICCAcSBgiIl+GnARICCAESAwi9AhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggGEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL8CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxAISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIICBIZEhcIARICCAcSBgiIl+GnARICCAESAwjFAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggJEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMYCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAoSGRIXCAESAggHEgYIiJfhpwESAggBEgMI4QISIFIeCAESGkoYCAESCAgHMgQKAggAGgpSCAgCEgQSAggZEgwaCgoICAESBBICCAgKggQIAhL9Axr6AwpcCISLvVASVRpTChgIAhIUGhIKEAgBEgxSCggFEgYIBxICCAMKGAgDEhQaEgoQCAESDFIKCAUSBggHEgIIAwoPCA4SCwgZMgcKBQ0AAAAACgwIEBIICDIyBAoCCAIKyQEIuZe9UBLBARq+AQq7AQgBErYBIrMBCrABCggICjIECgIIARKjARqgAQqdAQjgqp9REpUBGpIBCo8BCAESigFahwEIARJ1InMKcQouEiwIARICCAMSAggBEg0aCwgHMgcKBQj/nNx7EgIIARINGgsIBzIHCgUIm42lcxI/Gj0KOwibjaVzEjQaMgoMCAESCAhMMgQKAggBChAIAxIMEgoIBhICCAISAggGChAIAhIMEgoIBhICCAISAggIEgwSCggGEgIIAhICCAQKPgiVl71QEjcaNQozCAYSLxotCisI3KCKWhIkGiIKCAgCEgQSAggDCgwIAxIICAoyBAoCCAAKCAgBEgQSAggKCnEI65i9UBJqGmgKPAgFEjgiNgoaCggICjIECgIIARIOWgwIARIICFEyBAoCCAISGFoWCAESCAhRMgQKAggCEggIUTIECgIIBwoICAESBBICCBYKEAgEEgwSCggGEgIIAhICCBEKDAgGEggICjIECgIIAQobCJaR6VASFBoSChAIARIMEgoIBhICCAISAggIEtIHGs8HChEIARINGgsKCQinlNxLEgIaAApfCAISWxpZClcIhIu9UBJQGk4KDAgKEggIMDIECgIIAwoMCAwSCAgyMgQKAggECgwICxIICDEyBAoCCAMKEAgDEgwaCgoICAESBBICCBIKEAgCEgwaCgoICAESBBICCBIK2AYIAxLTBlrQBggBEtcDItQDCtEDCgQSAggHEsgDGsUDChEIARINGgsKCQinlNxLEgIaAAqvAwgCEqoDGqcDCjsIhIu9UBI0GjIKDAgREggIVDIECgIIAgoQCAMSDBoKCggIARIEEgIIDgoQCAISDBoKCggIARIEEgIIDgrnAgiVl71QEt8CGtwCCggIBRIEEgIIDwrPAggBEsoCIscCCrABChpKGAgBEgoIVRIGCAQSAggGGggIVTIECgIIAhKRASKOAQpECihSJggBEiJKIAgBEggIBzIECgIIABoSUhAIAhIMEgoIBBICCAcSAghsEhgSFggEEgIIBxICCGwSChoICAcyBAoCCC8SRiJECjQKJFIiCAESHkocCAESCAgHMgQKAggAGg5SDAgCEggSBggEEgIIBxIMEgoIBBICCAcSAggvEgwSCggEEgIIARICCDcSkQEijgEKRAooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAQSAggHEgIIbBIYEhYIBBICCAcSAghsEgoaCAgHMgQKAggqEkYiRAo0CiRSIggBEh5KHAgBEggIBzIECgIIABoOUgwIAhIIEgYIBBICCAcSDBIKCAQSAggHEgIIKhIMEgoIBBICCAESAghJEvECGu4CCrABCAESqwEaqAEKpQEIoLrkpQESnAEamQEKEAgDEgwSCggBEgIIBBICCAcKKwgEEicaJQojCNaV6VASHBoaChgImtiVnAESEBoOCgwIARIICFkyBAoCCAEKKwgFEicaJQojCNaV6VASHBoaChgImtiVnAESEBoOCgwIARIICFkyBAoCCAIKKwgGEicaJQojCNaV6VASHBoaChgImtiVnAESEBoOCgwIARIICFkyBAoCCAcKuAEIAhKzARqwAQotCISLvVASJhokChAIAxIMGgoKCAgBEgQSAggMChAIAhIMGgoKCAgBEgQSAggMCj4IlZe9UBI3GjUKMwgGEi8aLQorCNygiloSJBoiCgwIAxIICAoyBAoCCAAKCAgCEgQSAggNCggIARIEEgIICgo/COuYvVASOBo2ChIIBRIOWgwIARIICFEyBAoCCAIKDAgGEggICjIECgIIAQoICAESBBICCBMKCAgEEgQSAggUEt8VItwVCtkVCgpSCAgBEgQSAggVEsoVGscVChEIARINGgsKCQinlNxLEgIaAAotCAISKRonCiUIhIu9UBIeGhwKDAgKEggIMDIECgIIAwoMCAwSCAgyMgQKAggECoIVCAMS/RRa+hQIARL1FBryFArqEAgBEuUQGuIQCt8QCLmU3EsS1xAa1BAK0RAIARLMEBrJEAoMCAISCAg6MgQKAggCCocJCAESggki/wgKPAooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAYSAggDEgIIMxIQEg4IBhICCAMSAggzEgIIARK+CFq7CAgBErYIIrMICtwHCscGWsQGCAISnQZamgYIAhKBAVp/CAISYFpeCAISLBIqCAESAggDEgIIARIOGgwIBzIICgYIo9OfjgISAggBEgoaCAgHMgQKAggGEiwSKggBEgIIAxICCAESDRoLCAcyBwoFCJ7Yv0YSAggBEgsaCQgHMgUKAwjqBxIZEhcIARICCAcSBgiIl+GnARICCAESAwiKAhKRBVqOBQgDEs4EWssECAMSiwRaiAQIAxLIA1rFAwgDEoUDWoIDCAMSwgJavwIIAxL/AVr8AQgDErwBWrkBCAMSelp4CAMSOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIARIZEhcIARICCAcSBgiIl+GnARICCAESAwimAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggCEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKkCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAMSGRIXCAESAggHEgYIiJfhpwESAggBEgMIqgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBBIZEhcIARICCAcSBgiIl+GnARICCAESAwizAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggFEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL0CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAYSGRIXCAESAggHEgYIiJfhpwESAggBEgMIvwISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBxIZEhcIARICCAcSBgiIl+GnARICCAESAwjEAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggIEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMUCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAkSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIChIZEhcIARICCAcSBgiIl+GnARICCAESAwjhAhIgUh4IARIaShgIARIICAcyBAoCCAAaClIICAISBBICCBsSjwEijAEKiQEKYFpeCAISLBIqCAESAggDEgIIARIOGgwIBzIICgYIo9OfjgISAggBEgoaCAgHMgQKAggGEiwSKggBEgIIAxICCAESDRoLCAcyBwoFCJ7Yv0YSAggBEgsaCQgHMgUKAwjqBxIlGiMKIQgGEh0aGwoZCOoHEhQaEgoQCAESDBoKCggIARIEEgIIGxJSGlAKTggDEkoaSAoICAISBBICCBoKCAgDEgQSAggICjIIARIuIiwKKgoeUhwIARIYShYIARIICAYyBAoCCgAaCAgGMgQKAgoAEggIBjIECgIKAAquBwgDEqkHGqYHCqMHCPmj3EkSmwcamAcKlQcIBhKQByKNBwqKBwr5Blr2BggDEihSJggBEiJKIAgBEggIBzIECgIIABoSUhAIAhIMEgoIBhICCAMSAggzEscGWsQGCAISnQZamgYIAhKBAVp/CAISYFpeCAISLBIqCAESAggDEgIIARIOGgwIBzIICgYIo9OfjgISAggBEgoaCAgHMgQKAggGEiwSKggBEgIIAxICCAESDRoLCAcyBwoFCJ7Yv0YSAggBEgsaCQgHMgUKAwjqBxIZEhcIARICCAcSBgiIl+GnARICCAESAwiKAhKRBVqOBQgDEs4EWssECAMSiwRaiAQIAxLIA1rFAwgDEoUDWoIDCAMSwgJavwIIAxL/AVr8AQgDErwBWrkBCAMSelp4CAMSOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIARIZEhcIARICCAcSBgiIl+GnARICCAESAwimAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggCEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKkCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAMSGRIXCAESAggHEgYIiJfhpwESAggBEgMIqgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBBIZEhcIARICCAcSBgiIl+GnARICCAESAwizAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggFEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL0CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAYSGRIXCAESAggHEgYIiJfhpwESAggBEgMIvwISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBxIZEhcIARICCAcSBgiIl+GnARICCAESAwjEAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggIEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMUCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAkSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIChIZEhcIARICCAcSBgiIl+GnARICCAESAwjhAhIgUh4IARIaShgIARIICAcyBAoCCAAaClIICAISBBICCBsSDBoKCggIARIEEgIICAqCBAgCEv0DGvoDClwIhIu9UBJVGlMKGAgCEhQaEgoQCAESDFIKCAUSBggHEgIIAwoYCAMSFBoSChAIARIMUgoIBRIGCAcSAggDCg8IDhILCBkyBwoFDQAAAAAKDAgQEggIMjIECgIIAgrJAQi5l71QEsEBGr4BCrsBCAEStgEiswEKsAEKCAgKMgQKAggBEqMBGqABCp0BCOCqn1ESlQEakgEKjwEIARKKAVqHAQgBEnUicwpxCi4SLAgBEgIIAxICCAESDRoLCAcyBwoFCP+c3HsSAggBEg0aCwgHMgcKBQibjaVzEj8aPQo7CJuNpXMSNBoyCgwIARIICEwyBAoCCAEKEAgDEgwSCggGEgIIAxICCAYKEAgCEgwSCggGEgIIAxICCAgSDBIKCAYSAggDEgIIBAo+CJWXvVASNxo1CjMIBhIvGi0KKwjcoIpaEiQaIgoICAISBBICCAMKDAgDEggICjIECgIIAAoICAESBBICCAoKcQjrmL1QEmoaaAo8CAUSOCI2ChoKCAgKMgQKAggBEg5aDAgBEggIUTIECgIIAhIYWhYIARIICFEyBAoCCAISCAhRMgQKAggHCggIARIEEgIIFwoQCAQSDBIKCAYSAggDEgIIEQoMCAYSCAgKMgQKAggBChsIlpHpUBIUGhIKEAgBEgwSCggGEgIIAxICCAgSuhYitxYKtBYKClIICAESBBICCBUSpRYaohYKEQgBEg0aCwoJCKeU3EsSAhoACi0IAhIpGicKJQiEi71QEh4aHAoMCAoSCAgwMgQKAggDCgwIDBIICDIyBAoCCAQK3RUIAxLYFVrVFQgBEtAVGs0VCrURCAESsBEarREKqhEIuZTcSxKiERqfEQqcEQgBEpcRGpQRCgwIAhIICDoyBAoCCAIKswkIARKuCSKrCQo8CihSJggBEiJKIAgBEggIBzIECgIIABoSUhAIAhIMEgoIBhICCAQSAggzEhASDggGEgIIBBICCDMSAggBEuoIWucICAES4ggi3wgK5gcKzAZayQYIAhKdBlqaBggCEoEBWn8IAhJgWl4IAhIsEioIARICCAMSAggBEg4aDAgHMggKBgij05+OAhICCAESChoICAcyBAoCCAYSLBIqCAESAggDEgIIARINGgsIBzIHCgUInti/RhICCAESCxoJCAcyBQoDCOoHEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCIoCEpEFWo4FCAMSzgRaywQIAxKLBFqIBAgDEsgDWsUDCAMShQNaggMIAxLCAlq/AggDEv8BWvwBCAMSvAFauQEIAxJ6WngIAxI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggBEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKYCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAISGRIXCAESAggHEgYIiJfhpwESAggBEgMIqQISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIAxIZEhcIARICCAcSBgiIl+GnARICCAESAwiqAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggEEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCLMCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAUSGRIXCAESAggHEgYIiJfhpwESAggBEgMIvQISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBhIZEhcIARICCAcSBgiIl+GnARICCAESAwi/AhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggHEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMQCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAgSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxQISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIICRIZEhcIARICCAcSBgiIl+GnARICCAESAwjGAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggKEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCOECEiVSIwgBEh9KHQgBEggIBzIECgIIABoPUg0IAhIJCCgyBQoDCPMCEpQBIpEBCo4BCmBaXggCEiwSKggBEgIIAxICCAESDhoMCAcyCAoGCKPTn44CEgIIARIKGggIBzIECgIIBhIsEioIARICCAMSAggBEg0aCwgHMgcKBQie2L9GEgIIARILGgkIBzIFCgMI6gcSKhooCiYIBhIiGiAKHgjqBxIZGhcKFQgBEhEaDwoNCAESCQgoMgUKAwjzAhJ0GnIKcAgDEmwaagoQCAISDBIKCAYSAggEEgIIAgoiCAMSHiIcChQKDBIKCAESAggEEgIIChIEEgIICBIEEgIICwoyCAESLiIsCioKHlIcCAESGEoWCAESCAgGMgQKAgoAGggIBjIECgIKABIICAYyBAoCCgAKzQcIAxLIBxrFBwrCBwj5o9xJEroHGrcHCrQHCAYSrwcirAcKqQcK/gZa+wYIAxIoUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAYSAggEEgIIMxLMBlrJBggCEp0GWpoGCAISgQFafwgCEmBaXggCEiwSKggBEgIIAxICCAESDhoMCAcyCAoGCKPTn44CEgIIARIKGggIBzIECgIIBhIsEioIARICCAMSAggBEg0aCwgHMgcKBQie2L9GEgIIARILGgkIBzIFCgMI6gcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIigISkQVajgUIAxLOBFrLBAgDEosEWogECAMSyANaxQMIAxKFA1qCAwgDEsICWr8CCAMS/wFa/AEIAxK8AVq5AQgDEnpaeAgDEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAESGRIXCAESAggHEgYIiJfhpwESAggBEgMIpgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIAhIZEhcIARICCAcSBgiIl+GnARICCAESAwipAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggDEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKoCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAQSGRIXCAESAggHEgYIiJfhpwESAggBEgMIswISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBRIZEhcIARICCAcSBgiIl+GnARICCAESAwi9AhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggGEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL8CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxAISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIICBIZEhcIARICCAcSBgiIl+GnARICCAESAwjFAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggJEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMYCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAoSGRIXCAESAggHEgYIiJfhpwESAggBEgMI4QISJVIjCAESH0odCAESCAgHMgQKAggAGg9SDQgCEgkIKDIFCgMI8wISJhokCiIIARIeIhwKFAoMEgoIARICCAQSAggKEgQSAggIEgQSAggLCpIECAISjQQaigQKXAiEi71QElUaUwoYCAISFBoSChAIARIMUgoIBRIGCAcSAggDChgIAxIUGhIKEAgBEgxSCggFEgYIBxICCAMKDwgOEgsIGTIHCgUNAAAAAAoMCBASCAgyMgQKAggCCs0BCLmXvVASxQEawgEKvwEIARK6ASK3AQq0AQoMEgoIARICCAQSAggKEqMBGqABCp0BCOCqn1ESlQEakgEKjwEIARKKAVqHAQgBEnUicwpxCi4SLAgBEgIIAxICCAESDRoLCAcyBwoFCP+c3HsSAggBEg0aCwgHMgcKBQibjaVzEj8aPQo7CJuNpXMSNBoyCgwIARIICEwyBAoCCAEKEAgDEgwSCggGEgIIBBICCAYKEAgCEgwSCggGEgIIBBICCAgSDBIKCAYSAggEEgIIBAo+CJWXvVASNxo1CjMIBhIvGi0KKwjcoIpaEiQaIgoICAISBBICCAMKDAgDEggICjIECgIIAAoICAESBBICCAoKfQjrmL1QEnYadApACAUSPCI6Ch4KDBIKCAESAggEEgIIChIOWgwIARIICFEyBAoCCAISGFoWCAESCAhRMgQKAggCEggIUTIECgIIBwoQCAESDBIKCAYSAggEEgIIBQoQCAQSDBIKCAYSAggEEgIIEQoMCAYSCAgKMgQKAggBChsIlpHpUBIUGhIKEAgBEgwSCggGEgIIBBICCAgSEAgDEAcYBCIICAcyBAoCCCQSVAgEGAQiTiJMCkAKLFIqCAESJkokCAESCAgHMgQKAggAGhZSFAgCEhASDggBEgIIBxIGCMul76cBEhASDggBEgIIBxIGCMul76cBEggSBggBEgIIAhIsCAUQChgEIiRSIggBEh5KHAgBEggIBzIECgIIABoOUgwIAhIIEgYIBBICCAkSnAIIBhgEIpUCIpICCoUCCiRSIggBEh5KHAgBEggIBzIECgIIABoOUgwIAhIIEgYIARICCAUS3AEa2QEKIwgBEh9SHQgEEhkSFwgBEgIIBRIDCJkSEgIIARIGCP/C7NsBCiMIAhIfUh0IBBIZEhcIARICCAUSAwiZEhICCAISBgj/wuzbAQojCAMSH1IdCAQSGRIXCAESAggFEgMImRISAggDEgYI/8Ls2wEKIwgEEh9SHQgEEhkSFwgBEgIIBRIDCJkSEgIIBBIGCP/C7NsBChUIBRIREg8IARICCAUSAwiZEhICCAUKFQgGEhESDwgBEgIIBRIDCJkSEgIIBgoVCAcSERIPCAESAggFEgMImRISAggHEggSBggBEgIIARIsCAcQChgEIiRSIggBEh5KHAgBEggIBzIECgIIABoOUgwIAhIIEgYIARICCAUSmAEICBgEIpEBIo4BCkQKKFImCAESIkogCAESCAgHMgQKAggAGhJSEAgCEgwSCggEEgIIBxICCGwSGBIWCAQSAggHEgIIbBIKGggIBzIECgIIRhJGIkQKNAokUiIIARIeShwIARIICAcyBAoCCAAaDlIMCAISCBIGCAQSAggHEgwSCggEEgIIBxICCEYSDBIKCAQSAggBEgIITxIrCAkQChgEIiNKIQgBEhMIGBIPCAESAggHEgMI7wcSAggBGggIGDIECgIIHRKnAQgKGAQioAEinQEKmgEKBBICCAkSkQEijgEKRAooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAQSAggHEgIIbBIYEhYIBBICCAcSAghsEgoaCAgHMgQKAggBEkYiRAo0CiRSIggBEh5KHAgBEggIBzIECgIIABoOUgwIAhIIEgYIBBICCAcSDBIKCAQSAggHEgIIARIMEgoIBBICCAESAghWEhIICxgEIgwSCggEEgIIARICCA4SkgEIDBAZGAQiiQEihgEKEwoEEgIIBxILCBkyBwoFDQAAMEISbyJtCl4KBBICCAUSViJUCkQKKFImCAESIkogCAESCAgHMgQKAggAGhJSEAgCEgwSCggEEgIICRICCCYSGBIWCAQSAggJEgIIJhIKGggIBzIECgIIAhIMEgoIBBICCAkSAggCEgsIGTIHCgUNAABgQhImCA0QBxgEIh4iHAoQCgQSAggHEggIBzIECgIIJBIICAcyBAoCCCwSEwgOEBkYBCILCBkyBwoFDQAAkEISEwgPEBkYBCILCBkyBwoFDQAAEEISEwgQEBkYBCILCBkyBwoFDQAAtEISHwgREAoYBCIXEhUIARICCAcSAwj+BxICCB8SBAjp0x0SJAgSEBkYBCIcIhoKGAoQWg4IAhIEEgIIERIEEgIIBxIEEgIIDhLHAQgTEAYYBCK+ASK7AQoqCh5KHAgBEg4IHxIKCAESAggEEgIIBxoICB8yBAoCCAISCBIGCAYSAggGCioKHkocCAESDggfEgoIARICCAQSAggHGggIHzIECgIIAxIIEgYIBhICCAUKKgoeShwIARIOCB8SCggBEgIIBBICCAcaCAgfMgQKAggHEggSBggGEgIIBQoqCh5KHAgBEg4IHxIKCAESAggEEgIIBxoICB8yBAoCCAYSCBIGCAYSAggHEgkIBjIFCgMKASASMggUEAYYBCIqCAYyJgokCiJpZC5wbGF5ZXJfY29udHJvbHMucGxheWJhY2suYnV0dG9uEhQIFRAKGAQiDBIKCAESAggEEgIIHhJSCBYQBhgEIkoiSAo4CihSJggBEiJKIAgBEggIBzIECgIIABoSUhAIAhIMEgoIARICCAQSAggREgwSCggBEgIIBBICCBESDBIKCAYSAggCEgIIBRJSCBcQBhgEIkoiSAo4CihSJggBEiJKIAgBEggIBzIECgIIABoSUhAIAhIMEgoIARICCAQSAggSEgwSCggBEgIIBBICCBISDBIKCAYSAggDEgIIBRL0AggYEAYYBCLrAiLoAgrWAgooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAESAggEEgIIDxKpAiKmAgovCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAESDRILCAQSAggDEgMI2AMKLwoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggCEg0SCwgEEgIIAxIDCJcBCi8KHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIAxINEgsIBBICCAMSAwjZAwovCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAQSDRILCAQSAggDEgMI2gMKLwoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggFEg0SCwgEEgIIAxIDCNsDCi8KHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIBhINEgsIBBICCAMSAwjcAxINEgsIBBICCAMSAwiXARLHBQgZECgYBCK+BSK7BQr8BAooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAESAggEEgIIDxLPBCLMBApgCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAESPiI8CjoKLRIrCAESAggDEgIIARIOGgwIBzIICgYIi5fg4wISAggBEgsaCQgHMgUKAwipAxIJCCgyBQoDCKkDCmAKHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIAhI+IjwKOgotEisIARICCAMSAggBEg4aDAgHMggKBgiLl+DjAhICCAESCxoJCAcyBQoDCKEDEgkIKDIFCgMIoQMKYAoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggDEj4iPAo6Ci0SKwgBEgIIAxICCAESDhoMCAcyCAoGCIuX4OMCEgIIARILGgkIBzIFCgMIowMSCQgoMgUKAwijAwpgCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAQSPiI8CjoKLRIrCAESAggDEgIIARIOGgwIBzIICgYIi5fg4wISAggBEgsaCQgHMgUKAwilAxIJCCgyBQoDCKUDCmAKHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIBRI+IjwKOgotEisIARICCAMSAggBEg4aDAgHMggKBgiLl+DjAhICCAESCxoJCAcyBQoDCKcDEgkIKDIFCgMIpwMKYAoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggGEj4iPAo6Ci0SKwgBEgIIAxICCAESDhoMCAcyCAoGCIuX4OMCEgIIARILGgkIBzIFCgMIqwMSCQgoMgUKAwirAwo6Ci0SKwgBEgIIAxICCAESDhoMCAcyCAoGCIuX4OMCEgIIARILGgkIBzIFCgMIoQMSCQgoMgUKAwihAxL0AggaEAYYBCLrAiLoAgrWAgooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAESAggEEgIIDxKpAiKmAgovCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAESDRILCAQSAggDEgMI3QMKLwoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggCEg0SCwgEEgIIAxIDCJgBCi8KHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIAxINEgsIBBICCAMSAwjeAwovCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAQSDRILCAQSAggDEgMI3wMKLwoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggFEg0SCwgEEgIIAxIDCOADCi8KHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIBhINEgsIBBICCAMSAwjhAxINEgsIBBICCAMSAwiYARLHBQgbECgYBCK+BSK7BQr8BAooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAESAggEEgIIDxLPBCLMBApgCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAESPiI8CjoKLRIrCAESAggDEgIIARIOGgwIBzIICgYIi5fg4wISAggBEgsaCQgHMgUKAwiqAxIJCCgyBQoDCKoDCmAKHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIAhI+IjwKOgotEisIARICCAMSAggBEg4aDAgHMggKBgiLl+DjAhICCAESCxoJCAcyBQoDCKIDEgkIKDIFCgMIogMKYAoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggDEj4iPAo6Ci0SKwgBEgIIAxICCAESDhoMCAcyCAoGCIuX4OMCEgIIARILGgkIBzIFCgMIpAMSCQgoMgUKAwikAwpgCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAQSPiI8CjoKLRIrCAESAggDEgIIARIOGgwIBzIICgYIi5fg4wISAggBEgsaCQgHMgUKAwimAxIJCCgyBQoDCKYDCmAKHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIBRI+IjwKOgotEisIARICCAMSAggBEg4aDAgHMggKBgiLl+DjAhICCAESCxoJCAcyBQoDCKgDEgkIKDIFCgMIqAMKYAoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggGEj4iPAo6Ci0SKwgBEgIIAxICCAESDhoMCAcyCAoGCIuX4OMCEgIIARILGgkIBzIFCgMIrAMSCQgoMgUKAwisAwo6Ci0SKwgBEgIIAxICCAESDhoMCAcyCAoGCIuX4OMCEgIIARILGgkIBzIFCgMIogMSCQgoMgUKAwiiAxifia7Q8M+r8T4wAQrkhwHagYjvBdyHAQoqb25fdGhlX2dvX2NvbnRyb2xzLmVtbC1mZXxmODdjOGVjZGIxNTRkYWRkErWFAbLHzocFrYUBEp6FAQoECAYQCQoECAsQCwoECBAQDgoECBEQCAoECBIQDgoECBQQDgoECBgQBQoECB0QDgoECB8QAgoECCUQDQoECCoQDgoECCsQDgoECDAQCwoECDEQDgoFCDIQ6gcKBAhGEA4KBAhHEA4KBAhJEA4KBAhKEA4KBAhOEA4KBAhVEA4KBAhpEA4KBQiBARAOCgUIggEQDgoFCIkBEA4KBQiMARAOCgUIkQEQDhIECAEYARKUZggCGAIijWYaimYKEQgBEg0aCwoJCMTI4UwSAhoACjQIAhIwGi4KEwi5l71QEgwaCgoICAMSBBICCEMKFwjrmL1QEhAaDgoMCAYSCAgRMgQKAggACr5lCAMSuWVatmUIARKxZRquZQoRCAESDRoLCgkIp5TcSxICGgAKigEIAhKFARqCAQpnCISLvVASYBpeCgwIChIICEYyBAoCCAMKDAgLEggIRzIECgIIBApACAISPBo6CjgIARI0IjIKKgoiWiAIAhIWWhQIAhIEEgIIBxIKUggIARIEEgIICRIEEgIIDxIEEgIIGRIEEgIIFwoXCOuYvVASEBoOCgwIBhIICBEyBAoCCAAKi2QIAxKGZFqDZAgBEpoeGpceChEIARINGgsKCQinlNxLEgIaAAplCAISYRpfCl0IhIu9UBJWGlQKDAgKEggIRjIECgIIAwoPCA0SCwgfMgcKBQ0AAABACgwIDBIICEkyBAoCCAQKJQgDEiEaHwoPCAESCwgfMgcKBQ0AAIA/CgwIAhIICEoyBAoCCAIKmh0IAxKVHVqSHQgBEo0dGoodChEIARINGgsKCQinlNxLEgIaAAqcAQgCEpcBGpQBCpEBCISLvVASiQEahgEKDAgKEggIRjIECgIIAwoMCAwSCAhJMgQKAggECkEICRI9GjsKOQgBEjUaMwoxCAESLSIrChwKBBICCAoSFBISCAESAggEEgIIBBICCAESAggDEgsIHzIHCgUNAAAAAAolCAMSIRofCg8IARILCB8yBwoFDQAAYD8KDAgCEggISjIECgIIAgrVGwgDEtAbWs0bCAESlQIikgIKjwIKMFouCAISJFIiCAESHkocCAESCAgYMgQKAggAGg5SDAgCEggSBggDEgIIBRIEEgIILxLaARrXAQpdCAESWRpXClUIuZTcSxJOGkwKSggBEkYaRAoQCAESDBIKCAMSAggFEgIIAQoMCAISCAhOMgQKAggDCiIIAxIeGhwKGgj5o9xJEhMaEQoPCAMSCwgfMgcKBQ0AACBBCnYIAhJyGnAKbgiEi71QEmcaZQoeCAMSGhoYCggIARIEEgIILAoMCAISCAhKMgQKAggCCggIEhIEEgIIIQooCAgSJBoiCiAIARIcGhoKGAgBEhQSEggBEgIIBBICCAQSAggBEgIIBAoPCA4SCwgfMgcKBQ0AAAAAEp4IGpsICs0HCAESyAcaxQcKwgcI3JTcSxK6Bxq3BwqQBwgBEosHYogHEvsGGvgGCgwIAxIIEgYIARICCAYKEQgCEg0SCwgBEgIIAxIDCO8HChEIARINEgsIARICCAMSAwjyBwoICAcSBBICCDAKDAgIEggIVTIECgIIQQoMCAkSCBIGCAESAggECoUGCAQSgAYa/QUKEAgBEgwSCggDEgIIARICCAEKEAgFEgwSCggDEgIIARICCAUK1gUIBhLRBSLOBQrLBQorEikIARICCAYSAggBEg0aCwgYMgcKBQjP77R7EgIIARIKGggIGDIECgIIChKbBVqYBQgBErQCYrECEqMCGqACChEIARINEgsIARICCAMSAwjyBwoRCAISDRILCAESAggDEgMI7wcKDAgDEggSBggBEgIIBgoICAQSBBICCDAKDAgGEggIVTIECgIIQQoMCAcSCBIGCAESAggECsMBCAUSvgEauwEKqgEIBRKlASKiAQpMCixSKggBEiZKJAgBEggIGDIECgIIABoWUhQIAhIQEg4IARICCAQSAggHEgIIbBIcEhoIARICCAQSAggHEgIIbBIKGggIGDIECgIIRhJSIlAKPAooUiYIARIiSiAIARIICBgyBAoCCAAaElIQCAISDBIKCAESAggEEgIIBxIQEg4IARICCAQSAggHEgIIRhIQEg4IARICCAQSAggBEgIITwoMCAESCAglMgQKAggAKJaakduv9ezy3AES3AIq2QIISBIMEgoIAxICCAESAggFGsICYr8CErECGq4CChEIARINEgsIARICCAMSAwjyBwoRCAISDRILCAESAggDEgMI7wcKDAgDEggSBggBEgIIBgoICAQSBBICCDAKDAgGEggIVTIECgIIQQoMCAcSCBIGCAESAggECtEBCAUSzAEayQEKDAgBEggSBghIEgIIAQoMCAISCBIGCEgSAggCCqoBCAUSpQEiogEKTAosUioIARImSiQIARIICBgyBAoCCAAaFlIUCAISEBIOCAESAggEEgIIBxICCGwSHBIaCAESAggEEgIIBxICCGwSChoICBgyBAoCCAYSUiJQCjwKKFImCAESIkogCAESCAgYMgQKAggAGhJSEAgCEgwSCggBEgIIBBICCAcSEBIOCAESAggEEgIIBxICCAYSEBIOCAESAggEEgIIARICCDgolpqR26/17PLcASBJKEoKFAgFEhAaDgoMCAMSCAhpMgQKAggFKMqn+8eRyseEOQoiCAISHiIcChAKBBICCAoSCAglMgQKAggDEggIJTIECgIIAQpJCAISRRpDCkEIhIu9UBI6GjgKKAgIEiQaIgogCAESHBoaChgIARIUEhIIARICCAQSAggEEgIIARICCAMKDAgQEggISTIECgIIAhK8Axq5AwrrAggBEuYCGuMCCuACCNyU3EsS2AIa1QIKxAIIARK/AmK8AhKuAhqrAgoRCAESDRILCAESAggDEgMI8gcKEQgCEg0SCwgBEgIIAxIDCO8HCgwIAxIIEgYIARICCAYKDAgEEggSBggDEgIIAgqqAQgFEqUBIqIBCkwKLFIqCAESJkokCAESCAgYMgQKAggAGhZSFAgCEhASDggBEgIIBBICCAcSAghsEhwSGggBEgIIBBICCAcSAghsEgoaCAgYMgQKAghIElIiUAo8CihSJggBEiJKIAgBEggIGDIECgIIABoSUhAIAhIMEgoIARICCAQSAggHEhASDggBEgIIBBICCAcSAghIEhASDggBEgIIBBICCAESAghOCggIBxIEEgIIMQoMCAgSCAhVMgQKAggZCgwICRIIEgYIARICCAQKFAgGEhAaDgoMCAMSCAhpMgQKAggFKNiMkrnOnfLviQEKDAgCEggIJTIECgIIAQpJCAISRRpDCkEIhIu9UBI6GjgKKAgIEiQaIgogCAESHBoaChgIARIUEhIIARICCAQSAggEEgIIARICCAEKDAgQEggISTIECgIIAhLQDSLNDQrKDQoQWg4IAxIEEgIIGxIEEgIIHBK1DRqyDQoRCAESDRoLCgkIp5TcSxICGgAKcAgCEmwaagpoCISLvVASYRpfCgwIChIICEYyBAoCCAEKDAgQEggISTIECgIIBApBCAgSPRo7CjkIARI1GjMKMQgBEi0iKwoTCgQSAggaEgsIHzIHCgUNAAAAABIUEhIIARICCAQSAggEEgIIARICCAMKqgwIAxKlDFqiDAgBEo0GIooGCocGCgQSAggbEv4FGvsFCssFCAESxgUawwUKwAUIua29UBK4BRq1BQo8CAMSOBo2CjQIspmEUhItGisKKQgBEiUIBjIhCh8KHWJhZGdlLmVtbC1mZXw1MjkxY2ZlYWJjZTM4YjJmCi0IBRIpGicKJQjH9N1cEh4aHAoMCAcSCBIGCAMSAggPCgwIBBIIEgYIARICCAMKxQQIBhLABBq9BAqrAgj3wvBZEqMCGqACCg8IAhILCBgyBwoFCMf03VwKjAIIARKHAjqEAgqIASKFAQqCAQooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMe0vuABGggIGDIECgIIABJWGlQKFAgBEhASDggBEgIIAxIGCMe0vuABCh4IAxIaOhgKCAgYMgQKAggECgwIGDIICgYIy6XvpwEKDQgEEgkIgQEyBAoCCAEKDQgGEgkIggEyBAoCCAEKdyJ1CnMKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASRxpFChQIARIQEg4IARICCAMSBgjC4q72AQoMCAISCAgYMgQKAggFChAIAxIMOgoKCAgYMgQKAggFCg0IBhIJCIIBMgQKAggCCo8BCJX+m7gBEoYBGoMBCg8IAhILCBgyBwoFCMf03VwKcAgBEmw6agpoImYKZAooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMe0vuABGggIGDIECgIIABI4GjYKFAgBEhASDggBEgIIAxIGCMe0vuABCh4IAhIaOhgKCAgYMgQKAggECgwIGDIICgYIy6XvpwEKewiW/pu4ARJzGnEKDwgCEgsIGDIHCgUIx/TdXApeCAESWiJYClYKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASKhooChQIARIQEg4IARICCAMSBgjC4q72AQoQCAISDDoKCggIGDIECgIIBQorCAISJxolCiMIhIu9UBIcGhoKGAgJEhQaEgoQCAcSDBoKCggIARIEEgIIHRKNBiKKBgqHBgoEEgIIHBL+BRr7BQrLBQgBEsYFGsMFCsAFCLmtvVASuAUatQUKPAgDEjgaNgo0CLKZhFISLRorCikIARIlCAYyIQofCh1iYWRnZS5lbWwtZmV8NTI5MWNmZWFiY2UzOGIyZgotCAUSKRonCiUIx/TdXBIeGhwKDAgHEggSBggDEgIIEAoMCAQSCBIGCAESAggDCsUECAYSwAQavQQKqwII98LwWRKjAhqgAgoPCAISCwgYMgcKBQjH9N1cCowCCAEShwI6hAIKiAEihQEKggEKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASVhpUChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAMSGjoYCggIGDIECgIIBAoMCBgyCAoGCMul76cBCg0IBBIJCIEBMgQKAggBCg0IBhIJCIIBMgQKAggBCncidQpzCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIwuKu9gEaCAgYMgQKAggAEkcaRQoUCAESEBIOCAESAggDEgYIwuKu9gEKDAgCEggIGDIECgIIBQoQCAMSDDoKCggIGDIECgIIBQoNCAYSCQiCATIECgIIAgqPAQiV/pu4ARKGARqDAQoPCAISCwgYMgcKBQjH9N1cCnAIARJsOmoKaCJmCmQKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASOBo2ChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAISGjoYCggIGDIECgIIBAoMCBgyCAoGCMul76cBCnsIlv6buAEScxpxCg8IAhILCBgyBwoFCMf03VwKXggBEloiWApWCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIwuKu9gEaCAgYMgQKAggAEioaKAoUCAESEBIOCAESAggDEgYIwuKu9gEKEAgCEgw6CgoICBgyBAoCCAUKKwgCEicaJQojCISLvVASHBoaChgICRIUGhIKEAgHEgwaCgoICAESBBICCB0Sjg4iiw4KiA4KBBICCBAS/w0a/A0KEQgBEg0aCwoJCKeU3EsSAhoACiIIAhIeGhwKGgiEi71QEhMaEQoPCA0SCwgfMgcKBQ0AAIA/CsINCAMSvQ1aug0IARKZAxqWAwoRCAESDRoLCgkIp5TcSxICGgAKygEIAhLFARrCAQqmAQiEi71QEp4BGpsBCgwIChIICEYyBAoCCAMKDAgMEggISTIECgIIBAolCAMSIRofCg8IARILCB8yBwoFDQAAgD8KDAgCEggISjIECgIIAgoQCAISDBoKCggIARIEEgIIEwpECAkSQBo+CjwIARI4GjYKNAgBEjAiLgosCiRSIggBEh5KHAgBEggIGDIECgIIABoOUgwIAhIIEgYIAxICCAgSBBICCBIKFwjrmL1QEhAaDgoMCAYSCAgRMgQKAggACrMBCAMSrgFaqwEIARKmARqjAQpVCAESURpPCk0InKzQ+AESRRpDCkEIARI9IjsKOQosEioIARICCAYSAggBEg4aDAgYMggKBgjijtGxAhICCAESChoICBgyBAoCCAESCQiJATIECgIIAQpKCAISRhpECkIIhIu9UBI7GjkKEAgCEgwaCgoICAESBBICCBEKJQgDEiEaHwoPCAESCwgfMgcKBQ0AAIA/CgwIAhIICEoyBAoCCAISmQoilgoKkwoKJFIiCAESHkocCAESCAgYMgQKAggAGg5SDAgCEggSBggDEgIICBLqCRrnCQrVBwgBEtAHGs0HCsoHCLmtvVASwgcavwcKSQgDEkUaQwpBCLKZhFISOho4CjYIARIy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iAEihQEKggEKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASVhpUChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAMSGjoYCggIGDIECgIIBwoMCBgyCAoGCMul76cBCg0IBBIJCIEBMgQKAggBCg0IBhIJCIIBMgQKAggBCpABCJX+m7gBEocBGoQBChAIAhIMCBgyCAoGCMiPqfUBCnAIARJsOmoKaCJmCmQKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASOBo2ChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAISGjoYCggIGDIECgIIBwoMCBgyCAoGCMul76cBCnwIlv6buAESdBpyChAIAhIMCBgyCAoGCMiPqfUBCl4IARJaIlgKVgooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMLirvYBGggIGDIECgIIABIqGigKFAgBEhASDggBEgIIAxIGCMLirvYBChAIAhIMOgoKCAgYMgQKAggDCjsIAhI3GjUKGgiEi71QEhMaEQoPCA0SCwgfMgcKBQ0AAIA/ChcIlZe9UBIQGg4KDAgHEggIETIECgIIABKlLxqiLwoRCAESDRoLCgkIp5TcSxICGgAKlwEIAhKSARqPAQp0CISLvVASbRprCgwIChIICEYyBAoCCAEKDAgLEggIRzIECgIIBQoMCAwSCAhJMgQKAggCCg0IExIJCJEBMgQKAggBCg8IDRILCB8yBwoFDQAAgD4KHwgJEhsaGQoXCAcSExoRCg8IARILCB8yBwoFDQAAwEEKFwjrmL1QEhAaDgoMCAYSCAgRMgQKAggACvItCAMS7S1a6i0IARKZByKWBwqTBwokUiIIARIeShwIARIICBgyBAoCCAAaDlIMCAISCBIGCAMSAggNEuoGGucGChEIARINGgsKCQinlNxLEgIaAApVCAISURpPCk0IhIu9UBJGGkQKEAgEEgwaCgoICAESBBICCEYKEAgDEgwaCgoICAESBBICCB8KEAgCEgwaCgoICAESBBICCB8KDAgMEggISTIECgIIBAr6BQgDEvUFWvIFCAES7QUa6gUK5wUIARLiBRrfBQrcBQi5rb1QEtQFGtEFCkYIAxJCGkAKPgiymYRSEjcaNQozCAESLwgGMisKKQonZG93bmxvYWRfYnV0dG9uLmVtbC1mZXwxMzUyNjFhZDcwMjU4NDM5CjwIBRI4GjYKNAjEosiCARIsGioKDAgKEggSBggDEgIIDQoMCAMSCBIGCAESAggECgwIBhIIEgYIARICCAMKyAQIBhLDBBrABAqsAgj3wvBZEqQCGqECChAIAhIMCBgyCAoGCMSiyIIBCowCCAEShwI6hAIKiAEihQEKggEKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASVhpUChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAMSGjoYCggIGDIECgIIBgoMCBgyCAoGCMul76cBCg0IBBIJCIEBMgQKAggBCg0IBhIJCIIBMgQKAggBCncidQpzCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIwuKu9gEaCAgYMgQKAggAEkcaRQoUCAESEBIOCAESAggDEgYIwuKu9gEKDAgCEggIGDIECgIICQoQCAMSDDoKCggIGDIECgIICQoNCAYSCQiCATIECgIIAgqQAQiV/pu4ARKHARqEAQoQCAISDAgYMggKBgjEosiCAQpwCAESbDpqCmgiZgpkCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIx7S+4AEaCAgYMgQKAggAEjgaNgoUCAESEBIOCAESAggDEgYIx7S+4AEKHggCEho6GAoICBgyBAoCCAYKDAgYMggKBgjLpe+nAQp8CJb+m7gBEnQacgoQCAISDAgYMggKBgjEosiCAQpeCAESWiJYClYKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASKhooChQIARIQEg4IARICCAMSBgjC4q72AQoQCAISDDoKCggIGDIECgIICRKvCRqsCQrRBwgBEswHGskHCsYHCLmtvVASvgcauwcKSQgDEkUaQwpBCLKZhFISOho4CjYIARIyCAYyLgosCip2aWRlb19hY3Rpb25fYnV0dG9uLmVtbC1mZXxhOTZlY2NiNjc4NmVhMzMKdggFEnIacApuCLr3oK0BEmYaZAoQCAUSDBoKCggIEBIEEgIIQgo0CAcSMAgGMiwKKgoob25fdGhlX2dvX2NvbnRyb2xzX2VuYWJsZW1lbnRfZW50aXR5X2tleQoMCAESCBIGCAESAggECgwICxIIEgYIARICCAMK9QUIBhLwBRrtBQrZAwj3wvBZEtEDGs4DChAIAhIMCBgyCAoGCLr3oK0BCrkDCAEStAM6sQMKqgEipwEKpAEKSEpGCAYSOAgYUjQIAxIwCAYyLAoqCihvbl90aGVfZ29fY29udHJvbHNfZW5hYmxlbWVudF9lbnRpdHlfa2V5GggIGDIECgIIABJYGlYKNAgBEjAIBjIsCioKKG9uX3RoZV9nb19jb250cm9sc19lbmFibGVtZW50X2VudGl0eV9rZXkKDAgCEggIGDIECgIIBgoQCAMSDDoKCggIGDIECgIIBgp3InUKcwooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMLirvYBGggIGDIECgIIABJHGkUKFAgBEhASDggBEgIIAxIGCMLirvYBCgwIAhIICBgyBAoCCAgKEAgDEgw6CgoICBgyBAoCCAgKDQgGEgkIggEyBAoCCAIKiAEihQEKggEKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASVhpUChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAMSGjoYCggIGDIECgIICwoMCBgyCAoGCMul76cBCg0IBBIJCIEBMgQKAggBCg0IBhIJCIIBMgQKAggBCpABCJX+m7gBEocBGoQBChAIAhIMCBgyCAoGCLr3oK0BCnAIARJsOmoKaCJmCmQKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASOBo2ChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAISGjoYCggIGDIECgIICwoMCBgyCAoGCMul76cBCnwIlv6buAESdBpyChAIAhIMCBgyCAoGCLr3oK0BCl4IARJaIlgKVgooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMLirvYBGggIGDIECgIIABIqGigKFAgBEhASDggBEgIIAxIGCMLirvYBChAIAhIMOgoKCAgYMgQKAggICjUIBBIxCAYyLQorCilhdWRpb190b2dnbGVfb25seV92aWRlb19hY3Rpb25fYnV0dG9uX2tleQqeAQgCEpkBGpYBCkkIhIu9UBJCGkAKCAgOEgQSAghFChAIBBIMGgoKCAgBEgQSAghGChAIAxIMGgoKCAgBEgQSAghHChAI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ZW5hYmxlbWVudF9lbnRpdHlfa2V5CgwIAhIICBgyBAoCCAYKEAgDEgw6CgoICBgyBAoCCAYKdyJ1CnMKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASRxpFChQIARIQEg4IARICCAMSBgjC4q72AQoMCAISCAgYMgQKAggIChAIAxIMOgoKCAgYMgQKAggICg0IBhIJCIIBMgQKAggCCogBIoUBCoIBCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIx7S+4AEaCAgYMgQKAggAElYaVAoUCAESEBIOCAESAggDEgYIx7S+4AEKHggDEho6GAoICBgyBAoCCAsKDAgYMggKBgjLpe+nAQoNCAQSCQiBATIECgIIAQoNCAYSCQiCATIECgIIAQqQAQiV/pu4ARKHARqEAQoQCAISDAgYMggKBgi696CtAQpwCAESbDpqCmgiZgpkCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIx7S+4AEaCAgYMgQKAggAEjgaNgoUCAESEBIOCAESAggDEgYIx7S+4AEKHggCEho6GAoICBgyBAoCCAsKDAgYMggKBgjLpe+nAQp8CJb+m7gBEnQacgoQCAISDAgYMggKBgi696CtAQpeCAESWiJYClYKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASKhooChQIARIQEg4IARICCAMSBgjC4q72AQoQCAISDDoKCggIGDIECgIICAotCAQSKQgGMiUKIwohdmFyaXNwZWVkX3ZpZGVvX2FjdGlvbl9idXR0b25fa2V5CrIBCAISrQEaqgEKSQiEi71QEkIaQAoICA4SBBICCEUKEAgEEgwaCgoICAESBBICCEYKEAgDEgwaCgoICAESBBICCEcKEAgCEgwaCgoICAESBBICCB4KXQiVl71QElYaVApSCAYSThpMCkoIkKzckgESQhpACjQIARIwUi4IARIqSigIARIICBgyBAoCCAAaGlIYCAISFBISCAMSAggJEgYI/8Ls2wESAggECggIAxIEEgIIIBK7CRq4CQrVBwgBEtAHGs0HCsoHCLmtvVASwgcavwcKSQgDEkUaQwpBCLKZhFISOho4CjYIARIyCAYyLgosCip2aWRlb19hY3Rpb25fYnV0dG9uLmVtbC1mZXxhOTZlY2NiNjc4NmVhMzMKeggFEnYadApyCLr3oK0BEmoaaAoUCAUSEBoOCgwIEBIIEgYIAxICCAcKDAgBEggSBggBEgIIBAo0CAcSMAgGMiwKKgoob25fdGhlX2dvX2NvbnRyb2xzX2VuYWJsZW1lbnRfZW50aXR5X2tleQoMCAsSCBIGCAESAggDCvUFCAYS8AUa7QUK2QMI98LwWRLRAxrOAwoQCAISDAgYMggKBgi696CtAQq5AwgBErQDOrEDCqoBIqcBCqQBCkhKRggGEjgIGFI0CAMSMAgGMiwKKgoob25fdGhlX2dvX2NvbnRyb2xzX2VuYWJsZW1lbnRfZW50aXR5X2tleRoICBgyBAoCCAASWBpWCjQIARIwCAYyLAoqCihvbl90aGVfZ29fY29udHJvbHNfZW5hYmxlbWVudF9lbnRpdHlfa2V5CgwIAhIICBgyBAoCCAYKEAgDEgw6CgoICBgyBAoCCAYKdyJ1CnMKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASRxpFChQIARIQEg4IARICCAMSBgjC4q72AQoMCAISCAgYMgQKAggIChAIAxIMOgoKCAgYMgQKAggICg0IBhIJCIIBMgQKAggCCogBIoUBCoIBCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIx7S+4AEaCAgYMgQKAggAElYaVAoUCAESEBIOCAESAggDEgYIx7S+4AEKHggDEho6GAoICBgyBAoCCAsKDAgYMggKBgjLpe+nAQoNCAQSCQiBATIECgIIAQoNCAYSCQiCATIECgIIAQqQAQiV/pu4ARKHARqEAQoQCAISDAgYMggKBgi696CtAQpwCAESbDpqCmgiZgpkCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIx7S+4AEaCAgYMgQKAggAEjgaNgoUCAESEBIOCAESAggDEgYIx7S+4AEKHggCEho6GAoICBgyBAoCCAsKDAgYMggKBgjLpe+nAQp8CJb+m7gBEnQacgoQCAISDAgYMggKBgi696CtAQpeCAESWiJYClYKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASKhooChQIARIQEg4IARICCAMSBgjC4q72AQoQCAISDDoKCggIGDIECgIICAopCAQSJQgGMiEKHwodcXVldWVfdmlkZW9fYWN0aW9uX2J1dHRvbl9rZXkKsgEIAhKtARqqAQpJCISLvVASQhpACggIDhIEEgIIRQoQCAQSDBoKCggIARIEEgIIRgoQCAMSDBoKCggIARIEEgIIRwoQCAISDBoKCggIARIEEgIIHgpdCJWXvVASVhpUClIIBhJOGkwKSgiQrNySARJCGkAKNAgBEjBSLggBEipKKAgBEggIGDIECgIIABoaUhgIAhIUEhIIAxICCAcSBgj/wuzbARICCAQKCAgDEgQSAgggEhMIAxgEIg0SCwgBEgIIARIDCJUSEjkIBBAGGAQiMQgGMi0KKwopL3lvdXR1YmUvYXBwL29uX3RoZV9nb19tZW51X3RyaWdnZXJfc3RhdGUSNwgFEAYYBCIvCAYyKwopCicveW91dHViZS9hcHAvb25fdGhlX2dvX2F1ZGlvX29ubHlfc3RhdGUSQAgGEAsYBCI4GjYKNAjWlelQEi0aKwopCLXhn48BEiEaHwodCAISGRoXChUIAxIRCAYyDQoLCglvbi10aGUtZ28SJggHEBEYBCIeShwIARIOCBASCggBEgIIBRICCAUaCAgQMgQKAggAEiYICBARGAQiHkocCAESDggQEgoIARICCAUSAggFGggIEDIECgIIARImCAkQERgEIh5KHAgBEg4IEhIKCAESAggFEgIIBhoICBIyBAoCCAESVAgKEBEYBCJMWkoIAxIiSiAIARISCBQSDggBEgIIBRICCAMSAggBGggIFDIECgIIAxIiSiAIARISCBQSDggBEgIIBRICCAMSAggBGggIFDIECgIIBBJUCAsQERgEIkxaSggDEiJKIAgBEhIIFBIOCAESAggFEgIIAxICCAEaCAgUMgQKAggBEiJKIAgBEhIIFBIOCAESAggFEgIIAxICCAEaCAgUMgQKAggCEhgIDBARGAQiEFoOCAISBBICCAsSBBICCAgSZwgNEBEYBCJfIl0KUQorEikIARICCAYSAggBEg0aCwgYMgcKBQjd5bR7EgIIARIKGggIGDIECgIIChIiSiAIARISCB0SDggBEgIIBRICCAoSAggDGggIHTIECgIIAxIICBEyBAoCCAASGAgOEB8YBCIQEg4IARICCAUSAggEEgIIAhIyCA8QERgEIipKKAgEEhIIHxIO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";

  const textEncoder = new TextEncoder();
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  const schema = {
    Browse: [
      [9, "content", "BrowseContent"],
      [10, "onResponseReceivedAction", "BrowseContent"],
    ],
    BrowseContent: [
      [58173949, "singleColumnResultsRenderer", "SingleColumnResultsRenderer"],
      [153515154, "elementRenderer", "ElementRenderer"],
      [49399797, "sectionListRenderer", "SectionListRenderer"],
    ],
    SingleColumnResultsRenderer: [[1, "tabs", "BrowseTabSupportedRenderer", true]],
    BrowseTabSupportedRenderer: [[58174010, "tabRenderer", "TabRenderer"]],
    TabRenderer: [
      [1, "endpoint", "TabEndpoint"],
      [4, "content", "BrowseContent"],
    ],
    TabEndpoint: [[48687626, "browse", "TabBrowseEndpoint"]],
    TabBrowseEndpoint: [[3, "params", "string"]],
    ElementRenderer: [[172660663, "videoRendererContent", "VideoRendererContent"]],
    VideoRendererContent: [
      [1, "richItemContents", "VideoInfo", true],
      [2, "renderInfo", "RenderInfo"],
    ],
    VideoInfo: [[168777401, "videoContext", "VideoContext"]],
    VideoContext: [
      [3, "layout", "ElementLayout"],
      [5, "videoContent", "VideoContent"],
    ],
    ElementLayout: [[172035250, "layoutRender", "LayoutRender"]],
    VideoContent: [
      [413471385, "element", "ElementModel"],
      [512694658, "smartSkipButton", "SmartSkipButton"],
      [232954548, "videoLockup", "VideoLockup"],
      [454362329, "sponsoredVideo", "bytes"],
      [491441836, "sponsoredDisplay", "bytes"],
    ],
    ElementModel: [[1, "data", "ElementData"]],
    ElementData: [[1829, "shoppingShelf", "bytes"]],
    SmartSkipButton: [
      [1, "actions", "SmartSkipActions"],
      [13, "controller", "SmartSkipController"],
      [17, "displayLimit", "uint"],
    ],
    SmartSkipActions: [[3, "items", "SmartSkipAction", true]],
    SmartSkipAction: [[9, "displayLimit", "uint"]],
    SmartSkipController: [[7, "promotionMode", "bool"]],
    VideoLockup: [
      [33, "attachments", "Attachment", true],
      [34, "attachmentStateKey", "bytes"],
    ],
    Attachment: [[9, "products", "bytes", true]],
    RenderInfo: [[183314536, "layoutRender", "LayoutRender"]],
    LayoutRender: [[1, "eml", "string"]],
    SectionListRenderer: [
      [1, "sectionListSupportedRenderers", "SectionListSupportedRenderer", true],
      [32, "promotedContents", "bytes", true],
    ],
    SectionListSupportedRenderer: [
      [50195462, "itemSectionRenderer", "ItemSectionRenderer"],
      [51845067, "shelfRenderer", "ShelfRenderer"],
    ],
    ItemSectionRenderer: [[1, "richItemContents", "RichItemContent", true]],
    RichItemContent: [[153515154, "videoWithContextRenderer", "ElementRenderer"]],
    ShelfRenderer: [[5, "richSectionContent", "RichSectionContent"]],
    RichSectionContent: [[51431404, "reelShelfRenderer", "ReelShelfRenderer"]],
    ReelShelfRenderer: [[1, "richItemContents", "RichItemContent", true]],
    Next: [
      [7, "content", "NextContent"],
      [8, "onResponseReceivedAction", "BrowseContent"],
      [14, "playerOverlays", "PlayerOverlays"],
      [25, "engagementPanels", "EngagementPanel", true],
      [777, "frameworkUpdates", "bytes"],
    ],
    EngagementPanel: [[138681066, "renderer", "EngagementPanelRenderer"]],
    EngagementPanelRenderer: [[3, "content", "BrowseContent"]],
    NextContent: [[51779735, "nextResult", "NextResult"]],
    NextResult: [[1, "content", "BrowseContent"]],
    PlayerOverlays: [[78882851, "renderer", "PlayerOverlayRenderer"]],
    PlayerOverlayRenderer: [
      [2, "overflowMenu", "bytes"],
      [3, "related", "RelatedOverlay"],
      [42, "overlayCollections", "OverlayCollection", true],
    ],
    OverlayCollection: [[401855120, "renderer", "OverlayCollectionRenderer"]],
    OverlayCollectionRenderer: [[2, "overlays", "OverlayItem", true]],
    OverlayItem: [[401855122, "content", "OverlayContent"]],
    OverlayContent: [[1, "item", "RichItemContent"]],
    RelatedOverlay: [[29209665, "contents", "RelatedOverlayContents"]],
    RelatedOverlayContents: [[2, "contents", "RichItemContent", true]],
    Player: [
      [15, "playerConfig", "PlayerConfig"],
      [60, "overlayCollections", "OverlayCollection", true],
      [61, "paidPromotion", "bytes"],
      [7, "adPlacements", "bytes", true],
      [2, "playabilityStatus", "PlayabilityStatus"],
      [9, "playbackTracking", "PlaybackTracking"],
      [68, "adSlots", "bytes", true],
    ],
    PlayerConfig: [[1, "granularVariableSpeedConfig", "PlaybackSpeedConfig"]],
    PlaybackSpeedConfig: [
      [1, "minimumPlaybackRate", "uint"],
      [2, "maximumPlaybackRate", "uint"],
    ],
    PlayabilityStatus: [
      [21, "pictureInPictureRender", "PictureInPictureSupportedRenderer"],
      [11, "backgroundPlayerRender", "BackgroundSupportedRenderer"],
    ],
    PictureInPictureSupportedRenderer: [[151635310, "pictureInPictureAbility", "PictureInPictureAbility"]],
    PictureInPictureAbility: [
      [1, "active", "bool"],
      [4, "f4", "uint"],
      [6, "f6", "uint"],
      [8, "f8", "uint"],
    ],
    BackgroundSupportedRenderer: [[64657230, "backgroundAbility", "BackgroundAbility"]],
    BackgroundAbility: [[1, "active", "bool"]],
    PlaybackTracking: [[18, "pageadViewthroughconversion", "bytes"]],
    Search: [
      [4, "content", "BrowseContent"],
      [7, "onResponseReceivedCommand", "OnResponseReceivedCommand"],
    ],
    OnResponseReceivedCommand: [
      [50195462, "itemSectionRenderer", "ItemSectionRenderer"],
      [49399797, "appendContinuationItemsAction", "SectionListRenderer"],
    ],
    Shorts: [[2, "entries", "Entry", true]],
    Entry: [[1, "command", "Command"]],
    Command: [[139608561, "reelWatchEndpoint", "ReelWatchEndpoint"]],
    ReelWatchEndpoint: [[16, "adClientParams", "AdClientParams"]],
    AdClientParams: [[1, "isAd", "bool"]],
    Guide: [
      [4, "labelItems", "GuideItem", true],
      [6, "iconItems", "GuideItem", true],
    ],
    GuideItem: [[117866661, "guideSectionRenderer", "GuideSectionRenderer"]],
    GuideSectionRenderer: [[1, "rendererItems", "RendererItem", true]],
    RendererItem: [
      [318370163, "iconRender", "guideEntryRenderer"],
      [117501096, "labelRender", "guideEntryRenderer"],
    ],
    guideEntryRenderer: [[1, "browseId", "string"]],
    Setting: [
      [6, "settingItems", "SettingItem", true],
      [7, "collectionItems", "SettingItem", true],
    ],
    SettingItem: [
      [88478200, "backgroundPlayBackSettingRenderer", "BackgroundPlayBackSettingRenderer"],
      [66930374, "settingCategoryCollectionRenderer", "SettingCategoryCollectionRenderer"],
    ],
    BackgroundPlayBackSettingRenderer: [
      [2, "backgroundPlayback", "bool"],
      [14, "icon", "Icon"],
    ],
    Icon: [[1, "iconType", "uint"]],
    SettingCategoryCollectionRenderer: [
      [3, "subSettings", "SubSetting", true],
      [4, "categoryId", "uint"],
    ],
    SubSetting: [[61331416, "settingBooleanRenderer", "SettingBooleanRenderer"]],
    SettingBooleanRenderer: [
      [5, "enableServiceEndpoint", "ServiceEndpoint"],
      [6, "disableServiceEndpoint", "ServiceEndpoint"],
      [15, "itemId", "uint"],
    ],
    ServiceEndpoint: [[81212182, "setClientSettingEndpoint", "SetClientSettingEndpoint"]],
    SetClientSettingEndpoint: [[1, "settingData", "SettingData"]],
    SettingData: [
      [1, "clientSettingEnum", "ClientSettingEnum"],
      [3, "boolValue", "bool"],
    ],
    ClientSettingEnum: [[1, "item", "uint"]],
    Watch: [[1, "contents", "WatchContent", true]],
    ResolveUrl: [[2, "endpoint", "NavigationEndpoint"]],
    NavigationEndpoint: [[48687757, "watch", "NavigationWatch"]],
    NavigationWatch: [[68146959, "embedded", "EmbeddedPlayer"]],
    EmbeddedPlayer: [[68202535, "response", "EmbeddedPlayerBody"]],
    EmbeddedPlayerBody: [[1, "player", "Player"]],
    WatchContent: [
      [2, "player", "Player"],
      [3, "next", "Next"],
    ],
  };
  const contentTypes = new Set([
    "Browse",
    "BrowseContent",
    "BrowseTabSupportedRenderer",
    "ElementRenderer",
    "EmbeddedPlayer",
    "EmbeddedPlayerBody",
    "EngagementPanel",
    "EngagementPanelRenderer",
    "ItemSectionRenderer",
    "NavigationEndpoint",
    "NavigationWatch",
    "Next",
    "NextContent",
    "NextResult",
    "OnResponseReceivedCommand",
    "OverlayCollection",
    "OverlayCollectionRenderer",
    "OverlayContent",
    "OverlayItem",
    "Player",
    "PlayerOverlayRenderer",
    "PlayerOverlays",
    "ReelShelfRenderer",
    "RelatedOverlay",
    "RelatedOverlayContents",
    "ResolveUrl",
    "RichItemContent",
    "RichSectionContent",
    "Search",
    "SectionListRenderer",
    "SectionListSupportedRenderer",
    "ShelfRenderer",
    "SingleColumnResultsRenderer",
    "TabRenderer",
    "VideoContent",
    "VideoContext",
    "VideoInfo",
    "VideoLockup",
    "VideoRendererContent",
    "Watch",
    "WatchContent",
  ]);

  const CONFIG_KEY = "YouTubeConfig";
  const QUALITY_KEY = "YouTubeQuality";
  function readConfig(key = CONFIG_KEY, limit = Infinity) {
    // I/O errors must propagate: a failed read is not an empty configuration.
    const stored = $persistentStore.read(key);
    if (typeof stored === "string" && stored.length > limit) return {};
    try {
      const value = JSON.parse(stored || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }
  function writeConfig(config, key = CONFIG_KEY) {
    return $persistentStore.write(JSON.stringify(config), key);
  }

  function concatBytes(chunks) {
    const result = new Uint8Array(chunks.reduce((n, b) => n + b.length, 0));
    let offset = 0;
    for (const bytes of chunks) {
      result.set(bytes, offset);
      offset += bytes.length;
    }
    return result;
  }
  function sameBytes(a, b) {
    return a === b || (a.length === b.length && a.every((value, i) => value === b[i]));
  }
  function varint(value) {
    const bytes = [];
    do {
      bytes.push((value % 128) | (value > 127 ? 128 : 0));
      value = Math.floor(value / 128);
    } while (value);
    return new Uint8Array(bytes);
  }

  function wireFields(bytes) {
    const fields = [];
    let offset = 0;
    function read() {
      let value = 0,
        scale = 1;
      for (let i = 0; i < 5; i++) {
        if (offset >= bytes.length) throw new Error("Truncated protobuf varint");
        const byte = bytes[offset++];
        value += (byte & 127) * scale;
        if (!(byte & 128)) {
          if (value > 0xffffffff) throw new Error("Protobuf length/tag overflow");
          return value;
        }
        scale *= 128;
      }
      throw new Error("Invalid protobuf varint");
    }
    while (offset < bytes.length) {
      const start = offset,
        tag = read(),
        no = Math.floor(tag / 8),
        wire = tag % 8;
      if (!no) throw new Error("Invalid protobuf field");
      let payloadStart = offset;
      if (wire === 2) {
        const length = read();
        payloadStart = offset;
        offset += length;
      } else if (wire === 1) offset += 8;
      else if (wire === 5) offset += 4;
      else if (wire === 0) {
        let count = 0,
          byte;
        do {
          if (offset >= bytes.length || count++ === 10) throw new Error("Invalid protobuf integer");
          byte = bytes[offset++];
          if (count === 10 && byte > 1) throw new Error("Protobuf integer overflow");
        } while (byte & 128);
      } else throw new Error("Unsupported protobuf wire type " + wire);
      if (offset > bytes.length) throw new Error("Truncated protobuf field");
      fields.push({
        no,
        wire,
        data: bytes.subarray(payloadStart, offset),
        raw: bytes.subarray(start, offset),
      });
    }
    return fields;
  }

  function readInteger(bytes) {
    let value = 0,
      scale = 1;
    for (const byte of bytes) {
      value += (byte & 127) * scale;
      scale *= 128;
    }
    return value;
  }

  function readOptions(defaults = {}) {
    return { ...defaults, ...parseArguments() };
  }
  // $argument is a string in Surge (JSON), an object in Loon ($argument.xxx).
  function parseArguments() {
    if (typeof $argument === "string") {
      if (!$argument || $argument.includes("{{{")) return {};
      try {
        return coerceValues(JSON.parse($argument));
      } catch {
        return {};
      }
    }
    if ($argument && typeof $argument === "object") return coerceValues({ ...$argument });
    return {};
  }
  // Loon passes every value as a string; "false" must not stay truthy.
  function coerceValues(values) {
    const result = {};
    for (const [key, value] of Object.entries(values)) {
      if (typeof value !== "string") {
        result[key] = value;
        continue;
      }
      const text = value.trim().toLowerCase();
      if (text === "true") result[key] = true;
      else if (text === "false") result[key] = false;
      else if (text !== "" && !Number.isNaN(Number(text))) result[key] = Number(text);
      else result[key] = value;
    }
    return result;
  }

  function numberValue(bytes) {
    const value = readInteger(bytes);
    if (!Number.isSafeInteger(value)) throw new Error("Unsafe decoded integer");
    return value;
  }

  function decodeBase64(value) {
    const normalized = value.replace(/[-_\s=]/g, (character) => (character === "-" ? "+" : character === "_" ? "/" : ""));
    // Preserve the existing decoder's ignored final six bits; validate that character too.
    const partial = normalized.length % 4 === 1;
    const bytes = Uint8Array.fromBase64(partial ? normalized + "A" : normalized);
    return partial ? bytes.subarray(0, -1) : bytes;
  }

  const QUALITY_LIMIT = 64 * 1024;
  function validQuality(value) {
    const record = value;
    return !!(
      record &&
      typeof record === "object" &&
      !Array.isArray(record) &&
      Number.isInteger(record.height) &&
      record.height > 0 &&
      record.height <= 0x7fffffff &&
      Array.isArray(record.itags) &&
      record.itags.length > 0 &&
      record.itags.length <= 256 &&
      record.itags.every((itag) => Number.isInteger(itag) && itag > 0 && itag <= 0xffffffff) &&
      new Set(record.itags).size === record.itags.length &&
      (record.premiumItags === undefined ||
        (Array.isArray(record.premiumItags) &&
          record.premiumItags.length <= record.itags.length &&
          new Set(record.premiumItags).size === record.premiumItags.length &&
          record.premiumItags.every((itag) => record.itags.includes(itag))))
    );
  }

  function sameQuality(a, b) {
    return (
      a !== undefined &&
      a.height === b.height &&
      a.itags.length === b.itags.length &&
      b.itags.every((itag) => a.itags.includes(itag)) &&
      (a.premiumItags?.length ?? 0) === (b.premiumItags?.length ?? 0) &&
      (b.premiumItags ?? []).every((itag) => a.premiumItags?.includes(itag))
    );
  }
  function cacheQuality(players) {
    if (!players.length) return;
    const streams = players
      .map((player) => unknownFields(player).find((field) => field.no === 4 && field.wire === 2)?.data)
      .filter(Boolean);
    if (!streams.length) return;
    let stored;
    try {
      stored = readConfig(QUALITY_KEY, QUALITY_LIMIT);
    } catch (error) {
      console.log("YouTube quality read: " + error);
      return;
    }
    const cache = Object.create(null);
    let changed = false;
    const keys = Object.keys(stored);
    if (keys.length > 16) changed = true;
    for (const id of keys.slice(-16)) {
      const record = stored[id];
      if (id.length > 256 || !validQuality(record)) {
        changed = true;
        continue;
      }
      cache[id] = { height: record.height, itags: record.itags };
      if (record.premiumItags?.length) cache[id].premiumItags = record.premiumItags;
      if (Object.keys(record).length !== Object.keys(cache[id]).length) changed = true;
    }
    for (const stream of streams) {
      try {
        const fields = wireFields(stream);
        const url = fields.find((field) => field.no === 15 && field.wire === 2);
        const match = url && /[?&]id=([^&]+)/.exec(utf8.decode(url.data));
        if (!match) continue;
        const id = decodeURIComponent(match[1]),
          quality = { height: 0, itags: [] };
        if (id.length > 256) continue;
        const itags = new Set();
        let overflow = false;
        for (const field of fields) {
          if (field.no !== 3 || field.wire !== 2) continue;
          const format = wireFields(field.data);
          const mime = format.find((field) => field.no === 5 && field.wire === 2);
          if (!mime || !utf8.decode(mime.data).startsWith("video/")) continue;
          const value = (no) => {
            const field = format.find((field) => field.no === no && field.wire === 0);
            return field ? numberValue(field.data) : 0;
          };
          const height = Math.min(value(7), value(8)),
            itag = value(1);
          if (!itag || !height || height > 0x7fffffff || height < quality.height) continue;
          if (height > quality.height) {
            quality.height = height;
            quality.itags = [];
            delete quality.premiumItags;
            itags.clear();
            overflow = false;
          }
          if (overflow || itags.has(itag)) continue;
          if (itags.size === 256) {
            overflow = true;
            continue;
          }
          itags.add(itag);
          quality.itags.push(itag);
          const label = format.find((field) => field.no === 26 && field.wire === 2);
          if (label && /\bPremium\b/i.test(utf8.decode(label.data))) (quality.premiumItags ??= []).push(itag);
        }
        if (overflow || !validQuality(quality) || sameQuality(cache[id], quality)) continue;
        delete cache[id];
        cache[id] = quality;
        changed = true;
      } catch (error) {
        console.log("YouTube quality metadata: " + error);
      }
    }
    if (changed) {
      const keys = Object.keys(cache);
      for (const key of keys.slice(0, Math.max(0, keys.length - 16))) delete cache[key];
      try {
        let serialized = JSON.stringify(cache);
        while (textEncoder.encode(serialized).length > QUALITY_LIMIT) {
          delete cache[Object.keys(cache)[0]];
          serialized = JSON.stringify(cache);
        }
        if (!$persistentStore.write(serialized, QUALITY_KEY)) console.log("YouTube quality write failed");
      } catch (error) {
        console.log("YouTube quality cache: " + error);
      }
    }
  }

  const AI_PANEL = textEncoder.encode("PAyouchat");
  const AI_SUMMARY = textEncoder.encode("ai_summary_");
  function aiPathMatches(bytes, path, target = AI_PANEL, prefix = false) {
    if (!path.length) return prefix ? sameBytes(bytes.subarray(0, target.length), target) : sameBytes(bytes, target);
    return wireFields(bytes).some(
      (field) => field.no === path[0] && field.wire === 2 && aiPathMatches(field.data, path.slice(1), target, prefix),
    );
  }
  function rewriteAiFields(bytes, no, transform) {
    let changed = false;
    const chunks = wireFields(bytes).flatMap((field) => {
      if (field.no !== no || field.wire !== 2) return [field.raw];
      const data = transform(field.data);
      if (data && sameBytes(data, field.data)) return [field.raw];
      changed = true;
      return data ? [encodeField([no, "", "bytes"], data)] : [];
    });
    return changed ? concatBytes(chunks) : bytes;
  }
  function removeAiActionBar(bytes) {
    return rewriteAiFields(bytes, 1, (button) =>
      aiPathMatches(button, [10, 461054335, 4, 169495254, 138681778, 1])
        ? undefined
        : rewriteBinaryPath(button, [10, 37098], (menu) =>
            rewriteAiFields(menu, 3, (item) =>
              aiPathMatches(item, [489973921, 997, 3, 3, 169495254, 138681778, 1]) ? undefined : item,
            ),
          ),
    );
  }
  function removeAiQuickActions(bytes) {
    return rewriteAiFields(bytes, 10, (button) =>
      aiPathMatches(button, [15, 461054335, 4, 169495254, 138681778, 1])
        ? undefined
        : rewriteBinaryPath(button, [6], (menu) =>
            rewriteAiFields(menu, 3, (item) =>
              aiPathMatches(item, [4, 16, 461054335, 4, 169495254, 138681778, 1]) ? undefined : item,
            ),
          ),
    );
  }
  function removeAiCarousel(bytes) {
    return rewriteBinaryPath(bytes, [1], (carousel) => {
      const fields = wireFields(carousel);
      const headers = fields.filter((field) => field.no === 1 && field.wire === 2);
      const cards = fields.filter((field) => field.no === 2 && field.wire === 2);
      // Parallel header/card arrays must retain matching indices (Comments vs Ask).
      if (headers.length !== cards.length) return carousel;
      const removed = new Set();
      cards.forEach((card, index) => {
        if (aiPathMatches(card.data, [8, 2, 169495254, 138681778, 1])) {
          removed.add(card);
          removed.add(headers[index]);
        }
      });
      return removed.size ? concatBytes(fields.filter((field) => !removed.has(field)).map((field) => field.raw)) : carousel;
    });
  }
  function isAiOnlyCarousel(object) {
    try {
      return unknownFields(object).some((field) => {
        if (field.no !== 408379376 || field.wire !== 2) return false;
        const bodies = wireFields(field.data).filter((field) => field.no === 1 && field.wire === 2);
        if (bodies.length !== 1) return false;
        const fields = wireFields(bodies[0].data);
        const headers = fields.filter((field) => field.no === 1 && field.wire === 2);
        const cards = fields.filter((field) => field.no === 2 && field.wire === 2);
        return (
          cards.length > 0 &&
          cards.length === headers.length &&
          cards.every((card) => aiPathMatches(card.data, [8, 2, 169495254, 138681778, 1]))
        );
      });
    } catch {
      return false;
    }
  }
  function removeAiElement(bytes) {
    return rewriteBinaryPath(bytes, [153515154, 172660663, 1, 168777401, 5], (content) => {
      let result = rewriteAiFields(content, 386137609, removeAiQuickActions);
      result = rewriteBinaryPath(result, [413471385, 1], (data) => rewriteAiFields(data, 2185, removeAiActionBar));
      return rewriteAiFields(result, 408379376, removeAiCarousel);
    });
  }
  function removeAiSummary(bytes) {
    const result = rewriteAiFields(bytes, 45, (key) => (aiPathMatches(key, [], AI_SUMMARY, true) ? undefined : key));
    // Only remove the summary update command; keep inline playback commands.
    return rewriteBinaryPath(result, [1, 19, 1, 1, 4, 424915055, 1], (playback) =>
      rewriteAiFields(playback, 31, (command) =>
        aiPathMatches(command, [1, 204158123, 194114827, 1], AI_SUMMARY, true) ? undefined : command,
      ),
    );
  }
  function removeAi(object) {
    let changed = false;
    try {
      const next = object;
      if (next.engagementPanels?.length) {
        const keep = next.engagementPanels.filter((panel) => {
          const renderer = panel.renderer;
          return (
            !renderer ||
            !unknownFields(renderer).some((field) => field.no === 1 && field.wire === 2 && sameBytes(field.data, AI_PANEL))
          );
        });
        changed = setField(next, "engagementPanels", keep) || changed;
        for (const panel of keep) {
          if (!panel.renderer) continue;
          changed =
            rewriteUnknownField(panel.renderer, 10, (footer) =>
              aiPathMatches(
                footer,
                [
                  260791572, 1, 153515154, 172660663, 1, 168777401, 5, 413471385, 1, 2553, 997, 3, 3, 170382688, 1, 169495254,
                  138681778, 1,
                ],
              )
                ? undefined
                : footer,
            ) || changed;
        }
      }
      if (next.playerOverlays?.renderer)
        changed = rewriteUnknownField(next.playerOverlays.renderer, 37, removeAiElement) || changed;
      changed =
        rewriteUnknownField(object, 216561405, (metadata) => rewriteBinaryPath(metadata, [1], removeAiElement)) || changed;
      changed = rewriteUnknownField(object, 386137609, removeAiQuickActions) || changed;
      changed = rewriteUnknownField(object, 408379376, removeAiCarousel) || changed;
      const content = object;
      if (content.element?.data) changed = rewriteUnknownField(content.element.data, 2185, removeAiActionBar) || changed;
      if (content.videoLockup) changed = rewriteUnknownField(content.videoLockup, 18, removeAiSummary) || changed;
      if (object.videoContent?.videoLockup)
        changed =
          rewriteUnknownField(object, 6, (bindings) =>
            rewriteBinaryPath(bindings, [188490103], (collection) =>
              rewriteAiFields(collection, 1, (binding) =>
                aiPathMatches(binding, [1], AI_SUMMARY, true) ? undefined : binding,
              ),
            ),
          ) || changed;
    } catch (error) {
      console.log("YouTube AI controls: " + error);
    }
    return changed;
  }

  function bytesField(bytes, number, unique = false) {
    let first;
    for (const field of wireFields(bytes)) {
      if (field.no !== number || field.wire !== 2) continue;
      if (!unique) return field.data;
      if (first) return;
      first = field.data;
    }
    return first;
  }

  // Native action shapes verified against YouTube iOS 21.41.5 captures.
  function nativeField(no, value) {
    return encodeField([no, "", typeof value === "number" ? "uint" : typeof value === "string" ? "string" : "bytes"], value);
  }
  function nativePath(path, value) {
    for (let i = path.length - 1; i >= 0; i--) value = nativeField(path[i], value);
    return value;
  }
  function binaryAt(bytes, path) {
    let current = bytes;
    for (const no of path) {
      current = bytesField(current, no, true);
      if (!current) return;
    }
    return current;
  }
  const ON_THE_GO_ID = "on-the-go";
  const ON_THE_GO_MENU_ID = "/youtube/app/player_overflow_menu/menu_item_on_the_go";
  const MENU_MODEL_PATH = [153515154, 172660663, 1, 168777401, 5, 407694004];
  const MENU_CONTEXT_PATH = [153515154, 172660663, 1, 168777401];
  function panelIdentifier(panel) {
    if (!panel.renderer) return;
    const fields = unknownFields(panel.renderer);
    const structured = fields.find((f) => f.no === 18 && f.wire === 2);
    const id = (structured && binaryAt(structured.data, [3])) ?? fields.find((f) => f.no === 1 && f.wire === 2)?.data;
    return id && utf8.decode(id);
  }
  function onTheGoAction() {
    // Native serial action: log the click, dismiss the menu, set the trigger
    // entity, then open the panel. Its template observes the trigger entity.
    const state = "/youtube/app/on_the_go_menu_trigger_state";
    return nativeField(
      170382688,
      concatBytes([
        nativePath([1, 241780379, 1], 1),
        nativePath([1, 169495254, 423731020], new Uint8Array()),
        nativePath(
          [1, 169495254, 204158123, 170382688],
          concatBytes([
            nativePath(
              [1, 170382720],
              concatBytes([nativeField(1, state), nativeField(2, concatBytes([nativeField(1, state), nativeField(2, 1)]))]),
            ),
            nativePath([1, 169495254, 138681778, 10], concatBytes([nativeField(1, 1), nativeField(3, ON_THE_GO_ID)])),
          ]),
        ),
      ]),
    );
  }
  function onTheGoButton(icon, label, command, id) {
    return nativeField(
      461054335,
      concatBytes([
        nativeField(2, icon),
        nativeField(4, command),
        nativeField(5, label),
        ...(id ? [nativeField(17, "id.player_controls." + id + ".button")] : [nativeField(28, 1), nativeField(29, 1)]),
      ]),
    );
  }
  function makeOnTheGoPanel(message, sourceItem, template, speedCommand) {
    const nextResult = message.content?.nextResult;
    if (!nextResult) return;
    const raw = unknownFields(nextResult).find((f) => f.no === 4 && f.wire === 2);
    const metadata = raw && binaryAt(raw.data, [61479009]);
    const endpoint = unknownFields(message).find((f) => f.no === 9 && f.wire === 2);
    const video = endpoint && binaryAt(endpoint.data, [48687757, 1]);
    const metadataVideo = metadata && binaryAt(metadata, [17]);
    const title = metadata && binaryAt(metadata, [1, 1, 1]);
    const author = metadata && binaryAt(metadata, [10, 1, 1]);
    const thumbnails = metadata && bytesField(metadata, 2, true);
    if (
      !video ||
      !metadataVideo ||
      !sameBytes(video, metadataVideo) ||
      !/^[\w-]{11}$/.test(utf8.decode(video)) ||
      !title ||
      !thumbnails
    )
      return;
    const context = binaryAt(sourceItem, MENU_CONTEXT_PATH);
    const theme = context && binaryAt(context, [6, 386334485, 1, 1, 1]);
    const capabilities = context && binaryAt(context, [6, 386334486, 1, 1]);
    if (!theme || !capabilities) return;
    const transport = [
      [1, 6, 176991, "youtube_fill_experimental/skip_previous_24pt", "Previous video", "previous"],
      [2, 4, 176993, "youtube_outline_experimental/skip10_back_24pt", "Rewind", "seek.backward"],
      [3, 3, 176994, "youtube_outline_experimental/skip10_forward_24pt", "Fast forward", "seek.forward"],
      [4, 5, 176988, "youtube_fill_experimental/skip_next_24pt", "Next video", "next"],
    ];
    const panelTarget = concatBytes([nativeField(1, 1), nativeField(3, ON_THE_GO_ID)]);
    const thumbnailModel = concatBytes(
      wireFields(thumbnails).map((field) => {
        if (field.no !== 1 || field.wire !== 2) return field.raw;
        return nativeField(
          1,
          concatBytes(
            wireFields(field.data).map((part) =>
              part.wire === 0 && (part.no === 2 || part.no === 3) ? nativeField(part.no + 2, numberValue(part.data)) : part.raw,
            ),
          ),
        );
      }),
    );
    const models = [
      nativePath([1, 1], title),
      ...(author ? [nativeField(2, author)] : []),
      nativePath(
        [3, 2329],
        concatBytes([
          ...transport.map(([no, action, ve, icon, label, id]) =>
            nativeField(
              no,
              onTheGoButton(
                icon,
                label,
                nativePath([169495254, 327511066], concatBytes([nativeField(1, action), nativeField(2, ve)])),
                id,
              ),
            ),
          ),
          nativeField(5, "Play"),
          nativeField(6, "Pause"),
          nativeField(7, "Replay"),
        ]),
      ),
      nativeField(5, thumbnailModel),
      nativeField(
        6,
        onTheGoButton(
          "youtube_outline_experimental/headset_24pt",
          "Switch to audio mode",
          nativePath([169495254, 300135747, 2], panelTarget),
        ),
      ),
      nativeField(
        12,
        onTheGoButton(
          "youtube_outline_experimental/video_24pt",
          "Switch to video mode",
          nativePath([169495254, 300413109, 2], panelTarget),
        ),
      ),
    ];
    if (speedCommand)
      models.push(
        nativeField(9, onTheGoButton("youtube_outline_experimental/speedometer_24pt", "Playback speed", speedCommand)),
      );
    const chapters = message.engagementPanels
      .map(panelIdentifier)
      .find(
        (id) =>
          id === "engagement-panel-macro-markers-auto-chapters" || id === "engagement-panel-macro-markers-description-chapters",
      );
    if (chapters)
      models.push(
        nativeField(
          8,
          onTheGoButton(
            "youtube_outline_experimental/view_list_24pt",
            "Chapters",
            nativePath(
              [169495254, 138681778],
              concatBytes([
                nativeField(3, ON_THE_GO_ID),
                nativeField(10, concatBytes([nativeField(1, 1), nativeField(3, chapters)])),
              ]),
            ),
          ),
        ),
      );
    const subscriptions = [
      nativeField(
        1,
        concatBytes([nativeField(1, "/youtube/app/engagement_panel"), nativeField(2, 470855422), nativeField(3, 470855422)]),
      ),
      nativeField(
        1,
        concatBytes([nativeField(1, "/youtube/app/player_overlay"), nativeField(2, 470855423), nativeField(3, 470855423)]),
      ),
      ...[
        ["menu_trigger", 14],
        ["audio_only", 18],
      ].map(([name, no]) =>
        nativeField(
          1,
          concatBytes([
            nativeField(1, "/youtube/app/on_the_go_" + name + "_state"),
            nativeField(3, 1),
            nativeField(3, 2325),
            nativeField(3, Number(no)),
          ]),
        ),
      ),
      nativeField(2, 413471385),
    ];
    const bindings = concatBytes([
      nativeField(188490103, concatBytes(subscriptions)),
      nativeField(212323971, concatBytes([nativeField(1, 413471385), nativeField(2, 5)])),
      nativeField(
        386334485,
        concatBytes([nativeField(1, concatBytes([nativePath([1, 1], theme), nativeField(2, 4)])), nativeField(2, 413471385)]),
      ),
      nativeField(
        386334486,
        concatBytes([
          nativeField(1, concatBytes([nativeField(1, capabilities), nativeField(2, 6)])),
          nativeField(2, 413471385),
        ]),
      ),
    ]);
    return codec("EngagementPanel").fromBinary(
      nativeField(
        138681066,
        concatBytes([
          nativePath([2, 138681548, 1, 1, 1], "On-the-go"),
          nativePath(
            [3, 49399797, 1, 50195462, 1, 153515154, 172660663],
            concatBytes([
              nativePath(
                [1, 168777401],
                concatBytes([
                  nativePath([3, 172035250, 1], template),
                  nativePath([5, 413471385, 1, 2325], concatBytes(models)),
                  nativeField(6, bindings),
                ]),
              ),
              nativePath([2, 183314536, 1], template),
            ]),
          ),
          nativeField(5, 282218),
          nativeField(6, 1),
          nativeField(15, 1),
          nativeField(17, 3),
          nativeField(18, panelTarget),
          nativeField(20, 1),
          nativeField(21, 2),
          nativeField(21, 1),
          nativeField(36, 2),
        ]),
      ),
    );
  }
  function enableOnTheGo(message) {
    const overlay = message.playerOverlays?.renderer;
    if (!overlay?.overflowMenu || !Array.isArray(message.engagementPanels)) return false;
    if (message.engagementPanels.some((p) => panelIdentifier(p) === ON_THE_GO_ID)) return false;
    const menu = binaryAt(overlay.overflowMenu, [66439850]);
    if (!menu) return false;
    const fields = wireFields(menu);
    let source, speed;
    let insertion = fields.length;
    for (const [index, item] of fields.entries()) {
      if (item.no !== 1 || item.wire !== 2) continue;
      const model = binaryAt(item.data, MENU_MODEL_PATH);
      const state = model && bytesField(model, 10, true);
      if (!model || !state) continue;
      const id = utf8.decode(state);
      if (id === ON_THE_GO_MENU_ID) return false;
      if (id.endsWith("/menu_item_additional_settings")) insertion = index;
      source ??= item.data;
      if (id.endsWith("/menu_item_playback_speed")) {
        const commands = binaryAt(model, [4, 4, 170382688]);
        if (commands)
          for (const command of wireFields(commands))
            if (command.no === 1 && binaryAt(command.data, [169495254, 443434441])) speed = command.data;
      }
    }
    if (!source) return false;
    const resources = prepareOnTheGoResources(message);
    if (!resources) return false;
    const panel = makeOnTheGoPanel(message, source, resources.template, speed);
    if (!panel) return false;
    let entry = rewriteBinaryPath(source, MENU_MODEL_PATH, (model) =>
      concatBytes([
        ...wireFields(model)
          .filter((f) => [1, 2, 13, 17].includes(f.no))
          .map((f) => f.raw),
        nativeField(
          4,
          concatBytes([
            nativeField(2, "youtube_outline_experimental/headset_24pt"),
            nativeField(3, "On-the-go"),
            nativeField(4, onTheGoAction()),
          ]),
        ),
        nativeField(10, ON_THE_GO_MENU_ID),
        nativeField(12, 1),
      ]),
    );
    entry = rewriteBinaryPath(entry, [...MENU_CONTEXT_PATH, 6, 188490103, 1, 1], () => textEncoder.encode(ON_THE_GO_MENU_ID));
    entry = rewriteBinaryPath(entry, [153515154, 3, 396644439, 1], () => textEncoder.encode("menu_item_on_the_go"));
    const chunks = fields.map((field) => field.raw);
    chunks.splice(insertion, 0, nativeField(1, entry));
    const output = rewriteBinaryPath(overlay.overflowMenu, [66439850], () => concatBytes(chunks));
    setField(message, "frameworkUpdates", resources.framework);
    setField(message, "engagementPanels", [...message.engagementPanels, panel]);
    return setField(overlay, "overflowMenu", output);
  }

  // Only the two missing layouts are bundled. Shared components come from the
  // response's definitions or its resource-availability report, never our cache.
  function onTheGoResourceId(update) {
    const resource = binaryAt(update, [196886555]) ?? binaryAt(update, [426171394]);
    const id = resource && bytesField(resource, 1, true);
    return id && utf8.decode(id);
  }
  function bindTemplateReferences(bytes, replacements, depth = 0) {
    for (const [before, after] of replacements) if (sameBytes(bytes, before)) return after;
    if (depth === 96) return bytes;
    let fields;
    try {
      fields = wireFields(bytes);
    } catch {
      return bytes; // Literal text and opaque data are not nested messages.
    }
    let changed = false;
    const chunks = fields.map((field) => {
      if (field.wire !== 2) return field.raw;
      const data = bindTemplateReferences(field.data, replacements, depth + 1);
      if (data === field.data) return field.raw;
      changed = true;
      return nativeField(field.no, data);
    });
    return changed ? concatBytes(chunks) : bytes;
  }
  function prepareOnTheGoResources(message) {
    if (unknownFields(message).some((field) => field.no === 777)) return;
    const framework = message.frameworkUpdates;
    const updates = framework && binaryAt(framework, [2]);
    if (!updates) return;
    const available = new Set(),
      defined = new Set();
    for (const field of wireFields(updates)) {
      if (field.no !== 1 || field.wire !== 2) continue;
      const id = onTheGoResourceId(field.data);
      if (id) {
        available.add(id);
        defined.add(id);
      }
      const report = binaryAt(field.data, [328964737]);
      if (!report) continue;
      for (const item of wireFields(report)) {
        if (item.no !== 1 || item.wire !== 2) continue;
        const name = binaryAt(item.data, [1]);
        const status = wireFields(item.data).find((f) => f.no === 2 && f.wire === 0);
        // 1 = already available to the client; 2 = attached in this response.
        if (name && status && [1, 2].includes(numberValue(status.data))) available.add(utf8.decode(name));
      }
    }
    const bundled = wireFields(decodeBase64(ON_THE_GO_RESOURCES_BASE64));
    const bundledIds = new Set(bundled.map((field) => onTheGoResourceId(field.data)));
    const missing = [];
    let template = ON_THE_GO_BUNDLE_TEMPLATE;
    for (const entry of bundled) {
      let resource = binaryAt(entry.data, [196886555]);
      let id = onTheGoResourceId(entry.data);
      const replacements = [];
      for (const dep of wireFields(resource).filter((f) => f.no === 5 && f.wire === 2)) {
        const name = utf8.decode(dep.data);
        if (bundledIds.has(name) || available.has(name)) continue;
        // Match a public component by name. Fragment IDs have no interchangeable version.
        const prefix = name.slice(0, name.indexOf("|") + 1);
        const matches = prefix ? [...available].filter((value) => value.startsWith(prefix)) : [];
        if (matches.length !== 1) return;
        replacements.push([dep.data, textEncoder.encode(matches[0])]);
      }
      if (replacements.length) {
        resource = bindTemplateReferences(resource, replacements);
        if (replacements.some(([before]) => containsMarker(resource, before))) return;
        const bound = binaryAt(resource, [2]);
        // Separate cache identity for each rebound layout; no account data is involved.
        let hash = 2166136261;
        for (const byte of bound) hash = Math.imul(hash ^ byte, 16777619);
        id = id.split("|")[0] + "|" + (hash >>> 0).toString(16);
        resource = concatBytes(
          wireFields(resource).flatMap((field) => {
            if (field.no === 4) return [];
            if (field.no === 1 && field.wire === 2) return [nativeField(1, id)];
            return [field.raw];
          }),
        );
        if (onTheGoResourceId(entry.data) === template) template = id;
      }
      if (!defined.has(id)) missing.push(nativePath([1, 196886555], resource));
    }
    return {
      template,
      framework: missing.length ? rewriteBinaryPath(framework, [2], () => concatBytes([updates, ...missing])) : framework,
    };
  }

  const AD_LAYOUT =
    /^(?:inline_injection_entrypoint_layout|video_display_button_group_layout|full_width_portrait_image_layout|full_width_square_image_layout|video_display_full_buttoned_layout)\.eml(?:-js)?(?:-fe)?$/;
  // Match active shopping components, not product words in titles or URLs.
  const SHOPPING_LAYOUT = /^(?:shopping_|products?_in_video_)[a-z0-9_]+\.eml(?:-js)?(?:-fe)?$/;
  const AD_TRACKING = textEncoder.encode("/pagead/");
  const GAME_CARD = textEncoder.encode("mini_game_card.eml");
  const STORE_CARD = textEncoder.encode("shopping_item_card_list.eml");
  const STORE_TAB = textEncoder.encode("store");
  const LIVE_BADGE = textEncoder.encode("youtube_outline_experimental/live_24pt");
  const IMMERSIVE_LIVE = textEncoder.encode("immersive_live");
  const PREMIUM_BROWSE_ID = textEncoder.encode("SPunlimited");
  function containsMarker(bytes, marker = AD_TRACKING) {
    if (!marker.length) return true;
    const end = bytes.length - marker.length;
    let probes = 0,
      windowStart = 0;
    for (let i = bytes.indexOf(marker[0]); i >= 0 && i <= end; i = bytes.indexOf(marker[0], i + 1)) {
      let matched = true;
      for (let j = 1; j < marker.length; j++)
        if (bytes[i + j] !== marker[j]) {
          matched = false;
          break;
        }
      if (matched) return true;
      if (++probes === 8) {
        // Native search wins for sparse candidates; dense prefixes favor direct scanning.
        if (i - windowStart < 256) return scanMarkerTail(bytes, marker, i + 1);
        windowStart = i;
        probes = 0;
      }
    }
    return false;
  }
  function scanMarkerTail(bytes, marker, start) {
    outer: for (let i = start; i <= bytes.length - marker.length; i++) {
      for (let j = 0; j < marker.length; j++) if (bytes[i + j] !== marker[j]) continue outer;
      return true;
    }
    return false;
  }
  function hasVerticalLiveTarget(lockup) {
    let bytes = unknownFields(lockup).find((field) => field.no === 18 && field.wire === 2)?.data;
    // Primary tap target only; a channel avatar may link to a different live.
    try {
      for (const no of [4, 169495254, 462702848, 1, 139608561, 50, 7, 3]) {
        if (!bytes) return false;
        bytes = wireFields(bytes).find((field) => field.no === no && field.wire === 2)?.data;
      }
      return !!bytes && sameBytes(bytes, IMMERSIVE_LIVE);
    } catch {
      return false;
    }
  }
  function isStoreTab(item) {
    const params = item.tabRenderer?.endpoint?.browse?.params;
    if (!params) return false;
    try {
      const target = wireFields(decodeBase64(decodeURIComponent(params))).find((field) => field.no === 2 && field.wire === 2);
      return !!target && sameBytes(target.data, STORE_TAB);
    } catch {
      return false;
    }
  }
  function isPremiumBanner(bytes) {
    // Statement banner's CTA browse ID; independent of localized display text.
    const path = [2, 11, 1, 4, 170382656, 1, 169495254, 48687626, 2];
    function matches(bytes, depth) {
      if (depth === path.length) return sameBytes(bytes, PREMIUM_BROWSE_ID);
      const fields = wireFields(bytes).filter((field) => field.no === path[depth] && field.wire === 2);
      // The executor contains a list of commands; other hops are singletons.
      return (depth === 5 || fields.length === 1) && fields.some((field) => matches(field.data, depth + 1));
    }
    try {
      return matches(bytes, 0);
    } catch {
      return false;
    }
  }
  function isBlockedObject(object, blockGames, blockVerticalLive, blockStore) {
    const layout = object.layoutRender?.eml?.split("|")[0];
    if (
      (layout && (AD_LAYOUT.test(layout) || (blockStore && SHOPPING_LAYOUT.test(layout)))) ||
      (blockStore && object.shoppingShelf) ||
      object.sponsoredVideo ||
      object.sponsoredDisplay ||
      (blockVerticalLive && object.videoLockup && hasVerticalLiveTarget(object.videoLockup))
    )
      return true;
    return unknownFields(object).some(
      (field) =>
        field.wire === 2 &&
        (containsMarker(field.data) ||
          (field.no === 325515470 && isPremiumBanner(field.data)) ||
          (blockStore && field.no === 400157044) ||
          field.no === 455507059 ||
          (blockVerticalLive && field.no === 519005951 && containsMarker(field.data, LIVE_BADGE)) ||
          (field.no === 312131490 &&
            ((blockGames && containsMarker(field.data, GAME_CARD)) || (blockStore && containsMarker(field.data, STORE_CARD))))),
    );
  }
  function transformContent(
    message,
    { blockGames = true, blockVerticalLive = false, jumpAhead = true, blockStore = true, blockAi = true, onTheGo = true } = {},
  ) {
    let changed = transformMenus(message);
    if (onTheGo)
      try {
        changed = enableOnTheGo(message) || changed;
      } catch (error) {
        console.log("YouTube On-the-go: " + error);
      }
    const BLOCKED = 1,
      EMPTY = 2;
    const filtered = new Set(["richItemContents", "overlays"]);
    const pruned = new Set(["richItemContents", "contents", "sectionListSupportedRenderers", "overlayCollections"]);
    const wrappers = new Set([
      "videoWithContextRenderer",
      "videoRendererContent",
      "itemSectionRenderer",
      "shelfRenderer",
      "richSectionContent",
      "reelShelfRenderer",
      "renderer",
      "content",
      "item",
    ]);
    function visit(object, classify = false) {
      if (!object || typeof object !== "object" || ArrayBuffer.isView(object)) return 0;
      if (Array.isArray(object)) {
        let flags = 0;
        for (const child of object) flags |= visit(child, classify) & BLOCKED;
        return flags;
      }
      // Local and descendant blocking facts describe the pre-edit tree.
      let blocked =
        classify &&
        (isBlockedObject(object, blockGames, blockVerticalLive, blockStore) || (blockAi && isAiOnlyCarousel(object)));
      const layout = object.renderInfo?.layoutRender?.eml?.split("|")[0];
      let empty = !!layout && (AD_LAYOUT.test(layout) || (blockStore && SHOPPING_LAYOUT.test(layout)));
      if (classify && (blocked || empty)) return BLOCKED;
      if (blockAi) changed = removeAi(object) || changed;
      const state = object[wireState];
      for (const name of Object.keys(object)) {
        if (!classify && state?.deferred) {
          const spec = schema[state.type].find(([, key]) => key === name);
          if (
            spec &&
            !contentTypes.has(spec[2]) &&
            !filtered.has(name) &&
            !pruned.has(name) &&
            name !== "promotedContents" &&
            !(blockStore && (name === "tabs" || name === "attachments"))
          )
            continue;
        }
        const child = object[name];
        if (!child || typeof child !== "object" || ArrayBuffer.isView(child)) continue;
        if (!Array.isArray(child)) {
          const flags = visit(child, classify);
          if (classify && flags & BLOCKED) return BLOCKED;
          blocked = !!(flags & BLOCKED) || blocked;
          if (flags & EMPTY && wrappers.has(name)) empty = true;
          continue;
        }
        let keep;
        const filterItems = filtered.has(name),
          pruneItems = pruned.has(name);
        const filterTabs = blockStore && name === "tabs",
          filterAttachments = blockStore && name === "attachments";
        const filterPromoted = name === "promotedContents";
        for (let index = 0; index < child.length; index++) {
          const item = child[index];
          const direct =
            (filterTabs && isStoreTab(item)) ||
            (filterAttachments && item.products?.length) ||
            (filterPromoted && containsMarker(item));
          const flags = direct && !classify ? 0 : visit(item, classify || filterItems);
          if (classify && flags & BLOCKED) return BLOCKED;
          // Aggregate before deletion: an outer candidate still contains its original ad.
          blocked = !!(flags & BLOCKED) || blocked;
          const remove = direct || (filterItems && flags & BLOCKED) || (pruneItems && flags & EMPTY);
          if (remove) keep ??= child.slice(0, index);
          else if (keep) keep.push(item);
        }
        if (keep) {
          setField(object, name, keep);
          changed = true;
          if (!keep.length && (filterItems || pruneItems)) empty = true;
        }
        if (blockStore && name === "attachments" && !(keep ?? child).length && object.attachmentStateKey !== undefined)
          changed = removeField(object, "attachmentStateKey") || changed;
      }
      if (jumpAhead && object.smartSkipButton) changed = unlockJumpAhead(object.smartSkipButton) || changed;
      return (blocked ? BLOCKED : 0) | (empty ? EMPTY : 0);
    }
    visit(message);
    return changed;
  }
  function unlockJumpAhead(button) {
    let changed = false;
    const controller = button.controller;
    // smart_skip_button.eml selects a promo placeholder when field 7 is
    // true, and the client's timely_action button when false. Keep every
    // timing, gesture, entity binding and native seek action unchanged.
    if (controller?.promotionMode === true) {
      setField(controller, "promotionMode", false);
      changed = true;
    }
    // The client checks both total and per-action display counters. Use
    // YouTube's existing unlimited sentinel without resetting client state.
    if (button.actions?.items?.length)
      for (const target of [button, ...button.actions.items]) {
        if (target.displayLimit === 0x7fffffff) continue;
        setField(target, "displayLimit", 0x7fffffff);
        changed = true;
      }
    return changed;
  }
  function transformMenus(message) {
    const overlay = message.playerOverlays?.renderer;
    if (!overlay?.overflowMenu) return false;
    try {
      const menu = unlockSpeedMenu(overlay.overflowMenu);
      const changed = !sameBytes(menu, overlay.overflowMenu);
      if (changed) setField(overlay, "overflowMenu", menu);
      return changed;
    } catch (error) {
      console.log("YouTube speed menu: " + error);
      return false;
    }
  }
  function unlockSpeedMenu(bytes) {
    const upsell = textEncoder.encode("PApremium_upsell");
    // Overflow item → inline panel → playback-rate selector model (1602).
    return rewriteBinaryPath(
      bytes,
      [
        66439850, 1, 153515154, 172660663, 1, 168777401, 5, 407694004, 4, 4, 170382688, 1, 169495254, 443434441, 1, 1,
        441573002, 4, 153515154, 172660663, 1, 168777401, 5, 413471385, 1, 1602,
      ],
      (selector) => {
        const fields = wireFields(selector);
        const maximum = fields.find((field) => field.no === 5 && field.wire === 5);
        if (!maximum) return selector;
        const rate = new DataView(maximum.data.buffer, maximum.data.byteOffset, 4).getFloat32(0, true);
        if (!(rate > 0)) return selector; // Keep disabled/live controls disabled.
        let expanded = selector;
        if (rate < 4) {
          const limit = new Uint8Array(4);
          new DataView(limit.buffer).setFloat32(0, 4, true);
          expanded = concatBytes(fields.map((field) => (field === maximum ? concatBytes([varint(45), limit]) : field.raw)));
        }
        // Presets already contain the real rate action; field 3 overrides it
        // with the Premium panel. Remove only that preset-specific override.
        return rewriteBinaryPath(expanded, [10, 1674], (preset) => {
          const fields = wireFields(preset);
          const keep = fields.filter((field) => field.no !== 3 || field.wire !== 2 || !containsMarker(field.data, upsell));
          return keep.length === fields.length ? preset : concatBytes(keep.map((field) => field.raw));
        });
      },
    );
  }
  function transformPlayer(player, parameters) {
    let changed = transformContent(player, parameters);
    changed = removeField(player, "paidPromotion") || changed;
    for (const name of ["adPlacements", "adSlots"])
      if (player[name]?.length) {
        setField(player, name, []);
        changed = true;
      }
    const speed = player.playerConfig?.granularVariableSpeedConfig;
    if (speed?.maximumPlaybackRate !== undefined && speed.maximumPlaybackRate > 0 && speed.maximumPlaybackRate < 400) {
      setField(speed, "maximumPlaybackRate", 400);
      changed = true;
    }
    if (player.playbackTracking) changed = removeField(player.playbackTracking, "pageadViewthroughconversion") || changed;
    const status = player.playabilityStatus;
    if (status) {
      const pip = status.pictureInPictureRender ?? {};
      setField(status, "pictureInPictureRender", pip);
      const ability = pip.pictureInPictureAbility ?? {};
      setField(pip, "pictureInPictureAbility", ability);
      changed = setField(ability, "active", true) || changed;
      changed = setField(ability, "f4", 0) || changed;
      changed = setField(ability, "f6", 0) || changed;
      changed = setField(ability, "f8", 1) || changed;
      const background = status.backgroundPlayerRender ?? {};
      setField(status, "backgroundPlayerRender", background);
      const backgroundAbility = background.backgroundAbility ?? {};
      setField(background, "backgroundAbility", backgroundAbility);
      changed = setField(backgroundAbility, "active", true) || changed;
    }
    return changed;
  }
  function removeField(message, name) {
    if (message[name] === undefined) return false;
    delete message[name];
    if (message[wireState]) markChanged(message[wireState], name);
    return true;
  }

  function visitObjects(root, callback) {
    const stack = [root];
    while (stack.length) {
      const object = stack.pop();
      if (!object || typeof object !== "object" || ArrayBuffer.isView(object)) continue;
      callback(object);
      stack.push(...Object.values(object));
    }
  }
  function responsePlayers(type, message) {
    if (type === "Player") return [message];
    if (type === "Watch") return message.contents.map((content) => content.player).filter(Boolean);
    if (type === "ResolveUrl") {
      const player = message.endpoint?.watch?.embedded?.response?.player;
      return player ? [player] : [];
    }
    return [];
  }
  function removeShortsAds(message) {
    const keep = message.entries.filter((entry) => !entry.command?.reelWatchEndpoint?.adClientParams?.isAd);
    const changed = keep.length !== message.entries.length;
    if (changed) setField(message, "entries", keep);
    return changed;
  }
  function filterGuide(message, parameters) {
    const blocked = new Set(["SPunlimited"]);
    if (parameters.blockUpload) blocked.add("FEuploads");
    if (parameters.blockShorts) blocked.add("FEshorts");
    let changed = false;
    visitObjects(message, (object) => {
      const items = object.rendererItems;
      if (!Array.isArray(items)) return;
      const keep = items.filter((item) => !blocked.has(item.iconRender?.browseId ?? item.labelRender?.browseId));
      changed = keep.length !== items.length || changed;
      if (keep.length !== items.length) setField(object, "rendererItems", keep);
    });
    return changed;
  }
  function addPremiumSettings(message) {
    let changed = false;
    visitObjects(message, (object) => {
      const category = object;
      if (category.categoryId !== 10135) return;
      const endpoint = (enabled) => ({
        setClientSettingEndpoint: {
          settingData: {
            clientSettingEnum: { item: 151 },
            boolValue: enabled,
          },
        },
      });
      if (
        !category.subSettings.some(
          (item) =>
            item.settingBooleanRenderer?.enableServiceEndpoint?.setClientSettingEndpoint?.settingData?.clientSettingEnum
              ?.item === 151,
        )
      ) {
        changed = true;
        setField(category, "subSettings", [
          ...category.subSettings,
          {
            settingBooleanRenderer: {
              itemId: 0,
              enableServiceEndpoint: endpoint(true),
              disableServiceEndpoint: endpoint(false),
            },
          },
        ]);
      }
    });
    const background = message.settingItems.find(
      (item) => item.backgroundPlayBackSettingRenderer,
    )?.backgroundPlayBackSettingRenderer;
    if (background) {
      changed = setField(background, "backgroundPlayback", true) || changed;
    } else {
      changed = true;
      setField(message, "settingItems", [
        ...message.settingItems,
        {
          backgroundPlayBackSettingRenderer: {
            backgroundPlayback: true,
            icon: { iconType: 1093 },
          },
        },
      ]);
    }
    return changed;
  }
  function transformNavigation(message, parameters) {
    const player = message.endpoint?.watch?.embedded?.response?.player;
    return player ? transformPlayer(player, parameters) : false;
  }

  function transformWatch(message, parameters) {
    let changed = false;
    for (const content of message.contents) {
      if (content.player) changed = transformPlayer(content.player, parameters) || changed;
      if (content.next) changed = transformContent(content.next, parameters) || changed;
    }
    return changed;
  }

  const fieldSpecs = Object.create(null);
  const wireState = Symbol("wireState");
  function markChanged(state, name) {
    while (state) {
      (state.changed ??= new Set()).add(name);
      name = state.parentName;
      state = state.parent;
    }
  }
  function readField(field, depth, state) {
    const [, name, kind] = field.spec;
    return kind === "bytes"
      ? field.data
      : kind === "string"
        ? utf8.decode(field.data)
        : kind === "bool"
          ? numberValue(field.data) !== 0
          : kind === "uint"
            ? numberValue(field.data)
            : decodeMessage(kind, field.data, depth + 1, state, name);
  }
  function decodeMessage(type, bytes, depth = 0, parent, parentName) {
    if (depth > 64) throw new Error("Protobuf nesting limit");
    const message = {},
      fields = wireFields(bytes);
    const counts = fields.length > 1 ? new Map() : null;
    const state = { bytes, fields, parent, parentName };
    const specs = (fieldSpecs[type] ??= new Map(schema[type].map((spec) => [spec[0], spec])));
    Object.defineProperty(message, wireState, { value: state });
    for (const [, name, , repeated] of schema[type]) if (repeated) message[name] = [];
    if (counts)
      for (const field of fields) {
        const spec = specs.get(field.no);
        if (!spec || field.wire !== (spec[2] === "bool" || spec[2] === "uint" ? 0 : 2)) continue;
        field.spec = spec;
        if (!spec[3]) counts.set(spec[1], (counts.get(spec[1]) ?? 0) + 1);
      }
    let lazyNames;
    for (const field of fields) {
      const spec = counts ? field.spec : specs.get(field.no);
      if (!spec || field.wire !== (spec[2] === "bool" || spec[2] === "uint" ? 0 : 2)) continue;
      field.spec = spec;
      const [, name, kind, repeated] = spec;
      if (!repeated && (counts?.get(name) ?? 0) > 1) {
        delete field.spec;
        continue;
      }
      // Normal content stays eager; only present optional branches get a getter.
      if (schema[kind] && !contentTypes.has(kind)) {
        if (lazyNames?.has(name)) continue;
        (lazyNames ??= new Set()).add(name);
        const records = fields.filter((candidate) => candidate.spec?.[1] === name);
        state.type = type;
        state.deferred = true;
        Object.defineProperty(message, name, {
          enumerable: true,
          configurable: true,
          get() {
            const value = repeated
              ? records.map((record) => readField(record, depth, state))
              : readField(records[0], depth, state);
            Object.defineProperty(message, name, {
              value,
              enumerable: true,
              writable: true,
              configurable: true,
            });
            return value;
          },
        });
      } else {
        const value = readField(field, depth, state);
        if (repeated) message[name].push(value);
        else message[name] = value;
      }
    }
    return message;
  }
  function setField(message, name, value) {
    const previous = message[name];
    const same =
      Array.isArray(previous) && Array.isArray(value)
        ? previous.length === value.length && previous.every((item, i) => item === value[i])
        : previous === value;
    if (same) return false;
    message[name] = value;
    if (message[wireState]) markChanged(message[wireState], name);
    return true;
  }
  function encodeField(spec, value) {
    const [no, , kind] = spec,
      wire = kind === "bool" || kind === "uint" ? 0 : 2;
    const data =
      kind === "bytes"
        ? value
        : kind === "string"
          ? textEncoder.encode(value)
          : kind === "bool"
            ? varint(value ? 1 : 0)
            : kind === "uint"
              ? varint(value)
              : encodeMessage(kind, value);
    return concatBytes(wire === 2 ? [varint(no * 8 + wire), varint(data.length), data] : [varint(no * 8), data]);
  }
  function encodeMessage(type, message) {
    const state = message[wireState];
    if (state && !state.changed) return state.bytes;
    // Repeated edits filter existing values or append new ones; survivors keep wire order.
    const chunks = [],
      remaining = new Map(),
      handled = new Set();
    const identity = (value, kind) => (schema[kind] ? (value[wireState]?.bytes ?? value) : value);
    function values(spec) {
      const [, name, , repeated] = spec;
      return repeated ? (message[name] ?? []) : message[name] === undefined ? [] : [message[name]];
    }
    for (const spec of schema[type]) {
      const [, name, kind, repeated] = spec;
      if (!repeated || !state?.changed?.has(name)) continue;
      remaining.set(name, new Map(values(spec).map((value) => [identity(value, kind), value])));
    }
    for (const field of state?.fields ?? []) {
      if (!field.spec || !state.changed.has(field.spec[1])) {
        chunks.push(field.raw);
        continue;
      }
      const [, name, kind, repeated] = field.spec;
      handled.add(name);
      if (repeated) {
        const pending = remaining.get(name);
        if (!pending.has(field.data)) continue;
        const value = pending.get(field.data);
        pending.delete(field.data);
        chunks.push(!schema[kind] || !value[wireState]?.changed ? field.raw : encodeField(field.spec, value));
      } else {
        const value = message[name];
        if (value !== undefined)
          chunks.push(
            identity(value, kind) === field.data && (!schema[kind] || !value[wireState]?.changed)
              ? field.raw
              : encodeField(field.spec, value),
          );
      }
    }
    for (const spec of schema[type]) {
      const [, name, , repeated] = spec;
      if (state && !state.changed.has(name)) continue;
      if (repeated && remaining.has(name)) {
        for (const value of remaining.get(name).values()) chunks.push(encodeField(spec, value));
      } else if (!handled.has(name)) for (const value of values(spec)) chunks.push(encodeField(spec, value));
    }
    const output = concatBytes(chunks);
    return state && sameBytes(output, state.bytes) ? state.bytes : output;
  }
  function codec(type) {
    return {
      fromBinary: (bytes) => decodeMessage(type, bytes),
      toBinary: (message) => encodeMessage(type, message),
    };
  }
  const EMPTY_FIELDS = [];
  function unknownFields(message) {
    const state = message[wireState];
    if (!state) return EMPTY_FIELDS;
    if (state.unknown) return state.unknown;
    if (!state.fields.length || (state.fields.length === 1 && state.fields[0].spec)) return EMPTY_FIELDS;
    let unknown;
    for (const field of state.fields) if (!field.spec) (unknown ??= []).push(field);
    return (state.unknown = unknown ?? EMPTY_FIELDS);
  }
  // Patch a verified opaque field without teaching the content walker its schema.
  function rewriteUnknownField(message, no, transform) {
    let edits;
    for (const field of unknownFields(message)) {
      if (field.no !== no || field.wire !== 2) continue;
      const data = transform(field.data);
      if (data && sameBytes(data, field.data)) continue;
      (edits ??= []).push({ field, data });
    }
    if (!edits) return false;
    const state = message[wireState];
    for (const { field, data } of edits) {
      if (data) {
        field.data = data;
        field.raw = encodeField([no, "", "bytes"], data);
      } else {
        state.fields.splice(state.fields.indexOf(field), 1);
      }
    }
    state.unknown = undefined;
    // No declared field changed here; ancestors still use parentName.
    markChanged(state, "");
    return true;
  }
  // Edit a declared binary path; keep all siblings and repeated occurrences.
  function rewriteBinaryPath(bytes, path, transform) {
    if (!path.length) return transform(bytes);
    let changed = false;
    const chunks = wireFields(bytes).map((field) => {
      if (field.no !== path[0] || field.wire !== 2) return field.raw;
      const data = rewriteBinaryPath(field.data, path.slice(1), transform);
      if (sameBytes(data, field.data)) return field.raw;
      changed = true;
      return encodeField([field.no, "", "bytes"], data);
    });
    return changed ? concatBytes(chunks) : bytes;
  }

  const ROUTES = {
    "navigation/resolve_url": ["ResolveUrl", transformNavigation],
    browse: ["Browse", transformContent],
    next: ["Next", transformContent],
    player: ["Player", transformPlayer],
    search: ["Search", transformContent],
    "reel/reel_watch_sequence": ["Shorts", removeShortsAds],
    guide: ["Guide", filterGuide],
    "account/get_setting": ["Setting", addPremiumSettings],
    get_watch: ["Watch", transformWatch],
  };
  function apiMain() {
    try {
      const endpoint = $request.url.split("?")[0].split("/youtubei/v1/")[1];
      const route = Object.hasOwn(ROUTES, endpoint) && ROUTES[endpoint];
      if (!route || Number($response.status) >= 300 || !$response.body?.length) return $done();
      const [type, transform] = route,
        messageCodec = codec(type);
      const message = messageCodec.fromBinary($response.body);
      const options = readOptions({
        blockUpload: true,
        blockShorts: false,
      });
      if (options.autoHd !== false) cacheQuality(responsePlayers(type, message));
      $done(transform(message, options) ? { body: messageCodec.toBinary(message) } : {});
    } catch (error) {
      console.log("YouTube response: " + error);
      $done();
    }
  }

  apiMain();
})();

    })(
      __stashFinal,
      __stashArgument,
      __stashRequest,
      __stashResponse,
      typeof $persistentStore === "undefined" ? undefined : $persistentStore,
      __stashRealConsole
    );
  } catch (error) {
    __stashRealConsole.log("YouTube Stash response wrapper: " + error);
    __stashFinal({});
  }
})();
