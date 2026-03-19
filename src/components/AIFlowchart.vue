<template>
  <div class="ai-flowchart-container mb-5 p-4 rounded-4 shadow-2xl border border-secondary bg-black-70 position-relative overflow-hidden">
    <div class="glow-orb glow-purple"></div>
    <div class="glow-orb glow-blue"></div>

    <div class="session-header mb-4 d-flex justify-content-between align-items-center position-relative z-1">
      <div>
        <h5 class="fw-bold ai-gradient-text mb-1 d-flex align-items-center">
          <span class="fs-4 me-2">Brain</span> Sessao de Raciocinio da IA
        </h5>
        <small class="text-muted text-monospace d-block">ID: {{ session.session_id }}</small>
        <div v-if="session.match_reason" class="mt-2">
          <span class="badge bg-dark border border-secondary text-secondary x-small py-1 px-2 fw-normal opacity-75">
            Vinculo: {{ session.match_reason }}
          </span>
        </div>
        <div v-if="has_session_metrics" class="d-flex flex-wrap gap-2 mt-2">
          <span v-if="session.media_files?.length" class="badge bg-dark border border-info-subtle text-info x-small py-1 px-2 fw-normal">
            Midia: {{ session.media_files.length }}
          </span>
          <span v-if="session.browser_recording_count" class="badge bg-dark border border-primary-subtle text-primary x-small py-1 px-2 fw-normal">
            Frames browser: {{ session.browser_recording_count }}
          </span>
          <span v-if="session.session_files?.length" class="badge bg-dark border border-secondary text-secondary x-small py-1 px-2 fw-normal">
            Arquivos da sessao: {{ session.session_files.length }}
          </span>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span class="badge status-badge rounded-pill px-3 py-2 fw-bold">FINALIZADO</span>
      </div>
    </div>

    <div class="d-flex align-items-stretch justify-content-between gap-3 flow-row flex-column flex-lg-row position-relative z-1">
      <div class="flow-card card-pedido flex-grow-1 p-3 rounded-4 shadow-lg border border-warning-subtle position-relative overflow-hidden">
        <h6 class="fw-bold text-warning mb-3 pb-2 border-bottom border-warning-subtle d-flex align-items-center">
          <span class="card-icon me-2">1.</span> O Pedido
        </h6>
        <div class="markdown-body small overflow-auto pe-2" v-html="render_markdown(session.task_content)"></div>
      </div>

      <div class="flow-arrow d-none d-lg-flex align-items-center justify-content-center text-secondary fs-4">
        <span class="arrow-icon">-></span>
      </div>
      <div class="flow-arrow d-lg-none d-flex align-items-center justify-content-center text-secondary fs-4 my-2">
        <span class="arrow-icon">v</span>
      </div>

      <div class="flow-card card-plano flex-grow-1 p-3 rounded-4 shadow-lg border border-primary-subtle position-relative overflow-hidden">
        <h6 class="fw-bold text-info mb-3 pb-2 border-bottom border-primary-subtle d-flex align-items-center">
          <span class="card-icon me-2">2.</span> O Plano
        </h6>
        <div class="markdown-body small overflow-auto pe-2" v-html="render_markdown(session.plan_content)"></div>
      </div>

      <div class="flow-arrow d-none d-lg-flex align-items-center justify-content-center text-secondary fs-4">
        <span class="arrow-icon">-></span>
      </div>
      <div class="flow-arrow d-lg-none d-flex align-items-center justify-content-center text-secondary fs-4 my-2">
        <span class="arrow-icon">v</span>
      </div>

      <div class="flow-card card-execucao flex-grow-1 p-3 rounded-4 shadow-lg border border-success-subtle position-relative overflow-hidden">
        <h6 class="fw-bold text-success mb-3 pb-2 border-bottom border-success-subtle d-flex align-items-center">
          <span class="card-icon me-2">3.</span> Execucao
        </h6>
        <div class="markdown-body small overflow-auto pe-2" v-html="render_markdown(session.walkthrough_content)"></div>
      </div>
    </div>

    <div class="floating-files-container mt-4 pt-3 border-top border-secondary position-relative" v-if="session.modified_files && session.modified_files.length > 0">
      <h6 class="fw-bold text-muted small mb-3 text-uppercase letter-spacing-2">ARQUIVOS MODIFICADOS</h6>
      <div class="d-flex flex-wrap gap-2 position-relative pt-2">
        <div
          v-for="(file, index) in session.modified_files"
          :key="file"
          class="file-badge px-3 py-2 rounded-pill border shadow-lg d-flex align-items-center"
          :style="{ animationDelay: `${(index % 8) * 0.2}s` }"
        >
          <span class="file-icon me-2">FILE</span>
          <span class="file-name x-small text-truncate" :title="file" style="max-width: 250px;">{{ get_filename(file) }}</span>
        </div>
      </div>
    </div>

    <div class="floating-files-container mt-4 pt-3 border-top border-secondary position-relative" v-if="session.media_files && session.media_files.length > 0">
      <h6 class="fw-bold text-muted small mb-3 text-uppercase letter-spacing-2">ARTEFATOS DE MIDIA</h6>
      <div class="d-flex flex-wrap gap-2 position-relative pt-2">
        <div
          v-for="file in session.media_files"
          :key="file"
          class="file-badge px-3 py-2 rounded-pill border shadow-lg d-flex align-items-center"
        >
          <span class="file-icon me-2">IMG</span>
          <span class="file-name x-small text-truncate" :title="file" style="max-width: 250px;">{{ get_filename(file) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import filterXSS from 'xss';

const props = defineProps<{
  session: {
    session_id: string;
    task_content: string | null;
    plan_content: string | null;
    walkthrough_content: string | null;
    modified_files: string[];
    match_reason?: string;
    media_files?: string[];
    session_files?: string[];
    browser_recording_count?: number;
  }
}>();

const has_session_metrics = computed(() => {
  return Boolean(
    props.session.media_files?.length ||
    props.session.session_files?.length ||
    props.session.browser_recording_count
  );
});

const render_markdown = (content: string | null) => {
  if (!content) return '<p class="text-muted italic opacity-50">Conteudo nao disponivel.</p>';
  try {
    const raw = marked(content);
    return filterXSS(raw as string);
  } catch (err) {
    console.error('Erro ao renderizar markdown:', err);
    return `<p class="text-danger">Erro no render: ${String(err)}</p>`;
  }
};

const get_filename = (filepath: string) => {
  if (!filepath) return 'Desconhecido';
  return filepath.split(/\\|\//).pop() || filepath;
};
</script>

<style scoped>
.ai-flowchart-container {
  background: linear-gradient(135deg, #0b0d11 0%, #161a22 100%);
  border-color: rgba(255, 255, 255, 0.05) !important;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5);
}

.bg-black-70 {
  background-color: rgba(10, 11, 16, 0.9);
}

.ai-gradient-text {
  background: linear-gradient(90deg, #c084fc, #60a5fa);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.status-badge {
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa;
  font-size: 0.65rem;
  letter-spacing: 1px;
}

.flow-card {
  background-color: rgba(30, 41, 59, 0.3);
  backdrop-filter: blur(8px);
  min-height: 250px;
  max-height: 550px;
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  border-width: 1px !important;
}

.flow-card:hover {
  transform: translateY(-5px);
  background-color: rgba(30, 41, 59, 0.5);
}

.card-pedido { border-color: rgba(255, 193, 7, 0.1) !important; }
.card-pedido:hover { border-color: rgba(255, 193, 7, 0.4) !important; box-shadow: 0 0 15px rgba(255, 193, 7, 0.1) !important; }

.card-plano { border-color: rgba(13, 110, 253, 0.1) !important; }
.card-plano:hover { border-color: rgba(13, 110, 253, 0.4) !important; box-shadow: 0 0 15px rgba(13, 110, 253, 0.1) !important; }

.card-execucao { border-color: rgba(25, 135, 84, 0.1) !important; }
.card-execucao:hover { border-color: rgba(25, 135, 84, 0.4) !important; box-shadow: 0 0 15px rgba(25, 135, 84, 0.1) !important; }

.markdown-body {
  color: #94a3b8;
  line-height: 1.5;
  scrollbar-width: auto;
  scrollbar-color: #3b82f6 rgba(255, 255, 255, 0.05);
}

.markdown-body :deep(h1), .markdown-body :deep(h2), .markdown-body :deep(h3) {
  color: #e2e8f0;
  font-size: 1rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.markdown-body :deep(p) {
  margin-bottom: 0.75rem;
}

.markdown-body :deep(code) {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  color: #cbd5e1;
  font-family: 'Courier New', Courier, monospace;
}

.markdown-body :deep(ul) {
  padding-left: 1.2rem;
  margin-bottom: 0.75rem;
}

.markdown-body::-webkit-scrollbar {
  width: 6px;
}

.markdown-body::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.markdown-body::-webkit-scrollbar-thumb {
  background: #3b82f6;
  border-radius: 10px;
  box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
}

.markdown-body::-webkit-scrollbar-thumb:hover {
  background: #60a5fa;
}

.glow-orb {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.1;
  pointer-events: none;
  z-index: 0;
}

.glow-purple { top: -50px; left: -50px; background-color: #a855f7; }
.glow-blue { bottom: -50px; right: -50px; background-color: #3b82f6; }

.z-1 { z-index: 1; }

.arrow-icon { opacity: 0.3; font-weight: bold; }

.ai-flowchart-container:hover .arrow-icon {
  opacity: 0.7;
  color: #60a5fa;
  transform: scale(1.1);
  transition: all 0.3s;
}

.file-badge {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(59, 130, 246, 0.2) !important;
  color: #94a3b8;
  animation: float 4s ease-in-out infinite;
  backdrop-filter: blur(4px);
}

.file-badge:hover {
  animation-play-state: paused;
  border-color: #60a5fa !important;
  color: #fff;
  background: rgba(59, 130, 246, 0.3);
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.letter-spacing-2 { letter-spacing: 2px; }
.italic { font-style: italic; }
</style>
