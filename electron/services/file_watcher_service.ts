import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Serviço responsável por monitorar o diretório de artefatos do Antigravity.
 *
 * Regra de negócio: O monitoramento foca no diretório global do usuário,
 * especificamente na pasta '.gemini'. Ele detecta alterações em arquivos
 * 'walkthrough.md', que indicam a conclusão de uma tarefa pela IA.
 */
export class FileWatcherService {
    private watcher_instance: chokidar.FSWatcher | null = null;

    /**
     * Inicia o monitoramento do diretório de logs do Antigravity.
     *
     * @param {string} target_path Caminho absoluto do diretório a ser monitorado.
     * @param {Function} on_log_updated_callback Callback disparado ao detectar mudança no log.
     * @return {void}
     */
    public start_watching(
        target_path: string, 
        on_log_updated_callback: (file_path: string, content: string) => void
    ): void {
        this.stop_watching();

        console.log(`[Brain-Sync] Iniciando monitoramento em: ${target_path}`);

        this.watcher_instance = chokidar.watch(target_path, {
            ignored: [/node_modules/, /\.git/],
            persistent: true,
            ignoreInitial: true,
            depth: 3
        });

        this.watcher_instance.on('change', (changed_file_path: string) => {
            const file_name = path.basename(changed_file_path);

            if (file_name === 'walkthrough.md') {
                try {
                    const file_content = fs.readFileSync(changed_file_path, 'utf8');
                    console.log(`[Brain-Sync] Log detectado: ${changed_file_path}`);
                    on_log_updated_callback(changed_file_path, file_content);
                } catch (error) {
                    console.error(`[Brain-Sync] Erro ao ler walkthrough: ${error}`);
                }
            }
        });

        this.watcher_instance.on('error', (error) => {
            console.error(`[Brain-Sync] Erro no watcher: ${error}`);
        });
    }

    /**
     * Finaliza a instância ativa do watcher e libera recursos.
     *
     * @return {void}
     */
    public stop_watching(): void {
        if (this.watcher_instance) {
            this.watcher_instance.close();
            this.watcher_instance = null;
            console.log("[Brain-Sync] Monitoramento encerrado.");
        }
    }
}
