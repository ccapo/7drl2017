let dictionary = {};
dictionary['1'] = {id: 1, name: 'fire', consumables: []};
dictionary['2'] = {id: 2, name: 'earth', consumables: []};
dictionary['3'] = {id: 3, name: 'water', consumables: []};
dictionary['4'] = {id: 4, name: 'stone', consumables: []};
dictionary['5'] = {id: 5, name: 'stick', consumables: []};
dictionary['6'] = {id: 6, name: 'vines', consumables: []};
dictionary['7'] = {id: 7, name: 'metal', consumables: []};
dictionary['8'] = {id: 8, name: 'dead animal', consumables: []};

// Second order items
dictionary['1+2'] = {id: 9, name: 'sulphur', consumables: [2]};
dictionary['1+3'] = {id: 10, name: 'salt', consumables: [3]};
dictionary['2+3'] = {id: 11, name: 'mud', consumables: [2]};
dictionary['1+5'] = {id: 12, name: 'charcoal', consumables: [5]};
dictionary['4+4'] = {id: 13, name: 'sharpened stone', consumables: [4, 4]};
dictionary['6+6'] = {id: 14, name: 'vine rope', consumables: [6, 6]};
dictionary['5+6'] = {id: 15, name: 'unlit torch', consumables: [5, 6]};
dictionary['4+5'] = {id: 16, name: 'club', consumables: [4, 5]};

// Third order items
dictionary['1+11'] = {id: 17, name: 'mud brick', consumables: [11]};
dictionary['8+13'] = {id: 18, name: 'animal hide', consumables: [8]};
dictionary['5+13'] = {id: 19, name: 'sharpened stick', consumables: [5]};
dictionary['7+13'] = {id: 20, name: 'sharpened metal', consumables: [7]};
dictionary['4+14'] = {id: 21, name: 'bolas', consumables: [4, 14]};
dictionary['1+15'] = {id: 22, name: 'lit torch', consumables: [15]};

// Fourth order items
dictionary['17+17'] = {id: 23, name: 'brick wall', consumables: [17, 17]};
dictionary['5+20'] = {id: 24, name: 'axe', consumables: [5, 20]};

// Special items
dictionary['9+10+12'] = {id: 25, name: 'black powder', consumables: [9, 10, 12]};
dictionary['1+3+20'] = {id: 26, name: 'tempered blade', consumables: [20]};
dictionary['1+13+18'] = {id: 27, name: 'leather armour', consumables: [13, 18]};

console.log('dictionary:');
for(const key in dictionary) {
  console.log(key, dictionary[key]);
}

// Craft item function
function craftItem(items) {
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
  if(dictionary.hasOwnProperty(key) === true) {
    newItem = dictionary[key];
    for(const consume of newItem.consumables) {
      let index = items.indexOf(consume);
      if(index > -1) {
        items.splice(index, 1);
      }
    }
    console.log(`Crafted ${newItem.name}!`);
  } else {
    console.log(`Hmm ... that didn't work`);
  }

  return newItem;
}

// Check if array of items results can be crafted
let arrayItems = [1, 3, 20];
console.log(arrayItems);
let newItem = craftItem(arrayItems);
arrayItems.push(newItem.id);
console.log(arrayItems);