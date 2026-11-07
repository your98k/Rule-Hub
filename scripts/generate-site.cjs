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

function main() {
  fs.rmSync(SITE, { recursive: true, force: true });
  fs.mkdirSync(path.join(SITE, 'files', 'Stash'), { recursive: true });

  const cssSource = path.join(__dirname, 'tailwind.css');
  if (fs.existsSync(cssSource)) {
    fs.mkdirSync(path.join(SITE, 'assets'), { recursive: true });
    fs.copyFileSync(cssSource, path.join(SITE, 'assets', 'tailwind.css'));
  } else {
    console.warn('WARN: scripts/tailwind.css 不存在，页面样式会缺失');
  }

  const plugins = collectStashOverrides();
  plugins.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

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
  const template = fs.readFileSync(templatePath, 'utf8');
  const marker = /window\.__PLUGINS_DATA__\s*=\s*\{[^;]*\};/;
  if (!marker.test(template)) throw new Error('site-template.html 缺少 window.__PLUGINS_DATA__ 占位');
  fs.writeFileSync(
    path.join(SITE, 'index.html'),
    template.replace(marker, `window.__PLUGINS_DATA__=${JSON.stringify(data)};`)
  );

  console.log(`OK: ${plugins.length} 个 Stash 覆写 -> site/ (base=${BASE})`);
  for (const plugin of plugins) console.log(`  ${plugin.name} | ${plugin.date} | ${plugin.tags.join(',')}`);
}

main();
