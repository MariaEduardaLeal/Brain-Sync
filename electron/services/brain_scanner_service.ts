import * as fs from 'fs';
import * as path from 'path';
import { ProjectMetadata } from '../repositories/project_repository';

/**
 * Estrutura representando uma sessão completa de raciocínio da IA.
 */
export interface AIReasoningSession {
    session_id: string;
    task_content: string | null;
    plan_content: string | null;
    walkthrough_content: string | null;
    modified_files: string[];
    project_id?: number;
    match_reason?: string;
}

/**
 * Serviço responsável por varrer o diretório "brain" gerado pelo Antigravity,
 * parsear os artefatos de pensamento (task, plan, walkthrough),
 * e extrair arquivos modificados e associá-los a projetos.
 */
export class BrainScannerService {
    
    // Caminho base do "cérebro" do Antigravity
    private brain_path = 'C:\\Users\\mmedu\\.gemini\\antigravity\\brain';

    constructor() {}

    /**
     * Realiza a varredura primária na pasta 'brain', iterando em cada subpasta (session).
     * @param project_filter Se fornecido, retorna apenas sessões que pertençam a este projeto.
     */
    public async scan_historical_data(project_filter?: ProjectMetadata): Promise<AIReasoningSession[]> {
        if (!fs.existsSync(this.brain_path)) {
            console.warn(`[BrainScanner] Caminho não encontrado: ${this.brain_path}`);
            return [];
        }

        console.log(`[BrainScanner] Iniciando varredura em: ${this.brain_path}`);
        
        try {
            const dirents = await fs.promises.readdir(this.brain_path, { withFileTypes: true });
            const session_folders = dirents
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            const sessions: AIReasoningSession[] = [];

            // Usando Promise.all para processar paralelamente e não travar a UI
            const process_promises = session_folders.map(session_id => 
                this.process_session_folder(session_id, project_filter)
            );

            const results = await Promise.all(process_promises);
            
            // Filtra nulos (pastas puladas ou que não pertencem ao projeto selecionado)
            for (const res of results) {
                if (res !== null) sessions.push(res);
            }

            console.log(`[BrainScanner] Varredura concluída. ${sessions.length} sessões encontradas.`);
            return sessions;
        } catch (error) {
            console.error('[BrainScanner] Erro fatal durante a varredura:', error);
            throw error;
        }
    }

    /**
     * Processa uma única subpasta (sessão) dentro do cérebro.
     */
    private async process_session_folder(session_id: string, project_filter?: ProjectMetadata): Promise<AIReasoningSession | null> {
        const folder_path = path.join(this.brain_path, session_id);
        
        // Caminhos dos artefatos
        const task_path = path.join(folder_path, 'task.md');
        const plan_path = path.join(folder_path, 'implementation_plan.md');
        const walk_path = path.join(folder_path, 'walkthrough.md');

        const has_task = fs.existsSync(task_path);
        const has_plan = fs.existsSync(plan_path);
        const has_walk = fs.existsSync(walk_path);

        // Se não possui nenhum artefato relevante, ignora a pasta
        if (!has_task && !has_plan && !has_walk) {
            return null;
        }

        const task_content = has_task ? await fs.promises.readFile(task_path, 'utf8') : null;
        const plan_content = has_plan ? await fs.promises.readFile(plan_path, 'utf8') : null;
        const walkthrough_content = has_walk ? await fs.promises.readFile(walk_path, 'utf8') : null;

        // Extrai os caminhos absolutos dos arquivos usando Regex
        const modified_files = this.extract_file_paths(
            (task_content || '') + (plan_content || '') + (walkthrough_content || '')
        );

        // Se passarmos um filtro de projeto, temos que garantir que essa sessão pertence a ele
        if (project_filter) {
            // Caminho do projeto normalizado para comparação
            const normalized_project_path = path.normalize(project_filter.local_path).toLowerCase().replace(/\\/g, '/');

            // Filtra apenas arquivos que pertencem a este projeto (case-insensitive e slash-agnostic)
            const project_files = [...new Set(modified_files.filter(f => {
                const normalized_f = path.normalize(f).toLowerCase().replace(/\\/g, '/');
                return normalized_f.startsWith(normalized_project_path);
            }))];

            // Heurística de Precisão: Só associa se detectou pelo menos 1 arquivo modificado deste projeto
            if (project_files.length > 0) {
                const match_reason = `Detectado vínculo através de ${project_files.length} arquivo(s), ex: ${this.get_filename(project_files[0])}`;
                
                return {
                    session_id,
                    project_id: project_filter.id,
                    task_content,
                    plan_content,
                    walkthrough_content,
                    modified_files: project_files,
                    match_reason // Novo campo para dar feedback ao usuário
                };
            } else {
                // Se um filtro de projeto foi fornecido, mas nenhum arquivo modificado pertence a ele, ignorar a sessão.
                return null;
            }
        }

        // Se não há filtro de projeto, retorna a sessão com todos os arquivos modificados
        return {
            session_id,
            task_content,
            plan_content,
            walkthrough_content,
            modified_files
        };
    }

    /**
     * Busca padrões de links de arquivos no Markdown [NEW/MODIFY/DELETE] [nome](file:///c:/caminho).
     * Retorna um array de caminhos normalizados.
     */
    private extract_file_paths(content: string): string[] {
        const paths = new Set<string>();
        
        // Procura por (file:///C:/...) ou (file:///c%3A/...)
        const regex = /\(file:\/\/\/(.*?)\)/gi;
        let match;

        while ((match = regex.exec(content)) !== null) {
            let extracted_path = match[1];
            
            // Decodifica URL encode (ex: c%3A -> c:)
            extracted_path = decodeURIComponent(extracted_path);
            
            // No Windows via URI `file:///C:/` as barras vêm invertidas, 
            // no JS puro path.normalize ajuda a colocar barras certas
            extracted_path = path.normalize(extracted_path);
            
            paths.add(extracted_path);
        }

        return Array.from(paths);
    }

    private get_filename(filepath: string): string {
        return filepath.split(/[\\/]/).pop() || filepath;
    }
}
