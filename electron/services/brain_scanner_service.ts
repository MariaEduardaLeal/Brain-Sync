import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ProjectMetadata } from '../repositories/project_repository';

interface ArtifactMetadata {
    artifactType?: string;
    summary?: string;
    updatedAt?: string;
    version?: string;
}

interface SessionArtifact {
    name: string;
    path: string;
    content: string | null;
    metadata: ArtifactMetadata | null;
    resolved_versions: string[];
}

/**
 * Estrutura representando uma sessÃ£o completa de raciocÃ­nio da IA.
 */
export interface AIReasoningSession {
    session_id: string;
    task_content: string | null;
    plan_content: string | null;
    walkthrough_content: string | null;
    modified_files: string[];
    project_id?: number;
    match_reason?: string;
    all_text_content: string | null;
    artifact_summaries: {
        task?: ArtifactMetadata | null;
        plan?: ArtifactMetadata | null;
        walkthrough?: ArtifactMetadata | null;
    };
    session_files: string[];
    media_files: string[];
    browser_recording_files: string[];
    browser_recording_count: number;
}

/**
 * ServiÃ§o responsÃ¡vel por varrer o diretÃ³rio "brain" gerado pelo Antigravity,
 * parsear os artefatos de pensamento (task, plan, walkthrough),
 * e extrair arquivos modificados e associÃ¡-los a projetos.
 */
export class BrainScannerService {
    private antigravity_root = path.join(os.homedir(), '.gemini', 'antigravity');
    private brain_path = path.join(this.antigravity_root, 'brain');
    private browser_recordings_path = path.join(this.antigravity_root, 'browser_recordings');

    constructor() {}

    /**
     * Realiza a varredura primÃ¡ria na pasta 'brain', iterando em cada subpasta (session).
     * @param project_filter Se fornecido, retorna apenas sessÃµes que pertenÃ§am a este projeto.
     */
    public async scan_historical_data(project_filter?: ProjectMetadata): Promise<AIReasoningSession[]> {
        if (!fs.existsSync(this.brain_path)) {
            console.warn(`[BrainScanner] Caminho nÃ£o encontrado: ${this.brain_path}`);
            return [];
        }

        console.log(`[BrainScanner] Iniciando varredura em: ${this.brain_path}`);

        try {
            const dirents = await fs.promises.readdir(this.brain_path, { withFileTypes: true });
            const session_folders = dirents
                .filter(dirent => dirent.isDirectory() && dirent.name !== 'tempmediaStorage')
                .map(dirent => dirent.name);

            const process_promises = session_folders.map(session_id =>
                this.process_session_folder(session_id, project_filter)
            );

            const results = await Promise.all(process_promises);
            const sessions = results
                .filter((session): session is AIReasoningSession => session !== null)
                .sort((a, b) => {
                    const aUpdated = this.get_latest_timestamp(a);
                    const bUpdated = this.get_latest_timestamp(b);
                    return bUpdated.localeCompare(aUpdated);
                });

            console.log(`[BrainScanner] Varredura concluÃ­da. ${sessions.length} sessÃµes encontradas.`);
            return sessions;
        } catch (error) {
            console.error('[BrainScanner] Erro fatal durante a varredura:', error);
            throw error;
        }
    }

