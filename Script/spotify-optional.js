// Spotify 可选隐藏项（Stash 参数化）
// 上游用 Loon 的条件改写（reject_dict 带 ${switch} 判断）实现；
// Stash 的改写不支持条件，故改为 request 脚本按参数决定是否短路为 200 + {}

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

const MATCHERS = [
  { key: 'HideDiscoveryFeed', re: /\/watch-feed-entrypoints\/v\d+\/discovery-from-seed/ },
  { key: 'HideMembershipInfo', re: /\/pam-view-service\// },
  { key: 'HideAiDj', re: /37i9dQZF1EYkqdzj48dyYq/ },
];

const hit = MATCHERS.find((m) => m.re.test(url));
if (!hit) {
  $done({});
} else if (args[hit.key] === false) {
  $done({}); // 开关关闭：原样放行
} else {
  const headers = { 'Content-Type': 'application/json' };
  const body = '{}';
  $done({ status: 200, headers, body, response: { status: 200, headers, body } });
}
