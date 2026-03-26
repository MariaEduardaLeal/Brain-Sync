# Mapa de Funções

Esta nota mapeia a conectividade e a hierarquia das funções críticas do sistema.

## 🗺️ Hierarquia de Chamadas (Call flow)

### Fluxo de Scan
- `ipcMain.handle('historical_scan_request')`
    - [[06 - Serviços/BrainScannerService#scan_historical_data|BrainScannerService.scan_historical_data()]]
        - [[06 - Serviços/BrainScannerService#get_recent_session_candidates|get_recent_session_candidates()]]
        - [[06 - Serviços/BrainScannerService#process_session_folder|process_session_folder()]]
            - [[06 - Serviços/BrainScannerService#load_artifact_bundle|load_artifact_bundle()]]
            - [[06 - Serviços/BrainScannerService#extract_file_paths|extract_file_paths()]]
            - [[06 - Serviços/BrainScannerService#match_session_to_project|match_session_to_project()]]
    - [[06 - Serviços/GitHistoryService|GitHistoryService.enrich_sessions()]]
    - [[06 - Serviços/ProjectContextArchiveService#archive_project_scan|ArchiveService.archive_project_scan()]]

### Fluxo de Persistência de Projeto
- `ipcMain.handle('project_save_request')`
    - [[07 - Modelos/ProjectRepository#save_project|ProjectRepository.save_project()]]
    - [[06 - Serviços/ProjectContextArchiveService#ensure_project_vault|ArchiveService.ensure_project_vault()]]
    - [[07 - Modelos/ProjectRepository#update_project|ProjectRepository.update_project()]]

## 📌 Funções por Responsabilidade

### Extratoras (Parsing)
- `extract_file_paths`: Localiza caminhos absolutos em textos.
- `extract_user_request_content`: Identifica o pedido original do usuário no `task.md`.

### Persistência (IO)
- `persist`: Grava o JSON de projetos no `userData`.
- `write_json`: Utilitário de escrita segura no Vault.
- `copy_if_exists`: Copia arquivos fontes para o backup.

### UI / Reatividade
- `load_projects`: Sincroniza a lista lateral.
- `render_markdown`: Transforma conteúdo Bruto em HTML seguro.

---
Voltar para [[00 - Índice]]
