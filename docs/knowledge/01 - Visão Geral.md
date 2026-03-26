# Visão Geral

O **Brain-Sync Desktop** é uma aplicação desktop desenvolvida para sincronizar, arquivar e visualizar o histórico de raciocínio de assistentes de IA (especificamente o Antigravity).

O sistema atua como uma ponte entre o ambiente de desenvolvimento local do usuário e os artefatos gerados durante sessões de codificação assistida por IA.

## 🎯 Objetivos

- **Rastreabilidade**: Mapear quais arquivos foram alterados em cada sessão de IA.
- **Contexto**: Unificar Tasks, Planos de Implementação e Walkthroughs em uma linha do tempo visual.
- **Arquivamento**: Criar um "Vault" (cofre) local com cópias de segurança dos estados do código e mídias de cada sessão.
- **Produtividade**: Facilitar a retomada de contextos complexos através de fluxogramas de raciocinio.

## 💻 Stack Tecnológica

- **Frontend**: Vue 3 (Composition API), Vite, Bootstrap 5.
- **Runtime**: Electron (Main & Renderer process).
- **Persistência**: SQLite/JSON local (Repositórios descentralizados) e MySQL (Legado/Opcional).
- **Integrações**: `chokidar` (monitoramento de arquivos), `marked` (processamento de markdown), `git`.

## 📂 Localização do Código

- **Entry Point Backend**: `electron/main.ts`
- **Entry Point Frontend**: `src/main.ts`
- **Root Component**: `src/App.vue`
- **Diretório de Dados (Antigravity)**: `%USERPROFILE%\.gemini\antigravity`
- **Diretório de Vault (Brain-Sync)**: `%USERPROFILE%\BrainSyncVault`

---
Próximo passo: [[02 - Arquitetura]]
