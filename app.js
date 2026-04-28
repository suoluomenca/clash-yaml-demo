const state = {
  providers: []
};

const NODE_CODE_OPTIONS = [
  { code: "jp", region: "jp", regionLabel: "日本", flag: "🇯🇵", nodeLabel: "JP" },
  { code: "hk", region: "hk", regionLabel: "香港", flag: "🇭🇰", nodeLabel: "HK" },
  { code: "tw", region: "tw", regionLabel: "台湾", flag: "🇹🇼", nodeLabel: "TW" },
  { code: "sg", region: "sg", regionLabel: "新加坡", flag: "🇸🇬", nodeLabel: "SG" },
  { code: "kr", region: "kr", regionLabel: "韩国", flag: "🇰🇷", nodeLabel: "KR" },
  { code: "us", region: "us", regionLabel: "美国", flag: "🇺🇸", nodeLabel: "US" }
];

const FIXED_RULE_GROUP_SPECS = [
  { name: "📲 Telegram", type: "full" },
  { name: "🔍 Google", type: "full" },
  { name: "📹 YouTube", type: "full" },
  { name: "🎥 Netflix", type: "full" },
  { name: "🎥 Disney+", type: "full" },
  { name: "🎶 ChatGPT", type: "full" },
  { name: "📺 巴哈姆特", type: "bahamut" },
  { name: "📺 哔哩哔哩", type: "bilibili" },
  { name: "📺 EMBY", type: "full" },
  { name: "👽 红迪论坛", type: "full" },
  { name: "🌍 国外媒体", type: "full" },
  { name: "⬇️ 下载服务", type: "full" },
  { name: "Ⓜ️ 微软服务", type: "microsoft" },
  { name: "🍎 苹果服务", type: "full" },
  { name: "🎯 全球直连", type: "globalDirect" },
  { name: "🛑 广告拦截", type: "adBlock" },
  { name: "🍃 应用净化", type: "adBlock" },
  { name: "🐟 漏网之鱼", type: "full", fallbackComment: true }
];

function resetState(next) {
  state.providers = Array.isArray(next?.providers)
    ? next.providers.map((provider) => normalizeProvider(provider))
    : [];
}

function normalizeProvider(provider) {
  const next = { ...provider };
  const parsed = parseProviderKey(next.key);

  next.namePart = sanitizeNamePart(next.namePart || parsed.namePart || "");

  const fallbackNodeCode = next.nodeCode || next.countryCode || parsed.nodeCode || "jp";
  next.nodeCode = String(fallbackNodeCode || "jp").toLowerCase();
  next.key = buildProviderKey(next.namePart, next.nodeCode);

  if (!next.type) {
    next.type = "http";
  }

  if (!next.interval) {
    next.interval = 3600;
  }

  return next;
}

function parseProviderKey(key) {
  const raw = String(key || "").trim();
  if (!raw) {
    return { namePart: "", nodeCode: "jp" };
  }

  const match = raw.match(/^(.*?)-([a-z0-9]{2,3})$/i);
  if (!match) {
    return { namePart: raw, nodeCode: "jp" };
  }

  return {
    namePart: match[1],
    nodeCode: match[2].toLowerCase()
  };
}

function sanitizeNamePart(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^A-Za-z0-9_-]/g, "");
}

function buildProviderKey(namePart, nodeCode) {
  const safeName = sanitizeNamePart(namePart);
  const safeCode = String(nodeCode || "jp").toLowerCase();
  if (!safeName) return "";
  return `${safeName}-${safeCode}`;
}

function getNodeMeta(code) {
  return (
    NODE_CODE_OPTIONS.find((item) => item.code === code) || {
      code,
      region: code,
      regionLabel: String(code || "").toUpperCase(),
      flag: "🏳️",
      nodeLabel: String(code || "").toUpperCase()
    }
  );
}

function getRegionGroupName(nodeCode) {
  const meta = getNodeMeta(nodeCode);
  return `${meta.flag} ${meta.regionLabel}节点`;
}

function getProviderGroupName(provider) {
  const meta = getNodeMeta(provider.nodeCode);
  const namePart = String(provider.namePart || "").trim();
  return `${meta.flag} ${namePart}节点 ${meta.nodeLabel}`;
}

function uniqueItems(items) {
  const result = [];
  const seen = new Set();

  for (const item of items) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }

  return result;
}

function buildAutoRegionGroups(providers) {
  const grouped = new Map();

  for (const provider of providers) {
    if (!provider.key || !provider.nodeCode) continue;
    const name = getRegionGroupName(provider.nodeCode);
    const providerGroupName = getProviderGroupName(provider);

    if (!grouped.has(name)) {
      grouped.set(name, []);
    }

    grouped.get(name).push(providerGroupName);
  }

  return Array.from(grouped.entries()).map(([name, list]) => ({
    name,
    type: "select",
    mode: "proxies",
    list: uniqueItems(list)
  }));
}

