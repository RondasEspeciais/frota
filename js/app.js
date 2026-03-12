let deferredPrompt = null;

const screenEl = document.getElementById('screen');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const connectionBadge = document.getElementById('connectionBadge');
const syncBadge = document.getElementById('syncBadge');
const installBtn = document.getElementById('installBtn');
const notifyBtn = document.getElementById('notifyBtn');
const syncBtn = document.getElementById('syncBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');

const screenMeta = {
  dashboard: ['Dashboard', 'Visão geral da operação, alertas e indicadores'],
  motoristas: ['Cadastro Motoristas', 'Gerencie motoristas da frota'],
  viaturas: ['Cadastro Viaturas', 'Gerencie veículos e utilitários'],
  abastecimentos: ['Abastecimentos', 'Controle consumo e custos'],
  manutencoes: ['Agendar Manutenção', 'Planejamento preventivo e corretivo'],
  reparos: ['Reparos Realizados', 'Histórico de custos e serviços'],
  consultas: ['Consultas', 'Pesquisa global de registros'],
  relatorios: ['Relatórios', 'Indicadores consolidados da operação']
};

const crudConfig = {
  motoristas: {
    title: 'Novo Motorista',
    columns: ['id', 'nome', 'cnh', 'categoria', 'validadeCNH', 'telefone', 'status'],
    fields: [
      { name: 'nome', label: 'Nome', type: 'text', required: true },
      { name: 'cnh', label: 'CNH', type: 'text', required: true },
      { name: 'categoria', label: 'Categoria', type: 'text' },
      { name: 'validadeCNH', label: 'Validade CNH', type: 'date' },
      { name: 'telefone', label: 'Telefone', type: 'text' },
      { name: 'status', label: 'Status', type: 'text' }
    ]
  },
  viaturas: {
    title: 'Nova Viatura',
    columns: ['id', 'placa', 'modelo', 'marca', 'ano', 'kmAtual', 'status'],
    fields: [
      { name: 'placa', label: 'Placa/Prefixo', type: 'text', required: true },
      { name: 'modelo', label: 'Modelo', type: 'text', required: true },
      { name: 'marca', label: 'Marca', type: 'text' },
      { name: 'ano', label: 'Ano', type: 'number' },
      { name: 'tipo', label: 'Tipo', type: 'text' },
      { name: 'kmAtual', label: 'KM Atual', type: 'number' },
      { name: 'status', label: 'Status', type: 'text' }
    ]
  },
  abastecimentos: {
    title: 'Novo Abastecimento',
    columns: ['id', 'viaturaNome', 'motoristaNome', 'data', 'litros', 'valorTotal', 'km', 'posto'],
    fields: [
      { name: 'viaturaId', label: 'Viatura', type: 'select-viatura', required: true },
      { name: 'motoristaId', label: 'Motorista', type: 'select-motorista', required: true },
      { name: 'data', label: 'Data', type: 'date', required: true },
      { name: 'litros', label: 'Litros', type: 'number', required: true },
      { name: 'valorTotal', label: 'Valor Total', type: 'number', required: true },
      { name: 'km', label: 'KM', type: 'number' },
      { name: 'posto', label: 'Posto', type: 'text' },
      { name: 'observacao', label: 'Observação', type: 'textarea', full: true }
    ]
  },
  manutencoes: {
    title: 'Agendar Manutenção',
    columns: ['id', 'viaturaNome', 'tipo', 'dataAgendada', 'km', 'prioridade', 'status'],
    fields: [
      { name: 'viaturaId', label: 'Viatura', type: 'select-viatura', required: true },
      { name: 'tipo', label: 'Tipo de manutenção', type: 'text', required: true },
      { name: 'dataAgendada', label: 'Data agendada', type: 'date', required: true },
      { name: 'km', label: 'KM', type: 'number' },
      { name: 'prioridade', label: 'Prioridade', type: 'text' },
      { name: 'status', label: 'Status', type: 'text' },
      { name: 'observacao', label: 'Observação', type: 'textarea', full: true }
    ]
  },
  reparos: {
    title: 'Registrar Reparo',
    columns: ['id', 'viaturaNome', 'descricao', 'data', 'custo', 'fornecedor', 'status'],
    fields: [
      { name: 'viaturaId', label: 'Viatura', type: 'select-viatura', required: true },
      { name: 'descricao', label: 'Descrição', type: 'text', required: true },
      { name: 'data', label: 'Data', type: 'date', required: true },
      { name: 'custo', label: 'Custo', type: 'number' },
      { name: 'fornecedor', label: 'Fornecedor', type: 'text' },
      { name: 'status', label: 'Status', type: 'text' },
      { name: 'observacao', label: 'Observação', type: 'textarea', full: true }
    ]
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await openDB();
  setupMenu();
  setupPWA();
  setupToolbar();
  function setupToolbar() {
  syncBtn.addEventListener('click', syncPending);
  exportJsonBtn.addEventListener('click', exportBackupJSON);
  exportCsvBtn.addEventListener('click', exportCurrentDataCSV);
  exportPdfBtn.addEventListener('click', generatePDF); // ← ADICIONE ESTA LINHA
  notifyBtn.addEventListener('click', requestNotificationPermission);
}

  updateConnectionStatus();
  await updateSyncBadge();
  await renderScreen('dashboard');
  await checkAndNotifyAlerts();

  window.addEventListener('online', async () => {
    updateConnectionStatus();
    await syncPending();
  });
  // Máscara de telefone em qualquer campo com name="telefone"
document.addEventListener('input', (event) => {
  const el = event.target;
  if (!el.name || el.name.toLowerCase() !== 'telefone') return;

  el.value = phoneMask(el.value);
  // NÃO restaura selectionStart/End
});


// Forçar valor em maiúsculo em todos inputs de texto e textareas
document.addEventListener('input', (event) => {
  const el = event.target;
  if (!el.tagName) return;

  const tag = el.tagName.toLowerCase();
  const type = (el.type || '').toLowerCase();

  const isTextInput =
    (tag === 'input' && (type === 'text' || type === 'search' || type === 'email' || type === 'tel')) ||
    tag === 'textarea';

  // força MAIÚSCULAS (se quiser manter isso)
  if (isTextInput) {
    const pos = el.selectionStart;
    el.value = el.value.toUpperCase();
    if (pos !== null) el.selectionStart = el.selectionEnd = pos;
  }

  // aplica máscara de telefone apenas no campo telefone
  if (el.name && el.name.toLowerCase() === 'telefone') {
    const pos = el.selectionStart;
    el.value = phoneMask(el.value);
    if (pos !== null) el.selectionStart = el.selectionEnd = pos;
  }
});


  window.addEventListener('offline', updateConnectionStatus);
});

