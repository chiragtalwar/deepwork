import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Function to remove unused imports
function removeUnusedImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove imports that are marked as unused
  content = content.replace(/import\s*{\s*([^}]+)}\s*from\s*['"][^'"]+['"];?/g, (match, imports) => {
    const usedImports = imports
      .split(',')
      .map(i => i.trim())
      .filter(i => !i.includes(' is defined but never used'))
      .join(', ');
    
    return usedImports ? `import { ${usedImports} } from '@/components/ui';` : '';
  });

  fs.writeFileSync(filePath, content);
}

// Function to remove console.logs
function removeConsoleLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/console\.(log|error|warn|info)\((.*?)\);?\n?/g, '');
  fs.writeFileSync(filePath, content);
}

// Main function
async function main() {
  try {
    // Run ESLint fix first
    execSync('npx eslint . --fix', { stdio: 'inherit' });

    // Get all TypeScript files
    const files = execSync('git ls-files "*.ts" "*.tsx"', { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);

    // Fix each file
    files.forEach(file => {
      const filePath = path.resolve(process.cwd(), file);
      removeUnusedImports(filePath);
      removeConsoleLogs(filePath);
    });

    console.log('✅ Lint fixes applied successfully');
  } catch (error) {
    console.error('❌ Error fixing lint issues:', error);
    process.exit(1);
  }
}

main(); 