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
    content: string | null;
    metadata: ArtifactMetadata | null;
}

interface ArtifactRevision {
    label: string;
    file_path: string;
    content: string | null;
    updated_at: string | null;
    is_current: boolean;
}

interface SessionArtifactBundle {
    current: SessionArtifact;
    history: ArtifactRevision[];
}

interface CachedSessionEntry {
    stamp: number;
    data: AIReasoningSession | null;
}

interface SessionFolderCandidate {
    session_id: string;
    folder_path: string;
    stamp: number;
}

export interface AIReasoningSession {
    session_id: string;
    user_request_content: string | null;
    task_content: string | null;
    plan_content: string | null;
    walkthrough_content: string | null;
    artifact_history: {
        task: ArtifactRevision[];
        plan: ArtifactRevision[];
        walkthrough: ArtifactRevision[];
    };
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
    context_source_files: string[];
    media_files: string[];
    browser_recording_files: string[];
    browser_recording_count: number;
    session_started_at: string | null;
    session_updated_at: string | null;
    conversation_artifact: {
        file_path: string;
        exists: boolean;
        size_bytes: number;
    };
    git_evidence?: {
        repo_root: string | null;
        branch: string | null;
        remote_url: string | null;
        status_files: string[];
        matching_status_files: string[];
        matching_recent_commits: Array<{
            hash: string;
            short_hash: string;
            author_name: string;
            authored_at: string;
            subject: string;
            body: string;
            files: string[];
        }>;
        overlap_files: string[];
    };
}

export class BrainScannerService {
    private static readonly SESSION_SCAN_LIMIT = 30;
    private static session_cache = new Map<string, CachedSessionEntry>();

    private antigravity_root = path.join(os.homedir(), '.gemini', 'antigravity');
    private brain_path = path.join(this.antigravity_root, 'brain');
    private conversations_path = path.join(this.antigravity_root, 'conversations');
    private browser_recordings_path = path.join(this.antigravity_root, 'browser_recordings');

    public async scan_historical_data(project_filter?: ProjectMetadata): Promise<AIReasoningSession[]> {
        if (!fs.existsSync(this.brain_path)) {
            console.warn(`[BrainScanner] Caminho nao encontrado: ${this.brain_path}`);
            return [];
        }

        const session_candidates = await this.get_recent_session_candidates();
        const sessions: AIReasoningSession[] = [];

        for (const candidate of session_candidates) {
            const session = await this.process_session_folder(candidate, project_filter);
            if (session) {
                sessions.push(session);
            }
        }

        return sessions.sort((a, b) => {
            const a_updated = this.get_latest_timestamp(a);
            const b_updated = this.get_latest_timestamp(b);
            return b_updated.localeCompare(a_updated);
        });
    }

    private async get_recent_session_candidates(): Promise<SessionFolderCandidate[]> {
        const dirents = await fs.promises.readdir(this.brain_path, { withFileTypes: true });
        const candidates: SessionFolderCandidate[] = [];

        for (const dirent of dirents) {
            if (!dirent.isDirectory() || dirent.name === 'tempmediaStorage') {
                continue;
            }

            const folder_path = path.join(this.brain_path, dirent.name);
            try {
                const stats = await fs.promises.stat(folder_path);
                candidates.push({
                    session_id: dirent.name,
                    folder_path,
                    stamp: stats.mtimeMs
                });
            } catch {
                // Ignore broken folders and continue.
            }
        }

        return candidates
            .sort((a, b) => b.stamp - a.stamp)
            .slice(0, BrainScannerService.SESSION_SCAN_LIMIT);
    }

