const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");

const SCRIPT = path.join(__dirname, "..", "Stash", "txvideo-ad.stash.js");
const payload = fs.readFileSync(SCRIPT, "utf8");
let tests = 0;

function run(url, body, response = true) {
  const output = [];
  const logs = [];
  const box = {
    $request: { url, method: "POST", headers: {} },
    $done: (value) => output.push(value),
    console: { log: (message) => logs.push(String(message)) },
  };
  const input = body instanceof Uint8Array ? new Uint8Array(body) : body;
  if (response) box.$response = { body: input, status: 200, headers: {} };
  else box.$request.body = input;
  vm.runInNewContext(payload, box, { timeout: 1000 });
  assert.equal(output.length, 1, "$done must be called once");
  assert.equal(logs.length, 0, "unexpected script error: " + logs.join(" | "));
  tests++;
  return output[0];
}

const concat = (...parts) => Buffer.concat(parts);
const ev = (value) => {
  const bytes = [];
  do {
    bytes.push((value & 127) | (value > 127 ? 128 : 0));
    value = Math.floor(value / 128);
  } while (value);
  return Buffer.from(bytes);
};
const field = (number, data) => concat(ev(number * 8 + 2), ev(data.length), data);
const empty = Buffer.alloc(0);

function frame(header, body = empty) {
  const out = Buffer.alloc(16 + header.length + body.length);
  out[0] = 9;
  out[1] = 48;
  out.writeUInt32BE(out.length, 4);
  out.writeUInt16BE(header.length, 8);
  header.copy(out, 16);
  body.copy(out, 16 + header.length);
  return out;
}

const url = "https://i.video.qq.com/?test=1";

// 1-2. Splash request blocking, plain and gzip.
const splashFunc = "/trpc.business_splash.ad_ssp_splash.splashService/GetSplashPreload";
const splashRequest = frame(field(7, Buffer.from(splashFunc)));
for (const zip of [false, true]) {
  const raw = zip ? zlib.gzipSync(splashRequest) : splashRequest;
  const result = run(url, raw, false);
  let out = Buffer.from(result.body);
  if (zip) out = zlib.gunzipSync(out);
  assert.equal(out.length, splashRequest.length);
  assert.ok(out.includes(Buffer.from("XetSplashPreload")));
  assert.ok(!out.includes(Buffer.from(splashFunc)));
}
assert.equal(Object.keys(run(url, frame(field(7, Buffer.from("/service/Normal"))), false)).length, 0);

// 3-4. Feed ad response cleaning, plain and gzip.
const adType = Buffer.from("type.googleapis.com/test.AdResponseInfo");
const cleanBody = concat(field(1, field(1, field(1, adType))), field(2, Buffer.from("keep")));
for (const zip of [false, true]) {
  const raw = zip ? zlib.gzipSync(frame(empty, cleanBody)) : frame(empty, cleanBody);
  const result = run(url, raw, true);
  let out = Buffer.from(result.body);
  if (zip) out = zlib.gunzipSync(out);
  assert.equal(out.subarray(16).toString(), field(2, Buffer.from("keep")).toString());
}

// 5-6. AB config injection, plain and gzip.
const abBody = concat(ev(8), ev(100), field(3, field(1, Buffer.from("other_config"))));
for (const zip of [false, true]) {
  const raw = zip ? zlib.gzipSync(abBody) : abBody;
  const result = run("https://config.ab.qq.com/tab/GetTabRemoteConfig", raw, true);
  let out = Buffer.from(result.body);
  if (zip) out = zlib.gunzipSync(out);
  assert.ok(out.includes(Buffer.from("simple_mode_config")));
  assert.ok(out.includes(Buffer.from("0;2;4")));
}

// 7. rdelivery text rewrite.
{
  const result = run("https://rdelivery.qq.com/v1/sdkconfig/get", JSON.stringify({ tab_gray: true, keep: 1 }), true);
  assert.equal(result.body, JSON.stringify({ tab_gray: false, keep: 1 }));
}
assert.equal(Object.keys(run("https://rdelivery.qq.com/v1/sdkconfig/get", JSON.stringify({ tab_gray: false }), true)).length, 0);

// JCE helpers.
const ji = (tag, value) => value === 0
  ? Buffer.from([(tag << 4) | 12])
  : value < 128
    ? Buffer.from([(tag << 4), value])
    : Buffer.from([(tag << 4) | 1, value >> 8, value & 255]);
