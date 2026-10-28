// Quick checks: node test.js
require('./data/listings.js'); const M = require('./match.js'); const L = globalThis.SAMPLE_LISTINGS; const assert = require('assert');
const base = { itemName: 'Mixer grinder base unit', category: 'Kitchen', partType: 'base', brand: 'Prestige', model: 'Iris' };
let m = M.findMatch(base, L); assert.equal(m.kind, 'part'); assert.equal(m.listing.id, 1); assert.equal(m.score, 95);
m = M.findMatch({ itemName: 'Blender base', category: 'Kitchen', partType: 'base', brand: 'Bajaj', model: '' }, L); assert.equal(m.listing.id, 2);
m = M.findMatch({ itemName: 'Laptop', category: 'Electronics', partType: 'laptop', brand: 'Dell', model: 'Inspiron 15' }, L); assert.equal(m.listing.id, 3);
m = M.findMatch({ itemName: 'Winter coat', category: 'Clothing', partType: '', brand: '', model: '' }, L); assert.equal(m.kind, 'alt');
m = M.findMatch({ itemName: 'Mystery', category: 'Other', partType: '', brand: '', model: '' }, L); assert.equal(m.kind, 'none');
console.log('match tests passed');
