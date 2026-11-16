// 最新修改/部署时间: 2026-05-10 14:50:00 (UTC+8) — 支持 Strategy 参数, [Bypass,...,Strategy] 末段识别注入策略
// 参考薯薯: https://github.com/NSNanoCat/util/blob/main/test/argument.test.js
const url = $request.url;
let bypassParam = "-";
let strategyParam = "auto";

// 解析 $argument: 兼容 "Bypass=x&Strategy=y" / "[x,y]" / 纯字符串 / 对象
if (typeof $argument !== "undefined" && $argument !== null && $argument !== "") {
    if (typeof $argument === "string") {
        let str = $argument.trim();
        if (/(?:Bypass|bypass|Strategy|strategy)=/i.test(str)) {
            const bm = str.match(/(?:Bypass|bypass)=([^&]+)/i);
            if (bm) bypassParam = decodeURIComponent(bm[1]);
            const sm = str.match(/(?:Strategy|strategy)=([^&]+)/i);
            if (sm) strategyParam = decodeURIComponent(sm[1]);
        } else if (str.startsWith("[") && str.endsWith("]")) {
            // 兼容 [Bypass,Strategy] 以及 Bypass 内含逗号 (如 [Filebar,XXX,YYY,auto]) 的情况
            // 约定: 最后一段是 Strategy (若匹配已知策略名), 其余全部拼回 Bypass
            const knownStrategies = ["auto", "lifetime_sub", "year", "month", "all"];
            const parts = str.slice(1, -1).split(",").map(s => s.trim()).filter(Boolean);
            if (parts.length === 0) {
                // empty, keep defaults
            } else if (parts.length === 1) {
                bypassParam = parts[0];
            } else {
                const last = parts[parts.length - 1].toLowerCase();
                if (knownStrategies.includes(last)) {
                    strategyParam = last;
                    bypassParam = parts.slice(0, -1).join(",");
                } else {
                    // last 不是已知 strategy, 整段当 bypass (兼容老配置)
                    bypassParam = parts.join(",");
                }
            }
        } else {
            bypassParam = str;
        }
    } else if (typeof $argument === "object") {
        if ($argument.Bypass !== undefined) bypassParam = String($argument.Bypass);
        else if ($argument.bypass !== undefined) bypassParam = String($argument.bypass);
        if ($argument.Strategy !== undefined) strategyParam = String($argument.Strategy);
        else if ($argument.strategy !== undefined) strategyParam = String($argument.strategy);
        if (Array.isArray($argument)) {
            if ($argument.length > 0) bypassParam = String($argument[0]);
            if ($argument.length > 1) strategyParam = String($argument[1]);
        }
    }
}

const regex = /^https:\/\/(api\.revenuecat\.com|api\.rc-backup\.com|rc\.visionarytech\.ltd|revenue\.cuto\.app|proxy\.linearity\.io|subscriptions-api\.superwall\.com|api\.adapty\.io)\/(.*)$/;
const match = url.match(regex);

if (match) {
    const host = match[1];
    const rest = match[2];
    const targetUrl = `https://reven.jsforbaby.workers.dev/reven/${host}/${rest}?bypass=${encodeURIComponent(bypassParam)}&strategy=${encodeURIComponent(strategyParam)}`;

    // 透明代理
    const method = ($request.method || "GET").toLowerCase();
    const options = {
        url: targetUrl,
        headers: $request.headers
    };
    if ($request.body) {
        options.body = $request.body;
    }

    if (["get", "post", "put", "delete", "head", "options", "patch"].includes(method)) {
        $httpClient[method](options, function (error, response, data) {
            if (error) {
                $done({ response: { status: 500, body: String(error) } });
                return;
            }

            let headers = response.headers || {};
            // Loon底层会自动解压和处理分块，如果把原内容带 gzip 或 chunked 的 header 原封不动传给 APP，导致解锁失败
            const cleanHeaders = {};
            for (let key in headers) {
                if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
                    cleanHeaders[key] = headers[key];
                }
            }

            $done({
                response: {
                    status: response.status || response.statusCode || 200,
                    headers: cleanHeaders,
                    body: data
                }
            });
        });
    } else {
        $done({});
    }
} else {
    $done({});
}
