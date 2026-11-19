#!/usr/bin/env node
/**
 * generate-site.cjs - 生成 Stash 专属覆写画廊站数据与文件
 *
 * 用法：node scripts/generate-site.cjs [--base https://your98k.github.io/Rule-Hub]
 *
 * 扫描 Stash/*.stoverride：
 *   1. 解析 Stash 顶层 YAML 元数据（容错支持块标量与跨行文本）
 *   2. 生成 site/plugins.json
 *   3. 复制覆写文件到 site/files/Stash/
 *   4. 将数据内嵌到 site/index.html，作为离线兜底
 *   5. 复制预编译的 scripts/tailwind.css 到 site/assets/
 *
 * 注意：修改 site-template.html 中的 Tailwind class 后，需要重新编译 CSS：
 *   npx tailwindcss -c scripts/tailwind.config.js -i scripts/tailwind.input.css -o scripts/tailwind.css --minify
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const REPO = 'your98k/Rule-Hub';
const BRANCH = 'main';

let BASE = 'https://your98k.github.io/Rule-Hub';
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base') BASE = args[++i].replace(/\/+$/, '');
}

const stripQuotes = (s) => {
  s = s.trim();
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    const q = s[0];
    s = s.slice(1, -1).replaceAll(q + q, q);
  }
  return s.trim();
};

function normalizeTags(raw) {
  const tags = new Set(['Stash 覆写']);
  if (raw) {
    const tag = String(raw).trim();
    if (/去广告|^ad$/i.test(tag)) tags.add('去广告');
    else if (/解锁|会员/.test(tag)) tags.add('解锁会员');
    else if (/定时|签到|任务/.test(tag)) tags.add('定时任务');
    else if (/功能|增强/.test(tag)) tags.add('功能增强');
    else tags.add(tag);
  }
  return [...tags];
}

function parseAuthors(raw) {
  if (!raw) return [];
  const out = [];
  for (const line of String(raw).split('\n')) {
    const matches = line.match(/([^\[\]:]+)(?:\[(https?:\/\/[^\]]+)\])?/g) || [];
    for (const segment of matches) {
      const match = segment.match(/^([^\[\]]+?)(?:\[(https?:\/\/[^\]]+)\])?$/);
      if (!match) continue;
      const name = match[1].trim().replace(/[，,;；]\s*$/, '');
      if (!name || name.length > 40) continue;
      const url = match[2] || (name.match(/^[A-Za-z0-9_-]+$/) ? 'https://github.com/' + name : '');
      if (!out.some((author) => author.name === name)) out.push({ name, url });
    }
  }
  return out;
}

// Stash 覆写头部解析（容错支持块标量、跨行引号与纯多行折叠）
const BODY_KEYS = new Set([
  'rules', 'http', 'script', 'scripts', 'script-providers', 'proxies',
  'proxy-groups', 'proxy-providers', 'rule-providers', 'url-rewrite',
  'rewrite', 'hosts', 'dns', 'mitm', 'general', 'arguments',
  'arguments-version', 'republish', 'servers', 'proxy-chains',
]);

function parseStashHeader(text) {
  const lines = text.split('\n');
  const meta = {};
  let i = 0;
  while (i < lines.length && (lines[i].startsWith('#') || lines[i].trim() === '')) i++;
  while (i < lines.length) {
    const line = lines[i];
    // 空行在 YAML 映射里合法，跳过而不是终止头部解析
    if (line.trim() === '') { i++; continue; }
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) break;
    const key = match[1];
    const value = match[2];
    if (BODY_KEYS.has(key) && (value === '' || value.startsWith('|') || value.startsWith('>'))) break;
    i++;
    const blockMatch = value.match(/^\|\s*([+-]?)\s*$/);
    const foldMatch = value.match(/^>\s*([+-]?)\s*$/);
    if (blockMatch || foldMatch) {
      const parts = [];
      let indent = null;
      while (i < lines.length) {
        const current = lines[i];
        if (current.trim() === '') { parts.push(''); i++; continue; }
        const currentIndent = current.match(/^\s*/)[0].length;
        if (currentIndent === 0) break;
        if (indent === null) indent = currentIndent;
        parts.push(current.slice(indent));
        i++;
      }
      while (parts.length && parts[parts.length - 1] === '') parts.pop();
      meta[key] = blockMatch ? parts.join('\n') : parts.join(' ');
    } else {
      const continuation = [];
      while (i < lines.length && /^\s+\S/.test(lines[i]) && !/^([A-Za-z][\w-]*):/.test(lines[i]) && !lines[i].startsWith('#')) {
        continuation.push(lines[i].trim());
        i++;
      }
      meta[key] = stripQuotes([value, ...continuation].join(' '));
    }
  }
  return meta;
}

function gitDate(relPath) {
  try {
    const { execSync } = require('child_process');
    const output = execSync(`git log -1 --format=%cI -- "${relPath}"`, { cwd: ROOT, encoding: 'utf8' }).trim();
    return output ? output.slice(0, 10) : '';
  } catch {
    return '';
  }
}

