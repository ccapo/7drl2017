'use strict';

const ROT = require('rot-js');
let game = null;

let Obj = class Obj {
  constructor(options) {
    // Set defaults
    options.x = options.x || 0;
    options.y = options.y || 0;
    options.symbol = options.symbol || '?';
    options.colour = options.colour || 'white';
    options.blocks = options.blocks || false;

    // Set position, symbol and colour
    this.x = options.x;
    this.y = options.y;
    this.symbol = options.symbol;
    this.colour = options.colour;
    this.blocks = options.blocks;
  }

  getX() {
    return this.x;
  }

  getY() {
    return this.y;
  }

  render() {
    // Only render if visible in camera
    let dx = this.x - game.xOffset;
    let dy = this.y - game.yOffset;
    if(dx >= 0 && dx < game.displayWidth && dy >= 0 && dy < game.displayHeight) {
      game.display.draw(dx, dy, this.symbol, this.colour);
    }
  }
};

let Item = class Item extends Obj {
  constructor(options) {
    // Set position, symbol and colour
    super(options);

    // Set defaults
    options.id = options.id || 2;
    options.name = options.name || 'Earth';
    options.ingredients = options.ingredients || [];

    // Set item ID, name and list of items used to create this item
    this.id = options.id;
    this.name = options.name;
    this.ingredients = options.ingredients;
  }
};

let Entity = class Entity extends Obj {
  constructor(options) {
    // Set position, symbol and colour
    super(options);

    // Blocks path
    this.blocks = true;

    // Set defaults
    options.str = options.str || 1;
    options.dex = options.dex || 1;
    options.con = options.con || 1;
    options.name = options.name || 'Entity';

    // ATK = (STR + DEX + CON)/3
    // DEF = (STR + DEX + CON)/3 - 2
    // HP = 5*(STR + CON)
    // STUNNED if ATK - DEF >= HP/5

    // Base attributes
    this.str = options.str;
    this.dex = options.dex;
    this.con = options.con;
    this.pts = 0;
    this.name = options.name;

    // Derived attributes
    this.hpmax = 5*(this.str + this.con);
    this.hp = this.hpmax;
    this.atk = Math.floor((this.str + this.dex + this.con)/3);
    this.def = Math.max(Math.floor((this.str + this.dex + this.con)/3) - 2, 0);
  }

  getSpeed() {
    return this.dex;
  }

  act() {}
};

