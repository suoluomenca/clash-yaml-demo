function q(s) {
  if (/^[A-Za-z0-9_.-]+$/.test(s)) return s;
  return `'${String(s).replace(/'/g, "''")}'`;
}
function arrInline(arr = []) {
  return `[${arr.map(q).join(', ')}]`;
}

export function toYaml({ providers, groups }) {
  let out = 'proxy-providers:\n';
  for (const p of providers) {
    if (p.comment) out += `  # ${p.comment}\n`;
    out += `  ${p.key}:\n`;
    if (p.inheritP) out += `    <<: *p\n`;
    out += `    type: ${p.type || 'http'}\n`;
    out += `    url: ${p.url || ''}\n`;
    out += `    interval: ${Number(p.interval || 0)}\n\n`;
  }

  out += 'proxy-groups:\n';
  for (const g of groups) {
    out += `  - name: ${q(g.name || '')}\n`;
    out += `    type: ${g.type || 'select'}\n`;
    if (g.type === 'url-test' || g.type === 'fallback') {
      if (g.url) out += `    url: ${g.url}\n`;
      if (g.interval != null) out += `    interval: ${Number(g.interval)}\n`;
      if (g.type === 'url-test' && g.tolerance != null) out += `    tolerance: ${Number(g.tolerance)}\n`;
    }
    const key = g.mode === 'use' ? 'use' : 'proxies';
    out += `    ${key}: ${arrInline(g.list || [])}\n\n`;
  }
  return out.trimEnd();
}

// 轻量解析器：够你当前这两段结构使用
export function fromYaml(text) {
  const lines = text.split(/\r?\n/);

  const providers = [];
  const groups = [];

  // -------- parse proxy-providers --------
  let i = lines.findIndex(l => l.trim() === 'proxy-providers:');
  if (i >= 0) {
    i++;
    let pendingComment = '';
    while (i < lines.length) {
      const raw = lines[i];
      const t = raw.trim();
      if (!raw.startsWith('  ') || t === 'proxy-groups:') break;
      if (t.startsWith('#')) {
        pendingComment = t.replace(/^#\s?/, '');
        i++;
        continue;
      }
      const mKey = t.match(/^([A-Za-z0-9_.-]+):\s*$/);
      if (mKey) {
        const p = { key: mKey[1], comment: pendingComment || '', type: 'http', url: '', interval: 3600, inheritP: false };
        pendingComment = '';
        i++;
        while (i < lines.length && lines[i].startsWith('    ')) {
          const s = lines[i].trim();
          if (s.startsWith('<<:')) p.inheritP = true;
          else if (s.startsWith('type:')) p.type = s.slice(5).trim();
          else if (s.startsWith('url:')) p.url = s.slice(4).trim();
          else if (s.startsWith('interval:')) p.interval = Number(s.slice(9).trim() || 0);
          i++;
        }
        providers.push(p);
        continue;
      }
      i++;
    }
  }

  // -------- parse proxy-groups --------
  i = lines.findIndex(l => l.trim() === 'proxy-groups:');
  if (i >= 0) {
    i++;
    while (i < lines.length) {
      const raw = lines[i];
      if (!raw.startsWith('  ')) break;
      const t = raw.trim();
      if (t.startsWith('- name:')) {
        const g = { name: unquote(t.slice(7).trim()), type: 'select', mode: 'proxies', list: [] };
        i++;
        while (i < lines.length && lines[i].startsWith('    ')) {
          const s = lines[i].trim();
          if (s.startsWith('type:')) g.type = s.slice(5).trim();
          else if (s.startsWith('url:')) g.url = s.slice(4).trim();
          else if (s.startsWith('interval:')) g.interval = Number(s.slice(9).trim() || 0);
          else if (s.startsWith('tolerance:')) g.tolerance = Number(s.slice(10).trim() || 0);
          else if (s.startsWith('proxies:')) {
            g.mode = 'proxies';
            g.list = parseInlineList(s.slice(8).trim());
          } else if (s.startsWith('use:')) {
            g.mode = 'use';
            g.list = parseInlineList(s.slice(4).trim());
          }
          i++;
        }
        groups.push(g);
        continue;
      }
      i++;
    }
  }

  return { providers, groups };
}

function parseInlineList(s) {
  const x = s.trim();
  if (!x.startsWith('[') || !x.endsWith(']')) return [];
  const body = x.slice(1, -1).trim();
  if (!body) return [];
  // 简化分割：你当前数据够用（无复杂嵌套）
  return body.split(',').map(v => unquote(v.trim())).filter(Boolean);
}

function unquote(v) {
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
    return v.slice(1, -1).replace(/''/g, "'");
  }
  return v;
}