function buildAutoProviderGroups(providers) {
  return providers.map((provider) => ({
    name: getProviderGroupName(provider),
    type: "select",
    mode: "use",
    list: [provider.key]
  }));
}

function buildTopLevelGroup(regionNames, providerGroupNames) {
  return {
    name: "🚀 节点选择",
    type: "select",
    mode: "proxies",
    list: ["自动选择-全部", "故障转移-全部", ...regionNames, ...providerGroupNames]
  };
}

function buildAutoStrategyGroups(providers) {
  const keys = providers.map((provider) => provider.key);

  return [
    {
      name: "自动选择-全部",
      type: "url-test",
      mode: "use",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      list: keys
    },
    {
      name: "故障转移-全部",
      type: "fallback",
      mode: "use",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      list: keys
    }
  ];
}

function buildFixedRuleGroupList(type, context) {
  const { defaultFullList } = context;

  if (type === "adBlock") {
    return ["REJECT", "REJECT-DROP", "DIRECT"];
  }

  if (type === "bilibili" || type === "globalDirect") {
    return ["DIRECT", ...defaultFullList.filter((item) => item !== "DIRECT")];
  }

  return defaultFullList;
}

function buildFixedRuleGroups(regionNames, providerGroupNames) {
  const topLevelName = "🚀 节点选择";
  const firstJapanProviderName =
    providerGroupNames.find((name) => name.startsWith("🇯🇵 ")) || providerGroupNames[0] || topLevelName;
  const defaultFullList = uniqueItems([topLevelName, ...regionNames, ...providerGroupNames, "DIRECT"]);

  return FIXED_RULE_GROUP_SPECS.map((spec) => ({
    name: spec.name,
    type: "select",
    mode: "proxies",
    list: buildFixedRuleGroupList(spec.type, {
      topLevelName,
      regionNames,
      providerGroupNames,
      firstJapanProviderName,
      defaultFullList
    }),
    fallbackComment: Boolean(spec.fallbackComment)
  }));
}

function buildExportGroups(data) {
  const providers = data.providers.map(normalizeProvider).filter((item) => item.key);
  const regionGroups = buildAutoRegionGroups(providers);
  const providerGroups = buildAutoProviderGroups(providers);
  const regionNames = regionGroups.map((item) => item.name);
  const providerGroupNames = providerGroups.map((item) => item.name);
  const topLevelGroup = buildTopLevelGroup(regionNames, providerGroupNames);
  const autoStrategyGroups = buildAutoStrategyGroups(providers);
  const fixedRuleGroups = buildFixedRuleGroups(regionNames, providerGroupNames);

  return [
    topLevelGroup,
    ...autoStrategyGroups,
    ...regionGroups,
    ...providerGroups,
    ...fixedRuleGroups
  ];
}

function renderProviders(container, onChange) {
  container.innerHTML = "";

  state.providers.forEach((p, idx) => {
    const previewKey = buildProviderKey(p.namePart, p.nodeCode);

    const el = document.createElement("div");
    el.className = "card provider-card";
    el.innerHTML = `
      <div class="provider-main-grid">
        <div class="provider-field">
          <input
            data-k="namePart"
            value="${esc(p.namePart || "")}"
            placeholder="名字，如 A / B / C，仅支持字母、数字、_、-"
            pattern="[A-Za-z0-9_-]*"
            title="只允许 ASCII 字母、数字、下划线和短横线"
          />
          <div class="muted provider-hint">仅支持字母、数字、_、-</div>
        </div>
        <div class="provider-field">
          <select data-k="nodeCode">
            ${NODE_CODE_OPTIONS.map(
              (option) => `
              <option value="${option.code}" ${p.nodeCode === option.code ? "selected" : ""}>
                ${option.flag} ${option.regionLabel} / ${option.nodeLabel} (${option.code})
              </option>
            `
            ).join("")}
          </select>
        </div>
        <div class="provider-field">
          <input value="${esc(previewKey)}" placeholder="自动生成 key" readonly />
        </div>
        <button data-act="del" class="secondary provider-delete">删除</button>
      </div>
      <div class="provider-detail-grid">
        <div class="provider-field">
          <input data-k="comment" value="${esc(p.comment || "")}" placeholder="注释" />
        </div>
        <div class="provider-field">
          <input data-k="url" value="${esc(p.url || "")}" placeholder="url" />
        </div>
      </div>
      <div class="muted provider-preview">独立节点组预览：<span data-preview-group>${esc(getProviderGroupName(p))}</span></div>
    `;

    const previewKeyInput = el.querySelector("input[readonly]");
    const previewGroupEl = el.querySelector("[data-preview-group]");
    const updateProviderField = (inp) => {
      const k = inp.dataset.k;

      if (k === "namePart") {
        const sanitized = sanitizeNamePart(inp.value);
        if (inp.value !== sanitized) {
          inp.value = sanitized;
        }
      }

      p[k] = inp.value;

      if (k === "nodeCode") {
        p.nodeCode = String(inp.value || "jp").toLowerCase();
      }

      p.key = buildProviderKey(p.namePart, p.nodeCode);
      previewKeyInput.value = p.key;
      previewGroupEl.textContent = getProviderGroupName(p);
    };

    el.querySelectorAll("input[data-k]").forEach((inp) => {
      inp.addEventListener("input", () => updateProviderField(inp));
    });

    el.querySelectorAll("select[data-k]").forEach((inp) => {
      inp.addEventListener("change", () => updateProviderField(inp));
    });

    el.querySelector("[data-act='del']").addEventListener("click", () => {
      state.providers.splice(idx, 1);
      onChange();
    });

    container.appendChild(el);
  });
}

