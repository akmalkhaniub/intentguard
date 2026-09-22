import * as vscode from 'vscode';
import { SessionManager } from './sessionManager';
import { SessionTreeProvider } from './sessionTreeProvider';
import { VisualizerPanel } from './visualizerPanel';

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating IntentGuard: Autonomous AI Coding Control Plane & Rollback Suite...');
  const sessionManager = new SessionManager();
  const treeProvider = new SessionTreeProvider(sessionManager);

  // Register sidebar tree view under intentguard, agentlens, and legacy antigravity
  const intentGuardTreeView = vscode.window.registerTreeDataProvider('intentguard.sessionList', treeProvider);
  const agentLensTreeView = vscode.window.registerTreeDataProvider('agentlens.sessionList', treeProvider);
  const legacyTreeView = vscode.window.registerTreeDataProvider('antigravity.sessionList', treeProvider);

  // Register refresh commands
  const refreshHandler = () => {
    treeProvider.refresh();
    vscode.window.showInformationMessage('IntentGuard: Agent sessions refreshed across Claude, Antigravity, and Codex.');
  };
  const igRefreshCmd = vscode.commands.registerCommand('intentguard.refreshSessions', refreshHandler);
  const refreshCmd = vscode.commands.registerCommand('agentlens.refreshSessions', refreshHandler);
  const legacyRefreshCmd = vscode.commands.registerCommand('antigravity.refreshSessions', refreshHandler);

  // Register open cockpit/visualizer commands
  const openVisualizerHandler = (conversationId?: string) => {
    VisualizerPanel.createOrShow(context.extensionUri, sessionManager, conversationId);
  };
  const igOpenVisualizerCmd = vscode.commands.registerCommand('intentguard.openVisualizer', openVisualizerHandler);
  const openVisualizerCmd = vscode.commands.registerCommand('agentlens.openVisualizer', openVisualizerHandler);
  const legacyOpenVisualizerCmd = vscode.commands.registerCommand('antigravity.openVisualizer', openVisualizerHandler);

  context.subscriptions.push(
    intentGuardTreeView,
    agentLensTreeView,
    legacyTreeView,
    igRefreshCmd,
    refreshCmd,
    legacyRefreshCmd,
    igOpenVisualizerCmd,
    openVisualizerCmd,
    legacyOpenVisualizerCmd
  );
  console.log('IntentGuard registered successfully.');
}

export function deactivate() {
  if (VisualizerPanel.currentPanel) {
    VisualizerPanel.currentPanel.dispose();
  }
}
