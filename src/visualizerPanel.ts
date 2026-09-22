import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionManager, SessionDetail } from './sessionManager';

export class VisualizerPanel {
  public static currentPanel: VisualizerPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _fileWatcher: fs.FSWatcher | undefined;
  private _currentConversationId: string | undefined;
  private _debounceTimer: NodeJS.Timeout | undefined;

  public static createOrShow(extensionUri: vscode.Uri, sessionManager: SessionManager, conversationId?: string) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if (VisualizerPanel.currentPanel) {
      VisualizerPanel.currentPanel._panel.reveal(column);
      if (conversationId) {
        VisualizerPanel.currentPanel.loadSession(conversationId);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'antigravityVisualizer',
      'Antigravity Intelligence Dashboard',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );

    VisualizerPanel.currentPanel = new VisualizerPanel(panel, extensionUri, sessionManager, conversationId);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private sessionManager: SessionManager,
    initialConversationId?: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'openFile':
            if (message.path && fs.existsSync(message.path)) {
              const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(message.path));
              await vscode.window.showTextDocument(doc, { preview: true });
            } else {
              vscode.window.showWarningMessage(`File not found on disk: ${message.path}`);
            }
            return;

          case 'selectSession':
            if (message.conversationId) {
              this.loadSession(message.conversationId);
            }
            return;

          case 'exportHtmlReport':
            this.handleExportHtmlReport(message.htmlContent);
            return;

          case 'openNativeDiff':
            try {
              const { originalContent, replacementContent, filename, stepIndex } = message;
              const tmpDir = os.tmpdir();
              const base = path.basename(filename || 'file');
              const beforeFile = path.join(tmpDir, `antigravity_step${stepIndex}_before_${base}`);
              const afterFile = path.join(tmpDir, `antigravity_step${stepIndex}_after_${base}`);
              fs.writeFileSync(beforeFile, originalContent || '', 'utf8');
              fs.writeFileSync(afterFile, replacementContent || '', 'utf8');

              const leftUri = vscode.Uri.file(beforeFile);
              const rightUri = vscode.Uri.file(afterFile);
              const title = `${base} (Step #${stepIndex}: Before ↔ After)`;
              await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
            } catch (err: any) {
              vscode.window.showErrorMessage(`Failed to open diff editor: ${err.message}`);
            }
            return;

          case 'copyToClipboard':
            if (message.text) {
              await vscode.env.clipboard.writeText(message.text);
              vscode.window.showInformationMessage(message.toast || 'Copied to clipboard!');
            }
            return;

          case 'runInTerminal':
            if (message.command) {
              const choice = await vscode.window.showWarningMessage(
                `Execute rollback in VS Code terminal?\n\n${message.command}`,
                'Execute Rollback',
                'Cancel'
              );
              if (choice === 'Execute Rollback') {
                const term = vscode.window.activeTerminal || vscode.window.createTerminal('AgentLens Rollback');
                term.show();
                term.sendText(message.command);
              }
            }
            return;

