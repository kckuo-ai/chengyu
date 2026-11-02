// Register a generated original image. Re-encodes for the web, without cropping
// or changing composition; the original remains outside the checkout.
// node scripts/add_illustration.cjs NUMBER ORIGINAL_PATH ALT_TEXT
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

async function main() {
  const [no, original, alt] = process.argv.slice(2);
  if (!/^\d+$/.test(no || '') || !original || !alt) throw Error('Expected NUMBER ORIGINAL_PATH ALT_TEXT');
  const root = path.resolve(__dirname, '..');
  const catalogPath = path.join(root, 'data/illustrations.json');
  const index = JSON.parse(await fs.readFile(path.join(root, 'data/moe-index.json')));
  const item = index.find(i => String(i.no) === no);
  if (!item) throw Error('Unknown idiom');
  if (alt.includes(item.w)) throw Error('Do not put the quiz answer in alt text');
  const catalog = JSON.parse(await fs.readFile(catalogPath));
  if (catalog.entries[no]) throw Error('Image already registered; review before replacing it');
  const bytes = await fs.readFile(original);
  const src = `img/idioms/${no}.webp`;
  await fs.mkdir(path.join(root, 'img/idioms'), {recursive:true});
  const {data, info} = await sharp(bytes).webp({quality:85,effort:6}).toBuffer({resolveWithObject:true});
  await fs.writeFile(path.join(root, src), data, {flag:'wx'});
  catalog.entries[no] = {
    word:item.w, src, alt, width:info.width, height:info.height,
    source:'AI-generated original illustration',
    originalSha256:crypto.createHash('sha256').update(bytes).digest('hex'),
  };
  await fs.writeFile(catalogPath, JSON.stringify(catalog,null,2)+'\n');
  console.log(`${item.w}: ${Math.round(data.length/1024)} KB`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
