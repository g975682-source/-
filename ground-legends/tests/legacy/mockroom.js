// in-page mock of the room capability, bridged between pages by the Node test via __relaySend/__relayRecv
window.__peerId='p'+Math.random().toString(36).slice(2,8);
(function(){
  const me=window.__peerId;const rooms={};
  function R(name){return rooms[name]||(rooms[name]={peers:new Map([[me,{}]]),on:{},ph:[],joined:name===''});}
  function snapshot(name){const r=R(name);return Object.freeze([...r.peers].map(([peer,pres])=>Object.freeze({peer,by:null,isMe:peer===me,sameTab:peer===me,kind:'viewer',guest:false,presence:pres,updatedAt:Date.now()})));}
  function firePeers(name){const r=R(name),ps=snapshot(name);for(const f of r.ph)f({peers:ps,joined:[],left:[],updated:[]});}
  window.__relayRecv=function(msg){
    const r=R(msg.room);
    if(msg.kind==='presence'){if(!r.joined&&msg.room!=='')return;r.peers.set(msg.from,msg.p);firePeers(msg.room);}
    else if(msg.kind==='leave'){r.peers.delete(msg.from);firePeers(msg.room);}
    else if(msg.kind==='hello'){if(r.joined&&msg.from!==me){window.__relaySend(JSON.stringify({kind:'presence',room:msg.room,from:me,p:r.peers.get(me)||{}}));}if(r.joined)r.peers.set(msg.from,r.peers.get(msg.from)||{});firePeers(msg.room);}
    else if(msg.kind==='emit'){if(!r.joined)return;for(const f of (r.on[msg.topic]||[]))f({topic:msg.topic,data:msg.data,peer:msg.from,by:null,isMe:msg.from===me,sameTab:msg.from===me,kind:'viewer',guest:false});}
  };
  function api(name){const r=R(name);return {
    name,
    emit:async(topic,data)=>{if(JSON.stringify(data||null).length>4096)throw {code:'invalid_argument',message:'too big '+JSON.stringify(data).length};window.__relaySend(JSON.stringify({kind:'emit',room:name,from:me,topic,data}));},
    on:(topic,fn)=>{(r.on[topic]=r.on[topic]||[]).push(fn);return ()=>{};},
    presence:async(patch)=>{const cur=Object.assign({},r.peers.get(me)||{});for(const k in patch){if(patch[k]===null)delete cur[k];else cur[k]=patch[k];}
      if(JSON.stringify(cur).length>4096)throw {code:'invalid_argument',message:'presence too big '+JSON.stringify(cur).length};
      r.peers.set(me,cur);window.__presBytes=Math.max(window.__presBytes||0,JSON.stringify(cur).length);window.__relaySend(JSON.stringify({kind:'presence',room:name,from:me,p:cur}));},
    peers:()=>snapshot(name),
    onPeers:(fn)=>{r.ph.push(fn);setTimeout(()=>fn({peers:snapshot(name),joined:snapshot(name),left:[],updated:[]}),0);return ()=>{};},
    connected:()=>true,
    onConnection:(fn)=>{setTimeout(()=>fn(true),0);return ()=>{};},
    leave:async()=>{r.joined=false;window.__relaySend(JSON.stringify({kind:'leave',room:name,from:me}));},
  };}
  const lobby=api('');
  lobby.join=async(name)=>{const r=R(name);r.joined=true;window.__relaySend(JSON.stringify({kind:'hello',room:name,from:me}));return api(name);};
  window.claude={use:async(n)=>n==='room'?Object.freeze(lobby):null};
  setTimeout(()=>window.__relaySend(JSON.stringify({kind:'hello',room:'',from:me})),50);
})();
