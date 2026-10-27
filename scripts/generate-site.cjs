#!/usr/bin/env node
/**
 * generate-site.cjs - 生成插件画廊站数据与文件
 *
 * 用法：node scripts/generate-site.cjs [--base https://your98k.github.io/Rule-Hub]
 *
 * 扫描 Loon/*.plugin 与 Stash/*.stoverride：
 *   1. 解析头部元数据（Loon "#!key = value"，Stash 顶层 YAML 字段，容错解析）
 *   2. 生成 site/plugins.json
 *   3. 复制插件文件到 site/files/<原路径>
 *   4. 把数据内嵌进 site/index.html（window.__PLUGINS_DATA__，离线兜底）
 *   5. 复制预编译的 scripts/tailwind.css 到 site/assets/
 *
 * 注意：修改 site-template.html 里的 Tailwind class 后，需要重新编译 CSS：
 *   npx tailwindcss -c scripts/tailwind.config.js -i scripts/tailwind.input.css -o scripts/tailwind.css --minify
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const REPO = 'your98k/Rule-Hub';
const BRANCH = 'main';

// ---- 参数 ----
let BASE = 'https://your98k.github.io/Rule-Hub';
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base') BASE = args[++i].replace(/\/+$/, '');
}

// ---- 小工具 ----
const stripQuotes = (s) => {
  s = s.trim();
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    const q = s[0];
    s = s.slice(1, -1).replaceAll(q + q, q);
  }
  return s.trim();
};

// 分类归一化：各种历史 category 值统一成展示标签
function normalizeTags(raw, fileKind) {
  const tags = new Set();
  tags.add(fileKind === 'loon' ? 'Loon 插件' : 'Stash 覆写');
  if (raw) {
    const t = String(raw).trim();
    if (/去广告|^ad$/i.test(t)) tags.add('去广告');
    else if (/解锁|会员/.test(t)) tags.add('解锁会员');
    else if (/定时|签到|任务/.test(t)) tags.add('定时任务');
    else if (/功能|增强/.test(t)) tags.add('功能增强');
    else tags.add(t);
  }
  return [...tags];
}

// 作者字段解析："A[https://github.com/a]\n  B[https://github.com/b]" → [{name,url}]
function parseAuthors(raw) {
  if (!raw) return [];
  const out = [];
  for (const line of String(raw).split('\n')) {
    const m = line.match(/([^\[\]:]+)(?:\[(https?:\/\/[^\]]+)\])?/g) || [];
    for (const seg of m) {
      const mm = seg.match(/^([^\[\]]+?)(?:\[(https?:\/\/[^\]]+)\])?$/);
      if (!mm) continue;
      const name = mm[1].trim().replace(/[，,;；]\s*$/, '');
      if (!name || name.length > 40) continue;
      const url = mm[2] || (name.match(/^[A-Za-z0-9_-]+$/) ? 'https://github.com/' + name : '');
      if (!out.some((a) => a.name === name)) out.push({ name, url });
    }
  }
  return out;
}

// ---- Loon 插件头部解析 ----
function parseLoonHeader(text) {
  const meta = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^#!([A-Za-z_-]+)\s*=\s*(.*)$/);
    if (m) meta[m[1].toLowerCase()] = m[2].trim();
    if (/^\[(Rule|Script|Rewrite|MITM|Plugin)\]/.test(line)) break;
  }
  return meta;
}

// ---- Stash 覆写头部解析（容错：块标量、跨行引号、纯多行折叠）----
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
  // 跳过前导注释
  while (i < lines.length && (lines[i].startsWith('#') || lines[i].trim() === '')) i++;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!m) break;
    const key = m[1];
    let value = m[2];
    // 正文段开始，停止收集
    if (BODY_KEYS.has(key) && (value === '' || value.startsWith('|') || value.startsWith('>'))) break;
    i++;
    const blockMatch = value.match(/^\|\s*([+-]?)\s*$/);
    const foldMatch = value.match(/^>\s*([+-]?)\s*$/);
    if (blockMatch || foldMatch) {
      // 块标量：收集缩进行
      const parts = [];
      let indent = null;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === '') { parts.push(''); i++; continue; }
        const ind = l.match(/^\s*/)[0].length;
        if (ind === 0) break;
        if (indent === null) indent = ind;
        parts.push(l.slice(indent));
        i++;
      }
      while (parts.length && parts[parts.length - 1] === '') parts.pop();
      meta[key] = blockMatch ? parts.join('\n') : parts.join(' ');
    } else {
      // 单行或跨行折叠（引号/纯文本）：缩进续行合并
      let cont = [];
      while (i < lines.length && /^\s+\S/.test(lines[i]) && !/^([A-Za-z][\w-]*):/.test(lines[i]) && !lines[i].startsWith('#')) {
        cont.push(lines[i].trim());
        i++;
      }
      const raw = [value, ...cont].join(' ');
      meta[key] = stripQuotes(raw);
    }
  }
  return meta;
}

// ---- git 兜底日期 ----
function gitDate(relPath) {
  try {
    const { execSync } = require('child_process');
    const out = execSync(`git log -1 --format=%cI -- "${relPath}"`, { cwd: ROOT, encoding: 'utf8' }).trim();
    return out ? out.slice(0, 10) : '';
  } catch { return ''; }
}

