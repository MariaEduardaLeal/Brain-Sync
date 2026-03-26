# Integrações

O Brain-Sync atua como uma camada de observabilidade sobre outras ferramentas.

## 🛸 Antigravity (Google DeepMind)
- **Pasta de Origem**: `%USERPROFILE%\.gemini\antigravity`
- **Mecânica**: O sistema lê os diretórios `brain/`, `conversations/` e `browser_recordings/` gerados pelo agente de IA.
- **Artefatos Monitorados**: `task.md`, `implementation_plan.md`, `walkthrough.md`.

## 📂 Sistema de Arquivos (OS)
- **API**: Node.js `fs` e `path`.
- **Monitoramento**: `chokidar` é usado para escutar mudanças no diretório de dados do Antigravity em tempo real.
- **Diálogos**: `electron.dialog` para seleção nativa de pastas.

## 🌿 Git
- **Mecânica**: O sistema assume que o projeto local é um repositório Git.
- **Uso**: Busca o `repo_root`, `remote_url` e `branch` atual.
- **Enriquecimento**: Cruza a data de modificação dos artefatos da IA com a data de commits locais para sugerir vínculos automáticos.

---
Voltar para [[00 - Índice]]
