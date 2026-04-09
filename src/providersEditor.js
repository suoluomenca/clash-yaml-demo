export function renderProviders(container, state, onChange) {
  container.innerHTML = '';
  state.providers.forEach((p, idx) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <div class="row">
        <input data-k="key" value="${esc(p.key || '')}" placeholder="A-jp" />
        <input data-k="comment" value="${esc(p.comment || '')}" placeholder="注释" />
        <input data-k="url" value="${esc(p.url || '')}" placeholder="url" style="min-width:340px;" />
        <input data-k="interval" value="${p.interval ?? 3600}" placeholder="interval" />
        <label><input type="checkbox" data-k="inheritP" ${p.inheritP ? 'checked' : ''}/> <<: *p</label>
        <button data-act="del">删除</button>
      </div>
    `;
    el.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', () => {
        const k = inp.dataset.k;
        if (k === 'interval') p[k] = Number(inp.value || 0);
        else if (k === 'inheritP') p[k] = inp.checked;
        else p[k] = inp.value;
        onChange();
      });

      if (inp.type === 'checkbox') {
        inp.addEventListener('change', () => {
          p.inheritP = inp.checked;
          onChange();
        });
      }
    });

    el.querySelector('[data-act="del"]').addEventListener('click', () => {
      state.providers.splice(idx, 1);
      onChange();
    });

    container.appendChild(el);
  });
}

function esc(s) {
  return String(s);
}
