# Modelos e Dados

O sistema utiliza interfaces TypeScript para garantir a integridade dos dados trafegados entre Main e Renderer.

## 📊 Estruturas de Dados Principais

### `ProjectMetadata`
- **Arquivo**: `electron/repositories/project_repository.ts`
- **Campos**: `id`, `name`, `local_path`, `vault_path`, `no_database`, `created_at`.
- **Uso**: Cadastro da lista lateral de projetos.

### `AIReasoningSession`
- **Arquivo**: `electron/services/brain_scanner_service.ts`
- **Campos**:
    - `session_id`: UUID da sessão.
    - `user_request_content`: O prompt inicial do usuário.
    - `task_content / plan_content / walkthrough_content`: Conteúdos dos artefatos.
    - `artifact_history`: Histórico de versões (`.resolved`).
    - `modified_files`: Lista de arquivos associados.
    - `git_evidence`: Dados do repositório Git.

## 🗄️ Esquema do Banco de Dados

### Tabela: `brain_sync_ai_reasoning`
- **Arquivo**: `electron/db/schema.sql`
- **Estrutura**:
    - `session_id` (VARCHAR UNIQUE)
    - `task_content`, `plan_content`, `walkthrough_content` (LONGTEXT)
    - `modified_files` (JSON)
    - `git_evidence` (JSON)
    - `scanned_at` (TIMESTAMP)

---
Voltar para [[00 - Índice]]