// ---- 内容统计：规则条数 / MITM 主机 ----
function extractStats(text, fileKind) {
  const lines = text.split('\n');
  let rulesCount = 0;
  const hosts = [];
  if (fileKind === 'loon') {
    let section = '';
    for (const line of lines) {
      const sec = line.match(/^\[(\w+)\]/);
      if (sec) { section = sec[1]; continue; }
      if (section === 'Rule' && line.trim() && !line.trim().startsWith('#')) rulesCount++;
      if (section === 'Mitm') {
        const m = line.match(/^\s*hostname\s*=\s*(.*)$/i);
        if (m) hosts.push(...m[1].split(',').map((s) => s.trim()).filter(Boolean));
      }
    }
  } else {
    // Stash YAML：顶层 rules 列表 + http.mitm 列表
    let inRules = false, inMitm = false, mitmIndent = 0;
    for (const line of lines) {
      const t = line.trim();
      if (/^rules:\s*$/.test(t)) { inRules = true; continue; }
      if (inRules) {
        if (/^-\s/.test(t)) rulesCount++;
        else if (t && !t.startsWith('#')) inRules = false;
      }
      const mm = line.match(/^(\s*)mitm:\s*$/);
      if (mm) { inMitm = true; mitmIndent = mm[1].length; continue; }
      if (inMitm) {
        const ind = line.match(/^\s*/)[0].length;
        if (t && ind <= mitmIndent) { inMitm = false; continue; }
        const h = t.match(/^-\s*'?([\w.*-]+)'?\s*$/);
        if (h && /\./.test(h[1])) hosts.push(h[1]);
      }
    }
  }
  return { rulesCount, mitmHosts: [...new Set(hosts)] };
}

// slug id 生成（详情面板与收藏用）
function slugify(name, fallback) {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return s || fallback;
}

// ---- 收集条目 ----
function collect(dir, fileKind) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter((f) => (fileKind === 'loon' ? f.endsWith('.plugin') : f.endsWith('.stoverride')))
    .filter((f) => !f.endsWith('.stash.js'))
    .map((f) => {
      const rel = `${dir}/${f}`;
      const text = fs.readFileSync(abs + '/' + f, 'utf8');
      const meta = fileKind === 'loon' ? parseLoonHeader(text) : parseStashHeader(text);
      const fallbackDate = gitDate(rel);
      const date = (meta.date || fallbackDate || '').replace(/T.*$/, '');
      const rawUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${rel}`;
      const cdnUrl = `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/${rel}`;
      const pageUrl = `${BASE}/files/${rel}`;
      const stats = extractStats(text, fileKind);
      const entry = {
        id: slugify(path.basename(f, path.extname(f)), fileKind) + '-' + (fileKind === 'loon' ? 'loon' : 'stash'),
        name: (meta.name || path.basename(f, path.extname(f))).trim(),
        desc: (meta.desc || '').trim(),
        icon: (meta.icon || '').trim(),
        date,
        version: (meta.version || '').trim(),
        tags: normalizeTags(meta.category || meta.tag, fileKind),
        type: fileKind,
        authors: parseAuthors(meta.author),
        homepage: (meta.homepage || '').trim(),
        rulesCount: stats.rulesCount,
        mitmHosts: stats.mitmHosts,
        needsMitm: stats.mitmHosts.length > 0,
        urls: { raw: rawUrl, cdn: cdnUrl, page: pageUrl },
      };
      // 一键安装深链
      if (fileKind === 'stash') {
        entry.install = { stash: `https://link.stash.ws/install-override/raw.githubusercontent.com/${REPO}/${BRANCH}/${rel}` };
      } else {
        entry.install = { loon: `loon://import?plugin=${encodeURIComponent(rawUrl)}` };
      }
      return entry;
    });
}

// ---- 主流程 ----
function main() {
  fs.rmSync(SITE, { recursive: true, force: true });
  fs.mkdirSync(path.join(SITE, 'files'), { recursive: true });

  // 复制预编译的 Tailwind CSS（避免运行时 CDN JIT）
  const cssSrc = path.join(__dirname, 'tailwind.css');
  if (fs.existsSync(cssSrc)) {
    fs.mkdirSync(path.join(SITE, 'assets'), { recursive: true });
    fs.copyFileSync(cssSrc, path.join(SITE, 'assets', 'tailwind.css'));
  } else {
    console.warn('WARN: scripts/tailwind.css 不存在，页面样式会缺失');
  }

  const plugins = [
    ...collect('Loon', 'loon'),
    ...collect('Stash', 'stash'),
  ];
  // 默认排序：更新时间倒序
  plugins.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 复制插件文件
  for (const dir of ['Loon', 'Stash']) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    fs.mkdirSync(path.join(SITE, 'files', dir), { recursive: true });
    for (const f of fs.readdirSync(abs)) {
      if (f.endsWith('.plugin') || f.endsWith('.stoverride')) {
        fs.copyFileSync(path.join(abs, f), path.join(SITE, 'files', dir, f));
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

  // 内嵌兜底数据：从模板生成 index.html
  const tplPath = path.join(__dirname, 'site-template.html');
  const html = fs.readFileSync(tplPath, 'utf8');
  const marker = /window\.__PLUGINS_DATA__\s*=\s*\{[^;]*\};/;
  if (!marker.test(html)) throw new Error('site-template.html 缺少 window.__PLUGINS_DATA__ 占位');
  fs.writeFileSync(
    path.join(SITE, 'index.html'),
    html.replace(marker, `window.__PLUGINS_DATA__=${JSON.stringify(data)};`)
  );

  console.log(`OK: ${plugins.length} 个插件 -> site/ (base=${BASE})`);
  for (const p of plugins) console.log(`  [${p.type}] ${p.name} | ${p.date} | ${p.tags.join(',')}`);
}

main();
