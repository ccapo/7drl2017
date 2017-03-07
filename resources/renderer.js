const BrowserWindow = require('electron').remote.BrowserWindow;
const ipcRenderer = require('electron').ipcRenderer;
const path = require('path');
const url = require('url');
const Game = require('./game');

function generateMap(windowId) {
  let win = new BrowserWindow({ width: 400, height: 400, show: false });
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'generateMap.html'),
    protocol: 'file:',
    slashes: true
  }));

  win.webContents.on('did-finish-load', () => {
    //const seed = 1442796044743;
    const seed = Date.now();
    const options = {seed: seed, w: 64, h: Math.abs(64 - 9)};
    win.webContents.send('generate-map', options, windowId);
  });
}

ipcRenderer.on('new-game', (event, windowId) => {
  console.log('Generating Map ...');

  Game.cleanUp();

  generateMap(windowId);
});

ipcRenderer.on('map-generated', (event, options, map) => {
  console.log(`A map with width: ${options.w}, height: ${options.h} and seed: ${options.seed} was generated`);

  // Remove loading animation and message
  let element = document.getElementById('loading-animation');
  element.classList.remove('pong-loader');
  element = document.getElementById('loading-message');
  element.innerHTML = '';

  // Initialize canvas elements
  Game.initCanvas(options.w, options.h);

  // Create items
  Game.generateItems(map.cells, map.floorCells);

  // Draw map
  Game.drawMap(map.cells);

  // Create and draw the player and a creature
  Game.player = Game.createEntity(Game.Player, map.floorCells);
  Game.creature = Game.createEntity(Game.Creature, map.floorCells);

  // Initialize game
  Game.init(map.cells, map.floorCells);
});