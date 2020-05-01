// var njstrace = require('njstrace').inject({
//     files:"**/*.js"
// });

const Color = require("./tuya-color");

// let col = new Color();
// col.colorMode = "colour";
//
// col.setColor("#ff0006")
// console.log(col.color.H);
// console.log(col.color.S);
// console.log(col.color.L);
//
// console.log(JSON.stringify(col.getColorString("hex_brightness")));


col = new Color();
// col.colorMode = "colour"
// col.parseColorString("hex_brightness", "20000140402080");
// console.log(JSON.stringify(col));
// console.log(col.color.H);
// console.log(col.color.S);
// console.log(col.color.L);

let h = col._getAlphaHex(50);
console.log(h);

console.log(col._reverseAlphaHex(h))
