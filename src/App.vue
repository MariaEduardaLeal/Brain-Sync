<template>
  <div class="brain-sync-app d-flex vh-100">
    <aside class="sidebar d-flex flex-column p-3">
      <div class="brand-panel rounded-4 p-3 mb-4">
        <div class="d-flex align-items-center gap-3">
          <div class="brain-badge">🧠</div>
          <div>
            <div class="brand-kicker">Brain-Sync</div>
            <h1 class="brand-title m-0">Brain-Sync</h1>
          </div>
        </div>
      </div>

      <div class="section-label px-2 mb-2">Meus projetos</div>

      <ul class="nav flex-column gap-2 flex-grow-1 overflow-auto px-1">
        <li class="nav-item" v-for="project in registered_projects" :key="project.id">
          <button
            class="project-btn w-100 rounded-4 d-flex justify-content-between align-items-center"
            :class="{ 'active-project': project.id === active_project_id }"
            @click="select_project(project.id)"
          >
            <div class="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
              <span class="project-dot">◉</span>
              <span class="text-truncate">{{ project.name }}</span>
            </div>
            <span class="delete-icon" title="Remover projeto" @click.stop="delete_project(project.id)">×</span>
          </button>
        </li>

        <li v-if="registered_projects.length === 0" class="empty-sidebar rounded-4 p-3 text-center">
          Nenhum projeto registrado.
        </li>
      </ul>

      <button @click="show_project_modal = true" class="primary-btn w-100 rounded-4 fw-bold mt-3">
        + Novo Projeto
      </button>
    </aside>

    <main class="main-content flex-grow-1 p-4 p-xl-5 overflow-auto">
      <div v-if="is_loading_project" class="center-state fade-in">
        <div class="spinner-border text-info mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
        <h4 class="text-white fw-bold">Preparando projeto...</h4>
      </div>

      <div v-else-if="active_project_id" class="fade-in">
        <section class="hero-card rounded-4 p-4 p-xl-5 mb-4">
          <div class="d-flex flex-column flex-xl-row justify-content-between gap-4 align-items-start">
            <div>
              <div class="hero-kicker">Workspace</div>
              <h2 class="hero-title mt-2 mb-2">{{ active_project_name }}</h2>
              <div class="hero-path">{{ active_project_path }}</div>
              <div v-if="active_project_vault_path" class="hero-vault mt-3">
                Vault: {{ active_project_vault_path }}
              </div>
            </div>

            <div class="hero-actions">
              <button
                class="primary-btn rounded-4 fw-bold w-100"
                :disabled="is_scanning"
                @click="scan_ai_history"
              >
                {{ is_scanning ? 'Escaneando historico...' : 'Escanear Historico Completo' }}
              </button>

              <div class="monitor-card rounded-4 p-3 mt-3" :class="{ 'monitor-card-live': is_syncing }">
                <div class="monitor-title">{{ is_syncing ? 'Novo artefato detectado' : 'Monitoramento ativo' }}</div>
                <div v-if="last_log_received" class="monitor-path mt-2">{{ last_log_received.split('\\').pop() }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="manager-grid mb-4">
          <div class="manager-card rounded-4 p-4">
            <div class="card-kicker">Vault</div>
            <h4 class="manager-title">Cache local do projeto</h4>
            <p class="text-soft mb-2">Ao abrir o projeto, o app tenta carregar primeiro o último scan salvo no vault.</p>
            <div class="small text-info">{{ ai_sessions.length }} sessoes carregadas</div>
          </div>

          <div class="manager-card rounded-4 p-4" v-if="storage_summary">
            <div class="card-kicker">Antigravity</div>
            <h4 class="manager-title">Armazenamento</h4>
            <div class="storage-bucket-list mt-3">
              <div v-for="bucket in storage_summary.buckets" :key="bucket.key" class="storage-bucket">
                <div class="fw-semibold text-white">{{ bucket.label }}</div>
                <div class="text-soft small">{{ format_bytes(bucket.total_bytes) }} · {{ bucket.file_count }} arquivos</div>
              </div>
            </div>
          </div>
        </section>

        <section class="storage-card rounded-4 p-4 mb-4" v-if="storage_summary">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
            <div>
              <div class="card-kicker">Gerenciador do Antigravity</div>
              <h4 class="manager-title">Browser recordings</h4>
              <p class="text-soft mb-0">
                Você pode apagar gravações de testes aqui. Isso remove os arquivos do Antigravity e não será possível recuperar depois.
              </p>
            </div>
          </div>

          <div v-if="storage_summary.recording_sessions?.length" class="recording-list">
            <div v-for="recording in storage_summary.recording_sessions" :key="recording.session_id" class="recording-card rounded-4 p-3">
              <div class="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <div class="text-white fw-semibold">{{ recording.session_id }}</div>
                  <div class="text-soft small mt-1">{{ format_bytes(recording.total_bytes) }} · {{ recording.file_count }} arquivos</div>
                </div>
                <button class="danger-btn rounded-4" @click="delete_recording_session(recording.session_id)">
                  Excluir
                </button>
              </div>
            </div>
          </div>

          <div v-else class="text-soft">Nenhuma pasta de browser recording encontrada.</div>
        </section>

        <div v-if="ai_sessions.length > 0">
          <div class="timeline-title mb-3">Linha do tempo de raciocinio</div>
          <AIFlowchart
            v-for="session in ai_sessions"
            :key="session.session_id"
            :session="session"
            @open-graph="open_graph"
          />
        </div>

        <div v-else class="empty-main rounded-4 p-5 text-center">
          <div class="empty-main-brain mb-3">🧠</div>
          <h5 class="text-white fw-bold">Nenhuma sessao associada ainda</h5>
          <p class="text-soft mb-0">Rode o scan para arquivar e reconstruir o contexto do projeto.</p>
        </div>
      </div>

      <div v-else class="center-state fade-in">
        <div class="empty-main-brain mb-3">🧠</div>
        <h4 class="text-white fw-bold">Brain-Sync ativo</h4>
        <p class="text-soft mb-0">Selecione um projeto na lateral ou adicione um novo para comecar.</p>
      </div>
    </main>

    <div v-if="show_project_modal" class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3">
      <div class="setup-card rounded-4 p-4 w-100">
        <div class="hero-kicker mb-2">Novo workspace</div>
        <h5 class="text-white fw-bold mb-4">Registrar projeto</h5>

        <div class="mb-3">
          <label class="form-label text-soft small">Nome do projeto</label>
          <input v-model="new_project.name" type="text" class="form-control glass-input" placeholder="Ex: Meu App Vue">
        </div>

        <div class="mb-4">
          <label class="form-label text-soft small">Caminho local absoluto</label>
          <div class="input-group">
            <input v-model="new_project.local_path" type="text" class="form-control glass-input" placeholder="C:\Projetos\meu-app">
            <button class="btn secondary-btn" @click="pick_folder" title="Selecionar pasta">Pasta</button>
          </div>
        </div>

        <div class="d-flex gap-2">
          <button @click="show_project_modal = false" class="btn btn-outline-light flex-grow-1">Voltar</button>
          <button @click="save_project" class="primary-btn flex-grow-1" :disabled="is_saving">
            {{ is_saving ? 'Salvando...' : 'Criar workspace' }}
          </button>
        </div>
      </div>
    </div>

    <SessionGraphModal
      v-if="graph_session"
      :session="graph_session"
      @close="graph_session = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AIFlowchart from './components/AIFlowchart.vue'
import SessionGraphModal from './components/SessionGraphModal.vue'
import 'bootstrap/dist/css/bootstrap.min.css'

const registered_projects = ref<any[]>([])
const active_project_id = ref<number | null>(null)
const is_syncing = ref(false)
const last_log_received = ref<string | null>(null)
const show_project_modal = ref(false)
const is_saving = ref(false)
const is_loading_project = ref(false)
const ai_sessions = ref<any[]>([])
const is_scanning = ref(false)
const storage_summary = ref<any | null>(null)
const graph_session = ref<any | null>(null)

const new_project = reactive({
  name: '',
  local_path: '',
  no_database: true
})

const active_project = computed(() => registered_projects.value.find(p => p.id === active_project_id.value) || null)
const active_project_name = computed(() => active_project.value ? active_project.value.name : 'Selecione um projeto')
const active_project_path = computed(() => active_project.value ? active_project.value.local_path : '')
const active_project_vault_path = computed(() => active_project.value ? active_project.value.vault_path : '')

const pick_folder = async () => {
  // @ts-ignore
  const selected_path = await window.ipcRenderer.invoke('project_select_folder_request')
  if (selected_path) {
    new_project.local_path = selected_path
  }
}

const load_projects = async () => {
  try {
    // @ts-ignore
    const response = await window.ipcRenderer.invoke('project_list_request')
    if (response.success) {
      registered_projects.value = response.projects
    }
  } catch (err) {
    console.error('Erro ao carregar projetos:', err)
  }
}

const load_storage_summary = async () => {
  try {
    // @ts-ignore
    const response = await window.ipcRenderer.invoke('antigravity_storage_request')
    if (response.success) {
      storage_summary.value = response.data
    }
  } catch (err) {
    console.error('Erro ao carregar armazenamento do Antigravity:', err)
  }
}

const select_project = async (selected_id: number) => {
  active_project_id.value = selected_id
  ai_sessions.value = []
  is_loading_project.value = true

  try {
    // @ts-ignore
    const cached_response = await window.ipcRenderer.invoke('project_cached_scan_request', selected_id)
    if (cached_response.success) {
      ai_sessions.value = cached_response.data || []
    }
  } catch (err) {
    console.error('Erro ao carregar cache do projeto:', err)
  } finally {
    is_loading_project.value = false
  }
}

const save_project = async () => {
  if (!new_project.name || !new_project.local_path) return

  is_saving.value = true
  try {
    // @ts-ignore
    const response = await window.ipcRenderer.invoke('project_save_request', { ...new_project })
    if (response.success) {
      show_project_modal.value = false
      const saved_id = response.id
      reset_new_project()
      await load_projects()
      await select_project(saved_id)
    } else {
      alert(`Erro ao salvar projeto: ${response.error}`)
    }
  } catch (err) {
    console.error('Erro ao salvar projeto:', err)
  } finally {
    is_saving.value = false
  }
}

const scan_ai_history = async () => {
  if (!active_project_id.value) return

  is_scanning.value = true
  try {
    // @ts-ignore
    const response = await window.ipcRenderer.invoke('historical_scan_request', active_project_id.value)
    if (response.success) {
      ai_sessions.value = response.data
      await load_projects()
      await load_storage_summary()
      if (response.data.length === 0) {
        alert('Nenhum artefato do Antigravity foi associado a este projeto.')
      }
    } else {
      alert(`Falha ao escanear: ${response.error}`)
    }
  } catch (err) {
    console.error('Erro ao acionar varredura:', err)
  } finally {
    is_scanning.value = false
  }
}

const delete_project = async (id: number) => {
  if (!confirm('Deseja remover este projeto do Brain-Sync?')) return

  try {
    // @ts-ignore
    const response = await window.ipcRenderer.invoke('project_delete_request', id)
    if (response.success) {
      if (active_project_id.value === id) {
        active_project_id.value = null
        ai_sessions.value = []
      }
      await load_projects()
    } else {
      alert(`Erro ao excluir: ${response.error}`)
    }
  } catch (err) {
    console.error('Erro ao excluir projeto:', err)
  }
}

const delete_recording_session = async (session_id: string) => {
  const confirmed = confirm(`Excluir a pasta de browser recording da sessao ${session_id}? Essa acao nao pode ser desfeita.`)
  if (!confirmed) return

  try {
    // @ts-ignore
    const response = await window.ipcRenderer.invoke('antigravity_delete_recording_request', session_id)
    if (!response.success) {
      alert(`Falha ao excluir: ${response.error}`)
      return
    }
    await load_storage_summary()
  } catch (err) {
    console.error('Erro ao excluir browser recording:', err)
  }
}

const open_graph = (session: any) => {
  graph_session.value = session
}

const reset_new_project = () => {
  new_project.name = ''
  new_project.local_path = ''
  new_project.no_database = true
}

const format_bytes = (value: number) => {
  if (!value) return '0 B'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

onMounted(() => {
  load_projects()
  load_storage_summary()

  // @ts-ignore
  window.ipcRenderer.on('worklog_updated_event', (_event: any, data: any) => {
    is_syncing.value = true
    last_log_received.value = data.file_path

    setTimeout(() => {
      is_syncing.value = false
    }, 2000)
  })
})
</script>

<style scoped>
:root {
  color-scheme: dark;
}

.brain-sync-app {
  background:
    radial-gradient(circle at top left, rgba(76, 29, 149, 0.24), transparent 22%),
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.16), transparent 22%),
    linear-gradient(180deg, #060814 0%, #090c18 48%, #05070f 100%);
  color: #e6eeff;
  font-family: 'Segoe UI', sans-serif;
}

.sidebar {
  width: 290px;
  border-right: 1px solid rgba(96, 165, 250, 0.12);
  background: rgba(5, 9, 20, 0.72);
  backdrop-filter: blur(18px);
}

.brand-panel,
.hero-card,
.monitor-card,
.setup-card,
.empty-main,
.empty-sidebar,
.manager-card,
.storage-card {
  background: linear-gradient(180deg, rgba(11, 16, 31, 0.94), rgba(8, 12, 24, 0.92));
  border: 1px solid rgba(125, 211, 252, 0.12);
  box-shadow: 0 24px 60px rgba(2, 6, 23, 0.34);
}

.brand-kicker,
.section-label,
.hero-kicker,
.card-kicker {
  color: #8bd4ff;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.brain-badge {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.32), rgba(14, 165, 233, 0.3));
  font-size: 1.8rem;
}

.brand-title,
.hero-title,
.monitor-title,
.primary-btn,
.secondary-btn,
.manager-title {
  color: #f8fbff;
}

.hero-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
}