const str = (tag, value) => concat(Buffer.from([(tag << 4) | 6, Buffer.byteLength(value)]), Buffer.from(value));
const simple = (tag, data) => concat(Buffer.from([(tag << 4) | 13, 0]), ji(0, data.length), data);

function jce(cmd, body) {
  const inner = concat(Buffer.alloc(16), simple(1, body), Buffer.from([40]));
  inner[0] = 38;
  inner.writeUInt32BE(inner.length, 1);
  const head = Buffer.alloc(68);
  head[0] = 19;
  head[8] = cmd >> 16;
  head[9] = (cmd >> 8) & 255;
  head[10] = cmd & 255;
  head.writeUInt32BE(inner.length, 64);
  const out = concat(head, zlib.gzipSync(inner), Buffer.from([3]));
  out.writeUInt32BE(out.length, 1);
  return out;
}

function jrun(cmd, body) {
  const result = run("https://iacc.qq.com/", jce(cmd, body), true);
  const out = Buffer.from(result.body);
  assert.equal(out.readUInt32BE(1), out.length);
  const inner = zlib.gunzipSync(out.subarray(68, -1));
  assert.equal(out.readUInt32BE(64), inner.length);
  assert.equal(inner.readUInt32BE(1), inner.length);
  return inner;
}

// 8. Teen config.
const teen = concat(ji(4, 1), str(9, "0123456789ABCDEF0123456789ABCDEF"), Buffer.from([106]), str(0, "popup"), Buffer.from([11]));
const teenOut = jrun(89738, teen);
assert.ok(teenOut.includes(ji(4, 0)));
assert.ok(!teenOut.includes(Buffer.from("popup")));

// 9. Play tips.
const tipsOut = jrun(126577, concat(Buffer.from([24]), ji(0, 2), str(0, "4_operator_info"), str(1, "drop"), str(0, "keep_key"), str(1, "keep_value")));
assert.ok(!tipsOut.includes(Buffer.from("4_operator_info")));
assert.ok(tipsOut.includes(Buffer.from("keep_value")));

// 10. Roll ads.
for (const cmd of [129278, 130273]) {
  const rollOut = jrun(cmd, concat(Buffer.from([41]), ji(0, 1), str(0, "livemsg")));
  assert.ok(!rollOut.includes(Buffer.from("livemsg")));
  assert.ok(rollOut.includes(Buffer.from([41, 12])));
}

// 11. Pause ad (JCE 129196).
const pauseItem = concat(Buffer.from([0x06, 7]), Buffer.from("livemsg"));
const pauseList = concat(Buffer.from([0x09]), ji(0, 1), pauseItem);
const pauseMap = concat(Buffer.from([0x1a]), simple(1, pauseList), Buffer.from([0x0b]));
const pauseOut = jrun(129196, pauseMap);
assert.ok(!pauseOut.includes(Buffer.from("livemsg")), "pause ad list must be cleared");

// 12. Pause ad control: unrelated list must pass through.
const otherItem = concat(Buffer.from([0x06, 8]), Buffer.from("othermsg"));
const otherList = concat(Buffer.from([0x09]), ji(0, 1), otherItem);
const otherMap = concat(Buffer.from([0x1a]), simple(1, otherList), Buffer.from([0x0b]));
assert.equal(Object.keys(run("https://iacc.qq.com/", jce(129196, otherMap), true)).length, 0);

// 13-14. Waterfall feed ad removal and control.
function feedBody(tag) {
  const block = concat(field(1, Buffer.from("inner_module_id")), field(4, field(1, Buffer.from("type.googleapis.com/test.AdFeedInfo"))));
  const level1 = field(1, block);
  const level2 = field(5, level1);
  const element = concat(field(1, Buffer.from("some_module_id")), field(6, Buffer.from(tag)), field(2, level2));
  return field(1, element);
}
const feedResult = run(url, frame(empty, feedBody("waterfall_feeds_module_mergeid")), true);
assert.equal(Buffer.from(feedResult.body).length, 16, "waterfall feed element must be removed");
assert.equal(Object.keys(run(url, frame(empty, feedBody("normal_module")), true)).length, 0, "unrelated module must pass through");

// 15. Invalid bodies pass through.
for (const host of ["i.video.qq.com", "iacc.qq.com"]) {
  assert.equal(Object.keys(run("https://" + host + "/", Buffer.from([0, 1, 2, 255]), true)).length, 0);
}

console.log("Tencent Video Stash 脚本回归测试通过：" + tests + " 项。");