function extractStats(text) {
  const lines = text.split('\n');
  let rulesCount = 0;
  let inRules = false;
  let inMitm = false;
  let mitmIndent = 0;
  const hosts = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^rules:\s*$/.test(trimmed)) { inRules = true; continue; }
    if (inRules) {
      if (/^-\s/.test(trimmed)) rulesCount++;
      else if (trimmed && !trimmed.startsWith('#')) inRules = false;
    }
    const mitmMatch = line.match(/^(\s*)mitm:\s*$/);
    if (mitmMatch) { inMitm = true; mitmIndent = mitmMatch[1].length; continue; }
    if (inMitm) {
      const indent = line.match(/^\s*/)[0].length;
      if (trimmed && indent <= mitmIndent) { inMitm = false; continue; }
      const hostMatch = trimmed.match(/^-\s*'?([\w.*-]+)'?\s*$/);
      if (hostMatch && /\./.test(hostMatch[1])) hosts.push(hostMatch[1]);
    }
  }
  return { rulesCount, mitmHosts: [...new Set(hosts)] };
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'stash-override';
}

function collectStashOverrides() {
  const dir = 'Stash';
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter((file) => file.endsWith('.stoverride'))
    .map((file) => {
      const rel = `${dir}/${file}`;
      const text = fs.readFileSync(path.join(abs, file), 'utf8');
      const meta = parseStashHeader(text);
      const fallbackDate = gitDate(rel);
      const date = (meta.date || fallbackDate || '').replace(/T.*$/, '');
      const rawUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${rel}`;
      const cdnUrl = `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/${rel}`;
      const pageUrl = `${BASE}/files/${rel}`;
      const stats = extractStats(text);
      return {
        id: `${slugify(path.basename(file, path.extname(file)))}-stash`,
        name: (meta.name || path.basename(file, path.extname(file))).trim(),
        desc: (meta.desc || '').trim(),
        icon: (meta.icon || '').trim(),
        iconUrl: (meta.icon || '').trim(),
        date,
        version: (meta.version || '').trim(),
        tags: normalizeTags(meta.category || meta.tag),
        type: 'stash',
        authors: parseAuthors(meta.author),
        homepage: (meta.homepage || '').trim(),
        rulesCount: stats.rulesCount,
        mitmHosts: stats.mitmHosts,
        needsMitm: stats.mitmHosts.length > 0,
        urls: { raw: rawUrl, cdn: cdnUrl, page: pageUrl },
        install: {
          stash: `https://link.stash.ws/install-override/raw.githubusercontent.com/${REPO}/${BRANCH}/${rel}`,
        },
      };
    });
}

// Feedback hooks are injected into the shared template without rewriting its layout.
// Fail closed if a future template change removes an anchor, rather than dropping feedback silently.
function withFeedback(template) {
  const patches = [
  [
    "  <link rel=\"stylesheet\" href=\"./assets/tailwind.css\">",
    "  <link rel=\"stylesheet\" href=\"./assets/tailwind.css\">\n  <link rel=\"stylesheet\" href=\"./assets/feedback.css\">"
  ],
  [
    "            </div>\n          </article>\n",
    "            </div>\n            <div class=\"feedback-card-actions\" onclick=\"event.stopPropagation()\">\n              <button type=\"button\" class=\"ios-btn feedback-card-button\" data-feedback-id=\"${plugin.id}\" aria-haspopup=\"dialog\">💬 反馈</button>\n              <a class=\"feedback-history-link\" data-feedback-history=\"${plugin.id}\" target=\"_blank\" rel=\"noopener noreferrer\">查看反馈 ↗</a>\n            </div>\n          </article>\n"
  ],
  [
    "        <div class=\"mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-end gap-2.5\">\n",
    "        <div class=\"mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-end gap-2.5\">\n          <button type=\"button\" class=\"ios-btn feedback-card-button\" data-feedback-id=\"${p.id}\" aria-haspopup=\"dialog\">💬 反馈此覆写</button>\n"
  ],
  [
    "</body>\n",
    "  <script src=\"./assets/feedback.js\" defer></script>\n</body>\n"
  ]
];
  for (const [anchor, replacement] of patches) {
    if (template.split(anchor).length !== 2) throw new Error('反馈模板锚点缺失或重复：' + anchor.slice(0, 60));
    template = template.replace(anchor, () => replacement);
  }
  return template;
}

const ICON_DIR = path.join(SITE, 'assets', 'icons');
const ICON_CACHE = path.join(ROOT, 'assets', 'icon-cache');

function iconFileName(url) {
  const clean = url.split('?')[0].split('#')[0];
  const base = path.basename(clean);
  const ext = (base.match(/\.[A-Za-z0-9]+$/) || ['.png'])[0].toLowerCase();
  const stem = base.slice(0, base.length - ext.length).replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 60) || 'icon';
  return require('crypto').createHash('sha1').update(url).digest('hex').slice(0, 10) + '-' + stem + ext;
}

