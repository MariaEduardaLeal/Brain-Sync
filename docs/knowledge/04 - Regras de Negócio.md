# Regras de Negócio

O Brain-Sync Desktop utiliza heurísticas e regras específicas para automatizar a associação de dados.

## 🧠 Critérios de Associação de Projeto

Como o sistema sabe que uma sessão de IA pertence ao "Projeto X"?

1. **Extração de Caminhos**: O `BrainScannerService` busca padrões de caminhos absolutos dentro dos campos de texto (Tasks e Planos).
    - Ex: `C:\Users\...\projeto-x\src\App.vue`
2. **Match de Prefixo**: O sistema compara o prefixo dos caminhos encontrados com a "Pasta Local" cadastrada no projeto.
3. **Heurística de Filtragem**: Se pelo menos um arquivo modificado na sessão estiver dentro da árvore de diretórios do projeto, a sessão é associada.

## 📂 Organização do Vault

O Vault é organizado para garantir que os dados sejam portáveis e resilientes:

- `BrainSyncVault/projects/[ID]-[SLUG]/`
    - `project.json`: Metadados do projeto.
    - `scans/`: Histórico de execuções de scan (JSON).
        - `latest_sessions.json`: O cache usado para carregamento rápido.
    - `sessions/[SESSION_ID]/`:
        - `session.json`: O objeto completo da sessão.
        - `artifacts/`: Cópias físicas dos arquivos fontes no estado em que estavam no momento do scan.

## ⚠️ Tratamento de Dados Depreciados

Algumas funcionalidades foram mantidas por compatibilidade, mas marcadas como depreciadas:

- **MySQL**: O sistema ainda aceita conexões MySQL, mas prioriza o armazenamento descentralizado em JSON/Vault.
- **Probe Env**: O auto-descobrimento de credenciais (DB Discovery) está sendo descontinuado em favor da configuração manual via UI.

## 🔄 Sincronização de Estado

- O frontend **não** armazena dados de sessão permanentemente. Ele sempre confia no que o Main Process retorna via Cache (`project_cached_scan_request`) ou Scan.
- O Scan Total substitui o cache anterior inteiramente para evitar inconsistências.

---
Próximo passo: [[05 - Componentes/Índice]]
