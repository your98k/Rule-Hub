// CMS 资源站：暴风影视跑马灯片段重定向
// 上游 Loon 写法：redirect(307, "${urlMatch.1}${urlMatch.2}.ts")
// Stash 无捕获组模板跳转，改为 request 脚本改写 URL（$done({ url })，等效 307 重定向）

const url = typeof $request !== 'undefined' ? ($request.url || '') : '';
const m = url.match(/^(https?:\/\/s\d+\.bfengbf\.com\/video)(.+)_z5q\.ts/i);
if (!m) {
  $done({});
} else {
  $done({ url: m[1] + m[2] + '.ts' });
}
