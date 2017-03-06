const ROT = require('rot-js');

module.exports = {
  display: null,
  log: null,
  status: null,
  statusHeight: 1,
  logHeight: 8,
  width: null,
  height: null,
  fontSize: 12,
  fontFamily: 'helvetica',
  cells: [],
  symType: Object.freeze({FLOOR: 0, WALL: 1, ITEM: 2}),
  engine: null,
  player: null,
  creature: null,
  item: null,
  scheduler: null,

  // Clean up game state
  cleanUp: function() {
    if (this.scheduler) {
      this.scheduler.clear();
    }
    if (this.status) {
      this.status.clear();
    }
    if (this.display) {
      this.display.clear();
    }
    if (this.log) {
      this.log.messages = [];
      this.log.clear();
    }
    if (this.player) {
      this.player = null;
    }
    if (this.creature) {
      this.create = null;
    }
    if (this.item) {
      this.item = null;
    }
    if (this.cells) {
      this.cells = [];
    }
  },
 
  // Game initialization
  initCanvas: function(w, h) {
    let canvases = document.getElementsByTagName('canvas');
    if(canvases.length === 0) {
      let displayOptions = {
        width: w,
        height: h,
        fontSize: this.fontSize,
        fontFamily: this.fontFamily,
        fontStyle: 'bold',
        forceSquareRatio: true
      };

      this.width = w;
      this.height = h;

      let statusOptions = Object.assign({}, displayOptions, {height: 1});
      this.status = new ROT.Display(statusOptions);
      document.getElementById('game').appendChild(this.status.getContainer());

      this.display = new ROT.Display(displayOptions);
      document.getElementById('game').appendChild(this.display.getContainer());

      let logOptions = Object.assign({}, displayOptions, {height: this.logHeight});
      this.log = new ROT.Display(logOptions);
      this.log.messages = [];
      document.getElementById('game').appendChild(this.log.getContainer());
    } else {
      this.scheduler.clear();
      this.status.clear();
      this.display.clear();
      this.log.messages = [];
      this.log.clear();
    }
  },

  // Game initialization
  init: function(cells) {
    this.cells = cells;

    scheduler = new ROT.Scheduler.Speed();
    scheduler.add(this.player, true);
    scheduler.add(this.creature, true);

    this.engine = new ROT.Engine(scheduler);
    this.engine.start();

    this.initLog();

    this.statusWrite(this.player);
  },

  // Initialize log message
  initLog: function() {
    // Create border for top and bottom of message log
    for(let x = 0; x < this.width; x++) {
      this.log.drawText(x, 0, "=");
      this.log.drawText(x, this.logHeight - 1, "=");
    }

    // Create border for left and right of message log
    for(let y = 1; y < this.logHeight - 1; y++) {
      this.log.drawText(0, y, "|");
      this.log.drawText(this.width - 1, y, "|");
    }

    // Title for message log
    this.log.drawText(2, 0, "Message Log");
  },

  // Write to the message log
  logWrite: function(msg) {
    // If the log is full, remove first entry
    if( this.log.messages.length === this.logHeight - 2 ) {
	    this.log.messages.splice(0, 1);
    }

    // Push new message into array
    this.log.messages.push(msg);

    // Erase old messages
    for(let x = 2; x < this.width - 2; x++) {
      for(let y = 1; y < this.logHeight - 2; y++) {
        this.log.draw(x, y, " ", "#000000");
      }
    }

    // Display messages from newest to oldest
    let y = 1, fraction = 0.0;
    for(let i = this.log.messages.length - 1; i >= 0; i--) {
      let colour = ROT.Color.toHex(ROT.Color.interpolate([204, 204, 204], [0, 0, 0], fraction));
      this.log.drawText(2, y++, "%c{" + colour + "}" + this.log.messages[i]);
      fraction += 0.15
    }
  },

  statusWrite: function(data) {
    let statusStr = "HP: %c{#0f0}" + data.hp + "/" + data.hpmax + "%c{}";
    statusStr += " STR: %c{#0f0}" + data.str + "%c{}";
    statusStr += " DEX: %c{#0f0}" + data.dex + "%c{}";
    statusStr += " CON: %c{#0f0}" + data.con + "%c{}";
    statusStr += " PTS: %c{#0f0}" + data.pts + "%c{}";
    this.status.drawText(1, 0, statusStr);
  },

  // Generate Items
  generateItems: function(cells, floorCells) {
    let items = [];
    for(let i = 0; i < 1; i++) {
      let index = Math.floor(ROT.RNG.getUniform() * floorCells.length);
      let key = floorCells.splice(index, 1)[0];
      cells[key] = module.exports.symType.ITEM;
      items.push(key);
    }
    // Pick the special item
    let index = Math.floor(ROT.RNG.getUniform() * items.length);
    let randomKey = items[index];
    this.item = randomKey;
  },

  // Create entity
  createEntity: function(entity, floorCells) {
    let index = Math.floor(ROT.RNG.getUniform() * floorCells.length);
    let key = floorCells.splice(index, 1)[0];
    let x = key % this.width;
    let y = Math.floor(key/this.width);
    return new entity(x, y);
  },

  // Draw a tile
  drawTile: function(key, value) {
    let x = key % this.width;
    let y = Math.floor(key/this.width);
    switch (value) {
      case module.exports.symType.FLOOR: {
        this.display.draw(x, y, " ", "#000000");
      } break;

      case module.exports.symType.WALL: {
        this.display.draw(x, y, "#", "#777777");
      } break;

      case module.exports.symType.ITEM: {
        this.display.draw(x, y, "!", "#FF00FF");
      } break;

      default: {
        console.log('Unrecognized value: ' + value);
      } break;
    }
  },

  // Draw the map
  drawMap: function(cells) {
    for(let k = 0; k < cells.length; k++) {
      this.drawTile(k, cells[k]);
    }
  },

  // The player constructor
  Player: function(x, y) {
    // ATK = (STR + DEX + CON)/3
    // DEF = (STR + DEX + CON)/3 - 2
    // HP = 5*(STR + CON)
    // STUNNED if ATK - DEF >= HP/5

    // Base attributes
    this.str = 2;
    this.dex = 2;
    this.con = 2;
    this.pts = 0;

    // Derived attributes
    this.hpmax = 5*(this.str + this.con);
    this.hp = this.hpmax;

    // Position
    this.px = x;
    this.py = y;

    // Draw player
    this.draw();
  },

  Creature: function(x, y) {
    // ATK = (STR + DEX + CON)/3
    // DEF = (STR + DEX + CON)/3 - 2
    // HP = 5*(STR + CON)
    // STUNNED if ATK - DEF >= HP/5

    // Base attributes
    this.str = 1;
    this.dex = 1;
    this.con = 1;
    this.pts = 0;

    // Derived attributes
    this.hpmax = 5*(this.str + this.con);
    this.hp = this.hpmax;

    this.cx = x;
    this.cy = y;
    this.draw();
  }
};

