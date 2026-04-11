import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { globSync } from 'glob';
import matter from 'gray-matter';
import toml from '@iarna/toml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load fonts (static instances, not variable — satori's opentype parser can't handle fvar tables)
const loraRegular = fs.readFileSync(path.join(__dirname, 'fonts/Lora-Regular.ttf'));
const loraSemiBold = fs.readFileSync(path.join(__dirname, 'fonts/Lora-SemiBold.ttf'));
const interRegular = fs.readFileSync(path.join(__dirname, 'fonts/Inter-Regular.ttf'));
const interMedium = fs.readFileSync(path.join(__dirname, 'fonts/Inter-Medium.ttf'));

// Load avatar as base64 (PNG for lossless quality)
const avatarPath = path.join(ROOT, 'static/favicon.png');
const avatarBase64 = `data:image/png;base64,${fs.readFileSync(avatarPath).toString('base64')}`;

// Section config: category label + accent color
const SECTIONS = {
  post: { label: 'Article', color: '#4A90D9' },
  projects: { label: 'Project', color: '#50B83C' },
  oss: { label: 'Open Source', color: '#9B59B6' },
  about: { label: 'About', color: '#E67E22' },
  books: { label: 'Book Review', color: '#E74C3C' },
};

// Discover content files
const contentDir = path.join(ROOT, 'content');
const mdFiles = globSync('**/*.md', { cwd: contentDir })
  .filter(f => !f.endsWith('_index.md'));

// Output directory
const outDir = path.join(ROOT, 'static/img/og');
fs.mkdirSync(outDir, { recursive: true });

// gray-matter v4 ESM doesn't reliably detect +++ TOML delimiters, so parse manually
function parseFrontmatter(content) {
  const tomlMatch = content.match(/^\+\+\+\s*\n([\s\S]*?)\n\+\+\+/);
  if (tomlMatch) {
    return toml.parse(tomlMatch[1]);
  }
  return matter(content).data;
}

function shouldSkip(filePath, frontmatter) {
  const section = filePath.split('/')[0];
  // Skip projects that already have valid custom images
  if (section === 'projects') {
    const img = frontmatter.image;
    if (img && img !== '/img/logo.jpg') {
      const imgPath = path.join(ROOT, 'static', img);
      if (fs.existsSync(imgPath)) return true;
    }
  }
  return false;
}

function getTitle(frontmatter, filePath) {
  let title = frontmatter.title || path.basename(filePath, '.md');
  // For OSS reports, append subtitle
  if (frontmatter.subtitle) {
    title = `${title} \u2014 ${frontmatter.subtitle}`;
  }
  return title;
}

function buildCard(title, category, accentColor) {
  const titleLen = title.length;
  const titleFontSize = titleLen > 70 ? 36 : titleLen > 40 ? 42 : 52;

  return {
    type: 'div',
    props: {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        fontFamily: 'Inter',
        position: 'relative',
        overflow: 'hidden',
      },
      children: [
        // Decorative circle top-right
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: -80,
              right: -80,
              width: 350,
              height: 350,
              borderRadius: '50%',
              background: accentColor,
              opacity: 0.12,
            },
          },
        },
        // Decorative circle bottom
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: -60,
              right: 200,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: accentColor,
              opacity: 0.06,
            },
          },
        },
        // Category pill
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              marginBottom: 24,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    background: accentColor,
                    color: '#ffffff',
                    padding: '6px 18px',
                    borderRadius: 20,
                    fontSize: 14,
                    fontWeight: 500,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                  },
                  children: category,
                },
              },
            ],
          },
        },
        // Title
        {
          type: 'div',
          props: {
            style: {
              fontFamily: 'Lora',
              fontWeight: 600,
              fontSize: titleFontSize,
              lineHeight: 1.3,
              color: '#ffffff',
              flex: 1,
              display: 'flex',
              alignItems: 'flex-start',
            },
            children: title,
          },
        },
        // Separator
        {
          type: 'div',
          props: {
            style: {
              width: 60,
              height: 3,
              background: accentColor,
              borderRadius: 2,
              marginBottom: 24,
              marginTop: 24,
            },
          },
        },
        // Author row
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
            },
            children: [
              {
                type: 'img',
                props: {
                  src: avatarBase64,
                  width: 72,
                  height: 72,
                  style: {
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.25)',
                    marginRight: 16,
                  },
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          color: '#ffffff',
                          fontSize: 20,
                          fontWeight: 500,
                        },
                        children: 'Andriy Druk',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          color: '#7a7a90',
                          fontSize: 15,
                          marginTop: 2,
                        },
                        children: 'andriydruk.com',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function renderCard(element, outputPath) {
  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Lora', data: loraRegular, weight: 400, style: 'normal' },
      { name: 'Lora', data: loraSemiBold, weight: 600, style: 'normal' },
      { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
      { name: 'Inter', data: interMedium, weight: 500, style: 'normal' },
    ],
  });

  // Render at 2x for retina-quality output (sharper text and avatar)
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 2400 } });
  const pngData = resvg.render();
  fs.writeFileSync(outputPath, pngData.asPng());
}

// Main
console.log(`Found ${mdFiles.length} content files`);
let generated = 0;
let skipped = 0;

for (const relPath of mdFiles) {
  const fullPath = path.join(contentDir, relPath);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const fm = parseFrontmatter(raw);

  if (shouldSkip(relPath, fm)) {
    console.log(`  SKIP ${relPath} (has custom image)`);
    skipped++;
    continue;
  }

  if (fm.draft) {
    console.log(`  SKIP ${relPath} (draft)`);
    skipped++;
    continue;
  }

  const section = relPath.split('/')[0];
  const slug = path.basename(relPath, '.md');
  const sectionConfig = SECTIONS[section] || SECTIONS.post;
  const title = getTitle(fm, relPath);
  const outputPath = path.join(outDir, `${slug}.png`);

  const card = buildCard(title, sectionConfig.label, sectionConfig.color);
  await renderCard(card, outputPath);

  console.log(`  OK   ${relPath} → img/og/${slug}.png`);
  generated++;
}

console.log(`\nDone: ${generated} generated, ${skipped} skipped`);