    private async process_session_folder(candidate: SessionFolderCandidate, project_filter?: ProjectMetadata): Promise<AIReasoningSession | null> {
        const cached = BrainScannerService.session_cache.get(candidate.session_id);
        if (cached && cached.stamp === candidate.stamp) {
            return this.clone_for_project_filter(cached.data, project_filter);
        }

        const [task, plan, walkthrough] = await Promise.all([
            this.load_artifact_bundle(candidate.folder_path, 'task.md'),
            this.load_artifact_bundle(candidate.folder_path, 'implementation_plan.md'),
            this.load_artifact_bundle(candidate.folder_path, 'walkthrough.md')
        ]);

        if (!task.current.content && !plan.current.content && !walkthrough.current.content) {
            BrainScannerService.session_cache.set(candidate.session_id, { stamp: candidate.stamp, data: null });
            return null;
        }

        const session_files = await this.list_session_files_shallow(candidate.folder_path);
        const context_source_files = this.collect_context_source_files([
            ...session_files,
            ...task.history.map(item => item.file_path),
            ...plan.history.map(item => item.file_path),
            ...walkthrough.history.map(item => item.file_path)
        ]);
        const media_files = session_files.filter(file_path => this.is_media_file(file_path));
        const browser_recording_files = await this.list_browser_recording_preview(candidate.session_id);
        const browser_recording_count = await this.count_browser_recording_files(candidate.session_id);
        const conversation_artifact = await this.get_conversation_artifact(candidate.session_id);

        const all_text_parts = [
            task.current.content,
            plan.current.content,
            walkthrough.current.content,
            ...task.history.map(item => item.content),
            ...plan.history.map(item => item.content),
            ...walkthrough.history.map(item => item.content),
            task.current.metadata ? JSON.stringify(task.current.metadata, null, 2) : null,
            plan.current.metadata ? JSON.stringify(plan.current.metadata, null, 2) : null,
            walkthrough.current.metadata ? JSON.stringify(walkthrough.current.metadata, null, 2) : null
        ].filter((value): value is string => Boolean(value && value.trim()));

        const all_text_content = all_text_parts.join('\n\n');
        const modified_files = this.extract_file_paths(all_text_content);
        const session_started_at = this.get_session_started_at([task.history, plan.history, walkthrough.history]);
        const session_updated_at = this.get_session_updated_at(task.current.metadata, plan.current.metadata, walkthrough.current.metadata, candidate.stamp);
        const user_request_content = this.extract_user_request_content(task);

        const base_session: AIReasoningSession = {
            session_id: candidate.session_id,
            user_request_content,
            task_content: task.current.content,
            plan_content: plan.current.content,
            walkthrough_content: walkthrough.current.content,
            artifact_history: {
                task: task.history,
                plan: plan.history,
                walkthrough: walkthrough.history
            },
            modified_files,
            all_text_content,
            artifact_summaries: {
                task: task.current.metadata,
                plan: plan.current.metadata,
                walkthrough: walkthrough.current.metadata
            },
            session_files,
            context_source_files,
            media_files,
            browser_recording_files,
            browser_recording_count,
            session_started_at,
            session_updated_at,
            conversation_artifact
        };

        BrainScannerService.session_cache.set(candidate.session_id, {
            stamp: candidate.stamp,
            data: base_session
        });

        return this.clone_for_project_filter(base_session, project_filter);
    }

    private clone_for_project_filter(session: AIReasoningSession | null, project_filter?: ProjectMetadata): AIReasoningSession | null {
        if (!session) {
            return null;
        }

        if (!project_filter) {
            return { ...session };
        }

        const association = this.match_session_to_project(project_filter, session.modified_files);
        if (!association.matched) {
            return null;
        }

        return {
            ...session,
            project_id: project_filter.id,
            modified_files: association.project_files,
            match_reason: association.reason
        };
    }

    private async load_artifact(folder_path: string, filename: string): Promise<SessionArtifact> {
        const artifact_path = path.join(folder_path, filename);
        return {
            content: await this.read_optional_text(artifact_path),
            metadata: await this.read_optional_json(`${artifact_path}.metadata.json`)
        };
    }

    private async load_artifact_bundle(folder_path: string, filename: string): Promise<SessionArtifactBundle> {
        const current = await this.load_artifact(folder_path, filename);
        const history = await this.load_artifact_history(folder_path, filename, current.metadata?.updatedAt || null);

        return {
            current,
            history
        };
    }

    private async load_artifact_history(folder_path: string, filename: string, current_updated_at: string | null): Promise<ArtifactRevision[]> {
        if (!fs.existsSync(folder_path)) {
            return [];
        }

        const prefix = `${filename}.resolved`;
        const dirents = await fs.promises.readdir(folder_path, { withFileTypes: true });
        const candidates = dirents
            .filter(dirent => dirent.isFile() && dirent.name.startsWith(prefix))
            .map(dirent => dirent.name)
            .sort((a, b) => this.compare_resolved_names(a, b));

        const revisions: ArtifactRevision[] = await Promise.all(candidates.map(async name => {
            const file_path = path.join(folder_path, name);
            const stats = await fs.promises.stat(file_path);
            return {
                label: this.get_resolved_label(name, prefix),
                file_path,
                content: await this.read_optional_text(file_path),
                updated_at: stats.mtime.toISOString(),
                is_current: false
            } satisfies ArtifactRevision;
        }));

        const current_path = path.join(folder_path, filename);
        if (fs.existsSync(current_path)) {
            revisions.push({
                label: 'atual',
                file_path: current_path,
                content: await this.read_optional_text(current_path),
                updated_at: current_updated_at,
                is_current: true
            });
        }

        return revisions.filter(item => Boolean(item.content && item.content.trim()));
    }

    private async read_optional_text(file_path: string): Promise<string | null> {
        if (!fs.existsSync(file_path)) {
            return null;
        }

        try {
            return await fs.promises.readFile(file_path, 'utf8');
        } catch {
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
        } catch {
            return null;
        }
    }