    /**
     * Processa uma Ãºnica subpasta (sessÃ£o) dentro do cÃ©rebro.
     */
    private async process_session_folder(session_id: string, project_filter?: ProjectMetadata): Promise<AIReasoningSession | null> {
        const folder_path = path.join(this.brain_path, session_id);
        const [task, plan, walkthrough] = await Promise.all([
            this.load_artifact(folder_path, 'task.md'),
            this.load_artifact(folder_path, 'implementation_plan.md'),
            this.load_artifact(folder_path, 'walkthrough.md')
        ]);

        if (!task.content && !plan.content && !walkthrough.content) {
            return null;
        }

        const session_files = await this.list_session_files(folder_path);
        const media_files = session_files.filter(file => this.is_media_file(file));
        const browser_recording_files = await this.list_browser_recording_files(session_id);

        const all_text_parts = [
            task.content,
            ...task.resolved_versions,
            plan.content,
            ...plan.resolved_versions,
            walkthrough.content,
            ...walkthrough.resolved_versions,
            task.metadata ? JSON.stringify(task.metadata, null, 2) : null,
            plan.metadata ? JSON.stringify(plan.metadata, null, 2) : null,
            walkthrough.metadata ? JSON.stringify(walkthrough.metadata, null, 2) : null
        ].filter((value): value is string => Boolean(value && value.trim()));

        const all_text_content = all_text_parts.join('\n\n');
        const modified_files = this.extract_file_paths(all_text_content);

        if (project_filter) {
            const association = this.match_session_to_project(project_filter, modified_files);
            if (!association.matched) {
                return null;
            }

            return {
                session_id,
                project_id: project_filter.id,
                task_content: task.content,
                plan_content: plan.content,
                walkthrough_content: walkthrough.content,
                modified_files: association.project_files,
                match_reason: association.reason,
                all_text_content,
                artifact_summaries: {
                    task: task.metadata,
                    plan: plan.metadata,
                    walkthrough: walkthrough.metadata
                },
                session_files,
                media_files,
                browser_recording_files,
                browser_recording_count: browser_recording_files.length
            };
        }

        return {
            session_id,
            task_content: task.content,
            plan_content: plan.content,
            walkthrough_content: walkthrough.content,
            modified_files,
            all_text_content,
            artifact_summaries: {
                task: task.metadata,
                plan: plan.metadata,
                walkthrough: walkthrough.metadata
            },
            session_files,
            media_files,
            browser_recording_files,
            browser_recording_count: browser_recording_files.length
        };
    }

    private async load_artifact(folder_path: string, filename: string): Promise<SessionArtifact> {
        const artifact_path = path.join(folder_path, filename);
        const metadata_path = `${artifact_path}.metadata.json`;
        const resolved_versions = await this.read_resolved_versions(artifact_path);

        return {
            name: filename,
            path: artifact_path,
            content: await this.read_optional_text(artifact_path),
            metadata: await this.read_optional_json(metadata_path),
            resolved_versions
        };
    }

    private async read_resolved_versions(artifact_path: string): Promise<string[]> {
        const parent = path.dirname(artifact_path);
        const basename = path.basename(artifact_path);

        if (!fs.existsSync(parent)) {
            return [];
        }

        const dirents = await fs.promises.readdir(parent, { withFileTypes: true });
        const resolved_files = dirents
            .filter(dirent => dirent.isFile() && dirent.name.startsWith(`${basename}.resolved`))
            .map(dirent => path.join(parent, dirent.name))
            .sort();

        const contents = await Promise.all(
            resolved_files.map(file_path => this.read_optional_text(file_path))
        );

        return contents.filter((value): value is string => Boolean(value && value.trim()));
    }

    private async read_optional_text(file_path: string): Promise<string | null> {
        if (!fs.existsSync(file_path)) {
            return null;
        }

        try {
            return await fs.promises.readFile(file_path, 'utf8');
        } catch (error) {
            console.warn(`[BrainScanner] NÃ£o foi possÃ­vel ler texto: ${file_path}`, error);
            return null;
        }
    }

