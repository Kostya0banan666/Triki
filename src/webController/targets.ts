import type { ActionType } from '../profiles/profiles';

/**
 * A web service that can be driven from inside our own WebView. Adding a new
 * service = adding an entry here. Scripts run in the page via injectJavaScript.
 */
export interface WebTarget {
  id: string;
  name: string;
  url: string;
  /** per-action overrides; anything missing falls back to GENERIC */
  scripts?: Partial<Record<ActionType, string>>;
}

/** Helpers injected once per page load. */
export const HELPERS = `
(function(){
  if (window.__triki) return;
  function visibleVideo(){
    var vs = Array.prototype.slice.call(document.querySelectorAll('video'));
    var best = null, bestArea = 0, vh = window.innerHeight, vw = window.innerWidth;
    vs.forEach(function(v){
      var r = v.getBoundingClientRect();
      var w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      var h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      if (w*h > bestArea){ bestArea = w*h; best = v; }
    });
    return best;
  }
  function scroller(){
    var best = document.scrollingElement, bestH = 0;
    document.querySelectorAll('*').forEach(function(el){
      var s = getComputedStyle(el);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50 && el.clientHeight > bestH){
        best = el; bestH = el.clientHeight;
      }
    });
    return best;
  }
  function key(k){
    var o = { key: k, code: k, bubbles: true, cancelable: true };
    (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', o));
    document.dispatchEvent(new KeyboardEvent('keydown', o));
  }
  function page(dir){
    var s = scroller();
    s.scrollBy({ top: dir * s.clientHeight, behavior: 'smooth' });
  }
  function toast(t){
    var d = document.createElement('div');
    d.textContent = t;
    d.style.cssText = 'position:fixed;left:50%;top:14%;transform:translateX(-50%);background:rgba(0,0,0,.75);color:#fff;padding:8px 16px;border-radius:20px;font:600 15px -apple-system;z-index:2147483647;pointer-events:none';
    document.body.appendChild(d);
    setTimeout(function(){ d.remove(); }, 700);
  }
  window.__triki = { visibleVideo: visibleVideo, scroller: scroller, key: key, page: page, toast: toast };
})();
true;`;

const vid = (body: string) => `(function(){var T=window.__triki;var v=T.visibleVideo();${body}})();true;`;

export const GENERIC: Record<ActionType, string> = {
  NONE: 'true;',
  NEXT: `(function(){var T=window.__triki;T.key('ArrowDown');T.page(1);T.toast('▼ Next');})();true;`,
  PREVIOUS: `(function(){var T=window.__triki;T.key('ArrowUp');T.page(-1);T.toast('▲ Previous');})();true;`,
  PLAY_PAUSE: vid(`if(!v)return;if(v.paused){v.play();T.toast('▶');}else{v.pause();T.toast('❚❚');}`),
  LIKE: `(function(){var T=window.__triki;T.key('l');T.toast('♥');})();true;`,
  VOLUME_UP: vid(`if(!v)return;v.muted=false;v.volume=Math.min(1,v.volume+0.1);T.toast('🔊 '+Math.round(v.volume*100)+'%');`),
  VOLUME_DOWN: vid(`if(!v)return;v.volume=Math.max(0,v.volume-0.1);T.toast('🔉 '+Math.round(v.volume*100)+'%');`),
  MUTE: vid(`if(!v)return;v.muted=!v.muted;T.toast(v.muted?'🔇':'🔊');`),
};

export const WEB_TARGETS: WebTarget[] = [
  { id: 'tiktok', name: 'TikTok', url: 'https://www.tiktok.com/foryou' },
  { id: 'shorts', name: 'YouTube Shorts', url: 'https://m.youtube.com/shorts' },
  { id: 'reels', name: 'Instagram Reels', url: 'https://www.instagram.com/reels/' },
  { id: 'custom', name: 'Any website', url: 'https://www.youtube.com' },
];

export function scriptFor(target: WebTarget, action: ActionType): string {
  return HELPERS + (target.scripts?.[action] ?? GENERIC[action]);
}