function setupMenu() {
  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.menu-btn').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      await renderScreen(btn.dataset.screen);
    });
  });
}

function setupToolbar() {
  syncBtn.addEventListener('click', syncPending);
  exportJsonBtn.addEventListener('click', exportBackupJSON);
  exportCsvBtn.addEventListener('click', exportCurrentDataCSV);
  notifyBtn.addEventListener('click', requestNotificationPermission);
}

function setupPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js');
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installBtn.classList.remove('hidden');
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.classList.add('hidden');
  });
}

function updateConnectionStatus() {
  const online = navigator.onLine;
  connectionBadge.textContent = online ? 'Online' : 'Offline';
  connectionBadge.className = `badge ${online ? 'online' : 'offline'}`;
}

async function updateSyncBadge() {
  const queue = await getAll('syncQueue');
  syncBadge.textContent = queue.length ? `${queue.length} pendência(s)` : 'Sincronizado';
  syncBadge.className = `badge ${queue.length ? 'neutral' : 'online'}`;
}

async function renderScreen(name) {
  const [title, subtitle] = screenMeta[name];
  pageTitle.textContent = title;
  pageSubtitle.textContent = subtitle;

  if (name === 'dashboard') return renderDashboard();
  if (name === 'consultas') return renderConsultas();
  if (name === 'relatorios') return renderRelatorios();
  return renderCrud(name);
}

