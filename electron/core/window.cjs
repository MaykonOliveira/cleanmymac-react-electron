const { BrowserWindow } = require('electron')
const path = require('node:path')

function createMainWindow(isDev) {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    })
    return win
}

module.exports = { createMainWindow }


