import * as fs from 'fs';
import * as mysql from 'mysql2/promise';

export class DatabaseService {
    private connection_pool: mysql.Pool | null = null;

    public async connect(config: mysql.PoolOptions, schema_path: string): Promise<void> {
        try {
            console.log(`[DatabaseService] Verificando existencia do banco "${config.database}"...`);

            const temp_conn = await mysql.createConnection({
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password
            });

            await temp_conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\`;`);
            await temp_conn.end();

            if (this.connection_pool) {
                await this.disconnect();
            }

            this.connection_pool = mysql.createPool({
                ...config,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });

            await this.connection_pool.getConnection();
            await this.initialize_database(schema_path);
        } catch (error) {
            console.error('[DatabaseService] Falha na conexao ou criacao do banco:', error);
            throw new Error(`Erro ao conectar ao banco de dados: ${String(error)}`);
        }
    }

    public async initialize_database(schema_path: string): Promise<void> {
        if (!this.connection_pool) {
            throw new Error('Banco de dados nao conectado.');
        }

        try {
            const sql_content = fs.readFileSync(schema_path, 'utf8');
            const queries = sql_content
                .split(';')
                .map(query => query.trim())
                .filter(query => query.length > 0);

            for (const query of queries) {
                await this.connection_pool.query(query);
            }

            await this.ensure_reasoning_columns();
            console.log('[DatabaseService] Banco de dados inicializado com sucesso.');
        } catch (error) {
            console.error('[DatabaseService] Erro na inicializacao:', error);
            throw error;
        }
    }

    public async query(sql: string, params: any[] = []): Promise<any> {
        if (!this.connection_pool) {
            throw new Error('Conexao com banco de dados indisponivel.');
        }

        return await this.connection_pool.query(sql, params);
    }

    public async save_reasoning_scan_transaction(reasoning_data: any[]): Promise<void> {
        if (!this.connection_pool) {
            throw new Error('Conexao com banco de dados indisponivel.');
        }

        const conn = await this.connection_pool.getConnection();
        await conn.beginTransaction();

        try {
            for (const item of reasoning_data) {
                const sql = `
                    INSERT INTO brain_sync_ai_reasoning (
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
                        browser_recording_count,
                        git_evidence
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                        git_evidence = VALUES(git_evidence),
                        scanned_at = CURRENT_TIMESTAMP
                `;

                await conn.query({
                    sql,
                    values: [
                        item.session_id,
                        item.task_content || null,
                        item.plan_content || null,
                        item.walkthrough_content || null,
                        JSON.stringify(item.modified_files || []),
                        item.all_text_content || null,
                        JSON.stringify(item.artifact_summaries || {}),
                        JSON.stringify(item.session_files || []),
                        JSON.stringify(item.media_files || []),
                        JSON.stringify(item.browser_recording_files || []),
                        item.browser_recording_count || 0,
                        JSON.stringify(item.git_evidence || {})
                    ]
                });
            }

            await conn.commit();
            console.log(`[DatabaseService] Transacao concluida: ${reasoning_data.length} registros salvos.`);
        } catch (error) {
            await conn.rollback();
            console.error('[DatabaseService] Erro na transacao de salvamento:', error);
            throw error;
        } finally {
            conn.release();
        }
    }

    public async disconnect(): Promise<void> {
        if (this.connection_pool) {
            await this.connection_pool.end();
            this.connection_pool = null;
        }
    }

    private async ensure_reasoning_columns(): Promise<void> {
        if (!this.connection_pool) {
            throw new Error('Banco de dados nao conectado.');
        }

        const required_columns = [
            { name: 'all_text_content', definition: 'LONGTEXT' },
            { name: 'artifact_summaries', definition: 'JSON' },
            { name: 'session_files', definition: 'JSON' },
            { name: 'media_files', definition: 'JSON' },
            { name: 'browser_recording_files', definition: 'JSON' },
            { name: 'browser_recording_count', definition: 'INT DEFAULT 0' },
            { name: 'git_evidence', definition: 'JSON' }
        ];

        for (const column of required_columns) {
            const [rows] = await this.connection_pool.query(
                `
                    SELECT COUNT(*) AS count
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'brain_sync_ai_reasoning'
                      AND COLUMN_NAME = ?
                `,
                [column.name]
            ) as any;

            if (rows[0]?.count === 0) {
                await this.connection_pool.query(
                    `ALTER TABLE brain_sync_ai_reasoning ADD COLUMN ${column.name} ${column.definition}`
                );
            }
        }
    }
}
