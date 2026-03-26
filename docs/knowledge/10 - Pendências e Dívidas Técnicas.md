# Pendências e Dívidas Técnicas

Registro de itens identificados durante a análise técnica que necessitam de atenção ou melhoria.

## ⚠️ Itens Depreciados (Refatoração Necessária)

- **`database_connect_request`**: Função no `main.ts` retornando `deprecated: true`. O sistema está migrando para um modelo totalmente baseado em arquivos e Vault local.
- **`project_probe_env_request`**: Funcionalidade de autodetecção de credenciais MySQL marcada como depreciada.
- **MySQL Legacy**: O script `schema.sql` ainda foca em MySQL, mas o `ProjectRepository` utiliza JSON. É necessário unificar a camada de dados ou remover o código órfão.

## 🛠️ Sugestões de Evolução

- **Performance do Scan**: Atualmente o scan lê os artefatos de texto e roda Regex em cada execução. Poderia ser implementado um banco SQLite local para indexar caminhos de arquivos e acelerar buscas em projetos com milhares de sessões.
- **Visualização de Grafo**: O componente `SessionGraphModal` está presente, mas a lógica de construção do grafo de dependências entre arquivos poderia ser mais profunda (hoje é baseada apenas em menções textuais).
- **Integridade do Vault**: Adicionar verificações de Checksum (MD5/SHA) ao copiar arquivos para o Vault para garantir que o histórico não foi corrompido.

---
Voltar para [[00 - Índice]]
