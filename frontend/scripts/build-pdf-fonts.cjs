const fs = require("fs");
const path = require("path");

const fontsDir = path.join(__dirname, "../src/pdfFonts");
const outputFile = path.join(__dirname, "../src/pdfFonts/pdfmake-vfs.ts");

const files = ["Nirmala.ttf", "NirmalaB.ttf"];

const vfs = {};

for (const file of files) {
  const filePath = path.join(fontsDir, file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Font file missing: ${filePath}`);
  }

  vfs[file] = fs.readFileSync(filePath).toString("base64");
}

const output = `export const pdfMakeVfs = ${JSON.stringify(vfs, null, 2)};\n`;

fs.writeFileSync(outputFile, output);

console.log("pdfMake VFS generated:", outputFile);
