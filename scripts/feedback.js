/* Per-override feedback for the static Rule-Hub gallery. No access token is needed. */
(() => {
  "use strict";
  const REPO = "https://github.com/your98k/Rule-Hub";
  const DRAFT_PREFIX = "rulehub_feedback_v1:";
  const MAX_ISSUE_URL = 7500;
  const TYPES = new Set(["失效 / Bug", "误拦截", "功能建议", "使用咨询", "其他 / 自定义"]);
  const fields = ["type", "title", "details", "environment", "steps"];
  let activePlugin = null;
  let activeKey = "";
  let returnFocus = null;
  let previousOverflow = "";
  let draftTimer;
  const memoryDrafts = new Map();

  const dialog = document.createElement("dialog");
  dialog.id = "feedback-dialog";
  dialog.className = "feedback-dialog";
  dialog.setAttribute("aria-labelledby", "feedback-heading");
  dialog.setAttribute("aria-describedby", "feedback-context");
  dialog.innerHTML = `
    <form id="feedback-form" class="feedback-form">
      <header class="feedback-header">
        <div><p class="feedback-eyebrow">OVERRIDE FEEDBACK</p><h2 id="feedback-heading">反馈覆写</h2></div>
        <button type="button" id="feedback-close" class="ios-btn feedback-close" aria-label="关闭反馈">✕</button>
      </header>
      <p id="feedback-context" class="feedback-context"></p>
      <div class="feedback-fields">
        <label for="feedback-type">反馈类型<select id="feedback-type" name="type">
          <option>失效 / Bug</option><option>误拦截</option><option>功能建议</option><option>使用咨询</option><option>其他 / 自定义</option>
        </select></label>
        <label for="feedback-title">自定义标题 <span class="feedback-optional">选填</span>
          <input id="feedback-title" name="title" maxlength="100" placeholder="例如：更新后首页仍出现广告" autocomplete="off">
        </label>
        <label for="feedback-details">反馈内容 <span class="feedback-required">必填</span>
          <textarea id="feedback-details" name="details" rows="5" required maxlength="6000" placeholder="描述遇到的问题、希望增加的功能，或其他想反馈的内容。"></textarea>
        </label>
        <p class="feedback-count" id="feedback-count">0 / 6000</p>
        <label for="feedback-environment">使用环境 <span class="feedback-optional">选填</span>
          <input id="feedback-environment" name="environment" maxlength="250" placeholder="例如：iOS 版本、Stash 版本、目标 App 版本" autocomplete="off">
        </label>
        <label for="feedback-steps">复现步骤 / 补充信息 <span class="feedback-optional">选填</span>
          <textarea id="feedback-steps" name="steps" rows="3" maxlength="2000" placeholder="操作步骤、预期效果、实际表现；截图可在 GitHub 中补充。"></textarea>
        </label>
      </div>
      <p id="feedback-draft-status" class="feedback-help">草稿按覆写分别保存在当前浏览器。</p>
      <p class="feedback-help">反馈将公开发布到 GitHub Issues，需要登录 GitHub；覆写名称、版本及链接会自动附上。</p>
      <p id="feedback-status" class="feedback-status" role="status" aria-live="polite"></p>
      <div class="feedback-footer">
        <a id="feedback-history" target="_blank" rel="noopener noreferrer">查看此覆写的反馈 ↗</a>
        <div class="feedback-submit-row">
          <button type="button" id="feedback-copy" class="ios-btn feedback-secondary">复制反馈内容</button>
          <button type="submit" id="feedback-submit" class="ios-btn feedback-primary">前往 GitHub 提交 ↗</button>
        </div>
        <button type="button" id="feedback-clear" class="feedback-clear">清空此覆写草稿</button>
      </div>
    </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector("form");
  const field = name => form.elements.namedItem(name);
  const status = document.getElementById("feedback-status");
  const draftStatus = document.getElementById("feedback-draft-status");
  const submit = document.getElementById("feedback-submit");
  const copyButton = document.getElementById("feedback-copy");

  function pluginFor(id) {
    return typeof PLUGINS !== "undefined" ? PLUGINS.find(plugin => plugin.id === id) : null;
  }

  function filePath(plugin) {
    try {
      const url = new URL(plugin.url);
      const index = url.pathname.indexOf("/Stash/");
      if (index >= 0) return decodeURIComponent(url.pathname.slice(index + 1));
    } catch (_) {}
    return plugin.id;
  }

  // Full filenames distinguish overrides whose generated slugs or display names collide.
  function feedbackKey(plugin) {
    return filePath(plugin);
  }

  function marker(plugin) {
    return `[Rule-Hub:${feedbackKey(plugin)}]`;
  }

  function historyUrl(plugin) {
    const url = new URL(REPO + "/issues");
    url.searchParams.set("q", `is:issue in:body "${marker(plugin)}"`);
    return url.href;
  }

  function decorateHistoryLinks() {
    document.querySelectorAll("[data-feedback-history]").forEach(link => {
      const plugin = pluginFor(link.dataset.feedbackHistory);
      if (plugin) {
        link.href = historyUrl(plugin);
        link.setAttribute("aria-label", `查看 ${plugin.name} 的反馈`);
      }
    });
    document.querySelectorAll("[data-feedback-id]").forEach(button => {
      const plugin = pluginFor(button.dataset.feedbackId);
      if (plugin) button.setAttribute("aria-label", `反馈 ${plugin.name}`);
    });
  }

  function readDraft(key) {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_PREFIX + key) || "null");
      if (draft && typeof draft === "object") return draft;
    } catch (_) {}
    return memoryDrafts.get(key) || {};
  }

  function values() {
    return Object.fromEntries(fields.map(name => [name, field(name).value]));
  }

  function saveDraft() {
    clearTimeout(draftTimer);
    if (!activeKey) return;
    const data = values();
    const empty = data.type === "失效 / Bug" && fields.filter(name => name !== "type").every(name => !data[name].trim());
    if (empty) {
      memoryDrafts.delete(activeKey);
      try { localStorage.removeItem(DRAFT_PREFIX + activeKey); } catch (_) {}
      return;
    }
    memoryDrafts.set(activeKey, data);
    try {
      localStorage.setItem(DRAFT_PREFIX + activeKey, JSON.stringify(data));
      draftStatus.textContent = "草稿已保存到当前浏览器，仅对应此覆写。";
    } catch (_) {
      draftStatus.textContent = "浏览器未启用本地存储，草稿仅保留在当前页面；可复制留存。";
    }
  }

  function currentPage() {
    const page = new URL(location.href);
    page.search = "";
    page.hash = "";
    return page.href;
  }

  function issueBody() {
    const data = values();
    return [
      "## 覆写信息",
      `- 名称：${activePlugin.name}`,
      `- 文件：${filePath(activePlugin)}`,
      `- 版本：${activePlugin.version || "未标注"}`,
      `- 更新日期：${activePlugin.updatedAt || "未标注"}`,
      `- 覆写链接：${activePlugin.url}`,
      `- 反馈类型：${data.type}`,
      "", "## 反馈内容", data.details.trim(),
      "", "## 使用环境", data.environment.trim() || "未填写",
      "", "## 复现步骤 / 补充信息", data.steps.trim() || "未填写",
      "", "---", `来自：${currentPage()}`, marker(activePlugin)
    ].join("\n");
  }

  function issueTitle() {
    const title = field("title").value.trim() || field("type").value;
    // Leave headroom below GitHub's title limit, including multi-byte names.
    return Array.from(`[覆写反馈] ${activePlugin.name} · ${title}`).slice(0, 150).join("");
  }

  function issueUrl(includeBody = true) {
    const url = new URL(REPO + "/issues/new");
    url.searchParams.set("title", issueTitle());
    if (includeBody) url.searchParams.set("body", issueBody());
    return url.href;
  }

  function isLong() {
    return activePlugin && issueUrl().length > MAX_ISSUE_URL;
  }

  function refresh() {
    document.getElementById("feedback-count").textContent = `${field("details").value.length} / 6000`;
    const long = isLong();
    submit.textContent = long ? "复制并前往 GitHub ↗" : "前往 GitHub 提交 ↗";
    if (long) {
      status.textContent = "内容较长，将先复制完整反馈；打开 GitHub 后粘贴到正文再提交。";
    } else {
      status.textContent = "";
    }
    field("details").setCustomValidity("");
  }

  function closeFeedback() {
    if (dialog.open) dialog.close();
  }

  function openFeedback(plugin, trigger) {
    if (dialog.open) saveDraft();
    if (typeof closeInspector === "function") closeInspector();
    activePlugin = plugin;
    activeKey = feedbackKey(plugin);
    returnFocus = trigger;
    form.reset();
    const draft = readDraft(activeKey);
    for (const name of fields) {
      if (typeof draft[name] === "string") field(name).value = draft[name].slice(0, field(name).maxLength > 0 ? field(name).maxLength : 100);
    }
    if (!TYPES.has(field("type").value)) field("type").value = "失效 / Bug";
    document.getElementById("feedback-heading").textContent = "反馈 · " + plugin.name;
    document.getElementById("feedback-context").textContent = `${filePath(plugin)}${plugin.version ? " · v" + plugin.version : ""}`;
    document.getElementById("feedback-history").href = historyUrl(plugin);
    draftStatus.textContent = Object.keys(draft).length ? "已恢复此覆写的草稿。" : "草稿按覆写分别保存在当前浏览器。";
    copyButton.textContent = "复制反馈内容";
    copyButton.disabled = false;
    refresh();
    if (!dialog.open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialog.showModal();
    }
    form.scrollTop = 0;
    field("details").focus({ preventScroll: true });
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    // Keep the fallback inside the modal; the rest of the document is inert.
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.className = "feedback-copy-buffer";
    textarea.setAttribute("aria-label", "复制反馈缓冲区");
    dialog.append(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    let copied = false;
    try { copied = document.execCommand("copy"); } catch (_) {}
    textarea.remove();
    return copied;
  }

  function valid() {
    if (!field("details").value.trim()) field("details").setCustomValidity("请填写反馈内容。");
    return form.reportValidity();
  }

  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-feedback-id]");
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    const plugin = pluginFor(trigger.dataset.feedbackId);
    if (plugin) openFeedback(plugin, trigger);
  }, true);
  document.getElementById("feedback-close").addEventListener("click", closeFeedback);
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeFeedback();
  });
  dialog.addEventListener("close", () => {
    saveDraft();
    document.body.style.overflow = previousOverflow;
    const matchingCardButton = [...document.querySelectorAll("#plugin-grid [data-feedback-id]")].find(button => button.dataset.feedbackId === activePlugin?.id);
    if (returnFocus?.isConnected && !returnFocus.closest(".ios-modal-backdrop:not(.open)")) returnFocus.focus({ preventScroll: true });
    else matchingCardButton?.focus({ preventScroll: true });
  });
  dialog.addEventListener("keydown", event => {
    // Keep the gallery search shortcut from moving focus behind the open modal.
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  form.addEventListener("input", () => {
    refresh();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 250);
  });
  form.addEventListener("change", () => { refresh(); saveDraft(); });
  window.addEventListener("pagehide", () => { if (dialog.open) saveDraft(); });
  document.getElementById("feedback-clear").addEventListener("click", () => {
    clearTimeout(draftTimer);
    form.reset();
    memoryDrafts.delete(activeKey);
    try { localStorage.removeItem(DRAFT_PREFIX + activeKey); } catch (_) {}
    refresh();
    draftStatus.textContent = "此覆写的草稿已清空。";
    field("details").focus();
  });
  copyButton.addEventListener("click", async () => {
    if (!valid()) return;
    saveDraft();
    const copied = await copyText(issueBody());
    status.textContent = copied ? "完整反馈已复制，可在 GitHub 正文中粘贴。" : "复制未完成，请保留当前草稿并手动复制正文。";
    copyButton.textContent = copied ? "已复制 ✓" : "重试复制";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!valid()) return;
    saveDraft();
    if (!isLong()) {
      const target = window.open("about:blank", "_blank");
      if (target) {
        target.opener = null;
        target.location.replace(issueUrl());
      } else {
        location.assign(issueUrl());
      }
      // No success claim: publication happens only after GitHub's submit button.
      status.textContent = "已准备 GitHub 反馈页；请在那里检查并点击提交。当前草稿已保留。";
      return;
    }
    // Copy while the source tab has focus; no content is silently truncated.
    const copied = await copyText(issueBody());
    if (!copied) {
      status.textContent = "复制未完成，请先使用“复制反馈内容”重试，草稿已保留。";
      return;
    }
    // Same-tab navigation avoids an async popup being blocked by Safari.
    const url = issueUrl(false);
    location.assign(url);
    status.textContent = "完整反馈已复制；请在 GitHub 正文中粘贴，再点击提交。";
  });

  const grid = document.getElementById("plugin-grid");
  if (grid) new MutationObserver(decorateHistoryLinks).observe(grid, { childList: true });
  const inspector = document.getElementById("inspector-content");
  if (inspector) new MutationObserver(decorateHistoryLinks).observe(inspector, { childList: true });
  decorateHistoryLinks();
})();
