import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve absolute path to project root (two levels up from this script)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, ".."); // from /testUtilFiles/ to /

// ANSI color codes
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

function printDirTree(dir, prefix = "") {
  const excludedDirs = new Set(["node_modules", ".next", ".git"]);
  const items = fs
    .readdirSync(dir)
    .filter((item) => {
      const fullPath = path.join(dir, item);
      const isHidden = item.startsWith(".");
      const isExcluded = excludedDirs.has(item);
      return !isHidden && !isExcluded && fs.existsSync(fullPath);
    })
    .sort();

  const output = [];

  items.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const isLast = index === items.length - 1;
    const pointer = isLast ? "└── " : "├── ";
    const childPrefix = prefix + (isLast ? "    " : "│   ");

    const isDirectory = fs.statSync(fullPath).isDirectory();
    const colorized = isDirectory ? `${CYAN}${item}${RESET}` : item;

    output.push(prefix + pointer + colorized);

    if (isDirectory) {
      output.push(...printDirTree(fullPath, childPrefix));
    }
  });

  return output;
}

const treeOutput = printDirTree(rootDir).join("\n");

// Save plain (no color) version to root of project
const outputPath = path.join(rootDir, "folder-structure.txt");
const plainOutput = treeOutput.replace(/\x1b\[[0-9;]*m/g, ""); // strip ANSI codes
fs.writeFileSync(outputPath, plainOutput, "utf8");

// Print colorized version to console
console.log(treeOutput);
