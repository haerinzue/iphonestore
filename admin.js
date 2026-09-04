async function refresh(){
 const r=await fetch('/api/phones');const phones=await r.json();const el=document.getElementById('list');
 el.innerHTML=phones.length?phones.map(p=>`<div class="item"><img class="thumb" src="${p.images?.[0]||''}"><div class="item-info"><strong>${esc(p.name)}</strong><div>₱${Number(p.price||0).toLocaleString('en-PH')} • ${esc(p.storage||'')} • ${esc(p.color||'')} • ${esc(p.condition||'')}</div><div>Battery: ${esc(p.battery||'N/A')}</div></div><button class="delete" onclick="removePhone('${p.id}')">Delete</button></div>`).join(''):'<p style="color:#7f8da7">No listings yet.</p>';
}
document.getElementById('phoneForm').addEventListener('submit',async e=>{
 e.preventDefault();const status=document.getElementById('status');status.textContent='Uploading...';
 const r=await fetch('/api/phones',{method:'POST',body:new FormData(e.target)});const data=await r.json();
 status.textContent=r.ok?'Published!':(data.error||'Upload failed');
 if(r.ok){e.target.reset();refresh();}
});
async function removePhone(id){if(!confirm('Delete this listing?'))return;await fetch('/api/phones/'+id,{method:'DELETE'});refresh();}
async function deleteAll(){if(!confirm('Delete ALL listings?'))return;await fetch('/api/phones',{method:'DELETE'});refresh();}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
refresh();