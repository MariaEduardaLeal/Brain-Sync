import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import { AIReasoningSession } from './brain_scanner_service';

const exec_file_async = promisify(execFile);

export interface GitCommitSummary {
    hash: string;
    short_hash: string;
    author_name: string;
    authored_at: string;
    subject: string;
    body: string;
    files: string[];
}

export interface GitDiffFile {
    path: string;
    status: string;
}

export interface GitSessionEvidence {
    repo_root: string | null;
    branch: string | null;
    status_files: string[];
    matching_status_files: string[];
    matching_recent_commits: GitCommitSummary[];
    overlap_files: string[];
}

interface GitProjectEvidence {
    is_git_repo: boolean;
    repo_root: string | null;
    branch: string | null;
    status_files: string[];
    recent_commits: GitCommitSummary[];
}

export class GitHistoryService {
    public async enrich_sessions(project_path: string, sessions: AIReasoningSession[]): Promise<AIReasoningSession[]> {
        const evidence = await this.collect_project_evidence(project_path);
        if (!evidence.is_git_repo) {
            return sessions.map(session => ({
                ...session,
                git_evidence: {
                    repo_root: null,
                    branch: null,
                    status_files: [],
                    matching_status_files: [],
                    matching_recent_commits: [],
                    overlap_files: []
                }
            }));
        }

        return sessions.map(session => ({
            ...session,
            git_evidence: this.build_session_evidence(session, evidence)
        }));
    }

    private async collect_project_evidence(project_path: string): Promise<GitProjectEvidence> {
        try {
            const repo_root = await this.run_git(['rev-parse', '--show-toplevel'], project_path);
            const branch = await this.run_git(['rev-parse', '--abbrev-ref', 'HEAD'], project_path);
            const status_output = await this.run_git(['status', '--porcelain=v1'], project_path, true);
            const log_output = await this.run_git([
                'log',
                '--date=iso-strict',
                '--name-only',
                '--pretty=format:__COMMIT__%n%H%n%h%n%an%n%ad%n%s%n%b%n__FILES__',
                '-n',
                '20'
            ], project_path, true);

            return {
                is_git_repo: true,
                repo_root,
                branch,
                status_files: this.parse_status_files(status_output, repo_root),
                recent_commits: this.parse_commit_log(log_output, repo_root)
            };
        } catch {
            return {
                is_git_repo: false,
                repo_root: null,
                branch: null,
                status_files: [],
                recent_commits: []
            };
        }
    }

    private build_session_evidence(session: AIReasoningSession, evidence: GitProjectEvidence): GitSessionEvidence {
        const overlap_files = session.modified_files
            .map(file_path => this.normalize_path(file_path))
            .filter(file_path => {
                return evidence.status_files.some(status_file => this.normalize_path(status_file) === file_path) ||
                    evidence.recent_commits.some(commit => commit.files.some(commit_file => this.normalize_path(commit_file) === file_path));
            });

        const matching_status_files = evidence.status_files.filter(status_file => {
            const normalized_status = this.normalize_path(status_file);
            return overlap_files.includes(normalized_status);
        });

        const matching_recent_commits = evidence.recent_commits.filter(commit => {
            return commit.files.some(commit_file => overlap_files.includes(this.normalize_path(commit_file)));
        }).slice(0, 5);

        return {
            repo_root: evidence.repo_root,
            branch: evidence.branch,
            status_files: evidence.status_files,
            matching_status_files,
            matching_recent_commits,
            overlap_files
        };
    }

    private parse_status_files(output: string, repo_root: string): string[] {
        return output
            .split(/\r?\n/)
            .map(line => line.trimEnd())
            .filter(Boolean)
            .map(line => line.slice(3).split(' -> ').pop() || '')
            .filter(Boolean)
            .map(relative_file => path.join(repo_root, relative_file));
    }

    private parse_commit_log(output: string, repo_root: string): GitCommitSummary[] {
        const chunks = output.split('__COMMIT__').map(chunk => chunk.trim()).filter(Boolean);
        const commits: GitCommitSummary[] = [];

        for (const chunk of chunks) {
            const [headerPart, filesPart = ''] = chunk.split('__FILES__');
            const headerLines = headerPart.split(/\r?\n/);
            if (headerLines.length < 5) continue;

            const [hash, short_hash, author_name, authored_at, subject, ...bodyLines] = headerLines;
            const files = filesPart
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean)
                .map(relative_file => path.join(repo_root, relative_file));

            commits.push({
                hash,
                short_hash,
                author_name,
                authored_at,
                subject,
                body: bodyLines.join('\n').trim(),
                files
            });
        }

        return commits;
    }

    private async run_git(args: string[], cwd: string, allow_empty = false): Promise<string> {
        const { stdout } = await exec_file_async('git', args, { cwd, windowsHide: true });
        const value = stdout.trim();
        if (!value && !allow_empty) {
            throw new Error(`Git command returned empty output: git ${args.join(' ')}`);
        }
        return value;
    }

    private normalize_path(target_path: string): string {
        return path.normalize(target_path).replace(/\//g, '\\').toLowerCase();
    }
}
