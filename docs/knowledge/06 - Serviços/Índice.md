# Serviços (Backend)

Os serviços em `electron/services` encapsulam a lógica de negócio pesada, executando fora da thread de renderização para garantir performance.

## ⚙️ Lista de Serviços

- [[06 - Serviços/BrainScannerService|BrainScannerService]]: Motor de análise de artefatos do Antigravity.
- [[06 - Serviços/ProjectContextArchiveService|ProjectContextArchiveService]]: Orquestrador do Vault e backup.
- [[06 - Serviços/FileWatcherService|FileWatcherService]]: Monitor de baixa latência para arquivos.
- [[06 - Serviços/GitHistoryService|GitHistoryService]]: Wrapper para comandos Git.
- [[06 - Serviços/DatabaseService|DatabaseService]]: Conector de banco de dados (MySQL/Local).
- [[06 - Serviços/AntigravityStorageService|AntigravityStorageService]]: Gestor de mídias e gravações.

---
Voltar para [[00 - Índice]]
