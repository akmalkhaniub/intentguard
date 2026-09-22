import * as vscode from 'vscode';
import { SessionManager } from './sessionManager';
import { SessionTreeProvider } from './sessionTreeProvider';
import { VisualizerPanel } from './visualizerPanel';

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating AgentLens: Universal AI Observability & Rollback Suite...');
  const sessionManager = new SessionManager();
  const treeProvider = new SessionTreeProvider(sessionManager);

  // Register sidebar tree view under agentlens and legacy antigravity
  const treeView = vscode.window.registerTreeDataProvider('agentlens.sessionList', treeProvider);
  const legacyTreeView = vscode.window.registerTreeDataProvider('antigravity.sessionList', treeProvider);

  // Register commands
  const refreshHandler = () => {
    treeProvider.refresh();
    vscode.window.showInformationMessage('Agent sessions refreshed across Claude, Antigravity, and Codex.');
  };
  const refreshCmd = vscode.commands.registerCommand('agentlens.refreshSessions', refreshHandler);
  const legacyRefreshCmd = vscode.commands.registerCommand('antigravity.refreshSessions', refreshHandler);

  const openVisualizerHandler = (conversationId?: string) => {
    VisualizerPanel.createOrShow(context.extensionUri, sessionManager, conversationId);
  };
  const openVisualizerCmd = vscode.commands.registerCommand('agentlens.openVisualizer', openVisualizerHandler);
  const legacyOpenVisualizerCmd = vscode.commands.registerCommand('antigravity.openVisualizer', openVisualizerHandler);

  context.subscriptions.push(treeView, legacyTreeView, refreshCmd, legacyRefreshCmd, openVisualizerCmd, legacyOpenVisualizerCmd);
  console.log('AgentLens registered successfully.');
}

export function deactivate() {
  if (VisualizerPanel.currentPanel) {
    VisualizerPanel.currentPanel.dispose();
  }
}
