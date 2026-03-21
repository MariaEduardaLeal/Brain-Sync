# Vault Structure

O vault local do Brain-Sync existe para garantir que o contexto do projeto continue acessivel mesmo que os artefatos do Antigravity sejam apagados depois.

## Local padrao

`C:\Users\<usuario>\BrainSyncVault`

## Estrutura

```text
BrainSyncVault/
  projects/
    1-meu-projeto/
      project.json
      scans/
        latest_scan.json
        latest_sessions.json
        2026-03-21T18-20-10-000Z.json
      sessions/
        05cb2a40-ea43-4407-a89d-0c3fb8a9a6ae/
          session.json
          artifacts/
            C__Users__mmedu__.gemini__antigravity__brain__...__task.md
            C__Users__mmedu__.gemini__antigravity__brain__...__walkthrough.md
            C__Users__mmedu__.gemini__antigravity__conversations__...pb
```

## O que cada parte guarda

### `project.json`

Metadados do projeto:

- id interno
- nome
- caminho local
- caminho do vault
- timestamp do ultimo arquivamento

### `scans/latest_scan.json`

Resumo do ultimo scan:

- nome do projeto
- quantidade de sessoes
- timestamps
- resumo de sessoes

### `scans/latest_sessions.json`

Payload completo do ultimo scan. Esse arquivo e o que o app usa para abrir rapidamente um projeto sem precisar reescanear tudo.

### `scans/<timestamp>.json`

Snapshots historicos de scans completos.

### `sessions/<session-id>/session.json`

Payload completo de uma sessao especifica.

### `sessions/<session-id>/artifacts/`

Copias locais dos artefatos encontrados para aquela sessao.

Exemplos:

- `task.md`
- `implementation_plan.md`
- `walkthrough.md`
- arquivos `.resolved`
- midias
- browser recordings de preview
- conversa `.pb`

## Objetivo

Esse vault serve para:

- cache de abertura rapida
- retenção propria do Brain-Sync
- resiliencia caso o Antigravity seja limpo
- base futura para exportacao, sincronizacao e auditoria
