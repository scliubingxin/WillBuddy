/** Only the trusted main frame may call the legacy, compatibility-preserving IPC. */
export function createRegistrar({ ipcMain, getWindow, entryURL }) {
    return (name, handler) => ipcMain.handle('actwill:' + name, async (event, payload) => {
        const window = getWindow();
        if (!window || window.isDestroyed?.() || event.sender !== window.webContents ||
            event.senderFrame !== window.webContents.mainFrame || event.senderFrame?.url !== entryURL) {
            throw new Error('拒绝不可信页面');
        }
        return handler(payload || {});
    });
}
