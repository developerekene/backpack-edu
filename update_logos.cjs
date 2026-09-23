const fs = require('fs');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(filePath, content);
}

// Navbar
replaceInFile('src/ui/components/Navbar.tsx', [
    ['import logoUrl from "../../assets/backpack-logo.png";', ''],
    [/import \{ (.*?) \} from "lucide-react";/, 'import { $1, Backpack } from "lucide-react";'],
    [/<img src=\{logoUrl\} alt="Backpack Logo".*?\/>/, '<Backpack className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />']
]);

// LunchGames
let lunchGames = fs.readFileSync('src/ui/components/LunchGames.tsx', 'utf8');
lunchGames = lunchGames.replace('import logoUrl from "../../assets/backpack-logo.png";', '');
if (!lunchGames.includes('Backpack')) {
    lunchGames = lunchGames.replace(/import \{ (.*?) \} from "lucide-react";/, 'import { $1, Backpack } from "lucide-react";');
}
lunchGames = lunchGames.replace(/<img src=\{logoUrl\}.*?\/>/, '<Backpack className="w-8 h-8 text-indigo-600 dark:text-indigo-400 pointer-events-none drop-shadow-sm" />');
fs.writeFileSync('src/ui/components/LunchGames.tsx', lunchGames);

// Footer
let footer = fs.readFileSync('src/ui/components/Footer.tsx', 'utf8');
footer = footer.replace('import logoUrl from "../../assets/backpack-logo.png";', '');
if (!footer.includes('import { Backpack }')) {
    footer = footer.replace("import { Link } from 'react-router-dom';", "import { Link } from 'react-router-dom';\nimport { Backpack } from 'lucide-react';");
}
footer = footer.replace(/<img src=\{logoUrl\}.*?\/>/, '<Backpack className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />');
fs.writeFileSync('src/ui/components/Footer.tsx', footer);

// Signup
replaceInFile('src/ui/pages/Signup.tsx', [
    ['import logoUrl from "../../assets/backpack-logo.png";', ''],
    [/import \{ (.*?) \} from "lucide-react";/, 'import { $1, Backpack } from "lucide-react";'],
    [/<img src=\{logoUrl\}.*?\/>/, '<Backpack className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />']
]);

// Login
replaceInFile('src/ui/pages/Login.tsx', [
    ['import logoUrl from "../../assets/backpack-logo.png";', ''],
    [/import \{ (.*?) \} from "lucide-react";/, 'import { $1, Backpack } from "lucide-react";'],
    [/<img src=\{logoUrl\}.*?\/>/, '<Backpack className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />']
]);

