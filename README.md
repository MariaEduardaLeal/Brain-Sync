# 🧠 Brain-Sync: IA Organizational Memory

**Brain-Sync** é um aplicativo desktop desenvolvido com **Electron**, **Vue 3** e **TypeScript**, projetado para atuar como um "Provedor de Contexto (Context as a Service)". O objetivo central é capturar, estruturar e gerenciar a "memória organizacional" das interações com IAs (como o Antigravity), permitindo que logs de execução e walkthroughs sejam transformados em conhecimento útil para futuras sessões e onboarding.

![Aesthetic Dashboard](https://img.shields.io/badge/UI-Premium_Dark-blueviolet)
![Architecture](https://img.shields.io/badge/Architecture-Decentralized_BYOD-blue)

## 🚀 Visão Geral

Diferente de sistemas centralizados, o Brain-Sync adota uma abordagem **BYOD (Bring Your Own Database)** descentralizada:
- **Metadados Locais**: A lista de projetos e configurações é mantida em um repositório JSON local.
- **Isolamento de Dados**: Cada projeto possui seu próprio banco de dados MySQL, garantindo que os logs de desenvolvimento fiquem junto com o código/projeto do usuário.
- **Contexto Vivo**: Monitora em tempo real a criação de artefatos (como `walkthrough.md`) e os sincroniza automaticamente com o banco de dados.

## ✨ Funcionalidades Principais

- **Auto-Discovery**: Ao adicionar um novo projeto, o app faz o *probing* automático do arquivo `.env` para extrair credenciais do MySQL.
- **Auto-Schema**: Se o banco de dados do projeto não existir ou estiver vazio, o Brain-Sync inicializa as tabelas necessárias automaticamente.
- **Monitoramento Ativo**: Utiliza `Chokidar` para observar mudanças no sistema de arquivos e capturar logs assim que são gerados pela IA.
- **UI Premium**: Interface construída com **Bootstrap 5**, utilizando conceitos de *Glassmorphism*, animações suaves e um Dark Mode otimizado para desenvolvedores.

## 🛠️ Stack Tecnológica

- **Frontend**: Vue 3 (Composition API), Vite, Bootstrap 5.
- **Backend/Desktop**: Electron, Node.js.
- **Banco de Dados**: MySQL (via `mysql2/promise`).
- **Serviços**: File Watcher (Chokidar), Env Discovery (Dotenv).

## ⚙️ Instalação e Uso

### Requisitos
- [Node.js](https://nodejs.org/) (versão LTS recomendada).
- Servidor MySQL ativo (local ou remoto).

### Passos
1. Clone este repositório:
   ```bash
   git clone https://github.com/seu-usuario/brain_sync_desktop.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o ambiente de desenvolvimento:
   ```bash
   npm run dev
   ```

## 📂 Estrutura do Projeto

- `src/`: Código fonte do frontend (Vue components, assets).
- `electron/`: Lógica do processo principal, serviços e repositórios.
- `electron/db/schema.sql`: Script de inicialização das tabelas do projeto.
- `electron/services/`: Serviços especializados (Watcher, Database, Env Discovery).

---
*Desenvolvido para transformar logs de IA em inteligência organizacional.*

## 👨‍💻 Como Distribuir o App (Build)

Para gerar o executável (.exe) e enviar para alguém:

1.  No terminal do projeto, rode:
    ```bash
    npm run build
    ```
2.  Aguarde o processo finalizar. Uma pasta chamada `release/0.0.0` (ou a versão atual) será criada.
3.  Dentro dessa pasta, você encontrará o arquivo:
    *   `Brain-Sync-Windows-0.0.0-Setup.exe` (Instalador padrão).
4.  Basta enviar esse arquivo `.exe` para a pessoa!

> [!TIP]
> Você também pode encontrar uma pasta `win-unpacked` dentro de `release` se quiser rodar o app sem instalar em outras máquinas Windows.
