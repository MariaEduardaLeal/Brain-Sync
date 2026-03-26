# Fluxos Principais

Esta nota detalha como as principais ações percorrem as camadas do sistema.

## 🔄 Fluxo de Inicialização

1. O **Main Process** (`main.ts`) inicializa o `ProjectRepository`.
2. O `FileWatcherService` começa a monitorar a pasta `brain/` do Antigravity.
3. A janela (`BrowserWindow`) é criada e o frontend é carregado.
4. O frontend solicita a lista de projetos registrados via `project_list_request`.

## 🔍 Fluxo de Scan Histórico

Este é o processo mais crítico do sistema:

1. **Frontend**: Usuário clica em "Escanear Histórico Completo".
2. **IPC**: O comando `historical_scan_request` é enviado para o Main Process.
3. **Main (BrainScannerService)**:
    - Lê as pastas em `.gemini/antigravity/brain`.
    - Analisa `task.md`, `plan.md` e `walkthrough.md`.
    - Identifica arquivos modificados via Regex em caminhos absolutos.
    - Filtra sessões que pertencem ao projeto selecionado.
4. **Main (GitHistoryService)**: Recupera commits recentes que possuem os mesmos arquivos modificados.
5. **Main (ProjectContextArchiveService)**: Salva as sessões processadas no Vault e copia os fontes relacionados.
6. **Frontend**: Recebe os dados enriquecidos e renderiza os `AIFlowchart`.

## 📁 Fluxo de Criação de Projeto

1. **Frontend**: Abre modal e solicita escolha de pasta via `project_select_folder_request`.
2. **Main**: Abre o diálogo nativo do SO (`dialog.showOpenDialog`).
3. **Frontend**: Coleta nome e caminho, enviando `project_save_request`.
4. **Main**: 
    - Atribui um ID incremental.
    - Persiste em `brain_sync_projects.json`.
    - Solicita ao `ArchiveService` a criação da estrutura inicial de pastas no Vault.
5. **Frontend**: Atualiza a lista lateral e seleciona o novo projeto.

## 📡 Fluxo de Monitoramento em Tempo Real

1. `FileWatcherService` detecta uma alteração em `brain/`.
2. O Main process envia o evento `worklog_updated_event` para a janela ativa.
3. O Frontend recebe o evento e sinaliza "Novo artefato detectado" na barra lateral.

---
Próximo passo: [[04 - Regras de Negócio]]