          case 'exportPatchFile':
            try {
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
              const patchPath = path.join(workspaceFolder, `agentlens_revert_${this._currentConversationId?.substring(0, 8) || 'session'}.patch`);
              fs.writeFileSync(patchPath, message.patchContent || '', 'utf8');
              const action = await vscode.window.showInformationMessage(
                `Revert patch exported to:\n${patchPath}`,
                'Open Patch'
              );
              if (action === 'Open Patch') {
                const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(patchPath));
                await vscode.window.showTextDocument(doc);
              }
            } catch (err: any) {
              vscode.window.showErrorMessage(`Failed to export patch: ${err.message}`);
            }
            return;

          case 'loadComparisonSession':
            if (message.conversationId) {
              try {
                const compDetail = this.sessionManager.getSessionDetail(message.conversationId);
                this._panel.webview.postMessage({
                  command: 'setComparisonData',
                  data: compDetail
                });
              } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to load comparison session: ${err.message}`);
              }
            }
            return;

          case 'forkSession':
            if (message.targetBrand && this._currentConversationId) {
              try {
                const detail = this.sessionManager.getSessionDetail(this._currentConversationId);
                const forkPacket = this.sessionManager.createForkPacket(detail, message.targetBrand);
                await vscode.env.clipboard.writeText(forkPacket.formattedHandOffPrompt);
                vscode.window.showInformationMessage(
                  `Agent hand-off prompt for ${message.targetBrand.toUpperCase()} copied to clipboard! Paste it into ${message.targetBrand.toUpperCase()} to continue task.`
                );
              } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to fork session: ${err.message}`);
              }
            }
            return;

          case 'openTaskLog':
            if (message.path && fs.existsSync(message.path)) {
              try {
                const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(message.path));
                await vscode.window.showTextDocument(doc, { preview: true });
              } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to open log: ${err.message}`);
              }
            }
            return;

          case 'getLeaderboard':
            try {
              const summaries = await this.sessionManager.getSessions();
              const details = [];
              for (const s of summaries.slice(0, 40)) {
                try {
                  details.push(this.sessionManager.getSessionDetail(s.conversationId));
                } catch {}
              }
              const lb = this.sessionManager.getLeaderboard(details);
              this._panel.webview.postMessage({
                command: 'setLeaderboardData',
                data: lb
              });
            } catch {}
            return;
        }
      },
      null,
      this._disposables
    );

    if (initialConversationId) {
      setTimeout(() => this.loadSession(initialConversationId), 500);
    } else {
      setTimeout(async () => {
        const sessions = await this.sessionManager.getSessions();
        if (sessions.length > 0) {
          this.loadSession(sessions[0].conversationId);
        }
      }, 500);
    }
  }

  private async handleExportHtmlReport(htmlContent: string) {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
      const exportPath = path.join(workspaceFolder, `agentlens_report_${this._currentConversationId?.substring(0, 8) || 'session'}.html`);
      fs.writeFileSync(exportPath, htmlContent, 'utf8');

      const action = await vscode.window.showInformationMessage(
        `Standalone HTML PR report exported to:\n${exportPath}`,
        'Open in Browser'
      );
      if (action === 'Open in Browser') {
        vscode.env.openExternal(vscode.Uri.file(exportPath));
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to export HTML report: ${err.message}`);
    }
  }

  public async loadSession(conversationId: string) {
    this._currentConversationId = conversationId;
    this._setupFileWatcher(conversationId);

    try {
      const detail = this.sessionManager.getSessionDetail(conversationId);
      let allSessions: any[] = [];
      try {
        allSessions = await this.sessionManager.getSessions();
      } catch {}

      this._panel.webview.postMessage({
        command: 'setSessionData',
        data: detail,
        availableSessions: allSessions
      });
      this._panel.title = `Audit: ${detail.conversationId.substring(0, 8)}`;
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to load session: ${err.message}`);
    }
  }

  private _setupFileWatcher(conversationId: string) {
    if (this._fileWatcher) {
      this._fileWatcher.close();
      this._fileWatcher = undefined;
    }

    const brainDir = this.sessionManager.getBrainDir();
    const logDir = path.join(brainDir, conversationId, '.system_generated', 'logs');

    if (fs.existsSync(logDir)) {
      try {
        this._fileWatcher = fs.watch(logDir, (eventType, filename) => {
          if (filename && filename.includes('transcript')) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = setTimeout(() => {
              if (this._currentConversationId) {
                try {
                  const updated = this.sessionManager.getSessionDetail(this._currentConversationId);
                  this._panel.webview.postMessage({
                    command: 'setSessionData',
                    data: updated,
                    isLiveUpdate: true
                  });
                } catch {}
              }
            }, 300);
          }
        });
      } catch {}
    }
  }

  public dispose() {
    VisualizerPanel.currentPanel = undefined;
    if (this._fileWatcher) {
      this._fileWatcher.close();
    }
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'visualizer.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // Local vendor URIs for 100% offline & air-gapped support
    const mermaidUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vendor', 'mermaid.min.js'));
    const markedUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vendor', 'marked.min.js'));

    const nonce = this._getNonce();

    // Strict Content-Security-Policy with zero external network leakage
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-eval'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">`;

    html = html.replace('<head>', `<head>\n  ${cspMeta}`);
    html = html.replace(
      '<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>',
      `<script nonce="${nonce}" src="${mermaidUri}"></script>`
    );
    html = html.replace(
      '<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>',
      `<script nonce="${nonce}" src="${markedUri}"></script>`
    );
    html = html.replace('<script>', `<script nonce="${nonce}">`);

    return html;
  }

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