let Player = class Player extends Entity {
  constructor(options) {
    super(options);

    // Set defaults
    this.name = 'Player';
    this.symbol = '@';
    this.colour = '#FFFF00';
    this.str = 3;
    this.dex = 3;
    this.con = 3;
    this.hpmax = 5*(this.str + this.con);
    this.hp = this.hpmax;
    this.atk = Math.floor((this.str + this.dex + this.con)/3);
    this.def = Math.max(Math.floor((this.str + this.dex + this.con)/3) - 2, 0);
  }

  act() {
    game.engine.lock();
    window.addEventListener('keydown', this);
  }

  checkAction() {
    let key = this.x + this.y*game.mapWidth;

    // Check if the player is on top of an item
    let foundItemFlag = false;
    let foundItem = null;
    let indexItem = null;
    for(let item of game.maps[game.mapId].items) {
      if(this.x === item.x && this.y === item.y) {
        foundItemFlag = true;
        foundItem = item;
        indexItem = game.maps[game.mapId].items.indexOf(foundItem);
      }
    }

    if(game.maps[game.mapId].cells[key] >= game.symType.EXITUP || foundItemFlag === true) {
      let isExitUp = (key === game.maps[game.mapId].exitUp.key);
      let isExitDown = (key === game.maps[game.mapId].exitDown.key);
      let levelUp = game.maps[game.mapId].exitUp.mapId;
      let levelDown = game.maps[game.mapId].exitDown.mapId;
      if(isExitUp === true || isExitDown === true) {
        // Move to connected level
        let currentLevel = game.mapId;
        let newLevel = isExitUp === true ? levelUp : levelDown;

        // Lock the engine and remove keyboard listener
        game.engine.lock();
        window.removeEventListener('keydown', this);

        if (newLevel < game.MAXLEVELS) {
          // Cleanup display
          game.cleanUp();

          // Set current map ID
          game.mapId = newLevel;

          // Create exits, if necessary
          game.createExits();

          // Move player to the exit of the connect map
          let x = null;
          let y = null;
          if(isExitUp === true) {
            key = game.maps[game.mapId].exitDown.key;
            x = key % game.mapWidth;
            y = Math.floor(key/game.mapWidth);
          } else {
            key = game.maps[game.mapId].exitUp.key;
            x = key % game.mapWidth;
            y = Math.floor(key/game.mapWidth);
          }
          game.player.x = x;
          game.player.y = y;

          // Initialize level
          game.initLevel();

          // Announce map change
          game.logWrite(`Leaving Level ${currentLevel + 1} and Entering Level ${newLevel + 1}`, '#FF00FF');

          // Indicate the player is standing on an exit to the previous map
          if(isExitUp === true) {
            game.logWrite(`You Found An Exit Down`);
          } else {
            game.logWrite(`You Found An Exit Up`);
          }
        } else {
          game.logWrite(`Congratulations, you managed to escape alive!`, '#00ff00');

          // Disable command buttons
          game.craftBtn.onclick = () => {};
          game.dropBtn.onclick = () => {};
          game.removeBtn.onclick = () => {};
          game.wearBtn.onclick = () => {};
          game.wieldBtn.onclick = () => {};
        }
      } else {
        game.logWrite(`You Pick Up ${foundItem.name}`);

        // Add new item to end of list
        game.maps[game.mapId].items.splice(indexItem, 1);
        game.inventory.push(foundItem);
        let newInventory = document.createElement("LI");
        let textNode = document.createTextNode(foundItem.name);
        newInventory.appendChild(textNode);
        newInventory.dataset.id = foundItem.id;
        newInventory.onclick = () => {newInventory.classList.toggle('selected')};
        game.inventoryElement.appendChild(newInventory);
      }
    }
  }

  handleEvent(event) {
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
    keyMap[ROT.VK_NUMPAD5] = -1;  // Numpad 5 (WAIT)

    keyMap[ROT.VK_W] = 0;         // W Key (UP)
    keyMap[ROT.VK_E] = 1;         // E Key (UP+RIGHT)
    keyMap[ROT.VK_D] = 2;         // D Key (RIGHT)
    keyMap[ROT.VK_C] = 3;         // C Key (DOWN+RIGHT)
    keyMap[ROT.VK_X] = 4;         // X Key (DOWN)
    keyMap[ROT.VK_Z] = 5;         // Z Key (DOWN+LEFT)
    keyMap[ROT.VK_A] = 6;         // A Key (LEFT)
    keyMap[ROT.VK_Q] = 7;         // Q Key (UP+LEFT)
    keyMap[ROT.VK_S] = -1;        // S Key (WAIT)

    // Check if action key is pressed
    let code = event.keyCode;
    if(code === ROT.VK_RETURN || code === ROT.VK_SPACE) {
      this.checkAction();
      window.removeEventListener('keydown', this);
      game.engine.unlock();
      return;
    }

    /* Permitted set of movement directions? */
    if(!(code in keyMap)) {
      window.removeEventListener('keydown', this);
      game.engine.unlock();
      return;
    }

    if(keyMap[code] >= 0) {
      /* is there a free space? */
      let dir = ROT.DIRS[8][keyMap[code]];
      let newX = this.x + dir[0];
      let newY = this.y + dir[1];
      let newKey = newX + newY*game.mapWidth;

      let foundCreatureFlag = false;
      let foundCreature = null;
      let indexCreature = null;
      for(let creature of game.maps[game.mapId].creatures) {
        if(newX === creature.x && newY === creature.y && creature.blocks === true) {
          foundCreatureFlag = true;
          foundCreature = creature;
          indexCreature = game.maps[game.mapId].creatures.indexOf(foundCreature);
        }
      }

      // Check if we collide with a wall or a creature
      if(game.maps[game.mapId].cells[newKey] === game.symType.WALL || foundCreatureFlag === true) {
        // If we collide with a creature
        if(foundCreatureFlag === true) {
          if (foundCreature.name !== 'A Hearth') {
            // Attack creature
            let maxDamage = Math.max(this.atk - foundCreature.def, 0);
            let damage = Math.floor(Math.random() * maxDamage);
            if (damage > 0) {
              foundCreature.hp -= damage;
              foundCreature.hp = Math.max(foundCreature.hp, 0);
              game.logWrite(`Player Attacks ${foundCreature.name} For ${damage} Damage`);
              if(foundCreature.hp === 0) {
                game.logWrite(`You Killed The ${foundCreature.name}!`, '#FF0000');
                game.scheduler.remove(foundCreature);
                game.maps[game.mapId].creatures.splice(indexCreature, 1);
                let itemOptions = Object.assign({x: foundCreature.x, y: foundCreature.y, symbol: '%', colour: '#FF0000'}, game.itemDictionary['8']);
                let item = new Item(itemOptions);
                game.maps[game.mapId].items.push(item);
                item.render();
              }
            } else {
              game.logWrite(`Player's Attack Was Ineffectual`);
            }
          } else {
            game.logWrite(`Player Runs Into ${foundCreature.name}`);
          }
        }
        window.removeEventListener('keydown', this);
        game.engine.unlock();
        return;
      }

      // Remove player symbol from current position
      let oldKey = (this.x - game.xOffset) + (this.y - game.yOffset)*game.mapWidth;
      game.renderCell(oldKey, game.maps[game.mapId].cells[oldKey]);

      // Update player's position
      this.x = newX;
      this.y = newY;

      // Check if the player is on top of an item
      let foundItemFlag = false;
      let foundItem = null;
      for(let item of game.maps[game.mapId].items) {
        if(this.x === item.x && this.y === item.y) {
          foundItemFlag = true;
          foundItem = item;
        }
      }
      if(foundItemFlag === true) {
        game.logWrite(`You Found ${foundItem.name}`);
      }

      // Check if the player is on top of an exit
      if(game.maps[game.mapId].cells[newKey] === game.symType.EXITUP) {
        game.logWrite(`You Found An Exit Up`);
      }
      if(game.maps[game.mapId].cells[newKey] === game.symType.EXITDOWN) {
        game.logWrite(`You Found An Exit Down`);
      }

      // Render scene
      game.renderScene();

      window.removeEventListener('keydown', this);
      game.engine.unlock();
    } else {
      // The player decided to wait a turn
      this.render();
      window.removeEventListener('keydown', this);
      game.engine.unlock();
    }
  }
};

