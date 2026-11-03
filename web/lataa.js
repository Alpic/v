// Optional: fill version, size, date and sha256 from version.json. The page works without this script.
fetch('version.json',{cache:'no-store'}).then(function(r){return r.json()}).then(function(v){
 var s=function(i,x){if(x!=null&&x!=='')document.getElementById(i).textContent=x};
 s('v',v.versionName+' ('+v.versionCode+')');s('sha',v.sha256);s('dt',v.date);if(v.size)s('sz',(v.size/1048576).toFixed(1)+' Mt');
 if(v.apk)document.getElementById('dl').href=v.apk}).catch(function(){});
