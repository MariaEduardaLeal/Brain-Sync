import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { FileWatcherService } from './services/file_watcher_service'
import { DatabaseService } from './services/database_service'
import { ProjectRepository } from './repositories/project_repository'
import { EnvDiscoveryService } from './services/env_discovery_service'
import { BrainScannerService } from './services/brain_scanner_service'

// Instancia os serviços globais
const database_service = new DatabaseService();
const file_watcher = new FileWatcherService();
const env_discovery = new EnvDiscoveryService();

// O ProjectRepository será instanciado após o app.whenReady() para acessar app.getPath()
let project_repository: ProjectRepository;

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Inicia o monitoramento dos logs do Antigravity
  const target_path = 'C:\\Users\\mmedu\\.gemini\\antigravity\\brain';
  
  file_watcher.start_watching(target_path, (file_path, content) => {
    if (win) {
      console.log(`[Main] Disparando evento worklog_updated_event para: ${file_path}`);
      win.webContents.send('worklog_updated_event', {
          file_path: file_path,
          content: content,
          timestamp: new Date().toISOString()
      });
    }
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// --- Handlers IPC de Banco de Dados e Projetos ---

/**
 * Canal para conectar ao banco de dados de um projeto e inicializar o schema.
 */
ipcMain.handle('database_connect_request', async (_event: IpcMainInvokeEvent, config: any) => {
    try {
        const schema_path = path.join(process.env.APP_ROOT, 'electron/db/schema.sql');
        await database_service.connect(config, schema_path);
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
});

/**
 * Canal para salvar um novo projeto no JSON local.
 */
ipcMain.handle('project_save_request', async (_event: IpcMainInvokeEvent, project_data: any) => {
    try {
        const project_id = project_repository.save_project(project_data);
        return { success: true, id: project_id };
    } catch (error) {
        return { success: false, error: String(error) };
    }
});

/**
 * Canal para listar todos os projetos do JSON local.
 */
ipcMain.handle('project_list_request', async () => {
    try {
        const projects = project_repository.get_all_projects();
        return { success: true, projects };
    } catch (error) {
        return { success: false, error: String(error) };
    }
});

/**
 * Canal para tentar descobrir credenciais de banco em um projeto.
 */
ipcMain.handle('project_probe_env_request', async (_event: IpcMainInvokeEvent, project_path: string) => {
    try {
        const credentials = env_discovery.probe_project_env(project_path);
        return { success: true, credentials };
    } catch (error) {
        return { success: false, error: String(error) };
    }
});

/**
 * Canal para deletar um projeto do JSON local.
 */
ipcMain.handle('project_delete_request', async (_event: IpcMainInvokeEvent, project_id: number) => {
    try {
        const success = project_repository.delete_project(project_id);
        return { success };
    } catch (error) {
        return { success: false, error: String(error) };
    }
});

/**
 * Canal para executar a varredura do histórico da IA e salvar no banco do projeto.
 */
ipcMain.handle('historical_scan_request', async (_event: IpcMainInvokeEvent, project_id: number) => {
    try {
        const project = project_repository.get_project_by_id(project_id);
        if (!project) throw new Error('Projeto não encontrado nos registros locais.');

        const scanner = new BrainScannerService();
        // Faz o scan apenas filtrando por artefatos que cruzaram com este projeto
        const reasoning_data = await scanner.scan_historical_data(project);
        
        // Salva os resultados no banco MySQL de forma idempotente via Transação
        await database_service.save_reasoning_scan_transaction(reasoning_data);

        return { success: true, data: reasoning_data, count: reasoning_data.length };
    } catch (error) {
        console.error('[Main] Erro no historical_scan_request:', error);
        return { success: false, error: String(error) };
    }
});

app.whenReady().then(() => {
    // Inicializa o repositório local usando a pasta de dados do Electron
    project_repository = new ProjectRepository(app.getPath('userData'));
    createWindow();
})
