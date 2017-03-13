const BrowserWindow = require('electron').remote.BrowserWindow;
const ipcRenderer = require('electron').ipcRenderer;
const path = require('path');
const url = require('url');

const hiddenWH = 400;
const displayOptions = {
  displayWidth: 64,
  displayHeight: 55,
  mapWidth: 2*64,
  mapHeight: 2*55
};
let game = require('./game').game;

function generateFirstLevel(windowId) {
  console.log(`Generating Level 1/${game.MAXLEVELS}`);

  // Clean up game components
  game.cleanUp(true);

  let win = new BrowserWindow({width: hiddenWH, height: hiddenWH, show: false});
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'generateMap.html'),
    protocol: 'file:',
    slashes: true
  }));

  win.webContents.on('did-finish-load', () => {
    //const seed = 1442796044743;
    const seed = Date.now();
    const options = Object.assign(displayOptions, {seed: seed, windowId: windowId});
    win.webContents.send('generate-first-level', options, windowId);
  });
}

function generateNewLevel(windowId) {
  console.log(`Generating Level ${game.maps.length + 1}/${game.MAXLEVELS}`);

  let win = new BrowserWindow({width: hiddenWH, height: hiddenWH, show: false});
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'generateMap.html'),
    protocol: 'file:',
    slashes: true
  }));

  win.webContents.on('did-finish-load', () => {
    //const seed = 1442796044743;
    const seed = Date.now();
    const options = Object.assign(displayOptions, {seed: seed, windowId: windowId});
    win.webContents.send('generate-new-level', options, windowId);
  });
}

ipcRenderer.on('new-game', (event, windowId) => {
  console.log('New Game');
  generateFirstLevel(windowId);
});

ipcRenderer.on('first-level-generated', (event, options, map) => {
  // Store new level
  game.maps.push(map);

  console.log(`Generated Level ${game.maps.length}/${game.MAXLEVELS}`);

  // Initialize game
  game.init();

  // If we haven't generated enough maps
  if (game.maps.length < game.MAXLEVELS) {
    // Generate next level
    generateNewLevel(options.windowId);
  } else {
    // We are done
    console.log('Finished Generating Levels');
  }
});

ipcRenderer.on('new-level-generated', (event, options, map) => {
  // Store new level
  game.maps.push(map);

  console.log(`Generated Level ${game.maps.length}/${game.MAXLEVELS}`);

  // If we haven't generated enough maps
  if (game.maps.length < game.MAXLEVELS) {
    // Generate next level
    generateNewLevel(options.windowId);
  } else {
    // We are done
    console.log('Finished Generating Levels');
  }
});