    private async list_session_files_shallow(folder_path: string): Promise<string[]> {
        if (!fs.existsSync(folder_path)) {
            return [];
        }

        const dirents = await fs.promises.readdir(folder_path, { withFileTypes: true });
        return dirents
            .filter(dirent => dirent.isFile())
            .map(dirent => path.join(folder_path, dirent.name))
            .sort();
    }

    private collect_context_source_files(file_paths: string[]): string[] {
        return [...new Set(file_paths)].sort();
    }

    private async list_browser_recording_preview(session_id: string): Promise<string[]> {
        const recording_path = path.join(this.browser_recordings_path, session_id);
        if (!fs.existsSync(recording_path)) {
            return [];
        }

        const dirents = await fs.promises.readdir(recording_path, { withFileTypes: true });
        return dirents
            .filter(dirent => dirent.isFile())
            .slice(0, 5)
            .map(dirent => path.join(recording_path, dirent.name));
    }

    private async count_browser_recording_files(session_id: string): Promise<number> {
        const recording_path = path.join(this.browser_recordings_path, session_id);
        if (!fs.existsSync(recording_path)) {
            return 0;
        }

        const dirents = await fs.promises.readdir(recording_path, { withFileTypes: true });
        return dirents.filter(dirent => dirent.isFile()).length;
    }

    private async get_conversation_artifact(session_id: string): Promise<AIReasoningSession['conversation_artifact']> {
        const file_path = path.join(this.conversations_path, `${session_id}.pb`);
        if (!fs.existsSync(file_path)) {
            return {
                file_path,
                exists: false,
                size_bytes: 0
            };
        }

        const stats = await fs.promises.stat(file_path);
        return {
            file_path,
            exists: true,
            size_bytes: stats.size
        };
    }

    private match_session_to_project(project_filter: ProjectMetadata, modified_files: string[]) {
        let normalized_project_path = this.normalize_path(project_filter.local_path);
        if (!normalized_project_path.endsWith('\\')) {
            normalized_project_path += '\\';
        }

        const project_files = [...new Set(modified_files.filter(file_path => {
            return this.normalize_path(file_path).startsWith(normalized_project_path);
        }))];

        if (project_files.length > 0) {
            return {
                matched: true,
                project_files,
                reason: `Detectado vinculo atraves de ${project_files.length} arquivo(s), ex: ${this.get_filename(project_files[0])}`
            };
        }

        return {
            matched: false,
            project_files: [],
            reason: ''
        };
    }

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
            if (!raw) {
                continue;
            }

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

    private compare_resolved_names(left: string, right: string): number {
        return this.get_resolved_order(left) - this.get_resolved_order(right);
    }

    private get_resolved_order(name: string): number {
        const match = name.match(/\.resolved(?:\.(\d+))?$/);
        if (!match) {
            return Number.MAX_SAFE_INTEGER;
        }

        if (match[1] == null) {
            return Number.MAX_SAFE_INTEGER - 1;
        }

        return Number.parseInt(match[1], 10);
    }

    private get_resolved_label(name: string, prefix: string): string {
        if (name === prefix) {
            return 'resolvido-final';
        }

        const suffix = name.slice(prefix.length + 1);
        return `resolvido-${suffix}`;
    }

    private looks_like_absolute_path(target_path: string): boolean {
        return /^[a-z]:\\/.test(target_path);
    }

    private is_media_file(file_path: string): boolean {
        return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm'].includes(path.extname(file_path).toLowerCase());
    }

    private get_latest_timestamp(session: AIReasoningSession): string {
        return [
            session.session_updated_at,
            session.artifact_summaries.task?.updatedAt,
            session.artifact_summaries.plan?.updatedAt,
            session.artifact_summaries.walkthrough?.updatedAt
        ].filter((value): value is string => Boolean(value)).sort().pop() || '';
    }

    private get_session_started_at(groups: ArtifactRevision[][]): string | null {
        const timestamps = groups
            .flat()
            .map(item => item.updated_at)
            .filter((value): value is string => Boolean(value))
            .sort()

        return timestamps[0] || null;
    }

    private get_session_updated_at(
        task_metadata: ArtifactMetadata | null,
        plan_metadata: ArtifactMetadata | null,
        walkthrough_metadata: ArtifactMetadata | null,
        fallback_stamp: number
    ): string {
        return [
            task_metadata?.updatedAt,
            plan_metadata?.updatedAt,
            walkthrough_metadata?.updatedAt
        ].filter((value): value is string => Boolean(value)).sort().pop() || new Date(fallback_stamp).toISOString();
    }

    private extract_user_request_content(task_bundle: SessionArtifactBundle): string | null {
        const history_source = task_bundle.history.find(item => !item.is_current)?.content || task_bundle.current.content;
        if (!history_source) {
            return null;
        }

        return history_source.trim();
    }

    private get_filename(filepath: string): string {
        const base = filepath.split(/[\\/]/).pop() || filepath;
        return base.split('#')[0];
    }
}
