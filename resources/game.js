const ROT = require('rot-js');

module.exports = {
  // Canvas containers
  status: null,
  display: null,
  log: null,

  // Constants
  statusHeight: 1,
  logHeight: 8,
  fontSize: 12,
  fontFamily: 'helvetica',
  symType: Object.freeze({FLOOR: 0, WALL: 1, ITEM: 2, EXIT: 3}),

  // Global variables
  levels: [],
  levelId: 0,
  MAXLEVELS: 2,
  MAXITEMS: 3,
  engine: null,
  scheduler: null,
  player: null,
  creature: null,
  itemDictionary: {},
  inventory: [],

  // HTML elements
  gameElement: null,
  inventoryElement: null,
  loadingAnimation: null,
  loadingMessage: null,
  craftBtn: null,
  dropBtn: null,
  wearBtn: null,
  wieldBtn: null,

  // Clean up game state
  cleanUp: function(initial) {
    initial = initial || false;

    if (initial === true) {
      // Remove canvas elements
      this.gameElement = document.getElementById('game');
      let canvases = document.getElementsByTagName('canvas');
      for (let canvas of canvases) {
        this.gameElement.removeChild(canvas);
      }

      canvases = document.getElementsByTagName('canvas');
      for (let canvas of canvases) {
        this.gameElement.removeChild(canvas);
      }

      if (this.status) {
        this.status.clear();
      }

      if (this.log) {
        this.log.messages = [];
        this.log.clear();
      }

      if (this.inventory) {
        this.inventory = [
          this.itemDictionary['1'],
          this.itemDictionary['2'],
          this.itemDictionary['3']
        ];
      }

      // Add loader animation and message
      this.loadingAnimation = document.getElementById('loading-animation');
      this.loadingAnimation.classList.add('pong-loader');
      this.loadingMessage = document.getElementById('loading-message');
      this.loadingMessage.innerHTML = 'Generating Map&#8230;';

      this.inventoryElement = document.getElementById('inventory');
      this.craftBtn = document.getElementById('craft');
      this.dropBtn = document.getElementById('drop');
      this.wearBtn = document.getElementById('wear');
      this.wieldBtn = document.getElementById('wield');

      // Remove all items from inventory
      while (this.inventoryElement.firstChild) {
        this.inventoryElement.removeChild(this.inventoryElement.firstChild);
      }
    }

    if (this.display) {
      this.display.clear();
    }

    if (this.scheduler) {
      this.scheduler.clear();
    }

    if (this.player) {
      this.player = null;
    }

    if (this.creature) {
      this.creature = null;
    }
  },
 
  // Game initialization
  initCanvas: function(map) {
    let canvases = document.getElementsByTagName('canvas');
    if(canvases.length > 0) {
      throw new Error('Canvas elements were not removed!');
    }

    let displayOptions = {
      width: map.width,
      height: map.height,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontStyle: 'bold',
      forceSquareRatio: true
    };

    // Store first level
    this.levelId = 0;
    this.levels = [map];

    // Player Stats, Game Display and Message Log
    let statusOptions = Object.assign({}, displayOptions, {height: this.statusHeight});
    this.status = new ROT.Display(statusOptions);
    document.getElementById('game').appendChild(this.status.getContainer());

    this.display = new ROT.Display(displayOptions);
    document.getElementById('game').appendChild(this.display.getContainer());

    let logOptions = Object.assign({}, displayOptions, {height: this.logHeight});
    this.log = new ROT.Display(logOptions);
    this.log.messages = [];
    document.getElementById('game').appendChild(this.log.getContainer());

    this.initPanels();
  },

  // Game initialization
  init: function(initial) {
    initial = initial || false;

    this.scheduler = new ROT.Scheduler.Speed();
    this.scheduler.add(this.player, true);
    this.scheduler.add(this.creature, true);

    this.engine = new ROT.Engine(this.scheduler);
    this.engine.start();

    if (initial === true) {
      this.statusWrite(this.player);

      this.itemDictionary['1'] = {id: 1, name: 'Fire', consumables: []};
      this.itemDictionary['2'] = {id: 2, name: 'Earth', consumables: []};
      this.itemDictionary['3'] = {id: 3, name: 'Water', consumables: []};
      this.itemDictionary['4'] = {id: 4, name: 'Stone', consumables: []};
      this.itemDictionary['5'] = {id: 5, name: 'Stick', consumables: []};
      this.itemDictionary['6'] = {id: 6, name: 'Vines', consumables: []};
      this.itemDictionary['7'] = {id: 7, name: 'Metal', consumables: []};
      this.itemDictionary['8'] = {id: 8, name: 'Dead Animal', consumables: []};

      // Second order items
      this.itemDictionary['1+2'] = {id: 9, name: 'Sulphur', consumables: [2]};
      this.itemDictionary['1+3'] = {id: 10, name: 'Salt', consumables: [3]};
      this.itemDictionary['2+3'] = {id: 11, name: 'Mud', consumables: [2]};
      this.itemDictionary['1+5'] = {id: 12, name: 'Charcoal', consumables: [5]};
      this.itemDictionary['4+4'] = {id: 13, name: 'Sharpened Stone', consumables: [4, 4]};
      this.itemDictionary['6+6'] = {id: 14, name: 'Vine Rope', consumables: [6, 6]};
      this.itemDictionary['5+6'] = {id: 15, name: 'Unlit Torch', consumables: [5, 6]};
      this.itemDictionary['4+5'] = {id: 16, name: 'Club', consumables: [4, 5]};

      // Third order items
      this.itemDictionary['1+11'] = {id: 17, name: 'Mud Brick', consumables: [11]};
      this.itemDictionary['8+13'] = {id: 18, name: 'Animal Hide', consumables: [8]};
      this.itemDictionary['5+13'] = {id: 19, name: 'Sharpened Stick', consumables: [5]};
      this.itemDictionary['7+13'] = {id: 20, name: 'Sharpened Metal', consumables: [7]};
      this.itemDictionary['4+14'] = {id: 21, name: 'Bolas', consumables: [4, 14]};
      this.itemDictionary['1+15'] = {id: 22, name: 'Lit Torch', consumables: [15]};

      // Fourth order items
      this.itemDictionary['17+17'] = {id: 23, name: 'Brick Wall', consumables: [17, 17]};
      this.itemDictionary['5+20'] = {id: 24, name: 'Axe', consumables: [5, 20]};

      // Special items
      this.itemDictionary['9+10+12'] = {id: 25, name: 'Black Powder', consumables: [9, 10, 12]};
      this.itemDictionary['1+3+20'] = {id: 26, name: 'Tempered Blade', consumables: [20]};
      this.itemDictionary['1+13+18'] = {id: 27, name: 'Leather Armour', consumables: [13, 18]};

      // Setup basic inventory
      this.inventory = [
        this.itemDictionary['1'],
        this.itemDictionary['2'],
        this.itemDictionary['3']
      ];

      // Add inventory to menu
      for (let item of this.inventory) {
        let newInventory = document.createElement("LI");
        let textNode = document.createTextNode(item.name);
        newInventory.appendChild(textNode);
        newInventory.dataset.id = item.id;
        newInventory.onclick = () => {newInventory.classList.toggle('selected')};
        this.inventoryElement.appendChild(newInventory);
      }

      // Add on click listener for craft button
      this.craftBtn.onclick = () => {
        let selectedItems = document.querySelectorAll(".selected");
        if (selectedItems.length >= 2) {
          let itemsArray = [];
          for (let item of selectedItems) {
            itemsArray.push(parseInt(item.dataset.id));
            item.classList.remove('selected');
          }
          let newItem = this.craftItem(itemsArray);
          if (newItem) {
            let index = -1;
            for(let i = 0; i < this.inventory.length; i++) {
              let inv = this.inventory[i];
              if (inv.id === newItem.id) {
                index = i;
              }
            }
            if (index === -1) {
              this.inventory.push(newItem);
              let newInventory = document.createElement("LI");
              let textNode = document.createTextNode(newItem.name);
              newInventory.appendChild(textNode);
              newInventory.dataset.id = newItem.id;
              newInventory.onclick = () => {newInventory.classList.toggle('selected')};
              this.inventoryElement.appendChild(newInventory);
            } else {
              this.logWrite(`${newItem.name} Already in Inventory`);
            }
          }
        } else {
          alert('Please select two or more items to craft');
        }
      };

      // Add on click listener for drop button
      this.dropBtn.onclick = () => {
        let selectedItems = document.querySelectorAll(".selected");
        if (selectedItems.length > 0) {
          let itemsArray = [];
          for (let item of selectedItems) {
            this.logWrite(`You Dropped ${item.innerHTML}!`);
            let index = -1;
            for(let i = 0; i < this.inventory.length; i++) {
              let inv = this.inventory[i];
              if (inv.id === parseInt(item.dataset.id)) {
                index = i;
              }
            }
            if (index > -1) {
              this.inventory.splice(index, 1);
            }
            item.remove();
          }
        } else {
          alert('Please select an item to drop');
        }
      };

      // Add on click listener for wear button
      this.wearBtn.onclick = () => {
        let selectedItems = document.querySelectorAll(".selected");
        if (selectedItems.length > 0) {
          // Wear item
          for (let item of selectedItems) {
            this.logWrite(`You Wear ${item.innerHTML}!`);
            item.innerHTML = item.innerHTML + ' (worn)';
            item.classList.remove('selected');
          }
        } else {
          alert('Please select an item to wear');
        }
      };

      // Add on click listener for wield button
      this.wieldBtn.onclick = () => {
        let selectedItems = document.querySelectorAll(".selected");
        if (selectedItems.length > 0) {
          // Wield item
          for (let item of selectedItems) {
            this.logWrite(`You Wield ${item.innerHTML}!`);
            item.innerHTML = item.innerHTML + ' (wielded)';
            item.classList.remove('selected');
          }
        } else {
          alert('Please select an item to wield');
        }
      };
    }
  },

  // Initialize the message log, inventory and crucible panels
  initPanels: function() {
    // Create border for top and bottom of message log
    for(let x = 0; x < this.levels[this.levelId].width; x++) {
      this.log.drawText(x, 0, '-');
      this.log.drawText(x, this.logHeight - 1, '-');
    }

    // Create border for left and right of message log
    for(let y = 1; y < this.logHeight - 1; y++) {
      this.log.drawText(0, y, '|');
      this.log.drawText(this.levels[this.levelId].width - 1, y, '|');
    }

    // Title for message log
    this.log.drawText(2, 0, 'Message Log');
  },

  // Write to the message log
  logWrite: function(message, msgColour) {
    // If the log is full, remove first entry
    if( this.log.messages.length === this.logHeight - 2 ) {
	    this.log.messages.splice(0, 1);
    }

    // Push new message into array
    this.log.messages.push({text: message, colour: msgColour});

    // Erase old messages
    for(let x = 2; x < this.levels[this.levelId].width - 2; x++) {
      for(let y = 1; y < this.logHeight - 2; y++) {
        this.log.draw(x, y, ' ', '#000000');
      }
    }

    // Display messages from newest to oldest
    let y = 1, fraction = 0.0;
    for(let i = this.log.messages.length - 1; i >= 0; i--) {
      let colour = ROT.Color.toHex(ROT.Color.interpolate([204, 204, 204], [0, 0, 0], fraction));
      if (this.log.messages[i].colour) {
        this.log.drawText(2, y++, '%c{' + this.log.messages[i].colour + '}' + this.log.messages[i].text);
      } else {
        this.log.drawText(2, y++, '%c{' + colour + '}' + this.log.messages[i].text);
      }
      fraction += 0.15
    }
  },

  statusWrite: function(data) {
    let statusStr = 'HP: %c{#0f0}' + data.hp + '/' + data.hpmax + '%c{}';
    statusStr += ' STR: %c{#0f0}' + data.str + '%c{}';
    statusStr += ' DEX: %c{#0f0}' + data.dex + '%c{}';
    statusStr += ' CON: %c{#0f0}' + data.con + '%c{}';
    statusStr += ' PTS: %c{#0f0}' + data.pts + '%c{}';
    this.status.drawText(1, 0, statusStr);
  },

  // Generate Items
  generateItems: function() {
    if (this.levels[this.levelId].items.length === 0) {
      for(let i = 0; i < this.MAXITEMS; i++) {
        let index = Math.floor(ROT.RNG.getUniform() * this.levels[this.levelId].floorCells.length);
        let key = this.levels[this.levelId].floorCells.splice(index, 1)[0];
        this.levels[this.levelId].cells[key] = module.exports.symType.ITEM;
        this.levels[this.levelId].items.push(key);
      }
    }

    if (!(this.levels[this.levelId].exit.hasOwnProperty('key') && this.levels[this.levelId].exit.hasOwnProperty('levelId'))) {
      // Select the exit
      let index = Math.floor(ROT.RNG.getUniform() * this.levels[this.levelId].floorCells.length);
      let key = this.levels[this.levelId].floorCells.splice(index, 1)[0];
      this.levels[this.levelId].cells[key] = module.exports.symType.EXIT;
      this.levels[this.levelId].exit.key = key;
      this.levels[this.levelId].exit.levelId = (this.levelId + 1) % this.MAXLEVELS;
      console.log(`${this.levelId} => ${this.levels[this.levelId].exit.levelId}`);
    }
  },

  // Create entity
  createEntity: function(entity) {
    let index = Math.floor(ROT.RNG.getUniform() * this.levels[this.levelId].floorCells.length);
    let key = this.levels[this.levelId].floorCells.splice(index, 1)[0];
    let x = key % this.levels[this.levelId].width;
    let y = Math.floor(key/this.levels[this.levelId].width);
    return new entity(x, y);
  },

  // Draw a tile
  drawTile: function(key, value) {
    let x = key % this.levels[this.levelId].width;
    let y = Math.floor(key/this.levels[this.levelId].width);
    switch (value) {
      case module.exports.symType.FLOOR: {
        this.display.draw(x, y, ' ', '#000000');
      } break;

      case module.exports.symType.WALL: {
        this.display.draw(x, y, '#', '#777777');
      } break;

      case module.exports.symType.ITEM: {
        this.display.draw(x, y, '!', '#FF00FF');
      } break;

      case module.exports.symType.EXIT: {
        this.display.draw(x, y, '<', '#66ccff');
      } break;

      default: {
        console.log('Unrecognized value: ' + value);
      } break;
    }
  },

  // Draw the map
  drawMap: function() {
    for(let k = 0; k < this.levels[this.levelId].cells.length; k++) {
      this.drawTile(k, this.levels[this.levelId].cells[k]);
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
  },

  // Craft item function
  craftItem: function(items) {
    // Check that items is an array
    if (!Array.isArray(items)) {
      throw new Error('craftItems: Items needs to be an array');
    }

    // Check that items array has multiple entries
    if (items.length <= 1) {
      throw new Error('craftItems: Items array must contain two or more items');
    }

    // Sort items array
    items.sort((a, b) => {
      return a - b;
    });

    // Construct crafted item key
    let key = '';
    for(const item of items) {
      key += `${item.toString()}+`;
    }
    key = key.substr(0, key.length - 1);

    // Check if crafted key exists, and assign to newItem
    let newItem = null;
    if(this.itemDictionary.hasOwnProperty(key) === true) {
      newItem = this.itemDictionary[key];
      for(const consume of newItem.consumables) {
        let index = items.indexOf(consume);
        if(index > -1) {
          items.splice(index, 1);
        }
      }
      this.logWrite(`You Crafted ${newItem.name}!`, '#0000ff');
    } else {
      this.logWrite(`Hmm ... that didn't work`);
    }

    return newItem;
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
    window.addEventListener('keydown', this);
  },

  checkAction: function() {
    let key = this.px + this.py*module.exports.levels[module.exports.levelId].width;
    if(module.exports.levels[module.exports.levelId].cells[key] >= module.exports.symType.ITEM) {
      if(key === module.exports.levels[module.exports.levelId].exit.key) {


        // Move to connected level
        module.exports.logWrite(`Leaving Level ${module.exports.levelId + 1} and Entering Level ${module.exports.levels[module.exports.levelId].exit.levelId + 1}`, '#00ff00');
        module.exports.levelId = module.exports.levels[module.exports.levelId].exit.levelId;

        // Lock the engine and remove keyboard listener
        module.exports.engine.lock();
        window.removeEventListener('keydown', this);

        // Cleanup display
        module.exports.cleanUp();

        // Create items
        module.exports.generateItems();

        // Draw map
        module.exports.drawMap();

        // Create and draw the player and a creature
        module.exports.player = module.exports.createEntity(module.exports.Player);
        module.exports.creature = module.exports.createEntity(module.exports.Creature);

        // Initialize new level
        module.exports.init();
      } else {
        module.exports.logWrite('You found an item');
      }
    }
  },

  handleEvent: function(event) {
    // Define keybindings
    let keyMap = {};
    keyMap[ROT.VK_UP] = 0;        // Up Arrow Key (UP)
    keyMap[ROT.VK_PAGE_UP] = 1;   // Page Up Key (UP+RIGHT)
    keyMap[ROT.VK_RIGHT] = 2;     // Right Arrow Key (RIGHT)
    keyMap[ROT.VK_PAGE_DOWN] = 3; // Page Down Key (DOWN+RIGHT)
    keyMap[ROT.VK_DOWN] = 4;      // Down Arrow Key (DOWN)
    keyMap[ROT.VK_END] = 5;       // End Key (DOWN+LEFT)
    keyMap[ROT.VK_LEFT] = 6;      // Left Arrow Key (LEFT)
    keyMap[ROT.VK_HOME] = 7;      // Home Key (UP+LEFT)

    keyMap[ROT.VK_NUMPAD8] = 0;   // Numpad 8 (UP)
    keyMap[ROT.VK_NUMPAD9] = 1;   // Numpad 9 (UP+RIGHT)
    keyMap[ROT.VK_NUMPAD6] = 2;   // Numpad 6 (RIGHT)
    keyMap[ROT.VK_NUMPAD3] = 3;   // Numpad 3 (DOWN+RIGHT)
    keyMap[ROT.VK_NUMPAD2] = 4;   // Numpad 2 (DOWN)
    keyMap[ROT.VK_NUMPAD1] = 5;   // Numpad 1 (DOWN+LEFT)
    keyMap[ROT.VK_NUMPAD4] = 6;   // Numpad 4 (LEFT)
    keyMap[ROT.VK_NUMPAD7] = 7;   // Numpad 7 (UP+LEFT)

    keyMap[ROT.VK_W] = 0;         // W Key (UP)
    keyMap[ROT.VK_E] = 1;         // E Key (UP+RIGHT)
    keyMap[ROT.VK_D] = 2;         // D Key (RIGHT)
    keyMap[ROT.VK_C] = 3;         // C Key (DOWN+RIGHT)
    keyMap[ROT.VK_X] = 4;         // X Key (DOWN)
    keyMap[ROT.VK_Z] = 5;         // Z Key (DOWN+LEFT)
    keyMap[ROT.VK_A] = 6;         // A Key (LEFT)
    keyMap[ROT.VK_Q] = 7;         // Q Key (UP+LEFT)

    // Check if action key is pressed
    let code = event.keyCode;
    if(code === ROT.VK_RETURN || code === ROT.VK_SPACE) {
      this.checkAction();
      return;
    }

    /* one of numpad directions? */
    if(!(code in keyMap)) { return; }

    /* is there a free space? */
    let dir = ROT.DIRS[8][keyMap[code]];
    let newX = this.px + dir[0];
    let newY = this.py + dir[1];
    let newKey = newX + newY*module.exports.levels[module.exports.levelId].width;
    if(module.exports.levels[module.exports.levelId].cells[newKey] === module.exports.symType.WALL) { return; }

    let oldKey = this.px + this.py*module.exports.levels[module.exports.levelId].width;
    module.exports.drawTile(oldKey, module.exports.levels[module.exports.levelId].cells[oldKey]);

    this.px = newX;
    this.py = newY;
    this.draw();
    window.removeEventListener('keydown', this);
    module.exports.engine.unlock();
  },

  draw: function() {
    module.exports.display.draw(this.px, this.py, '@', '#ff0');
  }
};

module.exports.Creature.prototype = {
  getSpeed: function() {
    return this.dex;
  },

  draw: function() {
    module.exports.display.draw(this.cx, this.cy, 'M', 'red');
  },

  act: function() {
    let px = module.exports.player.getX();
    let py = module.exports.player.getY();
    let passableCallback = function(x, y) {
      return (module.exports.levels[module.exports.levelId].cells[x + y*module.exports.levels[module.exports.levelId].width] !== module.exports.symType.WALL);
    }
    let astar = new ROT.Path.AStar(px, py, passableCallback, {topology: 8});

    let path = [];
    let pathCallback = function(x, y) {
      path.push([x, y]);
    }
    astar.compute(this.cx, this.cy, pathCallback);

    path.shift(); // Remove the creatures position
    if (path.length === 1) {
      module.exports.logWrite('You were captured by the Creature!', '#ff0000');
      module.exports.logWrite('Game Over, better luck next time.', '#ff0000');
      module.exports.engine.lock();
      window.removeEventListener('keydown', module.exports.Player);
    } else {
      px = path[0][0];
      py = path[0][1];
      let key = this.cx + this.cy*module.exports.levels[module.exports.levelId].width;
      module.exports.drawTile(key, module.exports.levels[module.exports.levelId].cells[key]);
      this.cx = px;
      this.cy = py;
      this.draw();
    }
  }
}
