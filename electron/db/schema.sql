-- Script de Inicialização de Banco de Dados Brain-Sync
-- Arquivo: electron/db/schema.sql

-- A nova arquitetura do Analisador Visual armazena o ciclo completo da IA
-- em uma única tabela para cada sessão iterada.

CREATE TABLE IF NOT EXISTS brain_sync_ai_reasoning (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    task_content LONGTEXT,
    plan_content LONGTEXT,
    walkthrough_content LONGTEXT,
    modified_files JSON,
    all_text_content LONGTEXT,
    artifact_summaries JSON,
    session_files JSON,
    media_files JSON,
    browser_recording_files JSON,
    browser_recording_count INT DEFAULT 0,
    git_evidence JSON,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
