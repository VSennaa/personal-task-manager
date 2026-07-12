// Wrapper Electron do vsenaa: abre a PWA numa janela que pode encolher abaixo
// do piso do navegador. Multiplataforma (Windows/macOS/Linux) sem mudar de código.
//
// Configuração por variáveis de ambiente (todas opcionais):
//   TASKMGR_URL  = URL a carregar        (padrão: https://vsenaa.duckdns.org)
//   TASKMGR_TOP  = "1" para always-on-top (padrão: desligado)
//   TASKMGR_W / TASKMGR_H       = tamanho inicial   (padrão: 360x720)
//   TASKMGR_MINW / TASKMGR_MINH = tamanho mínimo    (padrão: 240x360)

const { app, BrowserWindow, shell } = require('electron');

const num = (v, d) => (Number.isFinite(+v) && +v > 0 ? +v : d);

const URL = process.env.TASKMGR_URL || 'https://vsenaa.duckdns.org';

function createWindow() {
  const win = new BrowserWindow({
    width: num(process.env.TASKMGR_W, 360),
    height: num(process.env.TASKMGR_H, 720),
    minWidth: num(process.env.TASKMGR_MINW, 240), // ← abaixo do piso do navegador
    minHeight: num(process.env.TASKMGR_MINH, 360),
    alwaysOnTop: process.env.TASKMGR_TOP === '1',
    title: 'vsenaa',
    autoHideMenuBar: true, // esconde o menu (Alt mostra)
    webPreferences: {
      // shell carregando site remoto: sem Node na página, por segurança
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL(URL);

  // links externos (target=_blank etc.) abrem no navegador padrão,
  // não dentro da janelinha
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  // macOS: recria a janela ao clicar no dock sem janelas abertas
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
