import * as chokidar from 'chokidar'
import * as fs from 'fs'
import * as path from 'path'

export class FileWatcherService {
    private watcher_instance: chokidar.FSWatcher | null = null

    public start_watching(
        target_path: string,
        on_log_updated_callback: (file_path: string, content: string) => void
    ): void {
        this.stop_watching()

        console.log(`[Brain-Sync] Iniciando monitoramento em: ${target_path}`)

        this.watcher_instance = chokidar.watch(target_path, {
            ignored: [/node_modules/, /\.git/],
            persistent: true,
            ignoreInitial: true,
            depth: 4
        })

        this.watcher_instance.on('change', (changed_file_path: string) => {
            const file_name = path.basename(changed_file_path)

            if (!this.is_context_artifact(file_name)) {
                return
            }

            try {
                const file_content = fs.readFileSync(changed_file_path, 'utf8')
                console.log(`[Brain-Sync] Artefato detectado: ${changed_file_path}`)
                on_log_updated_callback(changed_file_path, file_content)
            } catch (error) {
                console.error(`[Brain-Sync] Erro ao ler artefato: ${error}`)
            }
        })

        this.watcher_instance.on('error', (error) => {
            console.error(`[Brain-Sync] Erro no watcher: ${error}`)
        })
    }

    public stop_watching(): void {
        if (this.watcher_instance) {
            this.watcher_instance.close()
            this.watcher_instance = null
            console.log('[Brain-Sync] Monitoramento encerrado.')
        }
    }

    private is_context_artifact(file_name: string): boolean {
        return [
            'task.md',
            'implementation_plan.md',
            'walkthrough.md'
        ].includes(file_name) || file_name.includes('.resolved')
    }
}