function q(s) {
  if (/^[A-Za-z0-9_.-]+$/.test(s)) return s;
  return `'${String(s).replace(/'/g, "''")}'`;
}

function arrInline(arr = []) {
  return `[${arr.map(q).join(", ")}]`;
}

function renderGroupWithComment(group) {
  let out = "";
  if (group.fallbackComment) {
    out += "  # 兜底策略组，所有未匹配规则的流量最终将由该组处理\n";
  }
  out += `  - name: ${q(group.name || "")}\n`;
  out += `    type: ${group.type || "select"}\n`;
  if (group.type === "url-test" || group.type === "fallback") {
    if (group.url) out += `    url: ${group.url}\n`;
    if (group.interval != null) out += `    interval: ${Number(group.interval)}\n`;
    if (group.type === "url-test" && group.tolerance != null) {
      out += `    tolerance: ${Number(group.tolerance)}\n`;
    }
  }
  const key = group.mode === "use" ? "use" : "proxies";
  out += `    ${key}: ${arrInline(group.list || [])}\n\n`;
  return out;
}

function buildConfigSections(data) {
  const providers = data.providers.map(normalizeProvider).filter((item) => item.key);
  const groups = buildExportGroups(data);

  const regionGroups = groups.filter(
    (group) =>
      group.name !== "🚀 节点选择" &&
      group.name !== "自动选择-全部" &&
      group.name !== "故障转移-全部" &&
      group.mode === "proxies" &&
      /节点$/.test(group.name)
  );
  const providerGroups = groups.filter((group) => group.mode === "use" && group.type === "select");
  const fixedRuleGroups = groups.filter(
    (group) =>
      group.name !== "🚀 节点选择" &&
      group.name !== "自动选择-全部" &&
      group.name !== "故障转移-全部" &&
      !(group.mode === "proxies" && /节点$/.test(group.name)) &&
      !(group.mode === "use" && group.type === "select")
  );

  const topLevelGroup = groups.find((group) => group.name === "🚀 节点选择");
  const autoSelectGroup = groups.find((group) => group.name === "自动选择-全部");
  const fallbackGroup = groups.find((group) => group.name === "故障转移-全部");

  let providersYaml = "proxy-providers:\n";
  for (const provider of providers) {
    if (provider.comment) providersYaml += `  # ${provider.comment}\n`;
    providersYaml += `  ${provider.key}:\n`;
    providersYaml += "    <<: *p\n";
    providersYaml += `    type: ${provider.type || "http"}\n`;
    providersYaml += `    url: ${provider.url || ""}\n`;
    providersYaml += `    interval: ${Number(provider.interval || 3600)}\n\n`;
  }

  let groupsYaml = "proxy-groups:\n";
  groupsYaml += "  # ========================================================================\n";
  groupsYaml += "  # 策略组 (Proxy Groups) 配置区域\n";
  groupsYaml += "  # 采用 4 层架构设计，兼顾全局控制、自动测速、按地区分流和单节点精准控制\n";
  groupsYaml += "  # ========================================================================\n\n";

  groupsYaml += "  # --------------------- 顶层控制组 (第4层) ---------------------\n";
  groupsYaml += "  # 您的总控制器，所有日常使用的分流规则最终都指向这里\n";
  groupsYaml += renderGroupWithComment(topLevelGroup);

  groupsYaml += "  # --------------------- 全局自动策略组 (第3层) ---------------------\n";
  groupsYaml += renderGroupWithComment(autoSelectGroup);
  groupsYaml += renderGroupWithComment(fallbackGroup);

  groupsYaml += "  # --------------------- 按地区聚合策略组 (第2层) ---------------------\n";
  for (const group of regionGroups) {
    groupsYaml += renderGroupWithComment(group);
  }

  groupsYaml += "  # --------------------- 独立VPS策略组 (第1层) ---------------------\n";
  groupsYaml += "  # 将 provider 转换为单独的可选策略组，方便在顶层或分流规则中直接选中\n";
  for (const group of providerGroups) {
    groupsYaml += renderGroupWithComment(group);
  }

  groupsYaml += "  # --------------------- 精简和优化后的分流策略组 ---------------------\n";
  groupsYaml += "  # 针对具体应用的路由规则，默认走'🚀 节点选择'，也可指定特定节点或直连\n";
  for (const group of fixedRuleGroups) {
    groupsYaml += renderGroupWithComment(group);
  }

  return {
    providersYaml: providersYaml.trimEnd(),
    groupsYaml: groupsYaml.trimEnd()
  };
}

