# Componente: AIFlowchart.vue

Responsável por renderizar a "linha do tempo de raciocínio" de uma sessão específica.

- **Arquivo**: `src/components/AIFlowchart.vue`
- **Responsabilidade**: Renderização de Markdown e exibição de histórico de artefatos.

## 🧩 Seções de Renderização

- **Header**: Exibe ID, timestamps, branch git e botão para ver fluxograma completo.
- **Content Grid**: Três colunas fixas:
    - **Tasks**: Baseado em `task.md`.
    - **Plano**: Baseado em `implementation_plan.md`.
    - **Execução**: Baseado em `walkthrough.md`.
- **Histórico**: Seção expansível (`details`) que lista versões anteriores dos artefatos (`.resolved`).
- **Git Connected**: Lista de commits associados e informações do repositório.
- **Arquivos**: Badge cloud de arquivos modificados e fontes arquivadas.

## 🛠️ Lógica de Renderização

- **Markdown**: Usa a biblioteca `marked` com proteção `xss`.
- **Checklists**: Possui lógica personalizada para renderizar `[x]` como checkboxes visuais.
- **Formatação**: Função `format_datetime` para tratamento de strings ISO.

---
[[05 - Componentes/Índice|Voltar para a lista de Componentes]]
