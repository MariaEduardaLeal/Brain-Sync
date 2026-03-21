<template>
  <section class="session-card rounded-4 p-4 p-xl-5 mb-4">
    <div class="d-flex flex-column flex-xl-row justify-content-between gap-3 align-items-start">
      <div>
        <div class="section-kicker">Brain Session</div>
        <h3 class="session-title mt-2 mb-2"><span class="brain-mark">🧠</span> Sessao de raciocinio</h3>
        <div class="session-id">ID {{ session.session_id }}</div>
      </div>

      <div class="d-flex flex-column align-items-xl-end gap-3">
        <div class="session-meta-grid">
          <div class="meta-pill" v-if="session.session_started_at">
            <span class="meta-label">Inicio</span>
            <span class="meta-value">{{ format_datetime(session.session_started_at) }}</span>
          </div>
          <div class="meta-pill" v-if="session.session_updated_at">
            <span class="meta-label">Atualizacao</span>
            <span class="meta-value">{{ format_datetime(session.session_updated_at) }}</span>
          </div>
          <div class="meta-pill" v-if="session.git_evidence?.branch">
            <span class="meta-label">Branch</span>
            <span class="meta-value">{{ session.git_evidence.branch }}</span>
          </div>
        </div>

        <button class="graph-btn rounded-4" @click="$emit('open-graph', session)">
          Ver fluxograma
        </button>
      </div>
    </div>

    <div class="content-grid mt-4">
      <article class="content-card rounded-4 p-4">
        <div class="section-kicker">Tasks</div>
        <h4 class="content-title">Tasks da sessao</h4>
        <div class="rich-body mt-3" v-html="render_task_content(session.task_content)"></div>
      </article>

      <article class="content-card rounded-4 p-4">
        <div class="section-kicker">Plano</div>
        <h4 class="content-title">Implementation plan</h4>
        <div class="rich-body mt-3" v-html="render_markdown(session.plan_content)"></div>
      </article>

      <article class="content-card rounded-4 p-4">
        <div class="section-kicker">Execucao</div>
        <h4 class="content-title">Walkthrough final</h4>
        <div class="rich-body mt-3" v-html="render_markdown(session.walkthrough_content)"></div>
      </article>
    </div>

    <div v-if="history_groups.length" class="detail-panel rounded-4 p-4 mt-4">
      <div class="panel-title">Historico completo das versoes</div>
      <div class="history-grid mt-3">
        <section v-for="group in history_groups" :key="group.key" class="history-column rounded-4 p-3">
          <div class="history-heading">{{ group.label }}</div>
          <div class="history-count">{{ group.items.length }} versoes</div>

          <div class="history-list mt-3">
            <details v-for="item in group.items" :key="item.file_path + item.label" class="history-item rounded-4 p-3" open>
              <summary class="history-summary">
                <span class="history-badge">{{ item.label }}</span>
                <span class="history-date">{{ format_datetime(item.updated_at) }}</span>
              </summary>
              <div class="history-content mt-3" v-html="render_version_content(item.content)"></div>
            </details>
          </div>
        </section>
      </div>
    </div>

    <div class="detail-grid mt-4">
      <section class="detail-panel rounded-4 p-4" v-if="session.git_evidence">
        <div class="panel-title">Git conectado</div>

        <div class="git-summary-grid mt-3">
          <div class="git-pill" v-if="session.git_evidence.repo_root">
            <span class="meta-label">Repo</span>
            <span class="meta-value break-anywhere">{{ session.git_evidence.repo_root }}</span>
          </div>
          <div class="git-pill" v-if="session.git_evidence.remote_url">
            <span class="meta-label">Remote</span>
            <span class="meta-value break-anywhere">{{ session.git_evidence.remote_url }}</span>
          </div>
        </div>

        <div v-if="session.git_evidence.matching_recent_commits?.length" class="mt-4">
          <div class="mini-title mb-2">Commits da sessao</div>
          <div class="commit-list">
            <div v-for="commit in session.git_evidence.matching_recent_commits" :key="commit.hash" class="commit-card rounded-4 p-3">
              <div class="commit-topline">
                <span class="commit-hash">{{ commit.short_hash }}</span>
                <span class="history-date">{{ format_datetime(commit.authored_at) }}</span>
              </div>
              <div class="commit-subject mt-2">{{ commit.subject }}</div>
              <div v-if="commit.body" class="commit-body mt-2">{{ commit.body }}</div>
              <div class="commit-meta mt-2">{{ commit.author_name }}</div>
            </div>
          </div>
        </div>

        <div v-else class="empty-copy mt-4">Nenhum commit relacionado foi encontrado para esta sessao.</div>
      </section>

      <section class="detail-panel rounded-4 p-4" v-if="session.modified_files?.length || session.context_source_files?.length">
        <div class="panel-title">Arquivos e fontes</div>

        <div v-if="session.modified_files?.length" class="mt-3">
          <div class="mini-title mb-2">Arquivos modificados</div>
          <div class="badge-cloud">
            <span v-for="file in session.modified_files" :key="file" class="glass-badge">
              {{ get_filename(file) }}
            </span>
          </div>
        </div>

        <div v-if="session.context_source_files?.length" class="mt-4">
          <div class="mini-title mb-2">Fontes arquivadas</div>
          <div class="badge-cloud">
            <span v-for="file in session.context_source_files.slice(0, 24)" :key="file" class="glass-badge">
              {{ get_filename(file) }}
            </span>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import filterXSS from 'xss'

