const { app, BrowserWindow } = require('electron');
const path = require('path');

// Force enable Web MIDI
app.commandLine.appendSwitch('enable-features', 'WebMidi');
app.commandLine.appendSwitch('enable-web-midi');

function runTest() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false // Don't need to see it
  });

  // Grant Permissions
  win.webContents.session.setPermissionCheckHandler(() => true);
  win.webContents.session.setPermissionRequestHandler((wc, p, cb) => cb(true));

  const testScript = `
    (async () => {
      try {
        const access = await navigator.requestMIDIAccess({ sysex: true });
        const inputs = Array.from(access.inputs.values());
        
        console.log('--- MIDI DEVICE REPORT ---');
        console.log('Total Inputs Found:', inputs.length);
        inputs.forEach(i => console.log(\` - [\${i.id}] \${i.name} (\${i.state})\`));
        console.log('--------------------------');
        
        require('electron').ipcRenderer.send('test-complete', inputs.length);
      } catch (e) {
        console.error('MIDI Access Failed:', e);
        require('electron').ipcRenderer.send('test-error', e.toString());
      }
    })();
  `;

  win.loadFile('test.html');
  win.webContents.executeJavaScript(testScript);
}

app.whenReady().then(runTest);

// Listen for results
const { ipcMain } = require('electron');
ipcMain.on('test-complete', (event, count) => {
  console.log(`Test passed. Found ${count} devices.`);
  process.exit(0);
});

ipcMain.on('test-error', (event, err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
