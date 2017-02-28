const BrowserWindow = require('electron').remote.BrowserWindow;
const ipcRenderer = require('electron').ipcRenderer;
const path = require('path');
const url = require('url');
const Game = require('./game');

const genMapBtn = document.getElementById('gen-map-btn');

genMapBtn.addEventListener('click', function (clickEvent) {
  const windowID = BrowserWindow.getFocusedWindow().id;
  let win = new BrowserWindow({ width: 400, height: 400, show: false });
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'generateMap.html'),
    protocol: 'file:',
    slashes: true
  }));

  win.webContents.on('did-finish-load', function () {
    const seed = 1442796044743;
    //const seed = Date.now();
    const options = {seed: seed, w: 64, h: Math.abs(64 - 9)};
    win.webContents.send('generate-map', options, windowID);
  });
});

ipcRenderer.on('map-generated', function (event, options, map) {
  console.log(`A map with width: ${options.w}, height: ${options.h} and seed: ${options.seed} was generated`);

  // Initialize canvas elements
  Game.initCanvas();

  // Create treasure chests
  Game.generateTreasures(map.cells, map.floorCells);

  // Draw map
  Game.drawMap(map.cells);

  // Create and draw the player and a creature
  Game.player = Game.createEntity(Game.Player, map.floorCells);
  Game.creature = Game.createEntity(Game.Creature, map.floorCells);

  // Initialize game
  Game.init(map.cells);
});