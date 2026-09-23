const fs = require('fs');
let code = fs.readFileSync('src/ui/components/Navbar.tsx', 'utf-8');

if (code.includes('🎒')) {
  // Let's import Backpack icon or use Library if not present. Wait, I can just color a div or SVG.
  // We'll use lucide-react Library.
  code = code.replace(
    'import { Briefcase, GraduationCap, LogOut, Moon, Sun, Menu, X, Coffee } from "lucide-react";',
    'import { Briefcase, GraduationCap, LogOut, Moon, Sun, Menu, X, Coffee, Backpack } from "lucide-react";'
  );
  code = code.replace(
    '<span className="text-2xl">🎒</span>',
    '<div className="p-2 bg-blue-600 rounded-lg"><Backpack className="w-5 h-5 text-white" /></div>'
  );
  fs.writeFileSync('src/ui/components/Navbar.tsx', code);
}