async function renderDashboard() {
  const [motoristas, viaturas, abastecimentos, manutencoes, reparos] = await Promise.all([
    getAll('motoristas'),
    getAll('viaturas'),
    resolveAbastecimentos(),
    resolveManutencoes(),
    resolveReparos()
  ]);

  const totalAbastecimentos = abastecimentos.reduce((sum, item) => sum + (Number(item.valorTotal) || 0), 0);
  const totalReparos = reparos.reduce((sum, item) => sum + (Number(item.custo) || 0), 0);

  const hoje = getTodayISO();
  const cnhVencidas = motoristas.filter(m => m.validadeCNH && m.validadeCNH < hoje);
  const manutVencidas = manutencoes.filter(m => m.dataAgendada && m.dataAgendada < hoje && !isConcluida(m.status));

  screenEl.innerHTML = `
    <section class="kpi-grid">
      <div class="card"><div class="kpi-label">Motoristas</div><div class="kpi-value">${motoristas.length}</div></div>
      <div class="card"><div class="kpi-label">Viaturas</div><div class="kpi-value">${viaturas.length}</div></div>
      <div class="card"><div class="kpi-label">Abastecimentos</div><div class="kpi-value">R$ ${totalAbastecimentos.toFixed(2)}</div></div>
      <div class="card"><div class="kpi-label">Reparos</div><div class="kpi-value">R$ ${totalReparos.toFixed(2)}</div></div>
    </section>

    <section class="content-grid">
      <div class="panel">
        <h3>Alertas automáticos</h3>
        ${buildAlertsHtml(cnhVencidas, manutVencidas)}
      </div>

      <div class="panel">
        <h3>Próximas manutenções</h3>
        ${manutencoes.length ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Viatura</th>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${manutencoes
                  .sort((a, b) => safeDate(a.dataAgendada) > safeDate(b.dataAgendada) ? 1 : -1)
                  .slice(0, 8)
                  .map(item => `
                    <tr>
                      <td>${safe(item.viaturaNome)}</td>
                      <td>${safe(item.tipo)}</td>
                      <td>${safe(item.dataAgendada)}</td>
                      <td>${safe(item.status || 'Pendente')}</td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty">Nenhuma manutenção cadastrada.</div>`}
      </div>
    </section>

    <section class="chart-grid">
      <div class="panel">
        <h3>Custos por módulo</h3>
        <canvas id="costChart" height="260"></canvas>
      </div>

      <div class="panel">
        <h3>Registros por módulo</h3>
        <canvas id="countChart" height="260"></canvas>
      </div>
    </section>
  `;

  drawBarChart('costChart', [
    { label: 'Abastecimentos', value: totalAbastecimentos, color: '#3b5d47' },
    { label: 'Reparos', value: totalReparos, color: '#5c8a6a' }
  ], 'currency');

  drawBarChart('countChart', [
    { label: 'Motoristas', value: motoristas.length, color: '#3b5d47' },
    { label: 'Viaturas', value: viaturas.length, color: '#5c8a6a' },
    { label: 'Manutenções', value: manutencoes.length, color: '#7aa487' },
    { label: 'Reparos', value: reparos.length, color: '#93b9a0' }
  ], 'number');
}

function buildAlertsHtml(cnhVencidas, manutVencidas) {
  if (!cnhVencidas.length && !manutVencidas.length) {
    return `<div class="empty">Nenhum alerta crítico no momento.</div>`;
  }

  return `
    <div class="alert-stack">
      ${cnhVencidas.length ? `
        <div class="alert-box alert-danger">
          <strong>CNH vencida:</strong>
          <ul>
            ${cnhVencidas.map(item => `<li>${safe(item.nome)} - validade ${safe(item.validadeCNH)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${manutVencidas.length ? `
        <div class="alert-box alert-warning">
          <strong>Manutenção vencida:</strong>
          <ul>
            ${manutVencidas.map(item => `<li>${safe(item.viaturaNome)} - ${safe(item.tipo)} em ${safe(item.dataAgendada)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}

function drawBarChart(canvasId, items, format = 'number') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 500;
  const height = canvas.height || 260;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const padding = 36;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const maxValue = Math.max(...items.map(i => Number(i.value) || 0), 1);
  const segment = chartWidth / items.length;
  const barWidth = segment * 0.58;

  ctx.strokeStyle = '#d8dfd9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  items.forEach((item, index) => {
    const value = Number(item.value) || 0;
    const x = padding + index * segment + (segment - barWidth) / 2;
    const barHeight = (value / maxValue) * (chartHeight - 20);
    const y = height - padding - barHeight;

    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#223028';
    ctx.font = '12px Montserrat';
    ctx.textAlign = 'center';
    ctx.fillText(formatValue(value, format), x + barWidth / 2, y - 8);

    ctx.fillStyle = '#66756d';
    wrapLabel(ctx, item.label, x + barWidth / 2, height - padding + 16, segment - 8, 14);
  });
}

function wrapLabel(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '';
  const lines = [];

  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      lines.push(line.trim());
      line = words[i] + ' ';
    } else {
      line = test;
    }
  }

  lines.push(line.trim());
  lines.forEach((l, index) => ctx.fillText(l, x, y + (index * lineHeight)));
}

function formatValue(value, format = 'number') {
  const num = Number(value) || 0;
  if (format === 'currency') return `R$ ${num.toFixed(0)}`;
  return `${num.toFixed(0)}`;
}

function getTodayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function safeDate(value) {
  return value || '9999-12-31';
}

function isConcluida(status) {
  const s = (status || '').toLowerCase().trim();
  return ['concluida', 'concluída', 'finalizada', 'concluido', 'concluído'].includes(s);
}

async function renderCrud(store) {
  const config = crudConfig[store];
  const rows = await getRowsForStore(store);

  screenEl.innerHTML = `
    <section class="content-grid">
      <div class="panel">
        <h3>${config.title}</h3>
        <form id="crudForm" class="form-grid">
          <input type="hidden" name="id" />
          ${await buildFields(config.fields)}
          <div class="field full">
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Salvar</button>
              <button type="reset" class="btn btn-light" id="clearBtn">Limpar</button>
            </div>
          </div>
        </form>
      </div>

      <div class="panel">
        ${await buildFilters(store)}
        <div id="tableBox">${buildTable(store, rows)}</div>
      </div>
    </section>
  `;

  document.getElementById('crudForm').addEventListener('submit', (e) => saveCrud(e, store));
  document.getElementById('clearBtn').addEventListener('click', clearCrudForm);

  const filterForm = document.getElementById('filterForm');
  if (filterForm) {
    filterForm.addEventListener('input', () => applyFilters(store));
    filterForm.addEventListener('change', () => applyFilters(store));
  }
}

