import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

type StorageBucketKey = 'brain' | 'conversations' | 'browser_recordings'

export interface StorageBucketSummary {
    key: StorageBucketKey
    label: string
    folder_path: string
    exists: boolean
    file_count: number
    total_bytes: number
}

export interface RecordingSessionSummary {
    session_id: string
    folder_path: string
    file_count: number
    total_bytes: number
    preview_files: string[]
}

export class AntigravityStorageService {
    private readonly antigravity_root = path.join(os.homedir(), '.gemini', 'antigravity')
    private readonly brain_path = path.join(this.antigravity_root, 'brain')
    private readonly conversations_path = path.join(this.antigravity_root, 'conversations')
    private readonly browser_recordings_path = path.join(this.antigravity_root, 'browser_recordings')

    public get_storage_summary() {
        return {
            root_path: this.antigravity_root,
            buckets: [
                this.build_bucket_summary('brain', 'Brain'),
                this.build_bucket_summary('conversations', 'Conversations'),
                this.build_bucket_summary('browser_recordings', 'Browser recordings')
            ],
            recording_sessions: this.list_recording_sessions()
        }
    }

    public delete_recording_session(session_id: string): { success: boolean; deleted_path: string } {
        const target_path = path.join(this.browser_recordings_path, session_id)
        if (!fs.existsSync(target_path)) {
            throw new Error(`Sessao de browser recording nao encontrada: ${session_id}`)
        }

        fs.rmSync(target_path, { recursive: true, force: false })
        return {
            success: true,
            deleted_path: target_path
        }
    }

    private build_bucket_summary(key: StorageBucketKey, label: string): StorageBucketSummary {
        const folder_path = this.get_bucket_path(key)
        if (!fs.existsSync(folder_path)) {
            return {
                key,
                label,
                folder_path,
                exists: false,
                file_count: 0,
                total_bytes: 0
            }
        }

        const stats = this.measure_tree(folder_path)
        return {
            key,
            label,
            folder_path,
            exists: true,
            file_count: stats.file_count,
            total_bytes: stats.total_bytes
        }
    }

    private list_recording_sessions(): RecordingSessionSummary[] {
        if (!fs.existsSync(this.browser_recordings_path)) {
            return []
        }

        const dirents = fs.readdirSync(this.browser_recordings_path, { withFileTypes: true })
        return dirents
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                const folder_path = path.join(this.browser_recordings_path, dirent.name)
                const files = this.list_files(folder_path)
                const total_bytes = files.reduce((sum, file_path) => sum + fs.statSync(file_path).size, 0)
                return {
                    session_id: dirent.name,
                    folder_path,
                    file_count: files.length,
                    total_bytes,
                    preview_files: files.slice(0, 6)
                } satisfies RecordingSessionSummary
            })
            .sort((left, right) => right.total_bytes - left.total_bytes)
    }

    private get_bucket_path(key: StorageBucketKey): string {
        if (key === 'brain') return this.brain_path
        if (key === 'conversations') return this.conversations_path
        return this.browser_recordings_path
    }

    private measure_tree(root_path: string): { file_count: number; total_bytes: number } {
        const files = this.list_files(root_path)
        return {
            file_count: files.length,
            total_bytes: files.reduce((sum, file_path) => sum + fs.statSync(file_path).size, 0)
        }
    }

    private list_files(root_path: string): string[] {
        const results: string[] = []

        const visit = (current_path: string) => {
            const dirents = fs.readdirSync(current_path, { withFileTypes: true })
            for (const dirent of dirents) {
                const full_path = path.join(current_path, dirent.name)
                if (dirent.isDirectory()) {
                    visit(full_path)
                } else if (dirent.isFile()) {
                    results.push(full_path)
                }
            }
        }

        visit(root_path)
        return results
    }
}
