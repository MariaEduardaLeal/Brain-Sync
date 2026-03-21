# Brain-Sync

Brain-Sync e um app desktop em Electron + Vue para transformar o que o Antigravity produz em um contexto reutilizavel de projeto.

Hoje ele funciona com tres pilares:

- leitura dos artefatos do Antigravity em disco
- enriquecimento com Git por sessao
- arquivamento proprio em um vault local, para nao depender do Antigravity manter tudo para sempre

## O que mudou

As ultimas mudancas deixaram o app com este comportamento:

- removeu a dependencia de MySQL por projeto
- usa o filesystem do Antigravity como fonte primaria
- cruza `task.md`, `implementation_plan.md`, `walkthrough.md`, snapshots `.resolved`, conversas `.pb`, midias e browser recordings
- enriquece as sessoes com branch, commits relacionados, arquivos cruzados e URL remota do Git quando existir
- salva scans completos em um vault proprio do Brain-Sync
- ao abrir um projeto, tenta carregar primeiro o ultimo scan salvo no vault, sem obrigar novo scan
- adiciona um gerenciador do armazenamento do Antigravity
- permite excluir browser recordings dentro do app, com aviso de que a exclusao e irreversivel
- move o fluxograma para uma visualizacao separada por sessao, via botao `Ver fluxograma`

## Fluxo atual

1. O usuario registra um projeto apontando para a pasta local do repo.
2. O Brain-Sync cria ou reutiliza um vault local para esse projeto.
3. Ao escanear, o app:
   - le as sessoes do Antigravity
   - tenta associar cada sessao ao projeto pelos arquivos detectados
   - cruza a sessao com o Git do repo
   - salva tudo no vault
4. Ao clicar no projeto depois, o app tenta abrir o ultimo scan salvo no vault.

## Vault local

Por padrao o Brain-Sync guarda os dados em:

`C:\Users\<usuario>\BrainSyncVault`

Estrutura:

```text
BrainSyncVault/
  projects/
    <project-id>-<project-slug>/
      project.json
      scans/
        latest_scan.json
        latest_sessions.json
        2026-03-21T...json
      sessions/
        <session-id>/
          session.json
          artifacts/
            <copias-dos-arquivos-da-sessao>
```

Descricao:

- `project.json`: metadados do projeto e local do vault
- `scans/latest_scan.json`: resumo do ultimo scan
- `scans/latest_sessions.json`: sessoes completas do ultimo scan, usadas para abrir o projeto sem reescanear
- `scans/<timestamp>.json`: historico de scans completos
- `sessions/<session-id>/session.json`: payload completo da sessao
- `sessions/<session-id>/artifacts/`: copia local dos artefatos encontrados para aquela sessao

Detalhamento extra da estrutura em [docs/VAULT_STRUCTURE.md](./docs/VAULT_STRUCTURE.md).

## Fontes lidas do Antigravity

O app observa principalmente:

- `~/.gemini/antigravity/brain`
- `~/.gemini/antigravity/conversations`
- `~/.gemini/antigravity/browser_recordings`

## Gerenciador do Antigravity

O Brain-Sync ja exibe um resumo de armazenamento do Antigravity e lista as sessoes de `browser_recordings`.

No estado atual:

- mostra tamanho e contagem de arquivos por bucket
- lista sessoes de browser recordings ordenadas por tamanho
- permite excluir uma sessao de browser recording

Atencao:

- a exclusao feita por esse gerenciador remove os arquivos do Antigravity
- essa acao nao pode ser desfeita pelo app

## Fluxograma

Cada sessao agora tem um botao `Ver fluxograma`.

Essa visualizacao:

- abre em modal separado
- mostra bolinhas para sessao, artefatos e arquivos modificados
- permite arrastar os nodes para explorar as ligacoes

## Limites atuais

- o app ainda nao decodifica o `.pb` para mostrar o prompt original exato digitado pelo usuario
- a associacao de commits por sessao continua sendo heuristica, baseada em arquivos e proximidade temporal
- o fluxograma atual e uma visualizacao interativa simples, nao um parser completo da conversa

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
