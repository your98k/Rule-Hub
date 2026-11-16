console.log("Auto-generated gabo response");
const __headers = {
  "cache-control": "no-cache",
  "content-length": "0",
  "server-timing": "edge;dur=666",
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
  "alt-svc": 'h3=":443"; ma=2592000,h3-29=":443"; ma=2592000',
  "date": new Date().toUTCString(),
  "server": "envoy",
  "via": "HTTP/2 edgeproxy, 1.1 google"
};
const __body = "";
// 同时给出两种形态：Stash/Surge 读顶层，部分客户端读 response 包裹
$done({ status: 200, headers: __headers, body: __body, response: { status: 200, headers: __headers, body: __body } });