function replaceTemplateSection(template, startMarker, endMarker, replacement) {
  const normalized = String(template || "").replace(/\r\n/g, "\n");
  const startIndex = normalized.indexOf(startMarker);
  const endIndex = normalized.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(`模板中未找到配置段：${startMarker} -> ${endMarker}`);
  }

  return (
    normalized.slice(0, startIndex) +
    replacement.trimEnd() +
    "\n\n" +
    normalized.slice(endIndex)
  );
}

function mergeYamlIntoTemplate(data, templateText) {
  const { providersYaml, groupsYaml } = buildConfigSections(data);
  const withProviders = replaceTemplateSection(templateText, "proxy-providers:", "proxies:", providersYaml);
  return replaceTemplateSection(withProviders, "proxy-groups:", "rules:", groupsYaml);
}

function getEmbeddedTemplateText() {
  const el = document.getElementById("templateYaml");
  if (!el) return "";
  return String(el.value || el.textContent || "").trim();
}

async function loadTemplateText() {
  const embedded = getEmbeddedTemplateText();
  if (embedded) {
    return embedded;
  }

  const response = await fetch("./混合SKK规则集模板.yaml");
  if (!response.ok) {
    throw new Error(`模板读取失败: ${response.status}`);
  }

  return response.text();
}

function esc(s) {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
}

const providersEl = document.getElementById("providers");
const yamlOutputEl = document.getElementById("yamlOutput");

function getYamlOutputText() {
  return yamlOutputEl.textContent || "";
}

function setYamlOutputText(value) {
  yamlOutputEl.textContent = value || "";
}

function rerender() {
  state.providers = state.providers.map((provider) => normalizeProvider(provider));
  renderProviders(providersEl, rerender);
}

resetState({
  providers: [
    {
      key: "A-jp",
      namePart: "A",
      nodeCode: "jp",
      comment: "A节点（日本）",
      type: "http",
      url: "https://your_domain/uuid/proxies",
      interval: 3600
    },
    {
      key: "B-us",
      namePart: "B",
      nodeCode: "us",
      comment: "B节点（美国）",
      type: "http",
      url: "https://your_domain/uuid/proxies",
      interval: 3600
    }
  ]
});

rerender();

document.getElementById("addProvider").addEventListener("click", () => {
  state.providers.push(
    normalizeProvider({
      namePart: "",
      nodeCode: "jp",
      comment: "",
      type: "http",
      url: "",
      interval: 3600
    })
  );
  rerender();
});

document.getElementById("exportBtn").addEventListener("click", async () => {
  try {
    const templateText = await loadTemplateText();
    setYamlOutputText(mergeYamlIntoTemplate(state, templateText));
  } catch (err) {
    console.error(err);
    alert(`生成失败：${err.message}`);
  }
});

document.getElementById("copyBtn").addEventListener("click", async () => {
  const content = getYamlOutputText();
  if (!content.trim()) {
    alert("请先生成 YAML");
    return;
  }

  try {
    await navigator.clipboard.writeText(content);
    alert("已复制");
  } catch (err) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(yamlOutputEl);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();
    alert("已复制");
  }
});

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: "application/x-yaml;charset=utf-8" });

  // Legacy Edge fallback.
  if (typeof navigator.msSaveOrOpenBlob === "function") {
    navigator.msSaveOrOpenBlob(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);

  // Delay revoke to avoid Firefox/Safari occasionally canceling the download.
  requestAnimationFrame(() => {
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 1000);
  });
}

document.getElementById("downloadBtn").addEventListener("click", () => {
  const content = getYamlOutputText();
  if (!content) {
    alert("请先生成 YAML");
    return;
  }

  downloadTextFile(content, "clash-config.yaml");
});
