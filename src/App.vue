<template>
  <div class="brain-sync-app d-flex vh-100">
    
    <aside class="sidebar d-flex flex-column p-3">
      <div class="brand-container mb-4 mt-2 px-2 border-bottom border-secondary pb-3 d-flex justify-content-between align-items-start">
        <div>
          <h4 class="fw-bold m-0 ai-gradient-text">🧠 Brain-Sync</h4>
          <small class="text-muted text-uppercase" style="font-size: 0.7rem; letter-spacing: 1px;">Memória Organizacional</small>
        </div>
      </div>
      
      <div class="px-2 mb-2 text-muted small fw-bold">MEUS PROJETOS</div>
      
      <ul class="nav flex-column gap-2 flex-grow-1 overflow-auto px-1">
        <li class="nav-item" v-for="project in registered_projects" :key="project.id">
          <button 
            class="btn w-100 text-start project-btn rounded-3 d-flex align-items-center" 
            :class="{ 'active-project shadow-sm': project.id === active_project_id }"
            @click="select_project(project.id)"
          >
            <span class="folder-icon me-2">📁</span>
            <span class="text-truncate">{{ project.name }}</span>
          </button>
        </li>

        <li v-if="registered_projects.length === 0" class="px-2 py-3 text-center small text-muted opacity-50">
          Nenhum projeto registrado.
        </li>
      </ul>

      <div class="mt-auto pt-3 px-1">
        <button @click="show_project_modal = true" class="btn add-btn w-100 rounded-3 fw-bold d-flex align-items-center justify-content-center">
          <span class="me-2">+</span> Novo Projeto
        </button>
      </div>
    </aside>

    <main class="main-content flex-grow-1 p-5 overflow-auto">
      <!-- Mensagem de Conectando ao Banco do Projeto -->
      <div v-if="is_connecting_project" class="d-flex h-100 flex-column align-items-center justify-content-center text-center fade-in">
        <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
        <h4 class="fw-bold text-white">Conectando ao banco do projeto...</h4>
        <p class="text-muted">Aguarde enquanto sincronizamos as tabelas.</p>
      </div>

      <div v-else-if="active_project_id" class="fade-in">
        
        <header class="d-flex justify-content-between align-items-center mb-5">
          <div>
            <h2 class="fw-bold text-white mb-1">{{ active_project_name }}</h2>
            <div class="path-badge text-monospace small px-2 py-1 rounded">
              <span class="text-muted">PATH:</span> {{ active_project_path }}
            </div>
            <div v-if="!project_db_connected" class="mt-2 text-danger small d-flex align-items-center">
              <span class="me-1">⚠️</span> Erro de conexão com o MySQL do projeto. Verifique o .env.
            </div>
          </div>
          <button class="btn btn-export-ai px-4 py-2 rounded-3 fw-bold shadow-lg" :disabled="!project_db_connected">
            ✨ Copiar Contexto para IA
          </button>
        </header>

        <div class="status-card rounded-4 p-4 mb-4 d-flex align-items-center" :class="{ 'syncing-active': is_syncing }">
          <div class="pulse-indicator me-3" :class="{ 'pulse-fast': is_syncing }"></div>
          <div>
            <h6 class="mb-0 text-white fw-bold">{{ is_syncing ? 'Sincronizando...' : 'Monitoramento Ativo' }}</h6>
            <small class="text-muted">{{ is_syncing ? 'Processando novo walkthrough detectado...' : 'Aguardando novas tarefas do Antigravity...' }}</small>
            <div v-if="last_log_received" class="mt-2 text-info x-small fade-in">
              <span class="me-1">📄</span> Ultima detecção: {{ last_log_received.split('\\').pop() }}
            </div>
          </div>
        </div>

        <div class="history-section mt-5">
          <h5 class="text-white mb-3 fw-bold">Últimas Tarefas Sincronizadas</h5>
          
          <div class="empty-state text-center p-5 rounded-4 border border-secondary" v-if="project_db_connected">
            <span class="fs-1 opacity-50 mb-3 d-block">📭</span>
            <h6 class="text-white">Nenhum log capturado ainda</h6>
            <p class="text-muted small mb-0">Quando o Antigravity finalizar uma tarefa e você fizer o merge, o histórico aparecerá aqui.</p>
          </div>
          <div v-else class="text-center p-5 opacity-50">
             (Histórico indisponível devido a falha na conexão)
          </div>
        </div>

      </div>
      
      <div v-else class="d-flex h-100 flex-column align-items-center justify-content-center text-muted fade-in">
        <span class="fs-1 mb-3 opacity-25">🧠</span>
        <h4 class="fw-bold">Brain-Sync Ativo</h4>
        <p>Selecione um projeto na lateral ou adicione um novo para começar.</p>
      </div>
    </main>

    <!-- Modal Novo Projeto -->
    <div v-if="show_project_modal" class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3">
      <div class="setup-glass-card p-4 rounded-4 shadow-lg w-100" style="max-width: 500px;">
        <h5 class="fw-bold text-white mb-4">Registrar Novo Projeto</h5>
        
        <div class="mb-3">
          <label class="form-label small text-muted">Nome do Projeto</label>
          <input v-model="new_project.name" type="text" class="form-control bg-dark border-secondary text-white" placeholder="Ex: Meu App Vue">
        </div>

        <div class="mb-3">
          <label class="form-label small text-muted">Caminho Local (Absoluto)</label>
          <div class="input-group">
            <input v-model="new_project.local_path" @input="debounced_probe" type="text" class="form-control bg-dark border-secondary text-white" placeholder="C:\Projetos\meu-app">
            <span v-if="is_probing" class="input-group-text bg-dark border-secondary">
              <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            </span>
          </div>
          <small v-if="env_found" class="text-success x-small mt-1 d-block">✨ Arquivo .env detectado automaticamente!</small>
        </div>

        <div class="project-db-section p-3 rounded-3 mb-4 bg-black-50 border border-secondary shadow-inner">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="small fw-bold text-muted">CONFIGURAÇÃO DE BANCO (MySQL)</span>
            <span v-if="env_found" class="badge bg-success-soft text-success x-small">Auto-preenchido</span>
          </div>
          
          <div class="row g-2">
            <div class="col-8">
              <label class="x-small text-muted">Host</label>
              <input v-model="new_project.db_host" type="text" class="form-control form-control-sm bg-dark border-secondary text-white">
            </div>
            <div class="col-4">
              <label class="x-small text-muted">User</label>
              <input v-model="new_project.db_user" type="text" class="form-control form-control-sm bg-dark border-secondary text-white">
            </div>
          </div>
          <div class="row g-2 mt-1">
            <div class="col-6">
              <label class="x-small text-muted">Senha</label>
              <input v-model="new_project.db_pass" type="password" class="form-control form-control-sm bg-dark border-secondary text-white">
            </div>
            <div class="col-6">
              <label class="x-small text-muted">Database</label>
              <input v-model="new_project.db_name" type="text" class="form-control form-control-sm bg-dark border-secondary text-white">
            </div>
          </div>
        </div>

        <div class="d-flex gap-2">
          <button @click="show_project_modal = false" class="btn btn-outline-secondary flex-grow-1">Voltar</button>
          <button @click="save_project" class="btn btn-export-ai flex-grow-2 px-4 shadow-sm" :disabled="is_saving">
            {{ is_saving ? 'Salvando...' : 'Criar Workspace' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import 'bootstrap/dist/css/bootstrap.min.css';

// Estado Reativo
const registered_projects = ref<any[]>([]);
const active_project_id = ref<number | null>(null);
const is_syncing = ref(false);
const last_log_received = ref<string | null>(null);

// Database UX (Per Project)
const project_db_connected = ref(false);
const is_connecting_project = ref(false);

// Project UX
const show_project_modal = ref(false);
const is_probing = ref(false);
const is_saving = ref(false);
const env_found = ref(false);
const new_project = reactive({
  name: '',
  local_path: '',
  db_host: 'localhost',
  db_user: 'root',
  db_pass: '',
  db_name: 'brain_sync'
});

const active_project_name = computed(() => {
  const project = registered_projects.value.find(p => p.id === active_project_id.value);
  return project ? project.name : 'Selecione um Projeto';
});

const active_project_path = computed(() => {
  const project = registered_projects.value.find(p => p.id === active_project_id.value);
  return project ? project.local_path : '';
});

/**
 * Tenta descobrir credenciais no caminho fornecido (com debounce).
 */
let probe_timeout: any = null;
const debounced_probe = () => {
  if (probe_timeout) clearTimeout(probe_timeout);
  probe_timeout = setTimeout(async () => {
    if (!new_project.local_path || new_project.local_path.length < 5) return;
    
    is_probing.value = true;
    env_found.value = false;
    
    try {
      // @ts-ignore
      const response = await window.ipcRenderer.invoke('project_probe_env_request', new_project.local_path);
      if (response.success && response.credentials) {
        env_found.value = true;
        new_project.db_host = response.credentials.host || 'localhost';
        new_project.db_user = response.credentials.user || 'root';
        new_project.db_pass = response.credentials.password || '';
        new_project.db_name = response.credentials.database || 'brain_sync';
      }
    } catch (err) {
      console.warn('Falha no probe de env:', err);
    } finally {
      is_probing.value = false;
    }
  }, 800);
};

/**
 * Carrega a lista de projetos salvos localmente (JSON).
 */
const load_projects = async () => {
  try {
    // @ts-ignore
    const response = await window.ipcRenderer.invoke('project_list_request');
    if (response.success) {
      registered_projects.value = response.projects;
    }
  } catch (err) {
    console.error('Erro ao carregar projetos do storage local:', err);
  }
};

/**
 * Seleciona um projeto e estabelece a conexão com o banco MySQL dele.
 */
const select_project = async (selected_id: number) => {
  active_project_id.value = selected_id;
  const project = registered_projects.value.find(p => p.id === selected_id);
  
  if (!project) return;

  is_connecting_project.value = true;
  project_db_connected.value = false;

  try {
    const config = {
      host: project.db_host,
      user: project.db_user,
      password: project.db_pass,
      database: project.db_name
    };

    // @ts-ignore
    const response = await window.ipcRenderer.invoke('database_connect_request', config);
    if (response.success) {
      project_db_connected.value = true;
    } else {
      console.error('Falha ao conectar ao banco do projeto:', response.error);
    }
  } catch (err) {
    console.error('Erro fatal ao conectar projeto:', err);
  } finally {
    is_connecting_project.value = false;
  }
};

/**
 * Salva um novo projeto no storage local.
 */
const save_project = async () => {
  if (!new_project.name || !new_project.local_path) return;
  
  is_saving.value = true;
  try {
    // @ts-ignore
    const response = await window.ipcRenderer.invoke('project_save_request', { ...new_project });
    if (response.success) {
      show_project_modal.value = false;
      const saved_id = response.id;
      reset_new_project();
      await load_projects();
      // Auto-seleciona o projeto recém criado
      select_project(saved_id);
    } else {
      alert(`Erro ao salvar projeto localmente: ${response.error}`);
    }
  } catch (err) {
    console.error('Erro ao salvar projeto:', err);
  } finally {
    is_saving.value = false;
  }
};

const reset_new_project = () => {
  new_project.name = '';
  new_project.local_path = '';
  new_project.db_host = 'localhost';
  new_project.db_user = 'root';
  new_project.db_pass = '';
  new_project.db_name = 'brain_sync';
  env_found.value = false;
};

onMounted(() => {
  load_projects();

  // Listener para logs reais do Antigravity
  // @ts-ignore
  window.ipcRenderer.on('worklog_updated_event', (_event: any, data: any) => {
    console.log('[Vue] Novo log recebido:', data);
    is_syncing.value = true;
    last_log_received.value = data.file_path;
    
    setTimeout(() => {
      is_syncing.value = false;
    }, 2000);
  });
});
</script>

<style scoped>
/* Estética Premium Brain-Sync */
.brain-sync-app {
  background-color: #0d0f14;
  color: #a1a1aa;
  font-family: 'Inter', -apple-system, sans-serif;
  position: relative;
}

/* Sidebar */
.sidebar {
  background-color: #12141c;
  border-right: 1px solid #1e212b;
  width: 280px;
}

.ai-gradient-text {
  background: linear-gradient(90deg, #9333ea, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.project-btn {
  color: #94a3b8;
  background: transparent;
  border: 1px solid transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;
}

.project-btn:hover {
  background-color: #1a1e29;
  color: #f8fafc;
}

.active-project {
  background-color: #1e293b;
  color: #60a5fa !important;
  border: 1px solid #334155;
}

.project-db-section {
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.bg-black-50 {
  background-color: rgba(0, 0, 0, 0.5);
}

.bg-success-soft {
  background-color: rgba(16, 185, 129, 0.1);
}

.shadow-inner {
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
}

.form-control-sm {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
}

.add-btn {
  background-color: transparent;
  color: #a855f7;
  border: 1px dashed #334155;
  padding: 0.75rem;
}

.add-btn:hover {
  background-color: rgba(168, 85, 247, 0.05);
  border-color: #a855f7;
  color: #c084fc;
}

.modal-backdrop-custom {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
}

.setup-glass-card {
  background: rgba(22, 24, 33, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.form-control:focus {
  background-color: #0d0f14;
  border-color: #9333ea;
  box-shadow: 0 0 0 2px rgba(147, 51, 234, 0.2);
  color: white;
}

/* Dashboard */
.btn-export-ai {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  color: white;
  border: none;
  transition: all 0.3s;
}

.btn-export-ai:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -5px rgba(124, 58, 237, 0.4);
  color: white;
}

.path-badge {
  background-color: #1a1d27;
  border: 1px solid #2d3343;
  color: #94a3b8;
}

.status-card {
  background-color: #161922;
  border: 1px solid #252a37;
}

.pulse-indicator {
  width: 10px;
  height: 10px;
  background-color: #10b981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.syncing-active {
  border-color: #9333ea !important;
  background-color: rgba(147, 51, 234, 0.05) !important;
}

.pulse-fast {
  background-color: #a855f7 !important;
  animation: pulse-sync 0.6s infinite !important;
}

@keyframes pulse-sync {
  0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
  100% { transform: scale(1.2); box-shadow: 0 0 0 12px rgba(168, 85, 247, 0); }
}

.fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>