type ArtifactRevision = {
  label: string
  file_path: string
  content: string | null
  updated_at: string | null
  is_current: boolean
}

defineEmits<{
  (e: 'open-graph', session: any): void
}>()

const props = defineProps<{
  session: {
    session_id: string
    task_content: string | null
    plan_content: string | null
    walkthrough_content: string | null
    modified_files: string[]
    context_source_files?: string[]
    session_started_at?: string | null
    session_updated_at?: string | null
    artifact_history?: {
      task: ArtifactRevision[]
      plan: ArtifactRevision[]
      walkthrough: ArtifactRevision[]
    }
    git_evidence?: {
      repo_root: string | null
      branch: string | null
      remote_url: string | null
      status_files: string[]
      matching_status_files: string[]
      matching_recent_commits: Array<{
        hash: string
        short_hash: string
        author_name: string
        authored_at: string
        subject: string
        body: string
        files: string[]
      }>
      overlap_files: string[]
    }
  }
}>()

const history_groups = computed(() => {
  const groups = [
    { key: 'task', label: 'Task / pedido', items: props.session.artifact_history?.task || [] },
    { key: 'plan', label: 'Implementation / plano', items: props.session.artifact_history?.plan || [] },
    { key: 'walkthrough', label: 'Walkthrough / execucao', items: props.session.artifact_history?.walkthrough || [] },
  ]

  return groups.filter(group => group.items.length > 0)
})

const render_markdown = (content: string | null) => {
  if (!content) return '<p class="empty-copy">Conteudo nao disponivel.</p>'
  try {
    return filterXSS(marked(content) as string)
  } catch (err) {
    return `<p class="empty-copy">Erro ao renderizar: ${String(err)}</p>`
  }
}

const render_task_content = (content: string | null) => {
  if (!content) return '<p class="empty-copy">Tasks nao disponiveis.</p>'
  if (/<[^>]+>/.test(content)) {
    return filterXSS(content)
  }

  if (looks_like_checklist(content)) {
    return render_checklist_text(content)
  }

  return render_plain_text(content)
}

const render_version_content = (content: string | null) => {
  if (!content) return '<p class="empty-copy">Versao sem conteudo.</p>'
  if (/<[^>]+>/.test(content)) {
    return filterXSS(content)
  }
  return render_markdown(content)
}

const looks_like_checklist = (content: string) => {
  return /\[[xX\s/]\]/.test(content) || /^\s*-\s/m.test(content)
}