let Creature = class Creature extends Entity {
  constructor(options) {
    super(options);

    // Set defaults
    options.aiType = options.aiType || game.aiType.TIMID;

    this.aiType = options.aiType;
    this.minSquaredDistance = 4*4;

    // Set properties based on AI Type
    switch(this.aiType) {
      case game.aiType.TIMID: {
        this.name = 'Spider';
        this.symbol = 's';
        this.colour = '#0000FF';
        this.str = 1;
        this.dex = 1;
        this.con = 1;
        this.hpmax = 5*(this.str + this.con);
        this.hp = this.hpmax;
        this.atk = Math.floor((this.str + this.dex + this.con)/3);
        this.def = Math.max(Math.floor((this.str + this.dex + this.con)/3) - 2, 0);
        this.minSquaredDistance = 6*6;
      } break;
      case game.aiType.NORMAL: {
        this.name = 'Orc';
        this.symbol = 'o';
        this.colour = '#00FF00';
        this.str = 2;
        this.dex = 2;
        this.con = 2;
        this.hpmax = 5*(this.str + this.con);
        this.hp = this.hpmax;
        this.atk = Math.floor((this.str + this.dex + this.con)/3);
        this.def = Math.max(Math.floor((this.str + this.dex + this.con)/3) - 2, 0);
        this.minSquaredDistance = 8*8;
      } break;
      case game.aiType.AGGRESSIVE: {
        this.name = 'Giant';
        this.symbol = 'G';
        this.colour = '#FF0000';
        this.str = 6;
        this.dex = 2;
        this.con = 6;
        this.hpmax = 5*(this.str + this.con);
        this.hp = this.hpmax;
        this.atk = Math.floor((this.str + this.dex + this.con)/3);
        this.def = Math.max(Math.floor((this.str + this.dex + this.con)/3) - 2, 0);
        this.minSquaredDistance = 10*10;
      } break;
      default: {
        console.log(`Unrecognized AI Type: ${this.aiType}`);
      } break;
    }
  }

  act() {
    let px = game.player.getX();
    let py = game.player.getY();
    let r2 = (this.x - px)*(this.x - px) + (this.y - py)*(this.y - py);

    // Only persue the player if within 10 units
    if (r2 < this.minSquaredDistance) {
      // Store creature's position so it avoid itself
      game.cx = this.x;
      game.cy = this.y;
      let passableCallback = function(x, y) {
        let isNotWall = (game.maps[game.mapId].cells[x + y*game.mapWidth] !== game.symType.WALL);
        let isNotCreature = true;
        for(let creature of game.maps[game.mapId].creatures) {
          if(x !== game.cx && y !== game.cy && x === creature.x && y === creature.y && creature.blocks === true) {
            isNotCreature = false;
          }
        }
        return (isNotWall === true && isNotCreature === true);
      }
      let astar = new ROT.Path.AStar(px, py, passableCallback, {topology: 8});

      let path = [];
      let pathCallback = function(x, y) {
        path.push([x, y]);
      }
      astar.compute(this.x, this.y, pathCallback);

      path.shift(); // Remove the creatures position
      if (path.length > 1) {
        px = path[0][0];
        py = path[0][1];

        // Remove creature's symbol from current position
        let oldKey = (this.x - game.xOffset) + (this.y - game.yOffset)*game.mapWidth;
        game.renderCell(oldKey, game.maps[game.mapId].cells[oldKey]);

        // Update creature's position
        this.x = px;
        this.y = py;

        // Render scene
        game.renderScene();
      } else {
        // Attack player
        let maxDamage = Math.max(this.atk - game.player.def, 0);
        let damage = Math.floor(Math.random() * maxDamage);
        if (damage > 0) {
          game.player.hp -= damage;
          game.player.hp = Math.max(game.player.hp, 0);
          game.statusWrite(game.player);
          game.logWrite(`${this.name} Attacks For ${damage} Damage`);
          if(game.player.hp === 0) {
            game.engine.lock();
            window.removeEventListener('keydown', game.player);
            game.logWrite(`You Were Killed By The ${this.name}!`, '#FF0000');
            game.logWrite('Game Over, Better Luck Next Time', '#FF0000');
            game.craftBtn.onclick = () => {};
            game.dropBtn.onclick = () => {};
            game.removeBtn.onclick = () => {};
            game.wearBtn.onclick = () => {};
            game.wieldBtn.onclick = () => {};
          }
        } else {
          game.logWrite(`${this.name}'s Attack Was Ineffectual`);
        }
      }
    }
  }
};

