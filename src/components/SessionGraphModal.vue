<template>
  <div class="graph-backdrop" @click.self="$emit('close')">
    <div class="graph-shell rounded-4 p-4 p-xl-5">
      <div class="d-flex justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div class="graph-kicker">Fluxograma</div>
          <h3 class="graph-title mt-2">Mapa interativo da sessao</h3>
          <div class="graph-subtitle">Arraste as bolinhas para explorar as ligacoes.</div>
        </div>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div ref="boardRef" class="graph-board">
        <div
          v-for="node in nodes"
          :key="node.id"
          class="graph-node"
          :class="`graph-node-${node.kind}`"
          :style="{ left: `${node.x}%`, top: `${node.y}%` }"
          @pointerdown="start_drag(node.id, $event)"
        >
          <div class="graph-node-title">{{ node.label }}</div>
          <div v-if="node.meta" class="graph-node-meta">{{ node.meta }}</div>
        </div>

        <svg class="graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line
            v-for="edge in edges"
            :key="edge.id"
            :x1="edge.from.x"
            :y1="edge.from.y"
            :x2="edge.to.x"
            :y2="edge.to.y"
            class="graph-line"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type SessionNode = {
  id: string
  label: string
  meta?: string
  x: number
  y: number
  kind: 'core' | 'artifact' | 'file'
}

const props = defineProps<{
  session: any
}>()

defineEmits<{
  (e: 'close'): void
}>()

const boardRef = ref<HTMLElement | null>(null)
const nodes = ref<SessionNode[]>(build_nodes(props.session))

const edges = computed(() => {
  const map = new Map(nodes.value.map(node => [node.id, node]))
  const core = map.get('core')
  if (!core) return []

  return nodes.value
    .filter(node => node.id !== 'core')
    .map(node => ({
      id: `edge-${node.id}`,
      from: core,
      to: node,
    }))
})

let dragState: { id: string; pointerId: number } | null = null

const start_drag = (id: string, event: PointerEvent) => {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return
  dragState = { id, pointerId: event.pointerId }
  target.setPointerCapture(event.pointerId)
  target.addEventListener('pointermove', on_pointer_move)
  target.addEventListener('pointerup', stop_drag)
  target.addEventListener('pointercancel', stop_drag)
}

const on_pointer_move = (event: PointerEvent) => {
  if (!dragState || !boardRef.value) return
  const rect = boardRef.value.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100

  nodes.value = nodes.value.map(node => {
    if (node.id !== dragState?.id) return node
    return {
      ...node,
      x: clamp(x, 8, 92),
      y: clamp(y, 10, 90),
    }
  })
}

const stop_drag = (event: PointerEvent) => {
  const target = event.currentTarget as HTMLElement | null
  if (target && dragState) {
    target.releasePointerCapture(dragState.pointerId)
    target.removeEventListener('pointermove', on_pointer_move)
    target.removeEventListener('pointerup', stop_drag)
    target.removeEventListener('pointercancel', stop_drag)
  }
  dragState = null
}

function build_nodes(session: any): SessionNode[] {
  const nodes: SessionNode[] = [
    { id: 'core', label: session.session_id, meta: 'Sessao', x: 50, y: 48, kind: 'core' },
    { id: 'task', label: 'Task', meta: 'Pedido', x: 22, y: 24, kind: 'artifact' },
    { id: 'plan', label: 'Plan', meta: 'Implementation', x: 76, y: 24, kind: 'artifact' },
    { id: 'walkthrough', label: 'Walkthrough', meta: 'Execucao', x: 22, y: 72, kind: 'artifact' },
  ]

  if (session.git_evidence?.remote_url) {
    nodes.push({ id: 'git', label: 'Git Remote', meta: 'Repositorio', x: 76, y: 72, kind: 'artifact' })
  } else if (session.conversation_artifact?.exists) {
    nodes.push({ id: 'conversation', label: 'Conversa PB', meta: 'Arquivo', x: 76, y: 72, kind: 'artifact' })
  }

  const filePositions = [
    { x: 12, y: 48 },
    { x: 88, y: 48 },
    { x: 50, y: 14 },
    { x: 50, y: 84 },
    { x: 34, y: 10 },
    { x: 66, y: 88 },
  ]

  session.modified_files?.slice(0, 6).forEach((file: string, index: number) => {
    const position = filePositions[index]
    if (!position) return
    nodes.push({
      id: `file-${index}`,
      label: get_filename(file),
      meta: 'Arquivo',
      x: position.x,
      y: position.y,
      kind: 'file',
    })
  })

  return nodes
}

function get_filename(filepath: string) {
  const base = filepath.split(/\\|\//).pop() || filepath
  return base.split('#')[0]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
</script>

<style scoped>
.graph-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.84);
  backdrop-filter: blur(10px);
  z-index: 1400;
  display: grid;
  place-items: center;
  padding: 1.5rem;
}

.graph-shell {
  width: min(1200px, 100%);
  min-height: 720px;
  background: linear-gradient(180deg, rgba(8, 13, 27, 0.98), rgba(5, 10, 22, 0.96));
  border: 1px solid rgba(96, 165, 250, 0.16);
  box-shadow: 0 30px 80px rgba(2, 6, 23, 0.45);
}

.graph-kicker {
  color: #84ccff;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
}

.graph-title {
  color: #f8fbff;
  font-weight: 800;
}

.graph-subtitle {
  color: #98a9ce;
}

.close-btn {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(12, 18, 33, 0.88);
  color: #f8fbff;
  font-size: 1.6rem;
  line-height: 1;
}

.graph-board {
  position: relative;
  min-height: 580px;
  border-radius: 28px;
  overflow: hidden;
  background:
    radial-gradient(circle at center, rgba(37, 99, 235, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(7, 11, 23, 0.94), rgba(4, 7, 17, 0.96));
  border: 1px solid rgba(96, 165, 250, 0.12);
}

.graph-board::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(125, 211, 252, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(125, 211, 252, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
}

.graph-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.graph-line {
  stroke: url(#lineGradient);
  stroke: #5b7cff;
  stroke-width: 0.35;
  opacity: 0.8;
}

.graph-node {
  position: absolute;
  transform: translate(-50%, -50%);
  min-width: 126px;
  max-width: 180px;
  padding: 0.85rem 1rem;
  border-radius: 18px;
  color: #f8fbff;
  user-select: none;
  cursor: grab;
  text-align: center;
  box-shadow: 0 14px 30px rgba(2, 6, 23, 0.36);
}

.graph-node-core {
  background: linear-gradient(135deg, rgba(109, 40, 217, 0.95), rgba(37, 99, 235, 0.95));
  border: 1px solid rgba(191, 219, 254, 0.34);
}

.graph-node-artifact {
  background: rgba(31, 41, 55, 0.92);
  border: 1px solid rgba(139, 92, 246, 0.36);
}

.graph-node-file {
  background: rgba(14, 116, 144, 0.9);
  border: 1px solid rgba(125, 211, 252, 0.3);
}

.graph-node-title {
  font-weight: 700;
  font-size: 0.9rem;
  word-break: break-word;
}

.graph-node-meta {
  color: rgba(226, 232, 255, 0.82);
  font-size: 0.74rem;
  margin-top: 0.25rem;
}
</style>