    private async read_optional_json(file_path: string): Promise<ArtifactMetadata | null> {
        const raw = await this.read_optional_text(file_path);
        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw);
        } catch (error) {
            console.warn(`[BrainScanner] NÃ£o foi possÃ­vel ler metadata JSON: ${file_path}`, error);
            return null;
        }
    }

    private async list_session_files(folder_path: string): Promise<string[]> {
        if (!fs.existsSync(folder_path)) {
            return [];
        }

        const files: string[] = [];
        const walk = async (current_path: string): Promise<void> => {
            const dirents = await fs.promises.readdir(current_path, { withFileTypes: true });
            for (const dirent of dirents) {
                const full_path = path.join(current_path, dirent.name);
                if (dirent.isDirectory()) {
                    await walk(full_path);
                } else {
                    files.push(full_path);
                }
            }
        };

        await walk(folder_path);
        return files.sort();
    }

    private async list_browser_recording_files(session_id: string): Promise<string[]> {
        const recording_path = path.join(this.browser_recordings_path, session_id);
        if (!fs.existsSync(recording_path)) {
            return [];
        }

        const dirents = await fs.promises.readdir(recording_path, { withFileTypes: true });
        return dirents
            .filter(dirent => dirent.isFile())
            .map(dirent => path.join(recording_path, dirent.name))
            .sort();
    }

    private match_session_to_project(project_filter: ProjectMetadata, modified_files: string[]) {
        let normalized_project_path = this.normalize_path(project_filter.local_path);
        
        // Garante que a barra final exista para um pareamento exato do folder.
        // Assim "C:\app" não vai parear erradamente com "C:\app_backend\file.txt"
        if (!normalized_project_path.endsWith('\\')) {
            normalized_project_path += '\\';
        }

        const project_files = [...new Set(modified_files.filter(file_path => {
            const normalized_file_path = this.normalize_path(file_path);
            return normalized_file_path.startsWith(normalized_project_path);
        }))];

        if (project_files.length > 0) {
            return {
                matched: true,
                project_files,
                reason: `Detectado vínculo através de ${project_files.length} arquivo(s), ex: ${this.get_filename(project_files[0])}`
            };
        }

        return {
            matched: false,
            project_files: [],
            reason: ''
        };
    }

    /**
     * Busca padrÃµes de links de arquivos no Markdown [NEW/MODIFY/DELETE] [nome](file:///c:/caminho)
     * e tambÃ©m caminhos absolutos citados em texto puro.
     */
    private extract_file_paths(content: string): string[] {
        const paths = new Set<string>();

        const file_uri_regex = /\(file:\/\/\/(.*?)\)/gi;
        let file_uri_match: RegExpExecArray | null;
        while ((file_uri_match = file_uri_regex.exec(content)) !== null) {
            const normalized = this.normalize_path(decodeURIComponent(file_uri_match[1]));
            if (this.looks_like_absolute_path(normalized)) {
                paths.add(normalized);
            }
        }

        const windows_path_regex = /[a-zA-Z]:\\[^\s<>"'`)\]]+/g;
        const slash_path_regex = /[a-zA-Z]:\/[^\s<>"'`)\]]+/g;
        const quoted_path_regex = /(?:^|[\s(])([a-zA-Z]:\\[^"'`\r\n<>]+|[a-zA-Z]:\/[^"'`\r\n<>]+)/gm;

        this.collect_regex_paths(content, windows_path_regex, paths);
        this.collect_regex_paths(content, slash_path_regex, paths);
        this.collect_regex_paths(content, quoted_path_regex, paths, 1);

        return Array.from(paths).sort();
    }

    private collect_regex_paths(content: string, regex: RegExp, paths: Set<string>, capture_group = 0): void {
        let match: RegExpExecArray | null;
        while ((match = regex.exec(content)) !== null) {
            const raw = match[capture_group];
            if (!raw) continue;

            const cleaned = this.clean_candidate_path(raw);
            const normalized = this.normalize_path(cleaned);
            if (this.looks_like_absolute_path(normalized)) {
                paths.add(normalized);
            }
        }
    }

    private clean_candidate_path(candidate: string): string {
        return candidate
            .trim()
            .replace(/^[("'`\[]+/, '')
            .replace(/[>"'`\],.;:!?]+$/, '');
    }

    private normalize_path(target_path: string): string {
        return path.normalize(target_path).replace(/\//g, '\\').toLowerCase();
    }

    private looks_like_absolute_path(target_path: string): boolean {
        return /^[a-z]:\\/.test(target_path);
    }

    private is_media_file(file_path: string): boolean {
        return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm'].includes(path.extname(file_path).toLowerCase());
    }

    private get_latest_timestamp(session: AIReasoningSession): string {
        return [
            session.artifact_summaries.task?.updatedAt,
            session.artifact_summaries.plan?.updatedAt,
            session.artifact_summaries.walkthrough?.updatedAt
        ].filter((value): value is string => Boolean(value)).sort().pop() || '';
    }

    private get_filename(filepath: string): string {
        const base = filepath.split(/[\\/]/).pop() || filepath;
        // Remove anchors (e.g. #L10-L20) from the filename
        return base.split('#')[0];
    }
}
