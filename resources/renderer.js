const BrowserWindow = require('electron').remote.BrowserWindow;
const ipcRenderer = require('electron').ipcRenderer;
const path = require('path');
const url = require('url');
const Game = require('./game');

const hiddenWH = 400;
const displayWidth = 64;
const displayHeight = 55;
const mapWidth = Math.floor(3*displayWidth/2);
const mapHeight = Math.floor(3*displayHeight/2);
console.log(`displayWidth: ${displayWidth}, displayHeight: ${displayHeight}`);
console.log(`mapWidth: ${mapWidth}, mapHeight: ${mapHeight}`);

function generateFirstLevel(windowId) {
  // Reset level data
  Game.levels = [];

  console.log(`Generating Level 1/${Game.MAXLEVELS}`);

  let win = new BrowserWindow({ width: hiddenWH, height: hiddenWH, show: false });
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'generateMap.html'),
    protocol: 'file:',
    slashes: true
  }));

  win.webContents.on('did-finish-load', () => {
    //const seed = 1442796044743;
    const seed = Date.now();
    const options = {seed: seed, displayWidth: displayWidth, displayHeight: displayHeight, mapWidth: mapWidth, mapHeight: mapHeight, windowId: windowId};
    win.webContents.send('generate-first-level', options, windowId);
  });
}

function generateNewLevel(windowId) {
  console.log(`Generating Level ${Game.levels.length + 1}/${Game.MAXLEVELS}`);

  let win = new BrowserWindow({ width: hiddenWH, height: hiddenWH, show: false });
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'generateMap.html'),
    protocol: 'file:',
    slashes: true
  }));

  win.webContents.on('did-finish-load', () => {
    //const seed = 1442796044743;
    const seed = Date.now();
    const options = {seed: seed, displayWidth: displayWidth, displayHeight: displayHeight, mapWidth: mapWidth, mapHeight: mapHeight, windowId: windowId};
    win.webContents.send('generate-new-level', options, windowId);
  });
}

ipcRenderer.on('new-game', (event, windowId) => {
  Game.cleanUp(true);
  generateFirstLevel(windowId);
});

ipcRenderer.on('first-level-generated', (event, options, map) => {
  // Remove loading animation and message
  let element = document.getElementById('loading-animation');
  element.classList.remove('pong-loader');
  element = document.getElementById('loading-message');
  element.innerHTML = '';

  // Initialize canvas elements
  Game.initCanvas(map);

  console.log(`Generated Level ${Game.levels.length}/${Game.MAXLEVELS}`);

  // Create items
  Game.generateItems();

  // Create and draw the player and a creature
  Game.player = Game.createEntity(Game.Player);
  Game.creature = Game.createEntity(Game.Creature);

  Game.moveCamera(Game.player.px, Game.player.py);

  // Draw map, the player and the creature
  Game.drawMap();
  Game.player.draw();
  Game.creature.draw();

  // Initialize game
  Game.init(true);

  // If we haven't generated enough levels
  if (Game.levels.length < Game.MAXLEVELS) {
    // Generate next level
    generateNewLevel(options.windowId);
  } else {
    // We are done
    console.log('Finished Generating Levels');
  }
});

ipcRenderer.on('new-level-generated', (event, options, map) => {
  // Store new level
  Game.levels.push(map);

  console.log(`Generated Level ${Game.levels.length}/${Game.MAXLEVELS}`);

  // If we haven't generated enough levels
  if (Game.levels.length < Game.MAXLEVELS) {
    // Generate next level
    generateNewLevel(options.windowId);
  } else {
    // We are done
    console.log('Finished Generating Levels');
  }
});
