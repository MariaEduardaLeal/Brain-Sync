# Serviço: ProjectContextArchiveService

Gerencia a persistência física dos artefatos no Vault.

- **Arquivo**: `electron/services/project_context_archive_service.ts`
- **Responsabilidade**: Backup e organização do cofre de projetos.

## 🚀 Funções Principais

### `ensure_project_vault(project)`
- **Objetivo**: Garantir que a estrutura de pastas do projeto existe no Vault do usuário.
- **Caminho Padrão**: `~/BrainSyncVault/projects/[id]-[name]`

### `archive_project_scan(project, sessions)`
- **Objetivo**: Congelar o estado atual de um scan e fazer backup dos fontes.
- **Passo a passo**:
    1. Salva `project.json` com metadados básicos.
    2. Gera o arquivo `latest_sessions.json` para o frontend.
    3. Cria arquivos de scan com timestamp (ex: `2024-03-26-19-21-00.json`).
    4. **Cópia de Arquivos**: Para cada sessão, varre `context_source_files` e copia os arquivos originais para o diretório `artifacts/` da sessão no Vault, renomeando-os para evitar conflitos de caminho (ex: `C__Projetos__app__src__main.ts`).

### `load_latest_scan(project)`
- **Objetivo**: Carregar o cache do Vault para exibição imediata na UI sem rodar um novo scan completo.

---
[[06 - Serviços/Índice|Voltar para a lista de Serviços]]
