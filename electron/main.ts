import { app, BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent } from 'electron'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import path from 'node:path'
import { ProjectRepository } from './repositories/project_repository'
import { FileWatcherService } from './services/file_watcher_service'
import { BrainScannerService } from './services/brain_scanner_service'
import { GitHistoryService } from './services/git_history_service'
import { ProjectContextArchiveService } from './services/project_context_archive_service'
import { AntigravityStorageService } from './services/antigravity_storage_service'

const file_watcher = new FileWatcherService()
const git_history_service = new GitHistoryService()
const archive_service = new ProjectContextArchiveService()
const antigravity_storage_service = new AntigravityStorageService()

let project_repository: ProjectRepository
let win: BrowserWindow | null

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

function get_antigravity_brain_path() {
  return path.join(os.homedir(), '.gemini', 'antigravity', 'brain')
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  file_watcher.start_watching(get_antigravity_brain_path(), (file_path, content) => {
    if (!win) {
      return
    }

    win.webContents.send('worklog_updated_event', {
      file_path,
      content,
      timestamp: new Date().toISOString(),
    })
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle('database_connect_request', async (_event: IpcMainInvokeEvent, config: any) => {
  return { success: true, offline: true, deprecated: true, config }
})

ipcMain.handle('project_save_request', async (_event: IpcMainInvokeEvent, project_data: any) => {
  try {
    const draft_project = {
      ...project_data,
      no_database: true,
      created_at: new Date().toISOString(),
    }

    const project_id = project_repository.save_project(draft_project)
    const saved_project = project_repository.get_project_by_id(project_id)

    if (!saved_project) {
      throw new Error('Projeto salvo, mas nao foi possivel recarregar os metadados.')
    }

    const vault_path = archive_service.ensure_project_vault(saved_project)
    saved_project.vault_path = vault_path
    project_repository.update_project(saved_project)

    return { success: true, id: project_id, vault_path }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('project_list_request', async () => {
  try {
    const projects = project_repository.get_all_projects().map(project => ({
      ...project,
      no_database: true,
      vault_path: archive_service.ensure_project_vault(project),
    }))
    return { success: true, projects }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('project_probe_env_request', async (_event: IpcMainInvokeEvent, project_path: string) => {
  return { success: true, credentials: null, deprecated: true, project_path }
})

ipcMain.handle('project_delete_request', async (_event: IpcMainInvokeEvent, project_id: number) => {
  try {
    const success = project_repository.delete_project(project_id)
    return { success }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('historical_scan_request', async (_event: IpcMainInvokeEvent, project_id: number) => {
  try {
    const project = project_repository.get_project_by_id(project_id)
    if (!project) {
      throw new Error('Projeto nao encontrado nos registros locais.')
    }

    project.vault_path = archive_service.ensure_project_vault(project)
    project_repository.update_project(project)

    const scanner = new BrainScannerService()
    const reasoning_data = await scanner.scan_historical_data(project)
    const enriched_reasoning_data = await git_history_service.enrich_sessions(project.local_path, reasoning_data)

    archive_service.archive_project_scan(project, enriched_reasoning_data)

    return {
      success: true,
      data: enriched_reasoning_data,
      count: enriched_reasoning_data.length,
      persisted: true,
      vault_path: project.vault_path,
    }
  } catch (error) {
    console.error('[Main] Erro no historical_scan_request:', error)
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('project_cached_scan_request', async (_event: IpcMainInvokeEvent, project_id: number) => {
  try {
    const project = project_repository.get_project_by_id(project_id)
    if (!project) {
      throw new Error('Projeto nao encontrado nos registros locais.')
    }

    project.vault_path = archive_service.ensure_project_vault(project)
    project_repository.update_project(project)

    const sessions = archive_service.load_latest_scan(project)
    return {
      success: true,
      data: sessions,
      count: sessions.length,
      vault_path: project.vault_path
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('antigravity_storage_request', async () => {
  try {
    return {
      success: true,
      data: antigravity_storage_service.get_storage_summary(),
      vault_root: archive_service.get_vault_root()
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('antigravity_delete_recording_request', async (_event: IpcMainInvokeEvent, session_id: string) => {
  try {
    const result = antigravity_storage_service.delete_recording_session(session_id)
    return result
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('project_create_local_db_request', async (_event: IpcMainInvokeEvent, data: { name: string }) => {
  return {
    success: false,
    deprecated: true,
    error: `O Brain-Sync nao cria mais bancos MySQL para ${data.name}.`,
  }
})

ipcMain.handle('project_select_folder_request', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

app.whenReady().then(() => {
  project_repository = new ProjectRepository(app.getPath('userData'))
  createWindow()
})
