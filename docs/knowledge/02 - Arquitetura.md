# Arquitetura do Sistema

O Brain-Sync Desktop segue a arquitetura padrão do **Electron**, separando a lógica de baixo nível (Main Process) da interface do usuário (Renderer Process).

## 🏗️ Divisão de Responsabilidades

### 1. Main Process (Backend)
Localizado em `electron/`, é responsável por:
- Gerenciamento de janelas e ciclo de vida da aplicação.
- Integração com o Sistema de Arquivos (FS).
- Serviços de domínio (Scan, Monitoramento, Arquivamento).
- Persistência de dados (Repositórios).
- Comunicação via IPC (Inter-Process Communication).

### 2. Renderer Process (Frontend)
Localizado em `src/`, é responsável por:
- Interface gráfica reativa (Vue 3).
- Gerenciamento de estado da UI.
- Renderização de Markdown.
- Visualização de fluxogramas (`AIFlowchart`).

### 3. IPC Bridge (Preload)
Localizado em `electron/preload.ts`, atua como uma ponte segura expondo funções do Main para o Renderer através de `window.ipcRenderer`.

## ⚙️ Camada de Serviços

O sistema é modularizado em serviços especializados:

| Serviço | Responsabilidade |
| :--- | :--- |
| [[06 - Serviços/BrainScannerService\|BrainScannerService]] | Localiza e extrai dados de sessões do Antigravity. |
| [[06 - Serviços/ProjectContextArchiveService\|ProjectContextArchiveService]] | Gerencia o Vault e faz o backup dos artefatos. |
| [[06 - Serviços/FileWatcherService\|FileWatcherService]] | Monitora mudanças em tempo real para sincronização. |
| [[06 - Serviços/GitHistoryService\|GitHistoryService]] | Recupera commits vinculados a sessões. |
| [[06 - Serviços/AntigravityStorageService\|AntigravityStorageService]] | Gerencia o armazenamento de gravações de browser. |

## 📊 Camada de Dados

- **Metadata Local**: Armazenado em `brain_sync_projects.json` no diretório `userData`.
- **Vault**: Repositório centralizado de scans e artefatos em `~/BrainSyncVault`.
- **Banco de Dados**: Tabela `brain_sync_ai_reasoning` (MySQL/SQLite) para busca indexada.

---
Próximo passo: [[03 - Fluxos Principais]]