const render_checklist_text = (content: string) => {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  const items = lines.map(line => {
    const checked = /\[[xX]\]/.test(line)
    const clean = line.replace(/^[#*\-\s]+/, '').replace(/\[(?:x|X| |\/)\]\s*/g, '').trim()
    return `<li class="task-line ${checked ? 'task-line-done' : ''}"><span class="task-checkbox">${checked ? '✓' : '•'}</span><span>${escape_html(clean)}</span></li>`
  }).join('')

  return `<ul class="task-list">${items}</ul>`
}

const render_plain_text = (content: string) => {
  const html = escape_html(content).replace(/\n/g, '<br>')
  return `<div class="plain-copy">${html}</div>`
}

const escape_html = (content: string) => {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const get_filename = (filepath: string) => {
  const base = filepath.split(/\\|\//).pop() || filepath
  return base.split('#')[0]
}

const format_datetime = (value: string | null | undefined) => {
  if (!value) return 'Data desconhecida'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
</script>

<style scoped>
.session-card,
.content-card,
.detail-panel,
.history-column,
.history-item,
.commit-card {
  background: linear-gradient(180deg, rgba(9, 13, 27, 0.96), rgba(7, 10, 20, 0.94));
  border: 1px solid rgba(96, 165, 250, 0.14);
  box-shadow: 0 20px 50px rgba(2, 6, 23, 0.3);
}

.section-kicker,
.panel-title,
.mini-title {
  color: #84ccff;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
}

.session-title,
.content-title,
.history-heading,
.commit-subject {
  color: #f8fbff;
  font-weight: 800;
}

.session-id,
.history-count,
.history-date,
.commit-meta,
.commit-body,
.empty-copy {
  color: #97a8cc;
}

.brain-mark {
  margin-right: 0.5rem;
}

.session-meta-grid,
.git-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  width: 100%;
  max-width: 680px;
}

.meta-pill,
.git-pill {
  border-radius: 18px;
  padding: 0.85rem 1rem;
  background: rgba(11, 17, 34, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.meta-label {
  display: block;
  color: #84ccff;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-bottom: 0.35rem;
}

.meta-value,
.plain-copy,
.history-content,
.rich-body {
  color: #e5eeff;
}

.graph-btn {
  border: 1px solid rgba(139, 92, 246, 0.34);
  background: linear-gradient(135deg, rgba(109, 40, 217, 0.88), rgba(37, 99, 235, 0.88));
  color: #f8fbff;
  padding: 0.8rem 1.1rem;
  font-weight: 700;
}

.content-grid,
.detail-grid,
.history-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.detail-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.history-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.rich-body,
.history-content {
  max-height: 360px;
  overflow: auto;
  line-height: 1.65;
  padding-right: 0.35rem;
}

.rich-body :deep(h1),
.rich-body :deep(h2),
.rich-body :deep(h3),
.history-content :deep(h1),
.history-content :deep(h2),
.history-content :deep(h3) {
  color: #ffffff;
  font-size: 1rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.rich-body :deep(p),
.rich-body :deep(li),
.rich-body :deep(div),
.rich-body :deep(span),
.history-content :deep(p),
.history-content :deep(li),
.history-content :deep(div),
.history-content :deep(span) {
  color: #dde8ff;
}

.rich-body :deep(a),
.history-content :deep(a) {
  color: #7dd3fc;
}

.rich-body :deep(code),
.rich-body :deep(pre),
.history-content :deep(code),
.history-content :deep(pre) {
  color: #eef4ff;
  background: rgba(15, 23, 42, 0.84);
  border-radius: 10px;
}

.history-list,
.commit-list {
  display: grid;
  gap: 0.8rem;
}

.history-summary {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  cursor: pointer;
  list-style: none;
}

.history-summary::-webkit-details-marker {
  display: none;
}

.history-badge,
.commit-hash,
.glass-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(20, 28, 49, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.16);
  color: #eef4ff;
  padding: 0.45rem 0.75rem;
  font-size: 0.8rem;
}

.commit-topline {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.badge-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.break-anywhere {
  word-break: break-all;
}

.plain-copy {
  white-space: normal;
}

.rich-body :deep(.task-list) {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.8rem;
}

.rich-body :deep(.task-line) {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
}

.rich-body :deep(.task-checkbox) {
  color: #7dd3fc;
  min-width: 16px;
}

.rich-body :deep(.task-line-done) {
  opacity: 0.92;
}

.rich-body::-webkit-scrollbar,
.history-content::-webkit-scrollbar {
  width: 8px;
}

.rich-body::-webkit-scrollbar-thumb,
.history-content::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #8b5cf6, #38bdf8);
  border-radius: 999px;
}

@media (max-width: 1199px) {
  .content-grid,
  .detail-grid,
  .history-grid,
  .session-meta-grid,
  .git-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