.hero-path,
.hero-vault,
.text-soft,
.monitor-path {
  color: #9fb0d0;
}

.project-btn {
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(8, 13, 28, 0.68);
  color: #e2e8ff;
  padding: 0.9rem 1rem;
}

.active-project {
  border-color: rgba(139, 92, 246, 0.44);
  background: linear-gradient(135deg, rgba(76, 29, 149, 0.35), rgba(8, 47, 73, 0.38));
}

.project-dot {
  color: #8bd4ff;
  font-size: 0.78rem;
}

.delete-icon {
  color: #7f8cab;
  font-size: 1.2rem;
}

.primary-btn,
.secondary-btn,
.danger-btn {
  border: none;
  padding: 0.95rem 1.1rem;
  color: #f8fbff;
}

.primary-btn,
.secondary-btn {
  background: linear-gradient(135deg, #6d28d9, #2563eb);
  box-shadow: 0 18px 40px rgba(37, 99, 235, 0.18);
}

.danger-btn {
  background: linear-gradient(135deg, #991b1b, #dc2626);
}

.center-state {
  min-height: calc(100vh - 6rem);
  display: grid;
  place-items: center;
  text-align: center;
}

.hero-actions {
  width: min(100%, 340px);
}

.monitor-card-live {
  border-color: rgba(139, 92, 246, 0.36);
}

.timeline-title {
  color: #f8fbff;
  font-size: 1.1rem;
  font-weight: 800;
}

.manager-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.storage-bucket-list,
.recording-list {
  display: grid;
  gap: 0.8rem;
}

.storage-bucket,
.recording-card {
  border-radius: 18px;
  background: rgba(12, 19, 35, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.1);
  padding: 0.85rem 1rem;
}

.empty-main-brain {
  font-size: 3rem;
}

.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.76);
  backdrop-filter: blur(8px);
  z-index: 1000;
}

.setup-card {
  max-width: 560px;
}

.glass-input {
  background: rgba(8, 13, 28, 0.82);
  border: 1px solid rgba(125, 211, 252, 0.18);
  color: #f8fbff;
}

.glass-input:focus {
  background: rgba(8, 13, 28, 0.92);
  color: #ffffff;
  border-color: rgba(139, 92, 246, 0.45);
  box-shadow: 0 0 0 0.2rem rgba(109, 40, 217, 0.18);
}

.fade-in {
  animation: fadeIn 0.35s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 1199px) {
  .manager-grid {
    grid-template-columns: 1fr;
  }
}
</style>
