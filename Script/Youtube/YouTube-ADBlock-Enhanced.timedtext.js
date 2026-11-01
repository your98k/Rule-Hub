/* Temporary timedtext response translator: keeps the signed request untouched. */
(function () {
  var realDone = $done;
  var realConsole = console;
  var TAG = "[YTTR-3f91]";
  var finished = false;
  var argument = typeof $argument === "undefined" ? "" : $argument;

  function done(value) {
    if (finished) return;
    finished = true;
    realDone(value === undefined ? {} : value);
  }

  function parseArgument() {
    try {
      return typeof argument === "string" ? JSON.parse(argument) : (argument || {});
    } catch (error) {
      return {};
    }
  }

  function normalizeLanguage(value) {
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

  function typeOf(value) {
    if (value === undefined || value === null) return "none";
    if (value instanceof Uint8Array) return "u8";
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) return "view";
    if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) return "ab";
    if (typeof value === "string") return "string";
    return typeof value;
  }

  function textOfBody(value) {
    if (typeof value === "string") return value;
    if (value instanceof Uint8Array) {
      try {
        return new TextDecoder("utf-8", { fatal: false }).decode(value);
      } catch (error) {
        return null;
      }
    }
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
      try {
        return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function xmlDecode(text) {
    return String(text)
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, function (all, hex) {
        try { return String.fromCodePoint(parseInt(hex, 16)); } catch (error) { return all; }
      })
      .replace(/&#(\d+);/g, function (all, decimal) {
        try { return String.fromCodePoint(parseInt(decimal, 10)); } catch (error) { return all; }
      })
      .replace(/&amp;/g, "&");
  }

  function xmlEscape(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function splitText(text, size) {
    var rows = String(text).split("\n");
    var chunks = [];
    var current = "";
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var candidate = current ? current + "\n" + row : row;
      if (candidate.length > size && current) {
        chunks.push(current);
        current = row;
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

  function shift(value, magic) {
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

  function token(text) {
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
    for (var k = 0; k < bytes.length; k++) value = shift(value + bytes[k], "+-a^+6");
    value = shift(value, "+-3^+b+-f");
    value ^= 3293161072;
    if (value < 0) value = (value & 2147483647) + 2147483648;
    value %= 1000000;
    return value.toString() + "." + (value ^ 406644);
  }

  function translateUrl(text, language) {
    var target = language === "zh-Hans" ? "zh-CN" : language === "zh-Hant" ? "zh-TW" : language;
    return "https://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=" +
      encodeURIComponent(target) +
      "&hl=zh-CN&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&source=bh&ssel=0&tsel=0&kc=1&tk=" +
      token(text) + "&q=" + encodeURIComponent(text);
  }

  function httpGet(url, httpClient) {
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
          if (data && typeof data === "object" && data.body !== undefined) return resolve(textOfBody(data.body));
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

  async function translateText(text, language, httpClient) {
    if (!httpClient || !text || !text.trim()) return null;
    var chunks = splitText(text, 1800);
    var segments = [];
    var started = Date.now();
    for (var i = 0; i < chunks.length; i++) {
      if (Date.now() - started > 20000) return null;
      var raw = await httpGet(translateUrl(chunks[i], language), httpClient);
      if (!raw) return null;
      var data;
      try {
        data = JSON.parse(raw);
      } catch (error) {
        return null;
      }
      if (!data || !Array.isArray(data[0])) return null;
      for (var j = 0; j < data[0].length; j++) {
        var part = data[0][j];
        segments.push(Array.isArray(part) && typeof part[0] === "string" ? part[0] : "");
      }
    }
    return segments.length ? segments : null;
  }

  async function translateLines(lines, language, httpClient) {
    if (!lines.length) return null;
    var translated = await translateText(lines.join("\n"), language, httpClient);
    if (!translated) return null;
    if (translated.length >= lines.length) return translated.slice(0, lines.length);
    var joined = translated.join("").split("\n");
    return joined.length >= lines.length ? joined.slice(0, lines.length) : null;
  }

  async function translateMany(lines, language, httpClient) {
    if (!lines.length) return null;
    var output = lines.slice();
    var groupSize = 6;
    var groups = [];
    for (var i = 0; i < lines.length; i += groupSize) {
      groups.push({ start: i, items: lines.slice(i, i + groupSize) });
    }
    var cursor = 0;
    var started = Date.now();
    async function worker() {
      while (true) {
        if (Date.now() - started > 20000) return;
        var group = groups[cursor++];
        if (!group) return;
        var result = null;
        try {
          result = await translateText(group.items.join("\n"), language, httpClient);
        } catch (error) {}
        if (!result) continue;
        var mapped = null;
        if (result.length >= group.items.length) {
          mapped = result.slice(0, group.items.length);
        } else {
          var joined = result.join("").split("\n");
          if (joined.length >= group.items.length) mapped = joined.slice(0, group.items.length);
        }
        if (!mapped) continue;
        for (var j = 0; j < group.items.length; j++) {
          var replacement = mapped[j];
          if (replacement && replacement !== group.items[j]) output[group.start + j] = replacement;
        }
      }
    }
    var workers = [];
    var count = Math.min(8, groups.length);
    for (var k = 0; k < count; k++) workers.push(worker());
    await Promise.all(workers);
    return output;
  }

  async function translateXml(body, language, httpClient) {
    var pattern = />([^<]+)</g;
    var refs = [];
    var lines = [];
    var match;
    var textNodes = 0;
    var tags = {};
    var tagPattern = /<([A-Za-z][\w:.-]*)\b/g;
    var tagMatch;
    while ((tagMatch = tagPattern.exec(body))) {
      tags[tagMatch[1]] = (tags[tagMatch[1]] || 0) + 1;
    }
    while ((match = pattern.exec(body))) {
      textNodes++;
      var text = xmlDecode(match[1]);
      if (!looksLikeXmlText(text)) continue;
      refs.push(match);
      lines.push(text);
    }
    if (!refs.length) return { body: body, lines: 0, nodes: textNodes, translated: 0, tags: tags };
    var translated = await translateMany(lines, language, httpClient);
    if (!translated) return { body: body, lines: lines.length, nodes: textNodes, translated: 0, tags: tags };
    var index = 0;
    var translatedCount = 0;
    var output = body.replace(/>([^<]+)</g, function (all, inner) {
      var text = xmlDecode(inner);
      if (!looksLikeXmlText(text)) return all;
      var replacement = translated[index++];
      if (replacement && replacement !== text) {
        translatedCount++;
        return ">" + xmlEscape(replacement) + "<";
      }
      return all;
    });
    return { body: output, lines: lines.length, nodes: textNodes, translated: translatedCount, tags: tags };
  }

  async function translateJson(body, language, httpClient) {
    var data;
    try {
      data = JSON.parse(body);
    } catch (error) {
      return null;
    }
    var events = data && data.events;
    if (!Array.isArray(events)) return null;
    var refs = [];
    var lines = [];
    for (var i = 0; i < events.length; i++) {
      var event = events[i];
      if (!event || !Array.isArray(event.segs)) continue;
      var text = event.segs.map(function (seg) { return seg && typeof seg.utf8 === "string" ? seg.utf8 : ""; }).join("");
      if (!text) continue;
      refs.push(event);
      lines.push(text);
    }
    if (!refs.length) return null;
    var translated = await translateLines(lines, language, httpClient);
    if (!translated) return null;
    for (var j = 0; j < refs.length; j++) refs[j].segs = [{ utf8: translated[j] }];
    return { body: JSON.stringify(data), lines: lines.length };
  }

  async function translateVtt(body, language, httpClient) {
    var blocks = body.split(/\r?\n\r?\n/);
    var refs = [];
    var lines = [];
    for (var i = 0; i < blocks.length; i++) {
      var rows = blocks[i].split(/\r?\n/);
      var timing = -1;
      for (var j = 0; j < rows.length; j++) if (rows[j].indexOf("-->") >= 0) { timing = j; break; }
      if (timing < 0) continue;
      var textRows = rows.slice(timing + 1);
      if (!textRows.length) continue;
      refs.push({ blockIndex: i, rows: rows, timing: timing });
      lines.push(textRows.join("\n"));
    }
    if (!refs.length) return null;
    var translated = await translateLines(lines, language, httpClient);
    if (!translated) return null;
    for (var k = 0; k < refs.length; k++) {
      var ref = refs[k];
      blocks[ref.blockIndex] = ref.rows.slice(0, ref.timing + 1).concat([translated[k]]).join("\n");
    }
    return { body: blocks.join("\n\n"), lines: lines.length };
  }

  var textEncoder = new TextEncoder();

  function concatBytes(chunks) {
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

  function bytesOf(value) {
    if (!value) return null;
    if (value instanceof Uint8Array) return value;
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) return new Uint8Array(value);
    if (typeof value === "string") return textEncoder.encode(value);
    return null;
  }

  function headHex(value) {
    var bytes = bytesOf(value);
    if (!bytes) return "none";
    var output = "";
    for (var i = 0; i < Math.min(16, bytes.length); i++) {
      output += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
    }
    return output || "empty";
  }

  function header(name) {
    var headers = $response && $response.headers;
    if (!headers) return "";
    for (var key in headers) {
      if (key.toLowerCase() === name.toLowerCase()) return String(headers[key] || "");
    }
    return "";
  }

  function looksBase64(text) {
    var clean = String(text).replace(/\s/g, "");
    if (clean.length < 100 || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) return null;
    try {
      var binary = atob(clean);
      var output = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) output[i] = binary.charCodeAt(i);
      return output;
    } catch (error) {
      return null;
    }
  }

  async function gunzip(bytes) {
    if (typeof DecompressionStream === "undefined") return null;
    try {
      var stream = new DecompressionStream("gzip");
      var writer = stream.writable.getWriter();
      await writer.write(bytes);
      await writer.close();
      var reader = stream.readable.getReader();
      var chunks = [];
      var total = 0;
      while (true) {
        var result = await reader.read();
        if (result.done) break;
        if (result.value) {
          chunks.push(result.value);
          total += result.value.length;
          if (total > 16 * 1024 * 1024) return null;
        }
      }
      var output = new Uint8Array(total);
      var offset = 0;
      for (var i = 0; i < chunks.length; i++) {
        output.set(chunks[i], offset);
        offset += chunks[i].length;
      }
      return output;
    } catch (error) {
      return null;
    }
  }

  function varint(value) {
    var bytes = [];
    do {
      bytes.push((value % 128) | (value > 127 ? 128 : 0));
      value = Math.floor(value / 128);
    } while (value);
    return new Uint8Array(bytes);
  }

  function readVarint(bytes, index, end) {
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

  function parseFields(bytes, start, end) {
    var fields = [];
    var index = start;
    while (index < end) {
      var fieldStart = index;
      var key = readVarint(bytes, index, end);
      if (!key) return null;
      index = key[1];
      var number = Math.floor(key[0] / 8);
      var wire = key[0] & 7;
      if (!number) return null;
      var dataStart;
      var dataEnd;
      var fieldEnd;
      if (wire === 0) {
        var value = readVarint(bytes, index, end);
        if (!value) return null;
        dataStart = index;
        dataEnd = fieldEnd = value[1];
      } else if (wire === 1) {
        dataStart = index;
        dataEnd = fieldEnd = index + 8;
      } else if (wire === 2) {
        var size = readVarint(bytes, index, end);
        if (!size) return null;
        dataStart = size[1];
        dataEnd = dataStart + size[0];
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
        dataStart: dataStart,
        dataEnd: dataEnd,
        raw: bytes.subarray(fieldStart, fieldEnd)
      });
      index = fieldEnd;
    }
    return fields;
  }

  function encodeField(number, payload) {
    var tag = varint(number * 8 + 2);
    var length = varint(payload.length);
    var output = new Uint8Array(tag.length + length.length + payload.length);
    output.set(tag, 0);
    output.set(length, tag.length);
    output.set(payload, tag.length + length.length);
    return output;
  }

  function looksLikeText(bytes) {
    var text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (error) {
      return "";
    }
    if (!text || text.length < 2) return "";
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) return "";
    if (text.indexOf("://") >= 0) return "";
    if (/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i.test(text)) return "";
    if (!/[A-Za-z\u4e00-\u9fff]/.test(text)) return "";
    if (/^[A-Za-z0-9+/=_-]+$/.test(text) && text.length > 20) return "";
    if (/^[\d\s.,:;!?-]+$/.test(text)) return "";
    return text;
  }

  function looksLikeXmlText(text) {
    var value = String(text).replace(/^\s+|\s+$/g, "");
    if (!value) return false;
    if (/^[\d\s.,:;!?-]+$/.test(value)) return false;
    if (!/[^\s\d]/.test(value)) return false;
    return true;
  }

  function collectTexts(bytes, depth, entries) {
    if (depth > 16) return;
    var fields = parseFields(bytes, 0, bytes.length);
    if (!fields) return;
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (field.wire !== 2) continue;
      var payload = bytes.subarray(field.dataStart, field.dataEnd);
      var text = looksLikeText(payload);
      if (text) entries.push(text);
      else collectTexts(payload, depth + 1, entries);
    }
  }

  function replaceTexts(bytes, depth, state) {
    if (depth > 16) return { bytes: bytes, changed: false };
    var fields = parseFields(bytes, 0, bytes.length);
    if (!fields) return { bytes: bytes, changed: false };
    var changed = false;
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (field.wire !== 2) continue;
      var payload = bytes.subarray(field.dataStart, field.dataEnd);
      var text = looksLikeText(payload);
      if (text) {
        var index = state.index++;
        var replacement = state.translated[index];
        if (replacement && replacement !== text) {
          field.raw = encodeField(field.no, textEncoder.encode(replacement));
          changed = true;
        }
      } else {
        var child = replaceTexts(payload, depth + 1, state);
        if (child.changed) {
          field.raw = encodeField(field.no, child.bytes);
          changed = true;
        }
      }
    }
    return {
      bytes: changed ? concatBytes(fields.map(function (field) { return field.raw; })) : bytes,
      changed: changed
    };
  }

  async function translateProtobuf(bytes, language, httpClient) {
    var entries = [];
    collectTexts(bytes, 0, entries);
    if (!entries.length) return null;
    var translated = await translateLines(entries, language, httpClient);
    if (!translated) return null;
    var result = replaceTexts(bytes, 0, { index: 0, translated: translated });
    if (!result.changed) return null;
    return { body: result.bytes, lines: entries.length };
  }

  function detectFormat(body) {
    var trimmed = String(body).replace(/^\s+/, "");
    if (trimmed.charAt(0) === "{" || trimmed.charAt(0) === "[") return "json";
    if (/^WEBVTT/i.test(trimmed)) return "vtt";
    if (/^<\?xml/i.test(trimmed) || /<(?:text|p|transcript|tt|timedtext)\b/i.test(trimmed)) return "xml";
    return "unknown";
  }

  (async function main() {
    try {
      function safeText(value) {
        return String(value || "").replace(/[^A-Za-z0-9_.\/;=+,-]/g, "_").slice(0, 80);
      }
      function tagSummary(tags) {
        var parts = [];
        if (tags) for (var key in tags) parts.push(key + ":" + tags[key]);
        return parts.slice(0, 10).join(",");
      }
      var argumentObject = parseArgument();
      var language = normalizeLanguage(argumentObject.captionLang);
      var responseBody = $response && $response.body;
      var httpClient = typeof $httpClient === "undefined" ? null : $httpClient;
      var rawBytes = bytesOf(responseBody);
      var originalLength = rawBytes ? rawBytes.length : (typeof responseBody === "string" ? responseBody.length : -1);
      var body = textOfBody(responseBody);
      var contentType = header("content-type");
      var contentEncoding = header("content-encoding");
      var gz = 0;
      if (rawBytes && rawBytes.length > 1 && rawBytes[0] === 0x1f && rawBytes[1] === 0x8b) {
        var unzipped = await gunzip(rawBytes);
        if (unzipped) {
          rawBytes = unzipped;
          body = textOfBody(unzipped);
          gz = 1;
        }
      }
      if (!body || !body.trim()) {
        realConsole.log(TAG + " script=timedtext endpoint=timedtext target=" + language +
          " format=none lines=0 translated=0 changed=0 bodyLen=" + originalLength +
          " bodyType=" + typeOf(responseBody) + " ct=" + safeText(contentType) +
          " ce=" + safeText(contentEncoding) + " gz=" + gz + " head=" + headHex(responseBody) + "|done");
        return done({});
      }
      var format = detectFormat(body);
      if (format === "unknown") {
        var decoded = looksBase64(body);
        if (decoded) {
          rawBytes = decoded;
          body = textOfBody(decoded);
          format = detectFormat(body);
        }
      }
      realConsole.log(TAG + " script=timedtext endpoint=timedtext target=" + language +
        " format=" + format + "|entry");
      if (language === "off") {
        realConsole.log(TAG + " script=timedtext endpoint=timedtext target=off format=" + format +
          " lines=0 translated=0 changed=0 bodyLen=" + originalLength +
          " bodyType=" + typeOf(responseBody) + " ct=" + safeText(contentType) +
          " ce=" + safeText(contentEncoding) + " gz=" + gz + " head=" + headHex(responseBody) + "|done");
        return done({});
      }
      var result = null;
      if (format === "json") result = await translateJson(body, language, httpClient);
      else if (format === "vtt") result = await translateVtt(body, language, httpClient);
      else if (format === "xml") result = await translateXml(body, language, httpClient);
      else {
        if (!rawBytes) rawBytes = bytesOf(body);
        if (rawBytes) {
          var protobuf = await translateProtobuf(rawBytes, language, httpClient);
          if (protobuf) {
            result = { body: protobuf.body, lines: protobuf.lines };
            format = "protobuf";
          }
        }
      }
      var changed = result && (typeof result.body === "string" ? result.body !== body : true);
      var xmlNodes = result && typeof result.nodes === "number" ? result.nodes : 0;
      var xmlLines = result && typeof result.lines === "number" ? result.lines : 0;
      var translatedCount = result && typeof result.translated === "number" ? result.translated : (result ? result.lines : 0);
      if (!result || !changed) {
        realConsole.log(TAG + " script=timedtext endpoint=timedtext target=" + language +
          " format=" + format + " lines=" + xmlLines + " translated=" + translatedCount +
          " xmlNodes=" + xmlNodes + " xmlTags=" + tagSummary(result && result.tags) +
          " changed=0 bodyLen=" + originalLength +
          " bodyType=" + typeOf(responseBody) + " ct=" + safeText(contentType) +
          " ce=" + safeText(contentEncoding) + " gz=" + gz + " head=" + headHex(responseBody) + "|done");
        return done({});
      }
      var outputBody = typeof result.body === "string" ? textEncoder.encode(result.body) : result.body;
      realConsole.log(TAG + " script=timedtext endpoint=timedtext target=" + language +
        " format=" + format + " lines=" + xmlLines + " translated=" + translatedCount +
        " xmlNodes=" + xmlNodes + " xmlTags=" + tagSummary(result && result.tags) +
        " changed=1 bodyLen=" + originalLength + " bodyType=" + typeOf(responseBody) +
        " ct=" + safeText(contentType) + " ce=" + safeText(contentEncoding) +
        " gz=" + gz + " head=" + headHex(responseBody) + "|done");
      done({ body: outputBody });
    } catch (error) {
      realConsole.log(TAG + " script=timedtext endpoint=timedtext error");
      done({});
    }
  })();
})();
