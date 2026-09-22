import * as vscode from 'vscode';
import { SessionManager } from './sessionManager';
import { SessionTreeProvider } from './sessionTreeProvider';
import { VisualizerPanel } from './visualizerPanel';

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating Antigravity Visualizer extension...');
  const sessionManager = new SessionManager();
  const treeProvider = new SessionTreeProvider(sessionManager);

  // Register sidebar tree view
  const treeView = vscode.window.registerTreeDataProvider('antigravity.sessionList', treeProvider);

  // Register commands
  const refreshCmd = vscode.commands.registerCommand('antigravity.refreshSessions', () => {
    treeProvider.refresh();
    vscode.window.showInformationMessage('Antigravity sessions refreshed.');
  });

  const openVisualizerCmd = vscode.commands.registerCommand('antigravity.openVisualizer', (conversationId?: string) => {
    VisualizerPanel.createOrShow(context.extensionUri, sessionManager, conversationId);
  });

  context.subscriptions.push(treeView, refreshCmd, openVisualizerCmd);
  console.log('Antigravity Visualizer registered successfully.');
}

export function deactivate() {
  if (VisualizerPanel.currentPanel) {
    VisualizerPanel.currentPanel.dispose();
  }
}
