# Componente: App.vue

O `App.vue` é o ponto de entrada da interface gráfica e atua como o **Controller** do frontend.

- **Arquivo**: `src/App.vue`
- **Responsabilidade**: Gerenciamento de projetos, estados de carregamento e coordenação de IPC.

## 🛠️ Estado (Refs/Reactive)

- `registered_projects`: Lista de projetos carregados do Main.
- `active_project_id`: ID do projeto selecionado atualmente.
- `ai_sessions`: Lista de sessões de IA associadas ao projeto ativo.
- `is_scanning`: Flag que indica se um scan histórico está em curso.
- `is_syncing`: Flag ativada por eventos de monitoramento de arquivo.

## 🔄 Fluxos de Execução Internos

### Inicialização (`onMounted`)
1. Chama [[05 - Componentes/App#load_projects|load_projects()]] para buscar a lista inicial de projetos.
2. Chama [[05 - Componentes/App#load_storage_summary|load_storage_summary()]] para metadados de armazenamento.
3. Registra o listener IPC `worklog_updated_event` para monitoramento real-time.

### Seleção de Projeto (`select_project`)
1. Reseta a lista `ai_sessions`.
2. Solicita cache via `project_cached_scan_request`.
3. Atualiza a UI com os dados do Vault.

### Escaneamento (`scan_ai_history`)
1. Bloqueia a UI (`is_scanning = true`).
2. Aciona o `historical_scan_request`.
3. Ao retornar, atualiza a lista de sessões e o sumário de armazenamento.

---
[[05 - Componentes/Índice|Voltar para a lista de Componentes]]