function safeExt(buf) {
  if (buf.slice(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.slice(0, 3).toString() === 'GIF') return 'gif';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  const head = buf.slice(0, 200).toString('utf8').trimStart();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) return 'svg';
  return null;
}

// 复用已有缓存,避免每次构建都重新下载 120+ 图标;下载失败保留远程地址作回退。
async function localizeIcons(plugins) {
  fs.mkdirSync(ICON_DIR, { recursive: true });
  fs.mkdirSync(ICON_CACHE, { recursive: true });
  let localized = 0, cached = 0, failed = 0;
  for (const plugin of plugins) {
    const url = (plugin.iconUrl || '').trim();
    if (!/^https?:\/\//.test(url)) continue;
    const name = iconFileName(url);
    const cachePath = path.join(ICON_CACHE, name);
    const sitePath = path.join(ICON_DIR, name);
    try {
      let buf = null;
      if (fs.existsSync(cachePath)) { buf = fs.readFileSync(cachePath); cached++; }
      else {
        const res = await fetch(url, { headers: { 'User-Agent': 'Rule-Hub-Icon-Builder/1.0', Accept: 'image/*' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 64 || buf.length > 512 * 1024) throw new Error('size ' + buf.length);
        const ext = safeExt(buf);
        if (!ext) throw new Error('not an image');
        fs.writeFileSync(cachePath, buf);
        localized++;
      }
      if (!safeExt(buf)) throw new Error('not an image');
      fs.writeFileSync(sitePath, buf);
      plugin.imageUrl = './assets/icons/' + name;
    } catch (error) {
      failed++;
      console.warn(`WARN: 图标本地化失败 ${plugin.name}: ${error.message};保留远程地址`);
    }
  }
  console.log(`图标:本地化 ${localized},缓存复用 ${cached},失败回退远程 ${failed}`);
}

async function main() {
  fs.rmSync(SITE, { recursive: true, force: true });
  fs.mkdirSync(path.join(SITE, 'files', 'Stash'), { recursive: true });

  const cssSource = path.join(__dirname, 'tailwind.css');
  if (fs.existsSync(cssSource)) {
    fs.mkdirSync(path.join(SITE, 'assets'), { recursive: true });
    fs.copyFileSync(cssSource, path.join(SITE, 'assets', 'tailwind.css'));
  } else {
    console.warn('WARN: scripts/tailwind.css 不存在，页面样式会缺失');
  }

  for (const asset of ['feedback.css', 'feedback.js']) {
    const source = path.join(__dirname, asset);
    if (!fs.existsSync(source)) throw new Error(`缺少网页反馈资源：scripts/${asset}`);
    fs.mkdirSync(path.join(SITE, 'assets'), { recursive: true });
    fs.copyFileSync(source, path.join(SITE, 'assets', asset));
  }

  fs.copyFileSync(path.join(ROOT, "assets", "apple-touch-icon.png"), path.join(SITE, "apple-touch-icon.png"));

  const plugins = collectStashOverrides();
  plugins.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  await localizeIcons(plugins);

  const stashDir = path.join(ROOT, 'Stash');
  if (fs.existsSync(stashDir)) {
    for (const file of fs.readdirSync(stashDir)) {
      if (file.endsWith('.stoverride')) {
        fs.copyFileSync(path.join(stashDir, file), path.join(SITE, 'files', 'Stash', file));
      }
    }
  }

  const data = {
    generated_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
    repo: `https://github.com/${REPO}`,
    base: BASE,
    plugins,
  };
  fs.writeFileSync(path.join(SITE, 'plugins.json'), JSON.stringify(data, null, 2) + '\n');

  const templatePath = path.join(__dirname, 'site-template.html');
  const template = withFeedback(fs.readFileSync(templatePath, 'utf8'));
  const marker = /window\.__PLUGINS_DATA__\s*=\s*\{[^;]*\};/;
  if (!marker.test(template)) throw new Error('site-template.html 缺少 window.__PLUGINS_DATA__ 占位');

  // 首页提示条：内容放在 scripts/site-notice.html，改文案或样式只动那个小文件
  const noticePath = path.join(__dirname, 'site-notice.html');
  const NOTICE = fs.existsSync(noticePath) ? fs.readFileSync(noticePath, 'utf8').trim() : '';

  const html = template
    .replace(marker, `window.__PLUGINS_DATA__=${JSON.stringify(data)};`)
    .replace(/<main([^>]*)>/i, (m, attrs) => (NOTICE ? `<main${attrs}>${NOTICE}` : m));

  fs.writeFileSync(path.join(SITE, 'index.html'), html);

  console.log(`OK: ${plugins.length} 个 Stash 覆写 -> site/ (base=${BASE})`);
  for (const plugin of plugins) console.log(`  ${plugin.name} | ${plugin.date} | ${plugin.tags.join(',')}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
