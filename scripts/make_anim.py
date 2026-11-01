#!/usr/bin/env python3
"""產生成語小動畫（SVG + CSS 動畫），全部是本站原創圖形。

輸出：img/anim/<成語典編號>.svg
每個動畫 6～8 秒循環；裝置設定「減少動態效果」時不播放。
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "img" / "anim"

# 配色：跟網站一致（作業簿綠、老師紅筆）
INK, GREEN, LG, RED, YEL = "#1E2622", "#2F7A4E", "#9CC5A9", "#C8322A", "#F2C94C"
SKY, SKIN, BROWN, GRAY, WHITE = "#E3F1E8", "#F2C9A0", "#8A5A3B", "#A4ADA8", "#FFFFFF"
WATER, ORANGE, PINK = "#9FD0E6", "#E8964A", "#F0A7A0"
W, H = 360, 220


PAPER_DEFS = '''<defs>
<filter id="pencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
<filter id="wash" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="6" result="d"/><feGaussianBlur in="d" stdDeviation="0.6"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 0.10 0"/></filter>
</defs>'''
STYLE = {"hand": False}


def svg(name, body, css, dur=7):
    if STYLE["hand"]:
        for a, b in [("#E3F1E8", "#F6F0E1"), ("#CFE3C9", "#DCE5C4"), ("#2F7A4E", "#6F9A5B"), ("#1E2622", "#4A3F35"),
                     ("#C8322A", "#B8644A"), ("#F2C94C", "#E8C77E"), ("#9FD0E6", "#A9C9D6"), ("#BFE3F2", "#C9DDE3"),
                     ("#E8964A", "#D59A63"), ("#8A5A3B", "#9C7350"), ("#6BBF59", "#8DB672"), ("#8FB59A", "#9DB59A")]:
            body = body.replace(a, b)
        body = (PAPER_DEFS + f'<g filter="url(#wash)">' + body.replace('<text', '</g><text', 1) if False else
                PAPER_DEFS + f'<g filter="url(#pencil)">{body}</g><rect width="{W}" height="{H}" filter="url(#grain)" pointer-events="none"/>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{name}小動畫">
<style>
*{{transform-box:fill-box}}
.a{{animation-duration:{dur}s;animation-iteration-count:infinite;animation-timing-function:ease-in-out}}
text{{font-family:"PingFang TC","Noto Sans TC",sans-serif;fill:{INK}}}
{css}
@media (prefers-reduced-motion:reduce){{.a{{animation:none!important}}}}
</style>
<rect width="{W}" height="{H}" rx="14" fill="{"#F6F0E1" if STYLE["hand"] else SKY}"/>
{body}
</svg>'''


def ground(y=180, color="#CFE3C9"):
    return f'<rect x="0" y="{y}" width="{W}" height="{H-y}" fill="{color}"/><line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="{GREEN}" stroke-width="2"/>'


def person(x, y, shirt=GREEN, cls="", hat=False, arms="down", extra=""):
    """站著的人，腳底在 (x, y)。"""
    a = {
        "down": f'<path d="M{x-11} {y-40} l-7 18 M{x+11} {y-40} l7 18" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>',
        "up": f'<path d="M{x-11} {y-42} l-10 -16 M{x+11} {y-42} l10 -16" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>',
        "ears": f'<path d="M{x-11} {y-42} q-12 -8 -2 -24 M{x+11} {y-42} q12 -8 2 -24" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>',
        "none": "",
    }[arms]
    h = f'<path d="M{x-14} {y-70} q14 -14 28 0 z" fill="{BROWN}"/>' if hat else ""
    return f'''<g class="{cls}">
<path d="M{x-6} {y-18} l-4 18 M{x+6} {y-18} l4 18" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>
<rect x="{x-13}" y="{y-46}" width="26" height="30" rx="9" fill="{shirt}"/>
{a}
<circle cx="{x}" cy="{y-58}" r="13" fill="{SKIN}" stroke="{INK}" stroke-width="2"/>
<circle cx="{x-4}" cy="{y-59}" r="1.6" fill="{INK}"/><circle cx="{x+4}" cy="{y-59}" r="1.6" fill="{INK}"/>
{h}{extra}</g>'''


def sitting(x, y, shirt=GREEN, cls=""):
    return f'''<g class="{cls}">
<path d="M{x-4} {y-6} h20 v6" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
<rect x="{x-13}" y="{y-36}" width="26" height="30" rx="9" fill="{shirt}"/>
<circle cx="{x}" cy="{y-48}" r="13" fill="{SKIN}" stroke="{INK}" stroke-width="2"/>
<path d="M{x-6} {y-49} q2 2 4 0 M{x+2} {y-49} q2 2 4 0" stroke="{INK}" stroke-width="1.6" fill="none"/>
</g>'''


def tree(x, y, s=1.0):
    return f'''<g><rect x="{x-8*s}" y="{y-60*s}" width="{16*s}" height="{60*s}" fill="{BROWN}"/>
<circle cx="{x}" cy="{y-80*s}" r="{34*s}" fill="{GREEN}"/><circle cx="{x-22*s}" cy="{y-62*s}" r="{20*s}" fill="{GREEN}"/>
<circle cx="{x+22*s}" cy="{y-62*s}" r="{20*s}" fill="{GREEN}"/></g>'''


def rabbit(x, y, cls=""):
    return f'''<g class="{cls}"><ellipse cx="{x}" cy="{y-12}" rx="16" ry="11" fill="{WHITE}" stroke="{INK}" stroke-width="2"/>
<circle cx="{x-15}" cy="{y-22}" r="9" fill="{WHITE}" stroke="{INK}" stroke-width="2"/>
<ellipse cx="{x-18}" cy="{y-38}" rx="3.5" ry="11" fill="{WHITE}" stroke="{INK}" stroke-width="2"/>
<ellipse cx="{x-11}" cy="{y-38}" rx="3.5" ry="11" fill="{WHITE}" stroke="{INK}" stroke-width="2"/>
<circle cx="{x-18}" cy="{y-23}" r="1.6" fill="{INK}"/><circle cx="{x+16}" cy="{y-14}" r="4" fill="{WHITE}" stroke="{INK}" stroke-width="2"/></g>'''


def sheep(x, y, cls=""):
    return f'''<g class="{cls}"><path d="M{x-10} {y-8} v8 M{x+8} {y-8} v8" stroke="{INK}" stroke-width="3"/>
<ellipse cx="{x}" cy="{y-16}" rx="18" ry="12" fill="{WHITE}" stroke="{INK}" stroke-width="2"/>
<ellipse cx="{x-18}" cy="{y-20}" rx="7" ry="6" fill="{GRAY}"/><circle cx="{x-20}" cy="{y-21}" r="1.4" fill="{INK}"/></g>'''


def frog(x, y, cls=""):
    return f'''<g class="{cls}"><ellipse cx="{x}" cy="{y-10}" rx="16" ry="11" fill="#6BBF59" stroke="{INK}" stroke-width="2"/>
<circle cx="{x-8}" cy="{y-20}" r="6" fill="{WHITE}" stroke="{INK}" stroke-width="2"/><circle cx="{x+8}" cy="{y-20}" r="6" fill="{WHITE}" stroke="{INK}" stroke-width="2"/>
<circle cx="{x-8}" cy="{y-22}" r="2.2" fill="{INK}"/><circle cx="{x+8}" cy="{y-22}" r="2.2" fill="{INK}"/>
<path d="M{x-6} {y-8} q6 4 12 0" stroke="{INK}" stroke-width="2" fill="none"/></g>'''


def note(x, y, cls=""):
    return f'<g class="{cls}"><path d="M{x} {y} v-16 l10 -4 v16" stroke="{INK}" stroke-width="2.5" fill="none"/><circle cx="{x-3}" cy="{y}" r="4" fill="{INK}"/><circle cx="{x+7}" cy="{y-4}" r="4" fill="{INK}"/></g>'


def caption(t):
    return f'<text x="{W/2}" y="208" text-anchor="middle" font-size="15">{t}</text>'


SCENES = {}


def scene(no, name):
    def deco(fn):
        SCENES[no] = (name, fn)
        return fn
    return deco


@scene(39, "守株待兔")
def _():
    body = ground() + tree(200, 180) + f'''
<g class="a run">{rabbit(330, 180)}</g>
<g class="a farm">{person(80, 180, hat=True)}</g>
<g class="a sit" opacity="0">{sitting(150, 180)}<text x="160" y="110" font-size="18" class="a zz">Z z z</text></g>
<g class="a weed" opacity="0"><path d="M20 180 l6 -18 l4 18 M40 180 l5 -14 l5 14 M60 180 l4 -20 l5 20 M260 180 l6 -16 l4 16 M300 180 l5 -20 l5 20" stroke="{GREEN}" stroke-width="3" fill="none"/></g>
''' + caption("撞到樹的兔子，不會天天有")
    css = f'''
.run{{animation-name:run}}
@keyframes run{{0%{{transform:translateX(0)}}20%{{transform:translateX(-110px)}}24%{{transform:translateX(-104px) rotate(160deg) translateY(10px)}}100%{{transform:translateX(-104px) rotate(160deg) translateY(10px);opacity:1}}}}
.farm{{animation-name:farm}}
@keyframes farm{{0%,26%{{transform:none;opacity:1}}32%{{transform:translateY(-14px)}}38%{{transform:none;opacity:1}}44%,100%{{opacity:0}}}}
.sit{{animation-name:sit}}
@keyframes sit{{0%,44%{{opacity:0}}50%,100%{{opacity:1}}}}
.zz{{animation-name:zz}}
@keyframes zz{{0%,60%{{opacity:0}}70%,100%{{opacity:1}}}}
.weed{{animation-name:weed}}
@keyframes weed{{0%,70%{{opacity:0}}85%,100%{{opacity:1}}}}
'''
    return body, css


@scene(23, "畫蛇添足")
def _():
    body = ground(170) + f'''
<path class="a snake" d="M60 140 q30 -30 60 0 t60 0 t60 0 q20 -12 30 -2" stroke="{GREEN}" stroke-width="10" fill="none" stroke-linecap="round" pathLength="100"/>
<circle class="a snake-h" cx="272" cy="138" r="9" fill="{GREEN}" opacity="0"/>
<g class="a legs" opacity="0" stroke="{INK}" stroke-width="4" stroke-linecap="round"><path d="M90 128 v22 M150 150 v22 M210 128 v22 M240 150 v20"/></g>
<text class="a no" x="160" y="95" font-size="44" fill="{RED}" opacity="0" style="fill:{RED}">✕</text>
<g class="a cup"><path d="M300 150 h28 l-4 24 h-20 z" fill="{YEL}" stroke="{INK}" stroke-width="2"/></g>
''' + caption("蛇本來就沒有腳")
    css = '''
.snake{stroke-dasharray:100;animation-name:draw}
@keyframes draw{0%{stroke-dashoffset:100}30%,100%{stroke-dashoffset:0}}
.snake-h{animation-name:head}@keyframes head{0%,28%{opacity:0}32%,100%{opacity:1}}
.legs{animation-name:legs}@keyframes legs{0%,40%{opacity:0}50%,100%{opacity:1}}
.no{animation-name:no}@keyframes no{0%,62%{opacity:0;transform:scale(2)}68%,100%{opacity:1;transform:scale(1)}}
.cup{animation-name:cup}@keyframes cup{0%,72%{transform:none;opacity:1}88%,100%{transform:translateX(60px);opacity:0}}
'''
    return body, css


@scene(32, "狐假虎威")
def _():
    fox = f'''<g><path d="M-20 -10 q-26 -10 -30 -26 q16 6 26 14" fill="{ORANGE}" stroke="{INK}" stroke-width="2"/>
<ellipse cx="0" cy="-14" rx="20" ry="11" fill="{ORANGE}" stroke="{INK}" stroke-width="2"/>
<path d="M14 -20 l20 2 l-14 12 z" fill="{ORANGE}" stroke="{INK}" stroke-width="2"/>
<path d="M18 -20 l2 -12 l6 10 M26 -19 l4 -11 l4 10" fill="{ORANGE}" stroke="{INK}" stroke-width="2"/>
<circle cx="24" cy="-15" r="1.6" fill="{INK}"/><path d="M-12 -4 v10 M10 -4 v10" stroke="{INK}" stroke-width="3"/></g>'''
    tiger = f'''<g><ellipse cx="0" cy="-26" rx="38" ry="20" fill="{YEL}" stroke="{INK}" stroke-width="2"/>
<path d="M-20 -44 v14 M-6 -46 v16 M8 -46 v16 M22 -42 v12" stroke="{INK}" stroke-width="3"/>
<circle cx="40" cy="-38" r="17" fill="{YEL}" stroke="{INK}" stroke-width="2"/>
<circle cx="34" cy="-52" r="5" fill="{YEL}" stroke="{INK}" stroke-width="2"/><circle cx="48" cy="-52" r="5" fill="{YEL}" stroke="{INK}" stroke-width="2"/>
<circle cx="45" cy="-40" r="2" fill="{INK}"/><path d="M40 -32 h10" stroke="{INK}" stroke-width="2"/>
<path d="M-24 -8 v10 M-8 -8 v10 M12 -8 v10 M26 -8 v10" stroke="{INK}" stroke-width="4"/>
<path d="M-38 -28 q-18 -6 -14 -24" stroke="{INK}" stroke-width="4" fill="none"/></g>'''
    body = ground() + f'''
<g class="a walk"><g transform="translate(150 180)">{fox}</g><g transform="translate(60 180)">{tiger}</g></g>
<g class="a flee1">{rabbit(300, 180)}</g>
<g class="a flee2"><g transform="translate(330 180)"><ellipse cx="0" cy="-16" rx="14" ry="10" fill="{BROWN}"/><circle cx="-14" cy="-26" r="7" fill="{BROWN}"/><path d="M-16 -32 l-4 -10 M-12 -32 l2 -10 M-6 -6 v8 M6 -6 v8" stroke="{INK}" stroke-width="2"/></g></g>
<text class="a bang" x="250" y="100" font-size="26" opacity="0">！！</text>
''' + caption("大家怕的其實是後面的老虎")
    css = '''
.walk{animation-name:walk}@keyframes walk{0%{transform:translateX(-120px)}60%,100%{transform:translateX(30px)}}
.bang{animation-name:bang}@keyframes bang{0%,30%{opacity:0}36%,55%{opacity:1}60%,100%{opacity:0}}
.flee1{animation-name:flee}.flee2{animation-name:flee;animation-delay:.2s}
@keyframes flee{0%,34%{transform:none}38%{transform:translateY(-10px)}60%,100%{transform:translateX(120px)}}
'''
    return body, css


@scene(56, "揠苗助長")
def _():
    sprouts = "".join(f'''<g class="a sp" style="animation-delay:{i*0.12}s"><g class="a wilt">
<path d="M{x} 180 v-26" stroke="{GREEN}" stroke-width="4"/><path d="M{x} 162 q-12 -6 -14 -16 q12 2 14 12 M{x} 158 q12 -6 14 -16 q-12 2 -14 12" fill="{GREEN}"/></g></g>''' for i, x in enumerate(range(60, 320, 50)))
    body = ground(180, "#C9A97E") + sprouts + f'''
<g class="a hand"><path d="M0 0 q-8 -16 4 -24 h14 q10 4 6 16 z" fill="{SKIN}" stroke="{INK}" stroke-width="2"/></g>
<text class="a oh" x="290" y="60" font-size="28" opacity="0">😢</text>
''' + caption("拔高了，苗反而枯死了")
    css = f'''
.sp{{transform-origin:50% 100%;animation-name:pull}}
@keyframes pull{{0%,10%{{transform:scaleY(1)}}40%,100%{{transform:scaleY(1.9)}}}}
.wilt{{transform-origin:50% 100%;animation-name:wilt}}
@keyframes wilt{{0%,60%{{transform:none;filter:none}}75%,100%{{transform:rotate(30deg) scaleY(.85);filter:sepia(1) saturate(2) hue-rotate(-20deg)}}}}
.hand{{animation-name:hand}}
@keyframes hand{{0%{{transform:translate(50px,140px);opacity:1}}40%{{transform:translate(310px,90px);opacity:1}}48%,100%{{transform:translate(380px,60px);opacity:0}}}}
.oh{{animation-name:oh}}@keyframes oh{{0%,72%{{opacity:0}}80%,100%{{opacity:1}}}}
'''
    return body, css


@scene(43, "刻舟求劍")
def _():
    boat = f'''<path d="M-60 0 h120 l-18 26 h-84 z" fill="{BROWN}" stroke="{INK}" stroke-width="2"/>
{person(0, 2, shirt=GREEN)}
<path class="a mark" d="M-30 6 l8 12 M-22 6 l-8 12" stroke="{RED}" stroke-width="3" opacity="0"/>'''
    body = f'''<rect x="0" y="130" width="{W}" height="90" fill="{WATER}"/>
<path d="M0 130 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#5FA8C8" stroke-width="2" fill="none"/>
<g class="a boat"><g transform="translate(110 128)">{boat}</g></g>
<g class="a sword"><path d="M0 0 v34 M-7 8 h14" stroke="{INK}" stroke-width="4"/></g>
<text class="a q" x="250" y="110" font-size="30" opacity="0">？</text>
''' + caption("船走了，劍還在原來的地方")
    css = '''
.boat{animation-name:boat}@keyframes boat{0%,30%{transform:none}75%,100%{transform:translateX(150px)}}
.sword{animation-name:sword}@keyframes sword{0%,8%{transform:translate(88px,110px);opacity:1}25%,100%{transform:translate(88px,170px);opacity:1}}
.mark{animation-name:mark}@keyframes mark{0%,24%{opacity:0}28%,100%{opacity:1}}
.q{animation-name:q}@keyframes q{0%,78%{opacity:0}84%,100%{opacity:1}}
'''
    return body, css


@scene(73, "坐井觀天")
def _():
    body = f'''<rect width="{W}" height="{H}" rx="14" fill="#BFE3F2"/>
<circle cx="300" cy="44" r="20" fill="{YEL}"/>
<g fill="{WHITE}"><ellipse cx="80" cy="50" rx="30" ry="12"/><ellipse cx="200" cy="34" rx="26" ry="10"/></g>
<g class="a walls">
<rect x="-400" y="0" width="560" height="{H}" fill="#7A6A5A"/><rect x="200" y="0" width="560" height="{H}" fill="#7A6A5A"/>
<path d="M160 0 v{H} M200 0 v{H}" stroke="{INK}" stroke-width="3"/>
<g fill="#9C8B79"><rect x="120" y="40" width="30" height="14" rx="3"/><rect x="210" y="80" width="30" height="14" rx="3"/><rect x="120" y="120" width="30" height="14" rx="3"/><rect x="210" y="160" width="30" height="14" rx="3"/></g>
</g>
<rect x="0" y="186" width="{W}" height="34" fill="#5E8C6A"/>
{frog(180, 190)}
<g class="a turtle" opacity="0"><ellipse cx="290" cy="176" rx="26" ry="14" fill="{GREEN}" stroke="{INK}" stroke-width="2"/><circle cx="318" cy="174" r="7" fill="#6BBF59" stroke="{INK}" stroke-width="2"/></g>
<text class="a wow" x="196" y="140" font-size="26" opacity="0">！</text>
''' + '<text x="180" y="212" text-anchor="middle" font-size="15" style="fill:#fff">原來天空這麼大</text>'
    css = '''
.walls{animation-name:open}@keyframes open{0%,40%{transform:none}70%,100%{transform:scaleX(4)}}
.walls{transform-origin:180px 110px;transform-box:view-box}
.turtle{animation-name:t}@keyframes t{0%,70%{opacity:0}78%,100%{opacity:1}}
.wow{animation-name:t}
'''
    return body, css


@scene(482, "亡羊補牢")
def _():
    fence = "".join(f'<rect x="{x}" y="120" width="8" height="60" fill="{BROWN}"/>' for x in range(40, 330, 24) if x not in (184,))
    body = ground() + f'''
<path d="M40 136 H330 M40 160 H330" stroke="{BROWN}" stroke-width="5"/>{fence}
<g class="a plank" opacity="0"><rect x="180" y="120" width="16" height="60" fill="#B98552" stroke="{INK}" stroke-width="2"/></g>
{sheep(100, 176)}{sheep(260, 176)}
<g class="a lost">{sheep(190, 176)}</g>
<g class="a wolf"><g transform="translate(330 176)"><ellipse cx="0" cy="-16" rx="22" ry="11" fill="{GRAY}" stroke="{INK}" stroke-width="2"/><circle cx="-22" cy="-24" r="10" fill="{GRAY}" stroke="{INK}" stroke-width="2"/><path d="M-28 -32 l2 -10 l6 8 M-18 -33 l4 -9 l3 9" fill="{GRAY}" stroke="{INK}" stroke-width="2"/><circle cx="-25" cy="-25" r="1.8" fill="{RED}"/></g></g>
<text class="a ok" x="160" y="100" font-size="30" opacity="0" style="fill:{RED}">○</text>
''' + caption("破洞補好，羊就不會再少了")
    css = '''
.wolf{animation-name:wolf}@keyframes wolf{0%{transform:translateX(80px)}25%{transform:translateX(-130px)}45%,100%{transform:translateX(80px)}}
.lost{animation-name:lost}@keyframes lost{0%,24%{transform:none;opacity:1}45%{transform:translateX(210px);opacity:0}100%{opacity:0}}
.plank{animation-name:plank}@keyframes plank{0%,55%{opacity:0;transform:translateY(-40px)}65%,100%{opacity:1;transform:none}}
.ok{animation-name:ok}@keyframes ok{0%,70%{opacity:0}78%,100%{opacity:1}}
'''
    return body, css


@scene(47, "對牛彈琴")
def _():
    cow = f'''<g transform="translate(250 176)"><ellipse cx="0" cy="-34" rx="40" ry="22" fill="{WHITE}" stroke="{INK}" stroke-width="2"/>
<circle cx="-12" cy="-40" r="8" fill="{INK}"/><circle cx="16" cy="-30" r="6" fill="{INK}"/>
<path d="M-26 -14 v14 M-10 -14 v14 M12 -14 v14 M26 -14 v14" stroke="{INK}" stroke-width="5"/>
<g class="a eat"><ellipse cx="-50" cy="-30" rx="15" ry="12" fill="{WHITE}" stroke="{INK}" stroke-width="2"/><ellipse cx="-58" cy="-24" rx="8" ry="6" fill="{PINK}"/>
<path d="M-56 -42 l-6 -8 M-44 -42 l6 -8" stroke="{INK}" stroke-width="3"/><circle cx="-48" cy="-34" r="1.8" fill="{INK}"/></g></g>'''
    body = ground() + f'''
{sitting(70, 180, shirt=RED)}
<rect x="76" y="150" width="70" height="10" rx="3" fill="{BROWN}" stroke="{INK}" stroke-width="2"/>
{note(150, 120, "a n1")}{note(170, 100, "a n2")}{note(190, 115, "a n3")}
{cow}
<path d="M190 180 l4 -10 l4 10 M205 180 l4 -12 l4 12" stroke="{GREEN}" stroke-width="3" fill="none"/>
''' + caption("彈得再好聽，牛還是只顧著吃草")
    css = '''
.n1,.n2,.n3{animation-name:fly}.n2{animation-delay:1s}.n3{animation-delay:2s}
@keyframes fly{0%{transform:translate(0,0);opacity:0}15%{opacity:1}60%{transform:translate(40px,-30px);opacity:0}100%{opacity:0}}
.eat{transform-origin:100% 0;animation-name:eat;animation-duration:1.6s!important}
@keyframes eat{0%,100%{transform:rotate(0)}50%{transform:rotate(-14deg)}}
'''
    return body, css


@scene(49, "杯弓蛇影")
def _():
    body = f'''<rect x="0" y="0" width="{W}" height="140" fill="#EFE6D6"/><rect x="0" y="140" width="{W}" height="80" fill="#C9A97E"/>
<g><path d="M60 30 q40 50 0 100" stroke="{BROWN}" stroke-width="6" fill="none"/><path d="M60 30 v100" stroke="{INK}" stroke-width="2"/></g>
<path d="M60 80 L190 160" stroke="{YEL}" stroke-width="2" stroke-dasharray="4 6" class="a ray" opacity="0"/>
<rect x="150" y="140" width="110" height="14" fill="{BROWN}"/>
<path d="M178 112 h44 l-6 30 h-32 z" fill="{WHITE}" stroke="{INK}" stroke-width="2"/>
<ellipse cx="200" cy="114" rx="20" ry="4" fill="#E9D8A6"/>
<path class="a snake" d="M186 114 q4 -4 8 0 t8 0 t8 0" stroke="{GREEN}" stroke-width="2.5" fill="none"/>
<g class="a bowr" opacity="0"><path d="M188 112 q12 4 24 0" stroke="{BROWN}" stroke-width="2.5" fill="none"/></g>
{person(300, 180, shirt=GREEN, cls="a man")}
<text class="a ah" x="296" y="96" font-size="26" opacity="0">😨</text>
<text class="a oh" x="296" y="96" font-size="26" opacity="0">😊</text>
''' + caption("杯裡的「蛇」，只是牆上弓的影子")
    css = '''
.snake{animation-name:snake}@keyframes snake{0%,50%{opacity:1}58%,100%{opacity:0}}
.bowr{animation-name:bowr}@keyframes bowr{0%,52%{opacity:0}60%,100%{opacity:1}}
.ray{animation-name:ray}@keyframes ray{0%,40%{opacity:0}48%,70%{opacity:1}80%,100%{opacity:0}}
.ah{animation-name:ah}@keyframes ah{0%,10%{opacity:0}16%,50%{opacity:1}56%,100%{opacity:0}}
.oh{animation-name:oh}@keyframes oh{0%,62%{opacity:0}68%,100%{opacity:1}}
'''
    return body, css


@scene(54, "濫竽充數")
def _():
    xs = [50, 105, 160, 215, 270, 325]
    players = ""
    for i, x in enumerate(xs):
        fake = i == 2
        cls = "a fake" if fake else "a band"
        players += f'<g class="{cls}">{person(x, 180, shirt=RED if fake else GREEN)}<path d="M{x+4} {180-52} l18 -30" stroke="{BROWN}" stroke-width="5" stroke-linecap="round"/></g>'
        if not fake:
            players += note(x + 20, 80, f"a bn n{i%3}")
    body = ground() + players + f'<text class="a sweat" x="174" y="110" font-size="20" opacity="0">💦</text>' + caption("一個一個吹的時候，就露餡了")
    css = '''
.bn{animation-name:bn}.n1{animation-delay:.3s}.n2{animation-delay:.6s}
@keyframes bn{0%{opacity:0;transform:none}10%{opacity:1}30%{opacity:0;transform:translateY(-20px)}40%,100%{opacity:0}}
.band{animation-name:band}@keyframes band{0%,45%{opacity:1}55%,100%{opacity:.15}}
.sweat{animation-name:sw}@keyframes sw{0%,45%{opacity:0}52%,70%{opacity:1}75%,100%{opacity:0}}
.fake{animation-name:fake}@keyframes fake{0%,70%{transform:none;opacity:1}90%,100%{transform:translateX(-200px);opacity:0}}
'''
    return body, css


@scene(89, "自相矛盾")
def _():
    body = ground() + f'''
{person(180, 180, shirt=GREEN)}
<g class="a spear"><path d="M0 0 h110" stroke="{BROWN}" stroke-width="6"/><path d="M110 -10 l26 10 l-26 10 z" fill="{GRAY}" stroke="{INK}" stroke-width="2"/></g>
<g class="a shield"><ellipse cx="0" cy="0" rx="22" ry="34" fill="{YEL}" stroke="{INK}" stroke-width="3"/><circle r="6" fill="{RED}"/></g>
<text class="a q" x="166" y="80" font-size="38" opacity="0" style="fill:{RED}">？</text>
<text class="a sw" x="196" y="110" font-size="18" opacity="0">💦</text>
''' + caption("最利的矛刺最硬的盾，會怎樣？")
    css = '''
.spear{animation-name:spear}@keyframes spear{0%{transform:translate(10px,100px)}45%,100%{transform:translate(110px,100px)}}
.shield{animation-name:shield}@keyframes shield{0%{transform:translate(330px,100px)}45%,100%{transform:translate(262px,100px)}}
.q{animation-name:q}@keyframes q{0%,50%{opacity:0;transform:scale(.4)}58%,100%{opacity:1;transform:scale(1)}}
.sw{animation-name:sw}@keyframes sw{0%,62%{opacity:0}70%,100%{opacity:1}}
'''
    return body, css


@scene(534, "塞翁失馬")
def _():
    def horse(x, y, c):
        return f'''<g transform="translate({x} {y})"><ellipse cx="0" cy="-34" rx="30" ry="14" fill="{c}" stroke="{INK}" stroke-width="2"/>
<path d="M24 -40 l14 -22 l12 6 l-14 20 z" fill="{c}" stroke="{INK}" stroke-width="2"/><circle cx="42" cy="-58" r="1.8" fill="{INK}"/>
<path d="M-20 -22 v22 M-8 -22 v22 M8 -22 v22 M20 -22 v22" stroke="{INK}" stroke-width="4"/><path d="M-30 -36 q-14 4 -12 18" stroke="{INK}" stroke-width="4" fill="none"/></g>'''
    body = ground() + f'''
{person(60, 180, shirt=GRAY, hat=True)}
<g class="a h1">{horse(200, 180, BROWN)}</g>
<g class="a h2">{horse(200, 180, WHITE)}</g>
<g class="a fx1"><text x="60" y="94" font-size="22" text-anchor="middle">😢？</text></g>
<g class="a fx2" opacity="0"><text x="60" y="94" font-size="22" text-anchor="middle">😊？</text></g>
''' + caption("壞事？好事？還不一定呢")
    css = '''
.h1{animation-name:h1}@keyframes h1{0%,10%{transform:none}35%{transform:translateX(220px)}55%{transform:translateX(220px)}75%,100%{transform:none}}
.h2{animation-name:h2}@keyframes h2{0%,55%{transform:translateX(220px)}75%,100%{transform:translateX(90px)}}
.fx1{animation-name:fx1}@keyframes fx1{0%,15%{opacity:0}25%,55%{opacity:1}62%,100%{opacity:0}}
.fx2{animation-name:fx2}@keyframes fx2{0%,70%{opacity:0}80%,100%{opacity:1}}
'''
    return body, css


@scene(2, "掩耳盜鈴")
def _():
    bell = f'''<g transform="translate(110 180)"><path d="M-40 0 q0 -70 40 -80 q40 10 40 80 z" fill="{YEL}" stroke="{INK}" stroke-width="3"/>
<rect x="-46" y="-6" width="92" height="8" rx="3" fill="{BROWN}"/><circle cx="0" cy="-84" r="6" fill="{BROWN}"/></g>'''
    body = ground() + bell + f'''
<g class="a waves" fill="none" stroke="{RED}" stroke-width="3"><path d="M160 100 q12 20 0 40 M176 92 q18 28 0 56 M192 84 q24 36 0 72"/></g>
<g class="a hit">{person(250, 180, shirt=GRAY, arms="none")}<path d="M238 140 l-34 -14" stroke="{INK}" stroke-width="4" stroke-linecap="round"/><rect x="190" y="118" width="18" height="12" fill="{BROWN}"/></g>
<g class="a cover" opacity="0">{person(250, 180, shirt=GRAY, arms="ears")}</g>
''' + caption("摀住自己的耳朵，別人還是聽得到")
    css = '''
.waves{animation-name:wv}@keyframes wv{0%,20%{opacity:0}24%,90%{opacity:1}100%{opacity:0}}
.hit{animation-name:hit}@keyframes hit{0%,22%{opacity:1}26%,100%{opacity:0}}
.cover{animation-name:cover}@keyframes cover{0%,24%{opacity:0}30%,100%{opacity:1}}
'''
    return body, css


@scene(37, "杞人憂天")
def _():
    body = ground() + f'''
<g class="a sky"><path d="M0 0 h{W} v40 q-60 20 -120 0 t-120 0 t-120 0 z" fill="#9BB7C9"/>
<path class="a crack" d="M180 0 l-10 18 l14 10 l-12 16" stroke="{INK}" stroke-width="3" fill="none" opacity="0"/></g>
<g class="a shake">{person(180, 180, shirt=GREEN, arms="up")}</g>
<text class="a sw" x="196" y="104" font-size="18">💦</text>
<g class="a calm" opacity="0"><text x="180" y="90" font-size="22" text-anchor="middle">😮‍💨 原來不會塌</text></g>
''' + caption("擔心根本不會發生的事")
    css = '''
.sky{animation-name:sky}@keyframes sky{0%,10%{transform:none}30%,55%{transform:translateY(16px)}70%,100%{transform:none}}
.crack{animation-name:cr}@keyframes cr{0%,25%{opacity:0}30%,55%{opacity:1}65%,100%{opacity:0}}
.shake{animation-name:shake}@keyframes shake{0%,20%,60%,100%{transform:none}25%,35%,45%{transform:translateX(-4px)}30%,40%,50%{transform:translateX(4px)}}
.sw{animation-name:sw}@keyframes sw{0%,20%{opacity:0}25%,58%{opacity:1}64%,100%{opacity:0}}
.calm{animation-name:calm}@keyframes calm{0%,68%{opacity:0}76%,100%{opacity:1}}
'''
    return body, css


@scene(26, "望梅止渴")
def _():
    soldiers = "".join(person(x, 180, shirt=GREEN if i else RED) for i, x in enumerate([60, 110, 160, 210]))
    body = ground(180, "#E6D3A3") + f'''
<circle class="a sun" cx="320" cy="40" r="22" fill="{ORANGE}"/>
<g class="a walk">{soldiers}</g>
<g class="a bub" opacity="0"><ellipse cx="270" cy="80" rx="62" ry="36" fill="{WHITE}" stroke="{INK}" stroke-width="2"/>
<circle cx="240" cy="72" r="12" fill="{GREEN}"/><circle cx="268" cy="86" r="12" fill="{GREEN}"/><circle cx="296" cy="72" r="12" fill="{GREEN}"/>
<text x="270" y="112" font-size="13" text-anchor="middle">酸酸甜甜的梅子</text></g>
<g class="a drool" opacity="0"><text x="110" y="100" font-size="18">💧</text><text x="160" y="100" font-size="18">💧</text></g>
''' + caption("想到梅子，口水就流出來了")
    css = '''
.sun{animation-name:sun}@keyframes sun{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
.walk{animation-name:walk}@keyframes walk{0%{transform:translateX(0)}40%{transform:translateX(10px)}100%{transform:translateX(90px)}}
.bub{animation-name:bub}@keyframes bub{0%,25%{opacity:0}35%,100%{opacity:1}}
.drool{animation-name:dr}@keyframes dr{0%,45%{opacity:0}55%,100%{opacity:1}}
'''
    return body, css


@scene(36, "老馬識途")
def _():
    path = "M20 190 C 90 190, 80 120, 160 130 S 250 80, 340 70"
    body = f'''<rect width="{W}" height="{H}" rx="14" fill="{SKY}"/>
<path d="M0 150 L70 60 L140 150 Z M110 150 L200 40 L290 150 Z M230 150 L300 70 L370 150 Z" fill="#8FB59A"/>
<rect x="0" y="150" width="{W}" height="70" fill="#CFE3C9"/>
<path d="{path}" stroke="#E6D3A3" stroke-width="14" fill="none" stroke-linecap="round"/>
<path class="a trail" d="{path}" stroke="{RED}" stroke-width="3" stroke-dasharray="6 8" fill="none" pathLength="100"/>
<g><circle r="9" fill="{BROWN}" stroke="{INK}" stroke-width="2"/><path d="M6 -6 l8 -8" stroke="{INK}" stroke-width="3"/>
<animateMotion dur="7s" repeatCount="indefinite" path="{path}" keyPoints="0;1;1" keyTimes="0;0.75;1" calcMode="linear"/></g>
<g><circle r="6" fill="{GREEN}" stroke="{INK}" stroke-width="2"/><animateMotion dur="7s" begin="0.6s" repeatCount="indefinite" path="{path}" keyPoints="0;1;1" keyTimes="0;0.75;1" calcMode="linear"/></g>
<g><circle r="6" fill="{GREEN}" stroke="{INK}" stroke-width="2"/><animateMotion dur="7s" begin="1.2s" repeatCount="indefinite" path="{path}" keyPoints="0;1;1" keyTimes="0;0.75;1" calcMode="linear"/></g>
<text x="320" y="56" font-size="22">🏠</text>
''' + '<text x="180" y="210" text-anchor="middle" font-size="15">跟著認得路的老馬走出山谷</text>'
    css = '''
.trail{stroke-dasharray:100;animation-name:tr}@keyframes tr{0%{stroke-dashoffset:100}75%,100%{stroke-dashoffset:0}}
'''
    return body, css


@scene(267, "愚公移山")
def _():
    body = ground() + f'''
<g class="a mt"><path d="M150 180 L250 50 L350 180 Z" fill="#8FB59A" stroke="{INK}" stroke-width="2"/></g>
<g class="a dig">{person(80, 180, shirt=GRAY, hat=True, arms="none")}<path d="M90 140 l40 30" stroke="{BROWN}" stroke-width="5"/><path d="M126 166 l12 10 l-8 6 z" fill="{GRAY}"/></g>
<g class="a kid">{person(40, 180, shirt=GREEN)}<ellipse cx="40" cy="118" rx="14" ry="6" fill="{BROWN}"/></g>
<text class="a gen" x="40" y="60" font-size="15" opacity="0">兒子、孫子…一直挖</text>
''' + caption("一代接一代，山終於被搬走")
    css = '''
.mt{transform-origin:50% 100%;animation-name:mt}@keyframes mt{0%{transform:scale(1)}85%,100%{transform:scale(.05)}}
.dig{animation-name:dig;animation-duration:1s!important}@keyframes dig{0%,100%{transform:none}50%{transform:rotate(-6deg)}}
.kid{animation-name:kid}@keyframes kid{0%,100%{transform:none}50%{transform:translateY(-6px)}}
.gen{animation-name:gen}@keyframes gen{0%,20%{opacity:0}30%,80%{opacity:1}90%,100%{opacity:0}}
'''
    return body, css


@scene(1008, "磨杵成針")
def _():
    body = ground() + f'''
<rect x="140" y="160" width="120" height="22" rx="8" fill="{GRAY}" stroke="{INK}" stroke-width="2"/>
{sitting(90, 180, shirt=BROWN)}
<g class="a rub"><rect class="a rod" x="150" y="150" width="100" height="12" rx="6" fill="#6E7B76" stroke="{INK}" stroke-width="2"/></g>
<g class="a kid">{person(320, 180, shirt=GREEN)}</g>
<text class="a spark" x="250" y="140" font-size="22" opacity="0">✨</text>
<text class="a book" x="300" y="96" font-size="22" opacity="0">📖</text>
''' + caption("粗粗的鐵棒，慢慢磨成細細的針")
    css = '''
.rub{animation-name:rub;animation-duration:.8s!important}@keyframes rub{0%,100%{transform:translateX(-6px)}50%{transform:translateX(6px)}}
.rod{transform-origin:50% 50%;animation-name:rod}@keyframes rod{0%{transform:scaleY(1)}80%,100%{transform:scaleY(.16)}}
.spark{animation-name:sp}@keyframes sp{0%,78%{opacity:0}86%,100%{opacity:1}}
.book{animation-name:bk}@keyframes bk{0%,85%{opacity:0}92%,100%{opacity:1}}
'''
    return body, css


@scene(6, "朝三暮四")
def _():
    def monkey(x, cls):
        return f'''<g class="{cls}" transform="translate({x} 180)"><ellipse cx="0" cy="-20" rx="14" ry="18" fill="{BROWN}" stroke="{INK}" stroke-width="2"/>
<circle cx="0" cy="-48" r="13" fill="{BROWN}" stroke="{INK}" stroke-width="2"/><ellipse cx="0" cy="-45" rx="9" ry="8" fill="{SKIN}"/>
<circle cx="-14" cy="-50" r="5" fill="{SKIN}" stroke="{INK}" stroke-width="2"/><circle cx="14" cy="-50" r="5" fill="{SKIN}" stroke="{INK}" stroke-width="2"/>
<circle cx="-4" cy="-48" r="1.5" fill="{INK}"/><circle cx="4" cy="-48" r="1.5" fill="{INK}"/></g>'''
    nuts = lambda n, x: "".join(f'<circle cx="{x+i*16}" cy="0" r="6" fill="{BROWN}"/>' for i in range(n))
    body = ground() + f'''
<g transform="translate(40 40)"><text x="0" y="6" font-size="22">☀️</text><g class="a am3" transform="translate(40 0)">{nuts(3, 0)}</g><g class="a am4" transform="translate(40 0)" opacity="0">{nuts(4, 0)}</g></g>
<g transform="translate(200 40)"><text x="0" y="6" font-size="22">🌙</text><g class="a pm4" transform="translate(40 0)">{nuts(4, 0)}</g><g class="a pm3" transform="translate(40 0)" opacity="0">{nuts(3, 0)}</g></g>
{monkey(80, "")}{monkey(150, "")}{monkey(220, "")}{monkey(290, "")}
<text class="a mad" x="180" y="100" font-size="26" text-anchor="middle">😠😠😠</text>
<text class="a glad" x="180" y="100" font-size="26" text-anchor="middle" opacity="0">😄😄😄</text>
''' + caption("一天一樣是七顆")
    css = '''
.am3,.pm4,.mad{animation-name:first}.am4,.pm3,.glad{animation-name:second}
@keyframes first{0%,45%{opacity:1}52%,100%{opacity:0}}
@keyframes second{0%,48%{opacity:0}56%,100%{opacity:1}}
'''
    return body, css


@scene(320, "盲人摸象")
def _():
    body = ground() + f'''
<g transform="translate(190 180)">
<ellipse cx="0" cy="-70" rx="78" ry="48" fill="{GRAY}" stroke="{INK}" stroke-width="2"/>
<path d="M-56 -30 v30 M-26 -30 v30 M26 -30 v30 M56 -30 v30" stroke="{GRAY}" stroke-width="18"/>
<circle cx="-82" cy="-92" r="28" fill="{GRAY}" stroke="{INK}" stroke-width="2"/>
<path d="M-60 -110 q-40 -14 -40 26 q20 6 40 -6 z" fill="#B9C2BD" stroke="{INK}" stroke-width="2"/>
<path d="M-104 -80 q-16 30 -6 60" stroke="{GRAY}" stroke-width="12" fill="none" stroke-linecap="round"/>
<path d="M-96 -76 q-14 10 -26 6" stroke="{WHITE}" stroke-width="6" fill="none" stroke-linecap="round"/>
<circle cx="-88" cy="-98" r="2.4" fill="{INK}"/></g>
<g class="a l1" opacity="0"><text x="40" y="88" font-size="15">象牙：像蘿蔔</text></g>
<g class="a l2" opacity="0"><text x="70" y="40" font-size="15">耳朵：像畚箕</text></g>
<g class="a l3" opacity="0"><text x="200" y="64" font-size="15">肚子：像大甕</text></g>
<text class="a q" x="300" y="150" font-size="28" opacity="0" style="fill:{RED}">？</text>
''' + caption("每個人只摸到一部分")
    css = '''
.l1{animation-name:l1}.l2{animation-name:l2}.l3{animation-name:l3}.q{animation-name:l4}
@keyframes l1{0%,8%{opacity:0}15%,100%{opacity:1}}
@keyframes l2{0%,28%{opacity:0}35%,100%{opacity:1}}
@keyframes l3{0%,48%{opacity:0}55%,100%{opacity:1}}
@keyframes l4{0%,68%{opacity:0}75%,100%{opacity:1}}
'''
    return body, css


def main():
    import sys
    STYLE["hand"] = "--hand" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    for no, (name, fn) in SCENES.items():
        body, css = fn()
        (OUT / f"{no}.svg").write_text(svg(name, body, css), encoding="utf-8")
    print(f"{len(SCENES)} 個動畫 → {OUT}")


if __name__ == "__main__":
    main()
