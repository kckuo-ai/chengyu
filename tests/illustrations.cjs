// Integration coverage using the cloud environment's Playwright and Chromium.
// Start python3 -m http.server 8000, then: node tests/illustrations.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/illustrations.json'))).entries;
const index = JSON.parse(fs.readFileSync(path.join(root, 'data/moe-index.json')));
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';

(async () => {
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, r=>r.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e=>errors.push(e.message));
    assert.ok(Object.keys(catalog).length > 0, 'At least one illustration must be ready');
    for (const [no, art] of Object.entries(catalog)) {
      assert.equal(art.word, index.find(i=>String(i.no)===no).w);
      assert.ok(!art.alt.includes(art.word), 'Image descriptions must not reveal the idiom');
      await page.goto(`${base}/#/w/${no}`);
      await page.locator(`article[data-entry-no="${no}"]`).waitFor();
      await page.waitForFunction(()=>document.querySelector('.idiom-art img')?.naturalWidth>0);
      assert.equal(await page.locator('.idiom-art img').getAttribute('src'), art.src);
      assert.equal(await page.locator('.idiom-art img').getAttribute('alt'), art.alt);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'Mobile overflow');
    }
    console.log('PASS every ready entry displays its own image on mobile');
    const pending = index.find(i=>!catalog[i.no]);
    if (pending) {
      await page.goto(`${base}/#/w/${pending.no}`);
      await page.locator(`article[data-entry-no="${pending.no}"]`).waitFor();
      assert.equal(await page.locator('.idiom-art').count(),0);
      assert.ok((await page.locator('#view').innerText()).includes('意思'));
    }
    console.log('PASS pending entries retain readable dictionary content');

    await page.goto(`${base}/`);
    await page.getByRole('link',{name:'來猜猜看',exact:true}).click();
    assert.equal(await page.locator('[data-mode="picture"]').getAttribute('aria-pressed'),'true');
    await page.locator('#go').click();
    const seen = new Set();
    const n = Math.min(10,Object.keys(catalog).length);
    for (let i=0;i<n;i++) {
      await page.locator('.quiz-art img').waitFor();
      await page.waitForFunction(()=>document.querySelector('.quiz-art img')?.naturalWidth>0);
      const src = await page.locator('.quiz-art img').getAttribute('src');
      assert.ok(!seen.has(src), 'No repeated picture in one quiz');
      seen.add(src);
      const art = Object.values(catalog).find(a=>a.src===src);
      assert.ok(art);
      assert.ok(!(await page.locator('.q-prompt').innerText()).includes(art.word), 'No answer caption');
      const options = await page.locator('.opt').allTextContents();
      assert.equal(new Set(options).size,4);
      assert.equal(options.filter(o=>o===art.word).length,1);
      await page.getByRole('button',{name:art.word,exact:true}).click();
      await page.locator('#next').click();
    }
    assert.equal(await page.locator('.score').innerText(),'100 分');
    let saved = await page.evaluate(()=>JSON.parse(localStorage.getItem('chengyu-v1')));
    assert.equal(saved.answered,n);
    console.log('PASS picture quiz: distinct images, four choices, correct scoring and saved results');

    const first = Object.entries(catalog)[0];
    await page.evaluate(no=>localStorage.setItem('chengyu-v1',JSON.stringify({fav:[+no],learned:[],wrong:{},played:0,correct:0,answered:0})),first[0]);
    await page.goto(`${base}/#/quiz`);
    await page.reload();
    await page.locator('[data-mode="picture"]').click();
    await page.locator('[data-pool="fav"]').click();
    assert.equal(await page.locator('#go').innerText(),'開始 1 題');
    await page.locator('#go').click();
    await page.getByRole('button',{name:first[1].word,exact:true}).click();
    await page.locator('#next').click();
    assert.equal(await page.locator('.score').innerText(),'100 分');
    await page.goto(`${base}/#/quiz`);
    await page.locator('#go').click();
    const wrong = page.locator('.opt').filter({hasNotText:first[1].word}).first();
    await wrong.click();
    await page.locator('#next').click();
    saved = await page.evaluate(()=>JSON.parse(localStorage.getItem('chengyu-v1')));
    assert.equal(saved.wrong[first[0]],1);
    assert.equal(saved.answered,2);
    await page.reload();
    await page.locator('[data-mode="picture"]').click();
    assert.equal(await page.locator('[data-pool="learned"]').isDisabled(),true);
    console.log('PASS one-picture scoring, wrong-answer tracking and empty pools');

    // Optional catalog failure must not break the dictionary.
    const noArtContext = await browser.newContext();
    await noArtContext.route('**/data/illustrations.json',r=>r.fulfill({status:503,body:'unavailable'}));
    await noArtContext.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,r=>r.abort());
    const noArt = await noArtContext.newPage();
    await noArt.goto(`${base}/#/w/${first[0]}`);
    await noArt.locator('.entry-head').waitFor();
    await noArt.goto(`${base}/#/quiz`);
    await noArt.locator('[data-mode="picture"]').click();
    assert.equal(await noArt.locator('#go').isDisabled(),true);
    await noArtContext.close();
    console.log('PASS unavailable artwork catalog keeps text usable and picture quiz disabled');

    // Production auto-registration requires HTTPS; explicitly register on trusted
    // loopback to test the worker, without altering production registration rules.
    await page.goto(`${base}/#/me`);
    await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
    await page.reload();
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.locator('#dl').click();
    await page.getByRole('button',{name:'下載未完成，按此重試',exact:true}).waitFor();
    assert.equal(await page.locator('#dl').isDisabled(),false);
    await context.setOffline(false);
    await page.locator('#dl').click();
    await page.getByRole('button',{name:'已下載，可離線使用',exact:true}).waitFor({timeout:90000});
    assert.ok(await page.evaluate(async()=>{
      const c = await caches.open('chengyu-offline-v1');
      return (await c.keys()).length >= 15;
    }));
    await context.setOffline(true);
    await page.goto(`${base}/#/w/${first[0]}`);
    await page.reload();
    await page.locator('.entry-head').waitFor();
    await page.waitForFunction(()=>document.querySelector('.idiom-art img')?.naturalWidth>0);
    await page.goto(`${base}/#/quiz`);
    await page.locator('[data-mode="picture"]').click();
    await page.locator('#go').click();
    await page.waitForFunction(()=>document.querySelector('.quiz-art img')?.naturalWidth>0);
    console.log('PASS failed download can retry; downloaded dictionary, illustrations and picture quiz work offline');
    assert.deepEqual(errors,[]);
    await page.locator('.quiz-art img').evaluate(img=>img.decode());
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.screenshot({path:'/tmp/chengyu-picture-quiz.png',fullPage:true});
    console.log('PASS no JavaScript runtime errors; screenshot /tmp/chengyu-picture-quiz.png');
    await context.close();
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
