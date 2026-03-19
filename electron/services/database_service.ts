import * as mysql from 'mysql2/promise';
import * as fs from 'fs';

/**
 * Serviço central de gerenciamento de banco de dados MySQL.
 * 
 * Responsável por manter a conexão persistente e executar 
 * scripts de migração iniciais para garantir a consistência das tabelas.
 */
export class DatabaseService {
    private connection_pool: mysql.Pool | null = null;

    /**
     * Configura e estabelece a conexão com o servidor MySQL.
     * 
     * Regra de negócio: 
     * 1. Tenta criar o banco de dados caso ele não exista.
     * 2. Conecta ao pool.
     * 3. Inicializa as tabelas brain_sync_* se necessário.
     * 
     * @param {mysql.PoolOptions} config Objeto contendo credenciais de conexão.
     * @param {string} schema_path Caminho do script SQL de inicialização.
     * @return {Promise<void>}
     */
    public async connect(config: mysql.PoolOptions, schema_path: string): Promise<void> {
        try {
            console.log(`[DatabaseService] Verificando existência do banco "${config.database}"...`);
            
            // Conexão temporária sem database para criar o banco se necessário
            const temp_conn = await mysql.createConnection({
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password
            });

            await temp_conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\`;`);
            await temp_conn.end();

            console.log(`[DatabaseService] Banco "${config.database}" garantido. Conectando pool...`);

            
            // Se já houver um pool ativo, encerra-o antes de abrir um novo (BYOD Per-Project)
            if (this.connection_pool) {
                await this.disconnect();
            }

            this.connection_pool = mysql.createPool({
                ...config,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });

            // Testa a conexão definitiva e inicializa o schema
            await this.connection_pool.getConnection();
            console.log('[DatabaseService] Conexão pool estabelecida.');
            
            await this.initialize_database(schema_path);
        } catch (error) {
            console.error('[DatabaseService] Falha na conexão ou criação do banco:', error);
            throw new Error(`Erro ao conectar ao banco de dados: ${String(error)}`);
        }
    }

    /**
     * Inicializa as tabelas do sistema utilizando o script schema.sql.
     * 
     * @param {string} schema_path Caminho absoluto do arquivo SQL de schema.
     * @return {Promise<void>}
     */
    public async initialize_database(schema_path: string): Promise<void> {
        if (!this.connection_pool) {
            throw new Error('Banco de dados não conectado.');
        }

        try {
            const sql_content = fs.readFileSync(schema_path, 'utf8');
            const queries = sql_content
                .split(';')
                .map(q => q.trim())
                .filter(q => q.length > 0);

            console.log('[DatabaseService] Aplicando migrações (Schema)...');
            for (const query of queries) {
                await this.connection_pool.query(query);
            }
            console.log('[DatabaseService] Banco de dados inicializado com sucesso.');
        } catch (error) {
            console.error('[DatabaseService] Erro na inicialização:', error);
            throw error;
        }
    }

    /**
     * Executa uma consulta SQL no pool de conexões.
     * 
     * @param {string} sql String formatada do SQL.
     * @param {any[]} params Parâmetros para prevenir SQL Injection.
     * @return {Promise<any>}
     */
    public async query(sql: string, params: any[] = []): Promise<any> {
        if (!this.connection_pool) {
            throw new Error('Conexão com banco de dados indisponível.');
        }
        return await this.connection_pool.query(sql, params);
    }

    /**
     * Salva os ciclos completos de raciocínio da IA usando transação e UPSERT.
     * 
     * @param {any[]} reasoning_data Array de objetos contendo os logs parseados.
     */
    public async save_reasoning_scan_transaction(reasoning_data: any[]): Promise<void> {
        if (!this.connection_pool) {
            throw new Error('Conexão com banco de dados indisponível.');
        }

        const conn = await this.connection_pool.getConnection();
        await conn.beginTransaction();

        try {
            for (const item of reasoning_data) {
                const sql = `
                    INSERT INTO brain_sync_ai_reasoning 
                    (
                        session_id,
                        task_content,
                        plan_content,
                        walkthrough_content,
                        modified_files,
                        all_text_content,
                        artifact_summaries,
                        session_files,
                        media_files,
                        browser_recording_files,
                        browser_recording_count
                    ) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    task_content = VALUES(task_content),
                    plan_content = VALUES(plan_content),
                    walkthrough_content = VALUES(walkthrough_content),
                    modified_files = VALUES(modified_files),
                    all_text_content = VALUES(all_text_content),
                    artifact_summaries = VALUES(artifact_summaries),
                    session_files = VALUES(session_files),
                    media_files = VALUES(media_files),
                    browser_recording_files = VALUES(browser_recording_files),
                    browser_recording_count = VALUES(browser_recording_count),
                    scanned_at = CURRENT_TIMESTAMP
                `;
                
                const modified_files_json = JSON.stringify(item.modified_files || []);
                const artifact_summaries_json = JSON.stringify(item.artifact_summaries || {});
                const session_files_json = JSON.stringify(item.session_files || []);
                const media_files_json = JSON.stringify(item.media_files || []);
                const browser_recording_files_json = JSON.stringify(item.browser_recording_files || []);
                
                await conn.query({ sql, values: [
                    item.session_id,
                    item.task_content || null,
                    item.plan_content || null,
                    item.walkthrough_content || null,
                    modified_files_json,
                    item.all_text_content || null,
                    artifact_summaries_json,
                    session_files_json,
                    media_files_json,
                    browser_recording_files_json,
                    item.browser_recording_count || 0
                ]});
            }

            await conn.commit();
            console.log(`[DatabaseService] Transação concluída: ${reasoning_data.length} registros (Brain Scan) salvos.`);
        } catch (error) {
            await conn.rollback();
            console.error('[DatabaseService] Erro na transação de salvamento de raciocínio:', error);
            throw error;
        } finally {
            conn.release();
        }
    }

    /**
     * Encerra todas as conexões ativas no pool.
     */
    public async disconnect(): Promise<void> {
        if (this.connection_pool) {
            await this.connection_pool.end();
            this.connection_pool = null;
        }
    }
}
