export function renderGroups(container, state, onChange) {
  container.innerHTML = '';
  state.groups.forEach((g, idx) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <div class="row">
        <input data-k="name" value="${esc(g.name || '')}" placeholder="组名" style="min-width:220px;" />
        <select data-k="type">
          <option value="select" ${g.type === 'select' ? 'selected' : ''}>select</option>
          <option value="url-test" ${g.type === 'url-test' ? 'selected' : ''}>url-test</option>
          <option value="fallback" ${g.type === 'fallback' ? 'selected' : ''}>fallback</option>
        </select>
        <select data-k="mode">
          <option value="proxies" ${g.mode === 'proxies' ? 'selected' : ''}>proxies</option>
          <option value="use" ${g.mode === 'use' ? 'selected' : ''}>use</option>
        </select>
        <button data-act="del">删除</button>
      </div>
      <div class="row">
        <input data-k="url" value="${esc(g.url || '')}" placeholder="url (url-test/fallback)" style="min-width:340px;" />
        <input data-k="interval" value="${g.interval ?? ''}" placeholder="interval" />
        <input data-k="tolerance" value="${g.tolerance ?? ''}" placeholder="tolerance" />
      </div>
      <textarea data-k="list">${esc((g.list || []).join('\n'))}</textarea>
    `;
    el.querySelectorAll('input,select,textarea').forEach(inp => {
      inp.addEventListener('input', () => {
        const k = inp.dataset.k;
        if (k === 'interval' || k === 'tolerance') g[k] = inp.value === '' ? undefined : Number(inp.value);
        else if (k === 'list') g.list = inp.value.split('\n').map(v => v.trim()).filter(Boolean);
        else g[k] = inp.value;
        onChange();
      });
    });
    el.querySelector('[data-act="del"]').addEventListener('click', () => {
      state.groups.splice(idx, 1);
      onChange();
    });
    container.appendChild(el);
  });
}
function esc(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}