async function buildFields(fields) {
  const motoristas = await getAll('motoristas');
  const viaturas = await getAll('viaturas');

  return fields.map(field => {
    if (field.type === 'textarea') {
      return `
        <div class="field ${field.full ? 'full' : ''}">
          <label>${field.label}</label>
          <textarea name="${field.name}" ${field.required ? 'required' : ''}></textarea>
        </div>
      `;
    }

    if (field.type === 'select-motorista') {
      return `
        <div class="field ${field.full ? 'full' : ''}">
          <label>${field.label}</label>
          <select name="${field.name}" ${field.required ? 'required' : ''}>
            <option value="">Selecione</option>
            ${motoristas.map(m => `<option value="${m.id}">${safe(m.nome)} - ${safe(m.cnh)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    if (field.type === 'select-viatura') {
      return `
        <div class="field ${field.full ? 'full' : ''}">
          <label>${field.label}</label>
          <select name="${field.name}" ${field.required ? 'required' : ''}>
            <option value="">Selecione</option>
            ${viaturas.map(v => `<option value="${v.id}">${safe(v.placa)} - ${safe(v.modelo)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    return `
      <div class="field ${field.full ? 'full' : ''}">
        <label>${field.label}</label>
        <input type="${field.type}" step="any" name="${field.name}" ${field.required ? 'required' : ''}>
      </div>
    `;
  }).join('');
}

async function buildFilters(store) {
  const motoristas = await getAll('motoristas');
  const viaturas = await getAll('viaturas');

  if (store === 'motoristas') {
    return `
      <form id="filterForm" class="toolbar">
        <input type="text" name="termo" placeholder="Nome, CNH, telefone..." />
        <input type="text" name="status" placeholder="Status" />
        <input type="date" name="cnhAte" />
      </form>
    `;
  }

  if (store === 'viaturas') {
    return `
      <form id="filterForm" class="toolbar">
        <input type="text" name="termo" placeholder="Placa/Prefixo, modelo, marca..." />
        <input type="text" name="status" placeholder="Status" />
      </form>
    `;
  }

  if (store === 'abastecimentos') {
    return `
      <form id="filterForm" class="toolbar">
        <select name="viaturaId">
          <option value="">Todas as viaturas</option>
          ${viaturas.map(v => `<option value="${v.id}">${safe(v.placa)} - ${safe(v.modelo)}</option>`).join('')}
        </select>
        <select name="motoristaId">
          <option value="">Todos os motoristas</option>
          ${motoristas.map(m => `<option value="${m.id}">${safe(m.nome)}</option>`).join('')}
        </select>
        <input type="date" name="dataInicial" />
        <input type="date" name="dataFinal" />
        <input type="text" name="posto" placeholder="Posto" />
      </form>
    `;
  }

  if (store === 'manutencoes') {
    return `
      <form id="filterForm" class="toolbar">
        <select name="viaturaId">
          <option value="">Todas as viaturas</option>
          ${viaturas.map(v => `<option value="${v.id}">${safe(v.placa)} - ${safe(v.modelo)}</option>`).join('')}
        </select>
        <input type="date" name="dataInicial" />
        <input type="date" name="dataFinal" />
        <input type="text" name="status" placeholder="Status" />
        <input type="text" name="prioridade" placeholder="Prioridade" />
      </form>
    `;
  }

  if (store === 'reparos') {
    return `
      <form id="filterForm" class="toolbar">
        <select name="viaturaId">
          <option value="">Todas as viaturas</option>
          ${viaturas.map(v => `<option value="${v.id}">${safe(v.placa)} - ${safe(v.modelo)}</option>`).join('')}
        </select>
        <input type="date" name="dataInicial" />
        <input type="date" name="dataFinal" />
        <input type="text" name="status" placeholder="Status" />
        <input type="text" name="fornecedor" placeholder="Fornecedor" />
      </form>
    `;
  }

  return '';
}

async function applyFilters(store) {
  const rows = await getRowsForStore(store);
  const form = document.getElementById('filterForm');
  if (!form) {
    document.getElementById('tableBox').innerHTML = buildTable(store, rows);
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  let filtered = rows;

  if (store === 'motoristas') {
    filtered = rows.filter(item => {
      const okTermo = !data.termo || JSON.stringify(item).toLowerCase().includes(data.termo.toLowerCase());
      const okStatus = !data.status || (item.status || '').toLowerCase().includes(data.status.toLowerCase());
      const okCNH = !data.cnhAte || ((item.validadeCNH || '') !== '' && item.validadeCNH <= data.cnhAte);
      return okTermo && okStatus && okCNH;
    });
  }

  if (store === 'viaturas') {
    filtered = rows.filter(item => {
      const okTermo = !data.termo || JSON.stringify(item).toLowerCase().includes(data.termo.toLowerCase());
      const okStatus = !data.status || (item.status || '').toLowerCase().includes(data.status.toLowerCase());
      return okTermo && okStatus;
    });
  }

  if (store === 'abastecimentos') {
    filtered = rows.filter(item => {
      const okViatura = !data.viaturaId || Number(item.viaturaId) === Number(data.viaturaId);
      const okMotorista = !data.motoristaId || Number(item.motoristaId) === Number(data.motoristaId);
      const okPosto = !data.posto || (item.posto || '').toLowerCase().includes(data.posto.toLowerCase());
      const okDataIni = !data.dataInicial || item.data >= data.dataInicial;
      const okDataFim = !data.dataFinal || item.data <= data.dataFinal;
      return okViatura && okMotorista && okPosto && okDataIni && okDataFim;
    });
  }

  if (store === 'manutencoes') {
    filtered = rows.filter(item => {
      const okViatura = !data.viaturaId || Number(item.viaturaId) === Number(data.viaturaId);
      const okStatus = !data.status || (item.status || '').toLowerCase().includes(data.status.toLowerCase());
      const okPrioridade = !data.prioridade || (item.prioridade || '').toLowerCase().includes(data.prioridade.toLowerCase());
      const okDataIni = !data.dataInicial || item.dataAgendada >= data.dataInicial;
      const okDataFim = !data.dataFinal || item.dataAgendada <= data.dataFinal;
      return okViatura && okStatus && okPrioridade && okDataIni && okDataFim;
    });
  }

  if (store === 'reparos') {
    filtered = rows.filter(item => {
      const okViatura = !data.viaturaId || Number(item.viaturaId) === Number(data.viaturaId);
      const okStatus = !data.status || (item.status || '').toLowerCase().includes(data.status.toLowerCase());
      const okFornecedor = !data.fornecedor || (item.fornecedor || '').toLowerCase().includes(data.fornecedor.toLowerCase());
      const okDataIni = !data.dataInicial || item.data >= data.dataInicial;
      const okDataFim = !data.dataFinal || item.data <= data.dataFinal;
      return okViatura && okStatus && okFornecedor && okDataIni && okDataFim;
    });
  }

  document.getElementById('tableBox').innerHTML = buildTable(store, filtered);
}

async function getRowsForStore(store) {
  if (store === 'abastecimentos') return resolveAbastecimentos();
  if (store === 'manutencoes') return resolveManutencoes();
  if (store === 'reparos') return resolveReparos();
  return getAll(store);
}

async function resolveAbastecimentos() {
  const [rows, motoristas, viaturas] = await Promise.all([
    getAll('abastecimentos'),
    getAll('motoristas'),
    getAll('viaturas')
  ]);

  return rows.map(row => {
    const motorista = motoristas.find(m => Number(m.id) === Number(row.motoristaId));
    const viatura = viaturas.find(v => Number(v.id) === Number(row.viaturaId));
    return {
      ...row,
      motoristaNome: motorista ? motorista.nome : '-',
      viaturaNome: viatura ? `${viatura.placa} - ${viatura.modelo}` : '-'
    };
  });
}

async function resolveManutencoes() {
  const [rows, viaturas] = await Promise.all([
    getAll('manutencoes'),
    getAll('viaturas')
  ]);

  return rows.map(row => {
    const viatura = viaturas.find(v => Number(v.id) === Number(row.viaturaId));
    return {
      ...row,
      viaturaNome: viatura ? `${viatura.placa} - ${viatura.modelo}` : '-'
    };
  });
}

async function resolveReparos() {
  const [rows, viaturas] = await Promise.all([
    getAll('reparos'),
    getAll('viaturas')
  ]);

  return rows.map(row => {
    const viatura = viaturas.find(v => Number(v.id) === Number(row.viaturaId));
    return {
      ...row,
      viaturaNome: viatura ? `${viatura.placa} - ${viatura.modelo}` : '-'
    };
  });
}

function buildTable(store, rows) {
  const config = crudConfig[store];
  if (!rows.length) return `<div class="empty">Nenhum registro encontrado.</div>`;

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${config.columns.map(col => `<th>${col}</th>`).join('')}
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${config.columns.map(col => `<td>${safe(row[col])}</td>`).join('')}
              <td>
                <div class="action-inline">
                  <button class="btn-small btn-edit" onclick="editCrud('${store}', ${row.id})">Editar</button>
                  <button class="btn-small btn-delete" onclick="removeCrud('${store}', ${row.id})">Excluir</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function saveCrud(event, store) {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form).entries());

  if (data.id) data.id = Number(data.id);
  if (data.motoristaId) data.motoristaId = Number(data.motoristaId);
  if (data.viaturaId) data.viaturaId = Number(data.viaturaId);

  if (data.id) {
    await putRecord(store, data);
    await queueSync(store, 'update', data);
  } else {
    delete data.id;
    const id = await addRecord(store, data);
    await queueSync(store, 'create', { ...data, id });
  }

  form.reset();
  await updateSyncBadge();
  await checkAndNotifyAlerts();
  await renderCrud(store);
}

async function editCrud(store, id) {
  const data = await getOne(store, id);
  if (!data) return;

  const form = document.getElementById('crudForm');
  Object.keys(data).forEach(key => {
    if (form.elements[key]) {
      form.elements[key].value = data[key];
    }
  });
}

async function removeCrud(store, id) {
  const validation = await validateDelete(store, id);
  if (validation.blocked) {
    alert(validation.message);
    return;
  }

  if (!confirm('Deseja realmente excluir este registro?')) return;

  const current = await getOne(store, id);
  await deleteRecord(store, id);
  await queueSync(store, 'delete', current || { id });
  await updateSyncBadge();
  await checkAndNotifyAlerts();
  await renderCrud(store);
}

async function validateDelete(store, id) {
  id = Number(id);

  if (store === 'motoristas') {
    const total = await countByIndex('abastecimentos', 'motoristaId', id);
    if (total > 0) {
      return {
        blocked: true,
        message: `Não é possível excluir este motorista. Existem ${total} abastecimento(s) vinculados.`
      };
    }
  }

  if (store === 'viaturas') {
    const [abast, manut, rep] = await Promise.all([
      countByIndex('abastecimentos', 'viaturaId', id),
      countByIndex('manutencoes', 'viaturaId', id),
      countByIndex('reparos', 'viaturaId', id)
    ]);

    if (abast + manut + rep > 0) {
      return {
        blocked: true,
        message: `Não é possível excluir esta viatura. Há vínculos em abastecimentos (${abast}), manutenções (${manut}) e reparos (${rep}).`
      };
    }
  }

  return { blocked: false };
}

function clearCrudForm() {
  const form = document.getElementById('crudForm');
  if (form) form.reset();
}

async function renderConsultas() {
  const data = [
    ...(await getAll('motoristas')).map(r => ({ modulo: 'motoristas', resumo: JSON.stringify(r) })),
    ...(await getAll('viaturas')).map(r => ({ modulo: 'viaturas', resumo: JSON.stringify(r) })),
    ...(await resolveAbastecimentos()).map(r => ({ modulo: 'abastecimentos', resumo: JSON.stringify(r) })),
    ...(await resolveManutencoes()).map(r => ({ modulo: 'manutencoes', resumo: JSON.stringify(r) })),
    ...(await resolveReparos()).map(r => ({ modulo: 'reparos', resumo: JSON.stringify(r) }))
  ];

  screenEl.innerHTML = `
    <section class="panel">
      <h3>Consulta global</h3>
      <div class="toolbar">
        <input id="globalSearch" type="text" placeholder="Pesquisar em todos os módulos..." />
      </div>
      <div id="globalResults">${buildGlobalTable(data)}</div>
    </section>
  `;

  document.getElementById('globalSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = data.filter(item => item.resumo.toLowerCase().includes(term));
    document.getElementById('globalResults').innerHTML = buildGlobalTable(filtered);
  });
}

function buildGlobalTable(rows) {
  if (!rows.length) return `<div class="empty">Nenhum resultado.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Módulo</th>
            <th>Resumo</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td>${safe(row.modulo)}</td>
              <td>${safe(row.resumo)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function renderRelatorios() {
  const [abastecimentos, reparos, manutencoes, viaturas, motoristas] = await Promise.all([
    resolveAbastecimentos(),
    resolveReparos(),
    resolveManutencoes(),
    getAll('viaturas'),
    getAll('motoristas')
  ]);

  const hoje = getTodayISO();
  const totalCombustivel = abastecimentos.reduce((sum, item) => sum + (Number(item.valorTotal) || 0), 0);
  const totalReparos = reparos.reduce((sum, item) => sum + (Number(item.custo) || 0), 0);
  const pendentes = manutencoes.filter(x => !isConcluida(x.status)).length;
  const cnhVencidas = motoristas.filter(m => m.validadeCNH && m.validadeCNH < hoje).length;

  screenEl.innerHTML = `
    <section class="report-grid">
      <div class="card"><div class="kpi-label">Viaturas cadastradas</div><div class="kpi-value">${viaturas.length}</div></div>
      <div class="card"><div class="kpi-label">Custo com abastecimento</div><div class="kpi-value">R$ ${totalCombustivel.toFixed(2)}</div></div>
      <div class="card"><div class="kpi-label">Custo com reparos</div><div class="kpi-value">R$ ${totalReparos.toFixed(2)}</div></div>
      <div class="card"><div class="kpi-label">CNHs vencidas</div><div class="kpi-value">${cnhVencidas}</div></div>
      <div class="card"><div class="kpi-label">Manutenções pendentes</div><div class="kpi-value">${pendentes}</div></div>
    </section>
  `;
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Este navegador não suporta notificações.');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    alert('Alertas ativados com sucesso.');
    await checkAndNotifyAlerts();
  } else {
    alert('Permissão de notificação não concedida.');
  }
}

async function checkAndNotifyAlerts() {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) {
    return;
  }

  const hoje = getTodayISO();
  const motoristas = await getAll('motoristas');
  const manutencoes = await resolveManutencoes();

  const cnhVencidas = motoristas.filter(m => m.validadeCNH && m.validadeCNH < hoje);
  const manutVencidas = manutencoes.filter(m => m.dataAgendada && m.dataAgendada < hoje && !isConcluida(m.status));

  const totalAlerts = cnhVencidas.length + manutVencidas.length;
  if (!totalAlerts) return;

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('Gestão de Frota', {
    body: `Há ${totalAlerts} alerta(s): CNHs vencidas e/ou manutenções vencidas.`,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'gestao-frota-alertas',
    renotify: true
  });
}

async function queueSync(entity, action, payload) {
  await addRecord('syncQueue', {
    entity,
    action,
    payload,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
}

async function syncPending() {
  if (!navigator.onLine) {
    alert('Você está offline.');
    return;
  }

  const queue = await getAll('syncQueue');
  if (!queue.length) {
    await updateSyncBadge();
    alert('Nenhuma pendência para sincronizar.');
    return;
  }

  for (const item of queue) {
    try {
      await fakeApiSync(item);
      await deleteRecord('syncQueue', item.id);
    } catch (error) {
      console.error('Erro ao sincronizar:', item, error);
    }
  }

  await updateSyncBadge();
  alert('Sincronização concluída.');
}

function fakeApiSync(item) {
  return new Promise(resolve => setTimeout(() => resolve(item), 250));
}

async function exportBackupJSON() {
  const payload = {
    motoristas: await getAll('motoristas'),
    viaturas: await getAll('viaturas'),
    abastecimentos: await getAll('abastecimentos'),
    manutencoes: await getAll('manutencoes'),
    reparos: await getAll('reparos'),
    syncQueue: await getAll('syncQueue')
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  await shareOrDownload(blob, 'gestao-frota-backup.json', 'Backup Gestão de Frota', 'Backup do sistema');
}

async function exportCurrentDataCSV() {
  const activeBtn = document.querySelector('.menu-btn.active');
  const screen = activeBtn ? activeBtn.dataset.screen : 'dashboard';

  let rows = [];
  if (screen === 'motoristas') rows = await getAll('motoristas');
  else if (screen === 'viaturas') rows = await getAll('viaturas');
  else if (screen === 'abastecimentos') rows = await resolveAbastecimentos();
  else if (screen === 'manutencoes') rows = await resolveManutencoes();
  else if (screen === 'reparos') rows = await resolveReparos();
  else if (screen === 'consultas') {
    rows = [
      ...(await getAll('motoristas')).map(r => ({ modulo: 'motoristas', resumo: JSON.stringify(r) })),
      ...(await getAll('viaturas')).map(r => ({ modulo: 'viaturas', resumo: JSON.stringify(r) })),
      ...(await resolveAbastecimentos()).map(r => ({ modulo: 'abastecimentos', resumo: JSON.stringify(r) })),
      ...(await resolveManutencoes()).map(r => ({ modulo: 'manutencoes', resumo: JSON.stringify(r) })),
      ...(await resolveReparos()).map(r => ({ modulo: 'reparos', resumo: JSON.stringify(r) }))
    ];
  } else {
    alert('Abra um módulo de dados antes de exportar CSV.');
    return;
  }

  if (!rows.length) {
    alert('Não há dados para exportar.');
    return;
  }

  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  await shareOrDownload(blob, `gestao-frota-${screen}.csv`, `Exportação ${screen}`, `Dados exportados em CSV`);
}

async function shareOrDownload(blob, fileName, title, text) {
  const canNativeShare = 'canShare' in navigator && 'share' in navigator;

  if (canNativeShare) {
    const file = new File([blob], fileName, { type: blob.type });
    const data = { files: [file], title, text };

    if (navigator.canShare(data)) {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toCSV(rows) {
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const escapeCSV = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => headers.map(h => escapeCSV(row[h])).join(','))
  ];
  return lines.join('\n');
}

function safe(value) {
  return value ?? '-';
}
function phoneMask(value) {
  if (!value) return '';

  value = value.replace(/\D/g, '');        // remove tudo que não é dígito
  value = value.substring(0, 11);          // limita a 11 dígitos

  // (99) 99999-9999 ou (99) 9999-9999
  value = value.replace(/^(\d{2})(\d)/g, '($1) $2');

  if (value.length <= 14) {
    // até 10 dígitos: (99) 9999-9999
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
  } else {
    // 11 dígitos: (99) 99999-9999
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
  }

  return value;
}

// ============================================
// GERAÇÃO DE PDF
// ============================================

async function generatePDF() {
  const activeBtn = document.querySelector('.menu-btn.active');
  const screen = activeBtn ? activeBtn.dataset.screen : 'dashboard';

  if (screen === 'dashboard') {
    await generateDashboardPDF();
  } else if (screen === 'relatorios') {
    await generateRelatoriosPDF();
  } else {
    await generateTablePDF(screen);
  }
}

async function generateDashboardPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  // Cabeçalho
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Gestão de Frota - Dashboard', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 28, { align: 'center' });

  // Buscar dados
  const [motoristas, viaturas, abastecimentos, reparos] = await Promise.all([
    getAll('motoristas'),
    getAll('viaturas'),
    resolveAbastecimentos(),
    resolveReparos()
  ]);

  const totalAbastecimentos = abastecimentos.reduce((sum, item) => sum + (Number(item.valorTotal) || 0), 0);
  const totalReparos = reparos.reduce((sum, item) => sum + (Number(item.custo) || 0), 0);

  const hoje = getTodayISO();
  const cnhVencidas = motoristas.filter(m => m.validadeCNH && m.validadeCNH < hoje);
  const manutencoes = await resolveManutencoes();
  const manutVencidas = manutencoes.filter(m => m.dataAgendada && m.dataAgendada < hoje && !isConcluida(m.status));

  // Indicadores principais
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Indicadores Principais', 14, 40);

  const kpiData = [
    ['Motoristas cadastrados', motoristas.length.toString()],
    ['Viaturas cadastradas', viaturas.length.toString()],
    ['Custo com abastecimentos', `R$ ${totalAbastecimentos.toFixed(2)}`],
    ['Custo com reparos', `R$ ${totalReparos.toFixed(2)}`],
    ['CNHs vencidas', cnhVencidas.length.toString()],
    ['Manutenções vencidas', manutVencidas.length.toString()]
  ];

  doc.autoTable({
    startY: 45,
    head: [['Indicador', 'Valor']],
    body: kpiData,
    theme: 'grid',
    headStyles: { fillColor: [48, 76, 58], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 }
  });

  // Alertas
  if (cnhVencidas.length > 0 || manutVencidas.length > 0) {
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Alertas Críticos', 14, finalY);

    const alertas = [];
    cnhVencidas.forEach(m => {
      alertas.push(['CNH Vencida', `${m.nome} - Validade: ${m.validadeCNH}`]);
    });
    manutVencidas.forEach(m => {
      alertas.push(['Manutenção Vencida', `${m.viaturaNome} - ${m.tipo} - ${m.dataAgendada}`]);
    });

    doc.autoTable({
      startY: finalY + 5,
      head: [['Tipo', 'Descrição']],
      body: alertas,
      theme: 'striped',
      headStyles: { fillColor: [180, 35, 24], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 }
    });
  }

  // Rodapé
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
  }

  doc.save('gestao-frota-dashboard.pdf');
}

async function generateRelatoriosPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Gestão de Frota - Relatório Completo', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 28, { align: 'center' });

  const [abastecimentos, reparos, manutencoes, viaturas, motoristas] = await Promise.all([
    resolveAbastecimentos(),
    resolveReparos(),
    resolveManutencoes(),
    getAll('viaturas'),
    getAll('motoristas')
  ]);

  const hoje = getTodayISO();
  const totalCombustivel = abastecimentos.reduce((sum, item) => sum + (Number(item.valorTotal) || 0), 0);
  const totalReparos = reparos.reduce((sum, item) => sum + (Number(item.custo) || 0), 0);
  const pendentes = manutencoes.filter(x => !isConcluida(x.status)).length;
  const cnhVencidas = motoristas.filter(m => m.validadeCNH && m.validadeCNH < hoje).length;

  const relData = [
    ['Viaturas cadastradas', viaturas.length.toString()],
    ['Motoristas cadastrados', motoristas.length.toString()],
    ['Custo total com abastecimento', `R$ ${totalCombustivel.toFixed(2)}`],
    ['Custo total com reparos', `R$ ${totalReparos.toFixed(2)}`],
    ['CNHs vencidas', cnhVencidas.toString()],
    ['Manutenções pendentes', pendentes.toString()]
  ];

  doc.autoTable({
    startY: 35,
    head: [['Indicador', 'Valor']],
    body: relData,
    theme: 'grid',
    headStyles: { fillColor: [48, 76, 58], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 11, cellPadding: 4 }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
  }

  doc.save('gestao-frota-relatorio.pdf');
}

async function generateTablePDF(store) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape para tabelas

  const config = crudConfig[store];
  if (!config) {
    alert('Tela não suporta exportação de PDF.');
    return;
  }

  const rows = await getRowsForStore(store);
  if (!rows.length) {
    alert('Não há dados para gerar PDF.');
    return;
  }

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(`Gestão de Frota - ${screenMeta[store][0]}`, 148, 15, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 148, 22, { align: 'center' });

  const headers = config.columns.map(col => col);
  const body = rows.map(row => config.columns.map(col => safe(row[col])));

  doc.autoTable({
    startY: 28,
    head: [headers],
    body: body,
    theme: 'striped',
    headStyles: { fillColor: [48, 76, 58], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 15 } },
    margin: { left: 10, right: 10 }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${pageCount}`, 148, 205, { align: 'center' });
  }

  doc.save(`gestao-frota-${store}.pdf`);
}

