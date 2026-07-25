import { createHash } from 'crypto';
import { access, readdir, stat, mkdir, rm, writeFile } from 'fs/promises';
import { join, relative, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONTENT_DIR = join(__dirname, '../apps/web/content');
const PUBLIC_CONTENT_DIR = join(__dirname, '../apps/web/public/content');
const VARIANTS_DIR = join(PUBLIC_CONTENT_DIR, '.variants');
const OUTPUT_FILE = join(__dirname, '../apps/web/src/generated/contentMetadata.json');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const PHOTOS_PREFIX = 'dock/photos/';

const VARIANT_PRESETS = {
  thumbnail: { maxSize: 400, quality: 75 },
  display: { maxSize: 1600, quality: 82 },
};

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
    '.webloc': 'Internet Shortcut',
  };
  return kindMap[ext] || 'Document';
};

const getContentHash = (size, mtimeMs) =>
  createHash('sha1').update(`${size}:${mtimeMs}`).digest('hex').slice(0, 10);

const isPhotoAsset = (relativePath, extension) =>
  relativePath.startsWith(PHOTOS_PREFIX) && IMAGE_EXTENSIONS.has(extension.toLowerCase());

const toPosixPath = (filePath) => filePath.split('\\').join('/');

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const buildVariantRelativePath = (relativePath, variantName, hash) => {
  const extension = extname(relativePath);
  const baseName = basename(relativePath, extension);
  const dirName = dirname(relativePath);
  const fileName = `${baseName}.${variantName}.${hash}.webp`;
  return dirName === '.' ? fileName : join(dirName, fileName);
};

const getVariantPaths = (relativePath, hash) => {
  const variants = {};
  const absolutePaths = [];

  for (const variantName of Object.keys(VARIANT_PRESETS)) {
    const variantRelativePath = toPosixPath(
      buildVariantRelativePath(relativePath, variantName, hash)
    );
    absolutePaths.push(join(VARIANTS_DIR, variantRelativePath));
    variants[variantName] = `/content/.variants/${variantRelativePath}`;
  }

  return { variants, absolutePaths };
};

const generatePhotoVariants = async (fullPath, relativePath, hash) => {
  const { default: sharp } = await import('sharp');
  const { variants, absolutePaths } = getVariantPaths(relativePath, hash);
  const image = sharp(fullPath).rotate();

  for (const [index, variantName] of Object.keys(VARIANT_PRESETS).entries()) {
    const preset = VARIANT_PRESETS[variantName];
    const outputPath = absolutePaths[index];
    await mkdir(dirname(outputPath), { recursive: true });

    await image
      .clone()
      .resize({
        width: preset.maxSize,
        height: preset.maxSize,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: preset.quality })
      .toFile(outputPath);
  }

  return variants;
};

const ensurePhotoVariants = async (fullPath, relativePath, hash) => {
  const { variants, absolutePaths } = getVariantPaths(relativePath, hash);
  const missing = [];

  for (const absolutePath of absolutePaths) {
    if (!(await fileExists(absolutePath))) {
      missing.push(absolutePath);
    }
  }

  if (missing.length === 0) {
    return { variants, generated: false };
  }

  return {
    variants: await generatePhotoVariants(fullPath, relativePath, hash),
    generated: true,
  };
};

const collectFiles = async (dir, collected = []) => {
  if (!(await fileExists(dir))) {
    return collected;
  }

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(fullPath, collected);
    } else if (entry.isFile()) {
      collected.push(fullPath);
    }
  }

  return collected;
};

const removeStaleVariants = async (expectedVariantPaths) => {
  const existingFiles = await collectFiles(VARIANTS_DIR);
  let removed = 0;

  for (const existingPath of existingFiles) {
    const relativePath = toPosixPath(relative(VARIANTS_DIR, existingPath));
    if (!expectedVariantPaths.has(relativePath)) {
      await rm(existingPath, { force: true });
      removed += 1;
    }
  }

  return removed;
};

const scanDirectory = async (
  dir,
  baseDir = dir,
  folders = new Set(),
  stats = { generated: 0, reused: 0 }
) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const metadata = {};
  const expectedVariantPaths = new Set();

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      if (relativePath !== '.') {
        folders.add(relativePath);
      }
      const result = await scanDirectory(fullPath, baseDir, folders, stats);
      Object.assign(metadata, result.metadata);
      for (const path of result.expectedVariantPaths) {
        expectedVariantPaths.add(path);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    try {
      const fileStats = await stat(fullPath);
      const extension = extname(entry.name);
      const fileMeta = {
        size: fileStats.size,
        mtime: fileStats.mtime.toISOString(),
        birthtime: fileStats.birthtime.toISOString(),
        kind: getFileKind(extension),
      };

      if (isPhotoAsset(relativePath, extension)) {
        const hash = getContentHash(fileStats.size, fileStats.mtimeMs);
        const { absolutePaths } = getVariantPaths(relativePath, hash);

        for (const absolutePath of absolutePaths) {
          expectedVariantPaths.add(toPosixPath(relative(VARIANTS_DIR, absolutePath)));
        }

        try {
          const { variants, generated } = await ensurePhotoVariants(fullPath, relativePath, hash);
          fileMeta.variants = variants;
          if (generated) {
            stats.generated += 1;
          } else {
            stats.reused += 1;
          }
        } catch (error) {
          console.warn(`Failed to generate variants for ${relativePath}:`, error.message);
        }
      }

      metadata[relativePath] = fileMeta;
    } catch (error) {
      console.warn(`Failed to get stats for ${fullPath}:`, error.message);
    }
  }

  return { metadata, folders, expectedVariantPaths, stats };
};

const buildMetadata = async () => {
  try {
    console.log('Building content metadata...');

    await mkdir(VARIANTS_DIR, { recursive: true });

    const folders = new Set();
    const { metadata, expectedVariantPaths, stats } = await scanDirectory(
      CONTENT_DIR,
      CONTENT_DIR,
      folders
    );

    const removed = await removeStaleVariants(expectedVariantPaths);

    const output = {
      files: metadata,
      folders: Array.from(folders).sort(),
    };

    const outputDir = dirname(OUTPUT_FILE);
    await mkdir(outputDir, { recursive: true });
    await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`✓ Generated metadata for ${Object.keys(metadata).length} files`);
    console.log(
      `✓ Photo variants: ${stats.generated} generated, ${stats.reused} reused${
        removed > 0 ? `, ${removed} stale removed` : ''
      }`
    );
    console.log(`✓ Tracked ${folders.size} folders`);
    console.log(`  Output: ${OUTPUT_FILE}`);
    console.log(`  Variants: ${VARIANTS_DIR}`);
  } catch (error) {
    console.error('Failed to build content metadata:', error);
    process.exit(1);
  }
};

buildMetadata();
