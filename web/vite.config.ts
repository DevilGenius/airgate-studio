import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const SHARED_MODULES = ['react', 'react-dom', 'react/jsx-runtime', 'react-i18next'];

function sharedModulesPlugin(): Plugin {
  return {
    name: 'airgate-shared-modules',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        let code = chunk.code;
        for (const mod of SHARED_MODULES) {
          const esc = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // import Default, { named } from "mod"
          code = code.replace(
            new RegExp(`import\\s+([\\w$]+)\\s*,\\s*\\{([^}]+)\\}\\s*from\\s*["']${esc}["'];?`, 'g'),
            (_m, def, named) => {
              const specs = named.split(',').map((s: string) => {
                const parts = s.trim().split(/\s+as\s+/);
                return parts.length === 2 ? `${parts[0].trim()}: ${parts[1].trim()}` : s.trim();
              }).join(', ');
              return `const ${def} = window.__airgate_shared["${mod}"]; const { ${specs} } = window.__airgate_shared["${mod}"];`;
            },
          );
          // import { named } from "mod"
          code = code.replace(
            new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*["']${esc}["'];?`, 'g'),
            (_m, named) => {
              const specs = named.split(',').map((s: string) => {
                const parts = s.trim().split(/\s+as\s+/);
                return parts.length === 2 ? `${parts[0].trim()}: ${parts[1].trim()}` : s.trim();
              }).join(', ');
              return `const { ${specs} } = window.__airgate_shared["${mod}"];`;
            },
          );
          // import * as X from "mod"
          code = code.replace(
            new RegExp(`import\\s*\\*\\s*as\\s+(\\w+)\\s+from\\s*["']${esc}["'];?`, 'g'),
            (_m, name) => `const ${name} = window.__airgate_shared["${mod}"];`,
          );
          // import Default from "mod"
          code = code.replace(
            new RegExp(`import\\s+([\\w$]+)\\s+from\\s*["']${esc}["'];?`, 'g'),
            (_m, name) => `const ${name} = window.__airgate_shared["${mod}"];`,
          );
          // import "mod" (side-effect only)
          code = code.replace(
            new RegExp(`import\\s*["']${esc}["'];?`, 'g'),
            '',
          );
        }
        chunk.code = code;
      }
    },
  };
}

const watchOptions = process.argv.includes('--watch')
  ? { chokidar: { usePolling: true, interval: 1000 } }
  : undefined;

export default defineConfig({
  plugins: [react(), sharedModulesPlugin()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist',
    rollupOptions: {
      external: SHARED_MODULES,
      output: {
        inlineDynamicImports: true,
      },
    },
    watch: watchOptions,
  },
});
