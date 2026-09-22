import * as vscode from 'vscode';
import { SessionManager, SessionSummary } from './sessionManager';

export class SessionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly session: SessionSummary
  ) {
    super(session.title, vscode.TreeItemCollapsibleState.None);

    const brandLabel = (session.brand || 'antigravity').toUpperCase();
    this.tooltip = `[${brandLabel}] ${session.title}\nModel: ${session.modelName || 'Default'}\nID: ${session.conversationId}\nSteps: ${session.stepCount}\nLast active: ${session.lastModified}`;
    this.description = `[${brandLabel}] ${session.stepCount} steps • ${session.lastModified.substring(5, 16)}`;

    if (session.brand === 'claude') {
      this.iconPath = new vscode.ThemeIcon('hubot', new vscode.ThemeColor('charts.purple'));
    } else if (session.brand === 'codex') {
      this.iconPath = new vscode.ThemeIcon('code', new vscode.ThemeColor('charts.green'));
    } else {
      this.iconPath = new vscode.ThemeIcon('symbol-event', new vscode.ThemeColor('charts.blue'));
    }

    this.command = {
      command: 'antigravity.openVisualizer',
      title: 'Open Visualizer Dashboard',
      arguments: [session.conversationId]
    };
  }
}

export class SessionTreeProvider implements vscode.TreeDataProvider<SessionTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SessionTreeItem | undefined | null | void> = new vscode.EventEmitter<SessionTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SessionTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private sessionManager: SessionManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SessionTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SessionTreeItem): Promise<SessionTreeItem[]> {
    if (element) {
      return [];
    }

    const sessions = await this.sessionManager.getSessions();
    return sessions.map(s => new SessionTreeItem(s));
  }
}
