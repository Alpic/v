try{var p=JSON.parse(localStorage.getItem('v.prefs')||'{}');if(p.theme==='light')document.documentElement.dataset.theme='light';if(p.lang)document.documentElement.lang=p.lang}catch(e){}