let Game = class Game {
  constructor(options) {
    // Constants
    this.statusHeight = 1;
    this.logHeight = 8;
    this.fontSize = 12;
    this.fontFamily = 'helvetica';
    this.symType = Object.freeze({FLOOR: 0, WALL: 1, EXITUP: 2, EXITDOWN: 3});
    this.aiType = Object.freeze({TIMID: 0, NORMAL: 1, AGGRESSIVE: 2});
    this.MAXLEVELS = 5;
    this.MAXITEMS = 16;
    this.MINCREATURES = 4;
    this.SCALECREATURES = 4;

    // Canvas containers
    this.status = null;
    this.display = null;
    this.log = null;

    // HTML elements
    this.gameElement = document.getElementById('game');
    this.inventoryElement = document.getElementById('inventory');
    this.craftBtn = document.getElementById('craft');
    this.dropBtn = document.getElementById('drop');
    this.removeBtn = document.getElementById('remove');
    this.useBtn = document.getElementById('use');
    this.wearBtn = document.getElementById('wear');
    this.wieldBtn = document.getElementById('wield');

    // Add loader animation and message
    this.loadingAnimation = document.getElementById('loading-animation');
    this.loadingAnimation.classList.add('pong-loader');
    this.loadingMessage = document.getElementById('loading-message');
    this.loadingMessage.innerHTML = 'Generating Map&#8230;';

    // Set display and map widths and heights, as well as display offsets
    this.displayWidth = options.displayWidth;
    this.displayHeight = options.displayHeight;
    this.mapWidth = options.mapWidth;
    this.mapHeight = options.mapHeight;
    this.xOffset = null;
    this.yOffset = null;

    // Game variables
    this.maps = [];
    this.mapId = 0;
    this.engine = null;
    this.scheduler = null;
    this.hearth = null;
    this.player = null;
    this.inventory = [];

    // Item dictionary
    this.itemDictionary = {};

    // First order items
    this.itemDictionary['1'] = {id: 1, name: 'Fire', ingredients: []};
    this.itemDictionary['2'] = {id: 2, name: 'Some Earth', ingredients: []};
    this.itemDictionary['3'] = {id: 3, name: 'Some Water', ingredients: []};
    this.itemDictionary['4'] = {id: 4, name: 'A Stone', ingredients: []};
    this.itemDictionary['5'] = {id: 5, name: 'A Stick', ingredients: []};
    this.itemDictionary['6'] = {id: 6, name: 'Some Vines', ingredients: []};
    this.itemDictionary['7'] = {id: 7, name: 'Some Metal', ingredients: []};
    this.itemDictionary['8'] = {id: 8, name: 'A Carcass', ingredients: []};

    // Second order items
    this.itemDictionary['1+2'] = {id: 9, name: 'Some Sulphur', ingredients: [2]};
    this.itemDictionary['1+3'] = {id: 10, name: 'Some Salt', ingredients: [3]};
    this.itemDictionary['2+3'] = {id: 11, name: 'Some Mud', ingredients: [2]};
    this.itemDictionary['1+5'] = {id: 12, name: 'Some Charcoal', ingredients: [5]};
    this.itemDictionary['4+4'] = {id: 13, name: 'A Sharpened Stone', ingredients: [4, 4]};
    this.itemDictionary['6+6'] = {id: 14, name: 'A Vine Rope', ingredients: [6, 6]};
    this.itemDictionary['5+6'] = {id: 15, name: 'An Unlit Torch', ingredients: [5, 6]};
    this.itemDictionary['4+5'] = {id: 16, name: 'A Club', ingredients: [4, 5]};

    // Third order items
    this.itemDictionary['1+11'] = {id: 17, name: 'A Mud Brick', ingredients: [11]};
    this.itemDictionary['8+13'] = {id: 18, name: 'An Animal Hide', ingredients: [8]};
    this.itemDictionary['5+13'] = {id: 19, name: 'A Sharpened Stick', ingredients: [5]};
    this.itemDictionary['7+13'] = {id: 20, name: 'A Sharpened Metal', ingredients: [7]};
    this.itemDictionary['4+14'] = {id: 21, name: 'A Bolas', ingredients: [4, 14]};
    this.itemDictionary['1+15'] = {id: 22, name: 'A Lit Torch', ingredients: [15]};

    // Fourth order items
    this.itemDictionary['17+17'] = {id: 23, name: 'A Brick Wall', ingredients: [17, 17]};
    this.itemDictionary['5+20'] = {id: 24, name: 'An Axe', ingredients: [5, 20]};

    // Special items
    this.itemDictionary['9+10+12'] = {id: 25, name: 'Some Black Powder', ingredients: [9, 10, 12]};
    this.itemDictionary['1+3+20'] = {id: 26, name: 'A Tempered Blade', ingredients: [20]};
    this.itemDictionary['1+13+18'] = {id: 27, name: 'A Leather Armour', ingredients: [13, 18]};

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
            // Remove the consumable items used to create the new item from the inventory
            for(const consume of newItem.ingredients) {
              let index = this.inventory.indexOf(consume);
              if(index > -1) {
                this.inventory.splice(index, 1);
              }
              for (let item of selectedItems) {
                if (consume === parseInt(item.dataset.id)) {
                  item.remove();
                }
              }
            }

            // Add new item to end of list
            this.inventory.push(newItem);
            let newInventory = document.createElement("LI");
            let textNode = document.createTextNode(newItem.name);
            newInventory.appendChild(textNode);
            newInventory.dataset.id = newItem.id;
            newInventory.onclick = () => {newInventory.classList.toggle('selected')};
            this.inventoryElement.appendChild(newInventory);
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
        for (let selectedItem of selectedItems) {
          let index = -1;
          for(let i = 0; i < this.inventory.length; i++) {
            let inv = this.inventory[i];
            if (inv.id === parseInt(selectedItem.dataset.id)) {
              index = i;
            }
          }
          if (index > -1) {
            this.logWrite(`You Dropped ${selectedItem.innerHTML}!`);
            this.inventory.splice(index, 1);
            let itemOptions = Object.assign({x: this.player.x, y: this.player.y, symbol: '?', colour: '#FFFFFF'}, game.itemDictionary[selectedItem.dataset.id]);
            let item = new Item(itemOptions);
            game.maps[game.mapId].items.push(item);
            selectedItem.remove();
          }

        }
      } else {
        alert('Please select an item to drop');
      }
    };

    // Add on click listener for remove button
    this.removeBtn.onclick = () => {
      let selectedItems = document.querySelectorAll(".selected");
      if (selectedItems.length > 0) {
        let itemsArray = [];
        for (let item of selectedItems) {
          let origName = item.innerHTML.split(' (')[0];
          item.innerHTML = origName;
          this.logWrite(`You Removed ${item.innerHTML}!`);
        }
      } else {
        alert('Please select an item to remove/unequip');
      }
    };

    // Add on click listener for use button
    this.useBtn.onclick = () => {
      let selectedItems = document.querySelectorAll(".selected");
      if (selectedItems.length === 1) {
        // Use item
        game.logWrite("I Don't Know How To Use That");
      } else {
        alert('Please select an item to use');
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

  // Clean up game components
  cleanUp(initialFlag) {
    initialFlag = initialFlag || false;

    if(initialFlag === true) {
      // Remove canvas elements
      let canvases = document.getElementsByTagName('canvas');
      for (let canvas of canvases) {
        this.gameElement.removeChild(canvas);
      }
      canvases = document.getElementsByTagName('canvas');
      for (let canvas of canvases) {
        this.gameElement.removeChild(canvas);
      }

      // Remove all items from inventory
      while (this.inventoryElement.firstChild) {
        this.inventoryElement.removeChild(this.inventoryElement.firstChild);
      }

      // Empty maps and base inventory
      this.maps = [];
      this.mapId = 0;
      this.inventory = [
        this.itemDictionary['1']
      ];        
      this.hearth = null;

      // Add inventory to menu
      for (let item of this.inventory) {
        let newInventory = document.createElement("LI");
        let textNode = document.createTextNode(item.name);
        newInventory.appendChild(textNode);
        newInventory.dataset.id = item.id;
        newInventory.onclick = () => {newInventory.classList.toggle('selected')};
        this.inventoryElement.appendChild(newInventory);
      }
    }

    if (this.status) {
      this.status.clear();
    }

    if (this.display) {
      this.xOffset = 0;
      this.yOffset = 0;
      this.display.clear();
    }

    if (this.log) {
      this.log.clear();
    }

    if (this.scheduler) {
      this.scheduler.clear();
    }
  }

  initCanvas() {
    // Remove loading animation and message
    this.loadingAnimation.classList.remove('pong-loader');
    this.loadingMessage.innerHTML = '';

    // Common display options
    let displayOptions = {
      width: this.displayWidth,
      height: this.displayHeight,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontStyle: 'bold',
      forceSquareRatio: true
    };

    // Player Stats Display
    let statusOptions = Object.assign({}, displayOptions, {height: this.statusHeight});
    this.status = new ROT.Display(statusOptions);
    this.gameElement.appendChild(this.status.getContainer());

    // Game Display, width, height and offsets
    this.display = new ROT.Display(displayOptions);
    this.xOffset = 0;
    this.yOffset = 0;
    this.gameElement.appendChild(this.display.getContainer());

    // Message Log Display
    let logOptions = Object.assign({}, displayOptions, {height: this.logHeight});
    this.log = new ROT.Display(logOptions);
    this.log.messages = [];
    this.gameElement.appendChild(this.log.getContainer());
  }

  // Render a single cell
  renderCell(key, value) {
    let x = key % this.mapWidth;
    let y = Math.floor(key/this.mapWidth);
    switch (value) {
      case this.symType.FLOOR: {
        this.display.draw(x, y, ' ', '#000000');
      } break;

      case this.symType.WALL: {
        this.display.draw(x, y, '#', '#777777');
      } break;

      case this.symType.EXITUP: {
        this.display.draw(x, y, '>', '#FF00FF');
      } break;

      case this.symType.EXITDOWN: {
        this.display.draw(x, y, '<', '#FF00FF');
      } break;

      default: {
        console.log(`Unrecognized value: ${value} @ ${x}, ${y}`);
      } break;
    }
  }

  // Render the map
  renderMap() {
    // Clear the display
    this.display.clear();

    // Only draw what is centred on the player
    for(let x = 0; x < this.displayWidth; x++) {
      for(let y = 0; y < this.displayHeight; y++) {
        let offset = x + this.mapWidth*y;
        let poffset = (x + this.xOffset) + this.mapWidth*(y + this.yOffset);
        this.renderCell(offset, this.maps[this.mapId].cells[poffset]);
      }
    }
  }

  // Move camera
  moveCamera(entity) {
    // New display coordinates (top-left corner of the screen relative to the map)
    // Coordinates so that the target is at the center of the screen
    let cx = entity.getX() - Math.floor(this.displayWidth/2);
    let cy = entity.getY() - Math.floor(this.displayHeight/2);

    // Make sure the DISPLAY doesn't see outside the map
    if(cx < 0) cx = 0;
    if(cy < 0) cy = 0;
    if(cx > this.mapWidth - this.displayWidth) cx = this.mapWidth - this.displayWidth;
    if(cy > this.mapHeight - this.displayHeight) cy = this.mapHeight - this.displayHeight;

    // Display offsets
    this.xOffset = cx;
    this.yOffset = cy;
  }

  // Write to the message log
  logWrite(message, colour) {
    // If the log is full, remove first entry
    if(this.log.messages.length === this.logHeight - 2) {
      this.log.messages.splice(0, 1);
    }

    // Push new message into array
    this.log.messages.push({text: message, colour: colour});

    // Erase old messages
    for(let x = 2; x < this.displayWidth - 2; x++) {
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
  }

  statusWrite(entity) {
    // Construct player stats panel data
    let statusStr = 'HP: %c{#00ff00}' + entity.hp + '/' + entity.hpmax + '%c{}';
    statusStr += ' STR: %c{#00ff00}' + entity.str + '%c{}';
    statusStr += ' DEX: %c{#00ff00}' + entity.dex + '%c{}';
    statusStr += ' CON: %c{#00ff00}' + entity.con + '%c{}';
    statusStr += ' PTS: %c{#00ff00}' + entity.pts + '%c{}';

    // Write to status panel
    this.status.drawText(1, 0, statusStr);
  }

  // Create Items
  createItems() {
    if (this.maps[this.mapId].items.length < this.MAXITEMS) {
      for(let i = 0; i < this.MAXITEMS; i++) {
        // Select a valid floor cell
        let index = Math.floor(ROT.RNG.getUniform() * this.maps[this.mapId].floorCells.length);
        let key = this.maps[this.mapId].floorCells.splice(index, 1)[0];
        let x = key % this.mapWidth;
        let y = Math.floor(key/this.mapWidth);

        // Select one of the first order items
        let itemId = Math.floor(2 + ROT.RNG.getUniform() * 6);
        let itemOptions = {};
        switch(itemId) {
          // Earth
          case 2: {
            itemOptions = Object.assign({x: x, y: y, symbol: '~', colour: '#4D2800'}, this.itemDictionary['2']);
          } break;
          // Water
          case 3: {
            itemOptions = Object.assign({x: x, y: y, symbol: '~', colour: '#0000FF'}, this.itemDictionary['3']);
          } break;
          // Stone
          case 4: {
            itemOptions = Object.assign({x: x, y: y, symbol: '.', colour: '#404040'}, this.itemDictionary['4']);
          } break;
          // Stick
          case 5: {
            itemOptions = Object.assign({x: x, y: y, symbol: '/', colour: '#663300'}, this.itemDictionary['5']);
          } break;
          // Vines
          case 6: {
            itemOptions = Object.assign({x: x, y: y, symbol: '~', colour: '#00FF00'}, this.itemDictionary['6']);
          } break;
          // Metal
          case 7: {
            itemOptions = Object.assign({x: x, y: y, symbol: '-', colour: '#808080'}, this.itemDictionary['7']);
          } break;
          default: {
            console.log(`Unrecognized item ID: ${itemId}`);
          } break;
        }

        let item = new Item(itemOptions);
        this.maps[this.mapId].items.push(item);
      }
    }
  }

  // Create Exits
  createExits() {
    // Create the up exit
    if (!this.maps[this.mapId].exitUp.hasOwnProperty('key')) {
      let index = Math.floor(ROT.RNG.getUniform() * this.maps[this.mapId].floorCells.length);
      let key = this.maps[this.mapId].floorCells.splice(index, 1)[0];
      //let key = this.player.x + this.mapWidth*(this.player.y + 1);
      this.maps[this.mapId].cells[key] = this.symType.EXITUP;
      this.maps[this.mapId].exitUp = {
        key: key,
        mapId: this.mapId + 1
      };
    }

    if (this.mapId > 0 && !this.maps[this.mapId].exitDown.hasOwnProperty('key')) {
      // Create the down exit, except for the first level
      let index = Math.floor(ROT.RNG.getUniform() * this.maps[this.mapId].floorCells.length);
      let key = this.maps[this.mapId].floorCells.splice(index, 1)[0];
      this.maps[this.mapId].cells[key] = this.symType.EXITDOWN;
      this.maps[this.mapId].exitDown = {
        key: key,
        mapId: this.mapId - 1
      };
    }
  }

  // Create Creatures
  createCreatures() {
    let maxCreatures = this.MINCREATURES + this.mapId * this.SCALECREATURES;
    if (this.maps[this.mapId].creatures.length < maxCreatures) {
      for(let i = 0; i < maxCreatures; i++) {
        // Select a valid floor cell
        let index = Math.floor(ROT.RNG.getUniform() * this.maps[this.mapId].floorCells.length);
        let key = this.maps[this.mapId].floorCells.splice(index, 1)[0];
        let x = key % this.mapWidth;
        let y = Math.floor(key/this.mapWidth);

        // Select an AI type
        let aiTypeId = Math.floor(ROT.RNG.getUniform() * 3);
        let creatureOptions = {};
        switch(aiTypeId) {
          case this.aiType.TIMID: {
            creatureOptions = {x: x, y: y, aiType: aiTypeId};
          } break;
          case this.aiType.NORMAL: {
            creatureOptions = {x: x, y: y, aiType: aiTypeId};
          } break;
          case this.aiType.AGGRESSIVE: {
            creatureOptions = {x: x, y: y, aiType: aiTypeId};
          } break;
          default: {
            console.log(`Unrecognized AI type ID: ${aiTypeId}`);
          } break;
        }

        let creature = new Creature(creatureOptions);
        this.scheduler.add(creature, true);
        this.maps[this.mapId].creatures.push(creature);  
      }
    }
  }

  // Create Player
  createPlayer() {
    // Select a valid floor cell
    let index = Math.floor(ROT.RNG.getUniform() * this.maps[this.mapId].floorCells.length);
    let key = this.maps[this.mapId].floorCells.splice(index, 1)[0];
    let x = key % this.mapWidth;
    let y = Math.floor(key/this.mapWidth);

    return new Player({x: x, y: y});
  }

  // Render the scene
  renderScene() {
    // Move camera to be centred on player
    this.moveCamera(this.player);

    // Render map
    this.renderMap();

    // Render items
    for(const item of this.maps[this.mapId].items) {
      item.render();
    }

    // Render creatures
    for(const creature of this.maps[this.mapId].creatures) {
      creature.render();  
    }

    // Render player
    this.player.render();
  }

  // Initialize level
  initLevel() {
    // Create border for top and bottom of message log
    for(let x = 0; x < this.displayWidth; x++) {
      this.log.drawText(x, 0, '-');
      this.log.drawText(x, this.logHeight - 1, '-');
    }

    // Create border for left and right of message log
    for(let y = 1; y < this.logHeight - 1; y++) {
      this.log.drawText(0, y, '|');
      this.log.drawText(this.displayWidth - 1, y, '|');
    }

    // Title for message log
    this.log.drawText(2, 0, 'Message Log');

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

    // Create items, if necessary
    this.createItems();

    // Create exits, if necessary
    this.createExits();

    // Create scheduler and game engine
    this.scheduler = new ROT.Scheduler.Speed();

    // Add player to scheduler
    this.statusWrite(this.player);
    this.scheduler.add(this.player, true);

    // Create hearth, if necessary
    if(this.mapId === 0 && this.hearth === null) {
      this.hearth = new Entity({x: this.player.x, y: this.player.y - 1, symbol: '=', colour: '#FF9933', name: 'A Hearth'});
      this.maps[this.mapId].creatures.push(this.hearth);
    }

    // Create creatures, if necessary
    this.createCreatures();

    // Render the scene
    this.renderScene();

    // Create and start game engine
    this.engine = new ROT.Engine(this.scheduler);
    this.engine.start();
  }

  // Initialize game
  init() {
    // Initialize canvas elements
    this.initCanvas();

    // Create player
    this.player = this.createPlayer();

    // Initialize level
    this.initLevel();
  }

  // Craft item
  craftItem(items) {
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
      this.logWrite(`You Crafted ${newItem.name}!`, '#0000ff');
    } else {
      this.logWrite(`Hmm ... That Didn't Work`);
    }

    return newItem;
  }
};

const options = {
  displayWidth: 64,
  displayHeight: 55,
  mapWidth: 2*64,
  mapHeight: 2*55
};
game = new Game(options);

// Export game instance
module.exports.game = game;
