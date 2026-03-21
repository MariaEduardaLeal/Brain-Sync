import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { AIReasoningSession } from './brain_scanner_service'
import { ProjectMetadata } from '../repositories/project_repository'

export class ProjectContextArchiveService {
    private readonly vault_root = path.join(os.homedir(), 'BrainSyncVault')

    public get_vault_root(): string {
        this.ensure_dir(this.vault_root)
        return this.vault_root
    }

    public ensure_project_vault(project: Pick<ProjectMetadata, 'name' | 'local_path' | 'id' | 'created_at'> & { vault_path?: string }): string {
        const explicit_path = project.vault_path
        const project_path = explicit_path || path.join(this.vault_root, 'projects', this.build_project_slug(project))

        this.ensure_dir(project_path)
        this.ensure_dir(path.join(project_path, 'scans'))
        this.ensure_dir(path.join(project_path, 'sessions'))

        return project_path
    }

    public archive_project_scan(project: ProjectMetadata, sessions: AIReasoningSession[]): void {
        const project_vault = this.ensure_project_vault(project)
        const scan_stamp = new Date().toISOString().replace(/[:.]/g, '-')
        const scans_dir = path.join(project_vault, 'scans')
        const sessions_dir = path.join(project_vault, 'sessions')

        this.write_json(path.join(project_vault, 'project.json'), {
            id: project.id,
            name: project.name,
            local_path: project.local_path,
            vault_path: project_vault,
            archived_at: new Date().toISOString()
        })

        this.write_json(path.join(scans_dir, 'latest_scan.json'), {
            project_id: project.id,
            project_name: project.name,
            generated_at: new Date().toISOString(),
            session_count: sessions.length,
            sessions: sessions.map(session => ({
                session_id: session.session_id,
                user_request_content: session.user_request_content,
                session_started_at: session.session_started_at,
                session_updated_at: session.session_updated_at,
                git_remote_url: session.git_evidence?.remote_url || null
            }))
        })

        this.write_json(path.join(scans_dir, 'latest_sessions.json'), sessions)

        this.write_json(path.join(scans_dir, `${scan_stamp}.json`), sessions)

        for (const session of sessions) {
            const session_dir = path.join(sessions_dir, session.session_id)
            const artifacts_dir = path.join(session_dir, 'artifacts')
            this.ensure_dir(session_dir)
            this.ensure_dir(artifacts_dir)

            this.write_json(path.join(session_dir, 'session.json'), session)

            const files_to_copy = [
                ...session.context_source_files,
                ...session.browser_recording_files,
                ...session.media_files,
                ...(session.conversation_artifact?.exists ? [session.conversation_artifact.file_path] : [])
            ]

            for (const file_path of [...new Set(files_to_copy)]) {
                this.copy_if_exists(file_path, path.join(artifacts_dir, this.safe_artifact_name(file_path)))
            }
        }
    }

    public load_latest_scan(project: ProjectMetadata): AIReasoningSession[] {
        const project_vault = this.ensure_project_vault(project)
        const latest_sessions_path = path.join(project_vault, 'scans', 'latest_sessions.json')

        if (!fs.existsSync(latest_sessions_path)) {
            return []
        }

        try {
            const content = fs.readFileSync(latest_sessions_path, 'utf8')
            const parsed = JSON.parse(content)
            return Array.isArray(parsed) ? parsed as AIReasoningSession[] : []
        } catch (error) {
            console.warn(`[ProjectContextArchive] Falha ao ler latest_sessions.json: ${String(error)}`)
            return []
        }
    }

    private build_project_slug(project: Pick<ProjectMetadata, 'name' | 'id'>): string {
        const safe_name = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project'
        return `${project.id}-${safe_name}`
    }

    private safe_artifact_name(file_path: string): string {
        return file_path
            .replace(/[:\\\/]+/g, '__')
            .replace(/[^a-zA-Z0-9._-]+/g, '_')
            .slice(0, 220)
    }

    private copy_if_exists(source_path: string, target_path: string): void {
        try {
            if (!fs.existsSync(source_path)) {
                return
            }

            this.ensure_dir(path.dirname(target_path))
            fs.copyFileSync(source_path, target_path)
        } catch (error) {
            console.warn(`[ProjectContextArchive] Falha ao copiar "${source_path}": ${String(error)}`)
        }
    }

    private write_json(target_path: string, data: unknown): void {
        this.ensure_dir(path.dirname(target_path))
        fs.writeFileSync(target_path, JSON.stringify(data, null, 2), 'utf8')
    }

    private ensure_dir(target_path: string): void {
        fs.mkdirSync(target_path, { recursive: true })
    }
}
