import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Interface que define as credenciais de banco de dados extraídas.
 */
export interface DatabaseCredentials {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
}

/**
 * Serviço especializado em descobrir e extrair configurações de ambiente (.env).
 */
export class EnvDiscoveryService {
    /**
     * Tenta localizar e ler um arquivo .env no diretório fornecido.
     * 
     * @param {string} project_path Caminho absoluto da pasta do projeto.
     * @return {DatabaseCredentials | null} Objeto com as credenciais ou null se não for encontrado.
     */
    public probe_project_env(project_path: string): DatabaseCredentials | null {
        const env_path = path.join(project_path, '.env');

        if (!fs.existsSync(env_path)) {
            console.log(`[EnvDiscovery] Arquivo .env não encontrado em: ${project_path}`);
            return null;
        }

        try {
            const env_content = fs.readFileSync(env_path);
            const parsed_env = dotenv.parse(env_content);

            // Mapeamento de variáveis comuns (Laravel, Node, etc)
            const credentials: DatabaseCredentials = {
                host: parsed_env.DB_HOST || parsed_env.MYSQL_HOST || 'localhost',
                port: parseInt(parsed_env.DB_PORT || parsed_env.MYSQL_PORT || '3306'),
                user: parsed_env.DB_USERNAME || parsed_env.DB_USER || parsed_env.MYSQL_USER,
                password: parsed_env.DB_PASSWORD || parsed_env.MYSQL_PASSWORD,
                database: parsed_env.DB_DATABASE || parsed_env.MYSQL_DATABASE || parsed_env.DB_NAME
            };

            console.log(`[EnvDiscovery] Configurações detectadas para o banco: ${credentials.database}`);
            return credentials;
        } catch (error) {
            console.error(`[EnvDiscovery] Erro ao processar .env: ${error}`);
            return null;
        }
    }
}
