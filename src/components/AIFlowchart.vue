<template>
  <div class="ai-flowchart-container mb-5 p-4 rounded-4 shadow-lg border border-secondary bg-dark-subtle position-relative overflow-hidden">
    <div class="session-header mb-4 d-flex justify-content-between align-items-center">
      <div>
        <h5 class="fw-bold ai-gradient-text mb-1 d-flex align-items-center">
          <span class="fs-4 me-2">🧠</span> Sessão de Raciocínio da IA
        </h5>
        <small class="text-muted text-monospace">ID: {{ session.session_id }}</small>
      </div>
      <span class="badge bg-primary rounded-pill px-3 py-2 fw-normal opacity-75">Completado</span>
    </div>

    <!-- Fluxograma -->
    <div class="d-flex align-items-stretch justify-content-between gap-3 flow-row flex-column flex-lg-row">
      <!-- Pedido -->
      <div class="flow-card flex-grow-1 p-3 rounded-3 shadow border border-secondary position-relative">
        <h6 class="fw-bold text-white mb-2 pb-2 border-bottom border-light-subtle"><span class="me-2 text-warning">📝</span> 1. O Pedido</h6>
        <div class="content-preview small text-muted overflow-auto pe-2" style="max-height: 150px;">
          {{ truncate(session.task_content) || 'Conteúdo original não disponível.' }}
        </div>
      </div>
      
      <div class="flow-arrow d-none d-lg-flex align-items-center justify-content-center text-muted fs-4">➔</div>
      <div class="flow-arrow d-lg-none d-flex align-items-center justify-content-center text-muted fs-4 my-2">⬇</div>

      <!-- Plano -->
      <div class="flow-card flex-grow-1 p-3 rounded-3 shadow border border-primary position-relative">
        <h6 class="fw-bold text-white mb-2 pb-2 border-bottom border-light-subtle"><span class="me-2 text-primary">🗺️</span> 2. O Plano</h6>
        <div class="content-preview small text-muted overflow-auto pe-2" style="max-height: 150px;">
          {{ truncate(session.plan_content) || 'Conteúdo do plano não disponível.' }}
        </div>
      </div>

      <div class="flow-arrow d-none d-lg-flex align-items-center justify-content-center text-muted fs-4">➔</div>
      <div class="flow-arrow d-lg-none d-flex align-items-center justify-content-center text-muted fs-4 my-2">⬇</div>

      <!-- Execução -->
      <div class="flow-card flex-grow-1 p-3 rounded-3 shadow border border-success position-relative">
        <h6 class="fw-bold text-white mb-2 pb-2 border-bottom border-light-subtle"><span class="me-2 text-success">⚡</span> 3. Execução (Walkthrough)</h6>
        <div class="content-preview small text-muted overflow-auto pe-2" style="max-height: 150px;">
          {{ truncate(session.walkthrough_content) || 'Relatório de execução não disponível.' }}
        </div>
      </div>
    </div>

    <!-- Arquivos Flutuantes -->
    <div class="floating-files-container mt-4 pt-3 border-top border-secondary position-relative" v-if="session.modified_files && session.modified_files.length > 0">
      <h6 class="fw-bold text-muted small mb-3 text-uppercase letter-spacing-1">ARQUIVOS MODIFICADOS NA SESSÃO</h6>
      <div class="d-flex flex-wrap gap-2 position-relative pt-2">
        <div 
          v-for="(file, index) in session.modified_files" 
          :key="file" 
          class="file-badge px-3 py-2 rounded-pill border shadow d-flex align-items-center"
          :style="{ animationDelay: `${(index % 5) * 0.15}s` }"
        >
          <span class="file-icon me-2">📄</span>
          <span class="file-name x-small text-truncate" :title="file" style="max-width: 250px;">{{ get_filename(file) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  session: {
    session_id: string;
    task_content: string | null;
    plan_content: string | null;
    walkthrough_content: string | null;
    modified_files: string[];
  }
}>();

const get_filename = (filepath: string) => {
  if (!filepath) return 'Desconhecido';
  return filepath.split(/\\|\//).pop() || filepath;
};

const truncate = (text: string | null, length: number = 300) => {
  if (!text) return null;
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};
</script>

<style scoped>
.ai-flowchart-container {
  background-color: #161822; /* Fundo suave dark */
}

.ai-gradient-text {
  background: linear-gradient(90deg, #a855f7, #3b82f6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.flow-card {
  background-color: rgba(0, 0, 0, 0.2);
  min-height: 200px;
}

.content-preview {
  white-space: pre-wrap;
  word-break: break-word;
}

/* Scrollbar estilizada */
.content-preview::-webkit-scrollbar {
  width: 4px;
}
.content-preview::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}
.content-preview::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

/* Efeito Floating para os arquivos */
.floating-files-container {
  min-height: 80px;
}

.file-badge {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8));
  border-color: #3b82f6 !important;
  color: #93c5fd;
  animation: float 3.5s ease-in-out infinite;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.file-badge:hover {
  animation-play-state: paused;
  transform: translateY(-2px);
  filter: brightness(1.2);
  border-color: #a855f7 !important;
  color: #d8b4fe;
}

@keyframes float {
  0% { transform: translateY(0px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2); }
  50% { transform: translateY(-7px); box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2); }
  100% { transform: translateY(0px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2); }
}

.letter-spacing-1 {
  letter-spacing: 1px;
}
</style>
