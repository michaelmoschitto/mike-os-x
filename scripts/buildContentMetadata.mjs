import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONTENT_DIR = join(__dirname, '../apps/web/content');
const OUTPUT_FILE = join(__dirname, '../apps/web/src/generated/contentMetadata.json');

const getFileKind = (extension) => {
  const ext = extension.toLowerCase();
  const kindMap = {
    '.pdf': 'PDF Document',
    '.md': 'Markdown File',
    '.txt': 'Text File',
    '.jpg': 'Image',
    '.jpeg': 'Image',
    '.png': 'Image',
    '.gif': 'Image',
    '.webp': 'Image',
    '.svg': 'Image',
  };
  return kindMap[ext] || 'Document';
};

const scanDirectory = async (dir, baseDir = dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const metadata = {};

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      const subMetadata = await scanDirectory(fullPath, baseDir);
      Object.assign(metadata, subMetadata);
    } else if (entry.isFile()) {
      try {
        const stats = await stat(fullPath);
        const extension = entry.name.match(/\.[^.]+$/) ? entry.name.match(/\.[^.]+$/)[0] : '';
        
        metadata[relativePath] = {
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          birthtime: stats.birthtime.toISOString(),
          kind: getFileKind(extension),
        };
      } catch (error) {
        console.warn(`Failed to get stats for ${fullPath}:`, error.message);
      }
    }
  }

  return metadata;
};

const buildMetadata = async () => {
  try {
    console.log('Building content metadata...');
    const metadata = await scanDirectory(CONTENT_DIR);
    
    const output = JSON.stringify(metadata, null, 2);
    await import('fs/promises').then(({ writeFile, mkdir }) => {
      const outputDir = dirname(OUTPUT_FILE);
      return mkdir(outputDir, { recursive: true }).then(() => {
        return writeFile(OUTPUT_FILE, output, 'utf-8');
      });
    });
    
    console.log(`✓ Generated metadata for ${Object.keys(metadata).length} files`);
    console.log(`  Output: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Failed to build content metadata:', error);
    process.exit(1);
  }
};

buildMetadata();


