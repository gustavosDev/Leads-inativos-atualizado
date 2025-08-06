let token = null;
let leadsFiltrados = [];

const verificarBtn = document.getElementById('ilw-verificar-btn');
const criarTarefaBtn = document.getElementById('ilw-criar-tarefa-btn');
const resultadoDiv = document.getElementById('ilw-resultado');
const loader = document.getElementById('ilw-loader');

// função pra obter o token do kommo
async function obterToken() {
  token = await AMOCRM.getToken();
  if (!token) throw new Error('Token não obtido');
}

// função pra buscar os leads incluindo as suas tarefas
async function getLeads() {
  const response = await fetch('/api/v4/leads?with=tasks', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Erro ao buscar leads');
  const data = await response.json();
  return data._embedded.leads;
}

// função pra filtrar leads inativos
function filtrarLeads(leads) {
  const cincoDiasAtras = Math.floor(Date.now() / 1000) - 5 * 24 * 60 * 60;
  return leads.filter(lead => {
    const semTarefa = !lead._embedded?.tasks || lead._embedded.tasks.length === 0;
    const dataUltimoContato = lead.last_contacted_at || lead.updated_at || 0;
    return semTarefa && dataUltimoContato < cincoDiasAtras;
  });
}

// Função para exibir o resultado
function exibirResultado(leads) {
  resultadoDiv.innerHTML = '';
  if (leads.length === 0) {
    resultadoDiv.innerHTML = `<p>✅ Nenhum lead encontrado com mais de 5 dias sem contato e sem tarefas.</p>`;
    criarTarefaBtn.classList.add('ilw-hidden');
  } else {
    resultadoDiv.innerHTML = leads.map(lead => `
      <div class="ilw-lead-card">
        <strong>${lead.name || 'Sem nome'}</strong><br>
        ID: ${lead.id}<br>
        <a href="https://example.kommo.com/leads/detail/${lead.id}" target="_blank">Ver Lead</a>
      </div>
    `).join('');
    criarTarefaBtn.classList.remove('ilw-hidden');
  }
}

// função pra criar as tarefas
async function criarTarefas(leads) {
  if (leads.length === 0) throw new Error('Sem leads para agendar tarefas');

  const tarefas = leads.map(lead => ({
    text: 'Entrar em contato com o lead (5 dias sem contato)',
    complete_till: Math.floor(Date.now() / 1000) + 86400,
    entity_id: lead.id,
    entity_type: 'leads'
  }));

  const response = await fetch('/api/v4/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(tarefas)
  });

  if (!response.ok) throw new Error('Erro ao criar tarefas');
  resultadoDiv.innerHTML += `<p style="color: green;">✅ ${tarefas.length} tarefas criadas com sucesso!</p>`;
  criarTarefaBtn.classList.add('ilw-hidden');
}

// Evento pra verificar leads
verificarBtn.addEventListener('click', async () => {
  loader.classList.remove('ilw-hidden');
  criarTarefaBtn.classList.add('ilw-hidden');

  try {
    await obterToken();
    const leads = await getLeads();
    leadsFiltrados = filtrarLeads(leads);
    exibirResultado(leadsFiltrados);
  } catch (err) {
    resultadoDiv.innerHTML = `<p style="color: red;">Erro: ${err.message}</p>`;
  } finally {
    loader.classList.add('ilw-hidden');
  }
});

// Evento para criar tarefas
criarTarefaBtn.addEventListener('click', async () => {
  loader.classList.remove('ilw-hidden');
  try {
    await criarTarefas(leadsFiltrados);
  } catch (err) {
    resultadoDiv.innerHTML += `<p style="color: red;">Erro: ${err.message}</p>`;
  } finally {
    loader.classList.add('ilw-hidden');
  }
});
