import { state, resetState } from './state.js';
import { renderProviders } from './providersEditor.js';
import { renderGroups } from './groupsEditor.js';
import { fromYaml, toYaml } from './yamlCodec.js';

const providersEl = document.getElementById('providers');
const groupsEl = document.getElementById('groups');
const yamlInputEl = document.getElementById('yamlInput');
const yamlOutputEl = document.getElementById('yamlOutput');

function rerender() {
  renderProviders(providersEl, state, rerender);
  renderGroups(groupsEl, state, rerender);
}

// 默认给一些初始项
resetState({
  providers: [
    { key: 'A-jp', comment: 'A节点（日本）', type: 'http', url: 'https://your_domain/uuid/proxies', interval: 3600, inheritP: true },
    { key: 'B-la', comment: 'B节点（洛杉矶）', type: 'http', url: 'https://your_domain/uuid/proxies', interval: 3600, inheritP: true }
  ],
  groups: [
    { name: '🚀 节点选择', type: 'select', mode: 'proxies', list: ['自动选择-全部', '故障转移-全部'] }
  ]
});
rerender();

document.getElementById('addProvider').addEventListener('click', () => {
  state.providers.push({ key: 'new-provider', comment: '', type: 'http', url: '', interval: 3600, inheritP: true });
  rerender();
});

document.getElementById('addGroup').addEventListener('click', () => {
  state.groups.push({ name: '新策略组', type: 'select', mode: 'proxies', list: ['🚀 节点选择', 'DIRECT'] });
  rerender();
});

document.getElementById('importBtn').addEventListener('click', () => {
  try {
    const parsed = fromYaml(yamlInputEl.value || '');
    resetState(parsed);
    rerender();
    alert('导入成功，已回填表单');
  } catch (e) {
    alert('导入失败：' + e.message);
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  yamlOutputEl.value = toYaml(state);
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!yamlOutputEl.value.trim()) return alert('请先生成 YAML');
  await navigator.clipboard.writeText(yamlOutputEl.value);
  alert('已复制');
});