module.exports.Player.prototype = {
  getX: function() {
    return this.px;
  },

  getY: function() {
    return this.py;
  },

  getSpeed: function() {
    return this.dex;
  },

  act: function() {
    module.exports.engine.lock();
    window.addEventListener("keydown", this);
  },

  checkItem: function() {
    let key = this.px + this.py*module.exports.width;
    if(module.exports.cells[key] === module.exports.symType.ITEM) {
      if(key === module.exports.item) {
        module.exports.logWrite("Congratulations, you found the special item!");
        module.exports.logWrite("Select 'New Game' from the File menu to play again");
        module.exports.engine.lock();
        window.removeEventListener("keydown", this);
      } else {
        module.exports.logWrite("This isn't the special item");
      }
    }
  },

  handleEvent: function(event) {
    let keyMap = {};
    keyMap[38] = 0;
    keyMap[33] = 1;
    keyMap[39] = 2;
    keyMap[34] = 3;
    keyMap[40] = 4;
    keyMap[35] = 5;
    keyMap[37] = 6;
    keyMap[36] = 7;

    let code = event.keyCode;
    if(code === 13 || code === 32) {
      this.checkItem();
      return;
    }

    /* one of numpad directions? */
    if(!(code in keyMap)) { return; }

    /* is there a free space? */
    let dir = ROT.DIRS[8][keyMap[code]];
    let newX = this.px + dir[0];
    let newY = this.py + dir[1];
    let newKey = newX + newY*module.exports.width;
    if(module.exports.cells[newKey] === module.exports.symType.WALL) { return; }

    let oldKey = this.px + this.py*module.exports.width;
    module.exports.drawTile(oldKey, module.exports.cells[oldKey]);

    this.px = newX;
    this.py = newY;
    this.draw();
    window.removeEventListener("keydown", this);
    module.exports.engine.unlock();
  },

  draw: function() {
    module.exports.display.draw(this.px, this.py, "@", "#ff0");
  }
};

module.exports.Creature.prototype = {
  getSpeed: function() {
    return this.dex;
  },

  draw: function() {
    module.exports.display.draw(this.cx, this.cy, "M", "red");
  },

  act: function() {
    let px = module.exports.player.getX();
    let py = module.exports.player.getY();
    let passableCallback = function(x, y) {
      return (module.exports.cells[x + y*module.exports.width] !== module.exports.symType.WALL);
    }
    let astar = new ROT.Path.AStar(px, py, passableCallback, {topology: 8});

    let path = [];
    let pathCallback = function(x, y) {
      path.push([x, y]);
    }
    astar.compute(this.cx, this.cy, pathCallback);

    path.shift(); // Remove the creatures position
    if (path.length === 1) {
      alert("Game Over. You were captured by the Creature!");
      module.exports.logWrite("You lost, better luck next time.");
      module.exports.engine.lock();
    } else {
      px = path[0][0];
      py = path[0][1];
      let key = this.cx + this.cy*module.exports.width;
      module.exports.drawTile(key, module.exports.cells[key]);
      this.cx = px;
      this.cy = py;
      this.draw();
    }
  }
}