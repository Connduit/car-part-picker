"""Headless Chromium checks: workflows, keyboard-only navigation, dialog a11y, accessible names, contrast (light+dark).
Needs Playwright for Python + Chromium (not bundled). Usage: python3 browser-check.py [screenshot-prefix]"""
import subprocess,time,sys,json,os,tempfile
from playwright.sync_api import sync_playwright
tag=sys.argv[1] if len(sys.argv)>1 else 'x';os.makedirs('/tmp/shots',exist_ok=True)
data=os.path.join(tempfile.mkdtemp(),'db.json')
srv=subprocess.Popen(['node','src/index.js'],env={'PORT':'3333','DATA_FILE':data,'PATH':os.environ['PATH']},cwd=os.path.dirname(os.path.abspath(__file__)));time.sleep(1)
res=[];errs=[];B='http://localhost:3333'
def ok(n,c,extra=''):res.append((n,bool(c),extra))
CONTRAST=r'''()=>{const out=[];const lum=c=>{const a=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]};
const parse=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return[p[0],p[1],p[2],p.length>3?p[3]:1]};
const over=(f,b)=>[0,1,2].map(i=>f[i]*f[3]+b[i]*(1-f[3]));
function bg(el){let layers=[];for(let e=el;e;e=e.parentElement){const cs=getComputedStyle(e);if(cs.backgroundImage!=='none')return null;const c=parse(cs.backgroundColor);if(c&&c[3]>0){layers.push(c);if(c[3]>=1)break}}
let base=[255,255,255];for(const c of layers.reverse())base=over(c,base).concat([1]).slice(0,3);return base}
const seen=new Set();for(const el of document.querySelectorAll('body *')){const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;if(el.closest('dialog:not([open])'))continue;
const txt=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');if(!txt&&!(el.tagName==='INPUT'&&el.value))continue;const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
const b=bg(el);if(!b)continue;let f=parse(cs.color);if(!f)continue;const fg=over(f,b);const L1=lum(fg),L2=lum(b),ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);const px=parseFloat(cs.fontSize),bold=parseInt(cs.fontWeight)>=700,large=px>=24||(px>=18.66&&bold);const need=large?3:4.5;
if(ratio<need&&!el.disabled){const k=el.tagName+'.'+el.className+'|'+cs.color+'|'+b.join();if(seen.has(k))continue;seen.add(k);out.push({el:el.tagName+'.'+el.className,text:(txt||el.value).slice(0,40),ratio:+ratio.toFixed(2),need})}}return out}'''
NAMES=r'''()=>{const bad=[];const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width&&r.height&&s.visibility!=='hidden'};
for(const e of document.querySelectorAll('input:not([type=hidden]),select,textarea')){if(!vis(e))continue;const n=e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||(e.labels&&e.labels.length)||e.title;if(!n)bad.push('field '+e.tagName+' '+(e.dataset.f||e.dataset.b||e.dataset.p||e.id))}
for(const e of document.querySelectorAll('button,a[href]')){if(!vis(e))continue;if(!(e.textContent.trim()||e.getAttribute('aria-label')))bad.push('empty '+e.tagName)}
for(const e of document.querySelectorAll('svg[role=img]'))if(!e.getAttribute('aria-label'))bad.push('svg without label');return bad}'''
try:
  with sync_playwright() as p:
    br=p.chromium.launch()
    for name,vp in[('d',{'width':1280,'height':900}),('m',{'width':390,'height':800})]:
      ctx=br.new_context(viewport=vp);pg=ctx.new_page()
      pg.on('console',lambda m,n=name:errs.append((n,m.type,m.text)) if m.type in('error','warning') else None)
      pg.on('pageerror',lambda e,n=name:errs.append((n,'pageerror',str(e))))
      pg.on('response',lambda r,n=name:errs.append((n,r.status,r.url)) if r.status>=400 and not r.url.endswith('/nope') else None)
      def shot(n):pg.wait_for_timeout(250);pg.screenshot(path=f'/tmp/shots/{tag}_{name}_{n}.png',full_page=True)
      def wait(t):pg.wait_for_function('t=>document.body.innerText.toLowerCase().includes(t.toLowerCase())',arg=t,timeout=5000)
      pg.goto(B+'/vehicles');pg.wait_for_selector('.veh');ok(name+' vehicles: 11 generations',pg.locator('button[data-start]').count()==11);ok(name+' trims listed',pg.locator('text=Trims: Sport').count()>=1);shot('veh')
      pg.goto(B+'/');pg.wait_for_selector('.hero');shot('home')
      pg.locator('.cards button[data-start="nd"]').first.click();pg.wait_for_url('**/build/*');pg.wait_for_selector('.sec');url=pg.url
      pg.select_option('select[data-p=trim]','Club');wait('Club');pg.select_option('select[data-p=year]','2019');wait('2019')
      pg.click('.sec:has-text("Drivetrain") button');pg.wait_for_selector('dialog[open]');pg.click('dialog button[data-add="22"]');wait('Incompatible')
      ok(name+' trim-limited exclusion -> Incompatible (Club)',pg.locator('.item .st:has-text("Incompatible")').count()==1)
      pg.select_option('select[data-p=trim]','Sport');wait('Likely Compatible');ok(name+' Sport trim -> Likely',pg.locator('.item .st:has-text("Likely Compatible")').count()==1)
      pg.click('.sec:has-text("Engine") button');pg.click('dialog button[data-add="1"]');wait('Required supporting parts');pg.wait_for_selector('li:has-text("larger fuel injectors")');ok(name+' plan lists required supporting parts',pg.locator('#plh ~ h3:text-is("Required supporting parts")').count()==1 and pg.locator('li:has-text("larger fuel injectors")').count()>=1)
      pg.click('ul.pl button:has-text("Injectors")');wait('ECU tune');pg.click('ul.pl button:has-text("ECU tune")');pg.wait_for_function("()=>!document.body.innerText.toLowerCase().includes('required supporting parts')");ok(name+' supporting parts resolve the requirement',True)
      pg.locator('input[data-f=optional]').nth(0).check();pg.wait_for_selector('.st:has-text("Optional")');ok(name+' optional flag',pg.locator('.st:has-text("Optional")').count()==1)
      pg.click('summary:has-text("Target budgets")');pg.select_option('select[data-cbadd]','Engine');pg.wait_for_selector('input[data-cb=Engine]');pg.fill('input[data-cb=Engine]','1000');pg.press('input[data-cb=Engine]','Tab');wait('over target');ok(name+' category budget over target',True)
      shot('build')
      pg.reload();pg.wait_for_selector('.item');ok(name+' reload keeps profile, items, optional',pg.locator('.item').count()==4 and pg.locator('select[data-p=trim]').input_value()=='Sport' and pg.locator('.st:has-text("Optional")').count()==1)
      pg.fill('#tplname','My ND base');pg.click('button[data-savetpl]');wait('Template saved')
      pg.goto(B+'/garage');pg.wait_for_selector('text=My ND base');shot('garage');pg.click('button[data-gtpl]');pg.wait_for_url('**/build/*');pg.wait_for_selector('.item');ok(name+' build from template',pg.locator('.item').count()==4 and pg.url!=url)
      pg.goto(B+'/part/22');pg.wait_for_selector('.best');ok(name+' offers: stale + out-of-stock + fixture labelling',pg.locator('.st:has-text("Stale")').count()>=1 and pg.locator('text=fixture data, not live').count()>=1 and pg.locator('text=No price history available').count()==1);shot('part')
      pg.goto(B+'/catalog');pg.wait_for_selector('.cards .panel');pg.locator('input[data-cmp]').nth(0).check();pg.locator('input[data-cmp]').nth(1).check();pg.click('#tray button[data-cmpgo]');pg.wait_for_selector('th[scope=col]');ok(name+' compare still works',pg.locator('th[scope=col]').count()==2);shot('cmp')
      # public/private
      c2=br.new_context(viewport=vp);p3=c2.new_page();p3.goto(url);p3.wait_for_selector('.err');ok(name+' private build hidden from other browsers',p3.locator('text=private, deleted').count()==1);p3.close()
      pg.goto(url);pg.wait_for_selector('.item');pg.once('dialog',lambda d:d.accept());pg.check('input[data-b=public]');wait('Anyone with the link')
      p2=c2.new_page();p2.goto(url.replace('/build/','/b/'));p2.wait_for_selector('.banner');ok(name+' public build read-only for others',p2.locator('input[data-f]:not([disabled]),select[data-p]:not([disabled]),input[data-cb]:not([disabled])').count()==0 and p2.locator('textarea').count()==0);p2.close();c2.close()
      ctx.close()
    # keyboard-only + a11y on desktop
    ctx=br.new_context(viewport={'width':1280,'height':900});pg=ctx.new_page();pg.goto(B+'/vehicles');pg.wait_for_selector('.veh')
    pg.keyboard.press('Tab');ok('kbd: first Tab stop is skip link',pg.evaluate("document.activeElement.className")=='skip');pg.keyboard.press('Enter');ok('kbd: skip link moves focus to main',pg.evaluate("document.activeElement.id")=='app')
    pg.goto(B+'/');pg.wait_for_selector('.hero');seq=[]
    for _ in range(14):
      pg.keyboard.press('Tab');seq.append(pg.evaluate("(()=>{const e=document.activeElement;const cs=getComputedStyle(e);return [e.tagName,(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,20),cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>0]})()"))
    ok('kbd: every focused control shows a visible focus outline',all(s[2] for s in seq),str([s for s in seq if not s[2]]))
    pg.goto(B+'/vehicles');pg.wait_for_selector('.veh');pg.locator('button[data-start="nd"]').focus();pg.keyboard.press('Enter');pg.wait_for_url('**/build/*');pg.wait_for_selector('.sec')
    op=pg.locator('button[data-pick="Brakes"]');op.focus();pg.keyboard.press('Enter');pg.wait_for_selector('dialog[open]')
    ok('dialog: focus moves inside on open',pg.evaluate("document.querySelector('dialog').contains(document.activeElement)"))
    inside=True
    for _ in range(14):
      pg.keyboard.press('Tab');inside&=pg.evaluate("document.querySelector('dialog').contains(document.activeElement)")
    ok('dialog: focus is trapped while open (14 Tabs)',inside)
    ok('dialog: labelled and modal',pg.evaluate("(()=>{const d=document.querySelector('dialog');return !!document.getElementById(d.getAttribute('aria-labelledby'))&&d.matches(':modal')})()"))
    pg.keyboard.press('Escape');pg.wait_for_function("()=>!document.querySelector('dialog').open");ok('dialog: Escape closes and focus returns to opener',pg.evaluate("document.activeElement.dataset.pick")=='Brakes')
    pg.keyboard.press('Enter');pg.wait_for_selector('dialog[open]');pg.keyboard.press('Tab');pg.keyboard.press('Tab')
    pg.keyboard.press('Escape')
    # keyboard add via Enter in dialog
    pg.keyboard.press('Enter');pg.wait_for_selector('dialog[open]');pg.locator('dialog button[data-add]').first.focus();pg.keyboard.press('Enter');pg.wait_for_selector('.item');ok('kbd: add a part using only the keyboard',pg.locator('.item').count()==1)
    ctx.close()
    # audits
    for scheme in['light','dark']:
      ctx=br.new_context(viewport={'width':1280,'height':900},color_scheme=scheme);pg=ctx.new_page()
      pg.goto(B+'/vehicles');pg.wait_for_selector('.veh');pg.locator('button[data-start="nd"]').first.click();pg.wait_for_url('**/build/*');pg.wait_for_selector('.sec');bu=pg.url
      pg.select_option('select[data-p=trim]','Club');pg.wait_for_function("()=>document.body.innerText.toLowerCase().includes('club')")
      for cat,pid in[('Drivetrain',22),('Engine',1),('Wheels',6)]:
        pg.click(f'.sec:has-text("{cat}") button');pg.click(f'dialog button[data-add="{pid}"]');pg.wait_for_function('n=>document.querySelectorAll(".item").length>=n',arg=[22,1,6].index(pid)+1)
      pages=[('home','/'),('vehicles','/vehicles'),('catalog','/catalog'),('part','/part/22'),('compare','/compare?ids=1,22'),('community','/builds'),('garage','/garage'),('build',bu.replace(B,''))]
      allbad=[];allnames=[]
      for n,u in pages:
        pg.goto(B+u);pg.wait_for_timeout(500)
        if n=='compare':pg.wait_for_selector('th[scope=col]')
        c=pg.evaluate(CONTRAST);allbad+=[(n,x) for x in c];allnames+=[(n,x) for x in pg.evaluate(NAMES)]
        h1=pg.locator('h1').count();ok(f'a11y {scheme}: {n} has a level-1 heading',h1>=1)
        if scheme=='light':pg.screenshot(path=f'/tmp/shots/{tag}_a_{n}.png',full_page=True)
      ok(f'contrast {scheme}: all text meets WCAG AA (4.5:1, 3:1 large)',not allbad,json.dumps(allbad[:6]))
      ok(f'a11y {scheme}: every visible field/button/link has an accessible name',not allnames,json.dumps(allnames[:6]))
      ok(f'a11y {scheme}: landmarks present',pg.evaluate("!!document.querySelector('header')&&!!document.querySelector('nav[aria-label]')&&!!document.querySelector('main')"))
      ctx.close()
    br.close()
finally:srv.terminate()
for n,c,e in res:print('PASS' if c else 'FAIL',n,('| '+e) if (not c and e) else '')
print('console/network problems:',json.dumps(errs)[:800])
sys.exit(0 if all(c for _,c,_ in res) else 1)
