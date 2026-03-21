import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface que define a estrutura de um Projeto nos metadados locais.
 */
export interface ProjectMetadata {
    id: number;
    name: string;
    local_path: string;
    vault_path?: string;
    db_host?: string;
    db_user?: string;
    db_pass?: string;
    db_name?: string;
    no_database?: boolean;
    created_at: string;
}

/**
 * Repositório responsável pela persistência da lista de projetos em arquivo JSON local.
 * 
 * Seguindo a nova arquitetura descentralizada, os metadados dos projetos 
 * não ficam em um banco central, mas sim em um arquivo local do App.
 */
export class ProjectRepository {
    private storage_path: string;

    /**
     * @param {string} user_data_path Caminho do diretório de dados do usuário (Electron userData).
     */
    constructor(user_data_path: string) {
        this.storage_path = path.join(user_data_path, 'brain_sync_projects.json');
        this.ensure_storage_exists();
    }

    /**
     * Garante que o arquivo JSON existe, inicializando-o se necessário.
     */
    private ensure_storage_exists(): void {
        if (!fs.existsSync(this.storage_path)) {
            console.log(`[ProjectRepository] Inicializando storage local em: ${this.storage_path}`);
            fs.writeFileSync(this.storage_path, JSON.stringify([], null, 2));
        }
    }

    /**
     * Lê todos os projetos do arquivo JSON.
     * 
     * @return {ProjectMetadata[]}
     */
    public get_all_projects(): ProjectMetadata[] {
        try {
            const data = fs.readFileSync(this.storage_path, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('[ProjectRepository] Erro ao ler projetos:', error);
            return [];
        }
    }

    /**
     * Salva um novo projeto na lista local.
     * 
     * @param {Omit<ProjectMetadata, 'id' | 'created_at'>} project_data 
     * @return {number} ID do projeto criado.
     */
    public save_project(project_data: any): number {
        const projects = this.get_all_projects();
        
        const new_id = projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1;
        const new_project: ProjectMetadata = {
            ...project_data,
            id: new_id,
            created_at: new Date().toISOString()
        };

        projects.push(new_project);
        this.persist(projects);
        
        console.log(`[ProjectRepository] Projeto "${new_project.name}" salvo localmente.`);
        return new_id;
    }

    /**
     * Busca um projeto pelo ID.
     */
    public get_project_by_id(id: number): ProjectMetadata | null {
        const projects = this.get_all_projects();
        return projects.find(p => p.id === id) || null;
    }

    /**
     * Atualiza um projeto existente.
     */
    public update_project(project_data: ProjectMetadata): boolean {
        const projects = this.get_all_projects();
        const index = projects.findIndex(project => project.id === project_data.id);

        if (index === -1) {
            return false;
        }

        projects[index] = project_data;
        this.persist(projects);
        return true;
    }

    /**
     * Remove um projeto da lista local pelo ID.
     */
    public delete_project(id: number): boolean {
        const projects = this.get_all_projects();
        const initial_length = projects.length;
        const remaining = projects.filter(p => p.id !== id);
        
        if (remaining.length < initial_length) {
            this.persist(remaining);
            console.log(`[ProjectRepository] Projeto ID ${id} removido.`);
            return true;
        }
        return false;
    }

    /**
     * Persiste a lista completa no arquivo.
     */
    private persist(projects: ProjectMetadata[]): void {
        fs.writeFileSync(this.storage_path, JSON.stringify(projects, null, 2));
    }
}
