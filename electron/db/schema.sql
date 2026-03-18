-- Script de Inicialização de Banco de Dados Brain-Sync
-- Arquivo: electron/db/schema.sql

-- 1. Tabela de Projetos (Workspaces)
CREATE TABLE IF NOT EXISTS brain_sync_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    local_path VARCHAR(500) NOT NULL UNIQUE,
    db_host VARCHAR(255),
    db_user VARCHAR(255),
    db_pass VARCHAR(255),
    db_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Tarefas (Issues/Tasks)
CREATE TABLE IF NOT EXISTS brain_sync_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    issue_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    original_description TEXT,
    label VARCHAR(50), -- ex: 'feat', 'fix'
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES brain_sync_projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_issue_per_project (project_id, issue_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Execuções da IA (Os Logs do Antigravity)
CREATE TABLE IF NOT EXISTS brain_sync_ai_executions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    worklog_content LONGTEXT NOT NULL,
    ai_model VARCHAR(100) DEFAULT 'antigravity',
    execution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES brain_sync_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Snapshots de Código (O Commit)
CREATE TABLE IF NOT EXISTS brain_sync_code_snapshots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    commit_diff LONGTEXT NOT NULL,
    changed_files JSON, -- Guarda um array com o nome dos arquivos alterados
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES brain_sync_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Insights (Para a "Documenterção Viva")
CREATE TABLE IF NOT EXISTS brain_sync_insights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    report_content LONGTEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES brain_sync_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
