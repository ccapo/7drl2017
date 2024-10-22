const electron = require('electron');
// Module to control application life.
const app = electron.app;

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const Menu = electron.Menu;
const dialog = electron.dialog;

const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function newGameCallback(response) {
  if (response === 0) {
    mainWindow.webContents.send('new-game', 1);
  }
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({minWidth: 1068, minHeight: 850});

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'resources/index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  mainWindow.webContents.on('did-finish-load', () => {
    // Create a new game
    mainWindow.webContents.send('new-game', 1);
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Game',
          accelerator: 'CmdOrCtrl+N',
          click() {
            const options = {
              type: 'info',
              title: 'New Game',
              message: 'Would you like to start a New Game?',
              buttons: ['OK', 'Cancel']
            };
            dialog.showMessageBox(options, newGameCallback);
          }
        },
        {
          type: 'separator'
        },
        {
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          role: 'undo'
        },
        {
          type: 'separator'
        },
        {
          role: 'cut'
        },
        {
          role: 'copy'
        },
        {
          role: 'paste'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          role: 'reload'
        },
        {
          role: 'toggledevtools'
        },
        {
          type: 'separator'
        },
        {
          role: 'resetzoom'
        },
        {
          role: 'zoomin'
        },
        {
          role: 'zoomout'
        },
        {
          type: 'separator'
        },
        {
          role: 'togglefullscreen'
        }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About',
          click() {
            const options = {
              type: 'info',
              title: 'About EscapeCraft',
              message: 'Created for the 2017 7DRL Challenge\n\nThe goal is to survive and escape by crafting weapons/tools\n\nWritten by Chris Capobianco',
              buttons: ['OK']
            };
            dialog.showMessageBox(options);
          }
        },
        {
          label: 'Controls',
          click() {
            const options = {
              type: 'info',
              title: 'Controls',
              message: 'The player can move in all 8 directions using:\n\nArrow, Home, End, PgUp and PgDown keys\nWAXD+QEZC keys and S waits a turn\nNumPad keys and 5 waits a turn\n\nThe Enter or Space keys picks up items or uses stairs\n\nThe inventory and crafting are handled using the mouse',
              buttons: ['OK']
            };
            dialog.showMessageBox(options);
          }
        }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        {
          role: 'about',
        },
        {
          type: 'separator'
        },
        {
          role: 'services',
          submenu: [
            {
              label: 'New Game',
              accelerator: 'CmdOrCtrl+N',
              click() {
                const options = {
                  type: 'info',
                  title: 'New Game',
                  message: 'Would you like to start a New Game?',
                  buttons: ['OK', 'Cancel']
                };
                dialog.showMessageBox(options, newGameCallback);
              }
            }
          ]
        },
        {
          type: 'separator'
        },
        {
          role: 'hide'
        },
        {
          role: 'hideothers'
        },
        {
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          role: 'quit'
        }
      ]
    });

    // Edit menu.
    template[1].submenu.push(
      {
        type: 'separator'
      },
      {
        label: 'Speech',
        submenu: [
          {
            role: 'startspeaking'
          },
          {
            role: 'stopspeaking'
          }
        ]
      }
    );

    // Window menu.
    template[3].submenu = [
      {
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
      },
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {
        label: 'Zoom',
        role: 'zoom'
      },
      {
        type: 'separator'
      },
      {
        label: 'Bring All to Front',
        role: 'front'
      }
    ];

    const dockMenu = Menu.buildFromTemplate([{
      label: 'New Game',
      click() {
        newGameCallback(0);
      }
    }]);
    app.dock.setMenu(dockMenu)
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

app.setName('EscapeCraft');