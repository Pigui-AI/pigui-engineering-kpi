const DATA = 'data/team.json';
const fallback = { period: 'Semana actual', team: [
  { name:'Marco', role:'Desarrollador móvil', login:'por-asignar' }, { name:'América', role:'Fullstack móvil', login:'americabalderas-del' }, { name:'Ricardo', role:'Fullstack Sr.', login:'por-asignar' }, { name:'Yestzanetli', role:'QA', login:'por-asignar' }, { name:'Ever', role:'Backend', login:'por-asignar' }
]};
function score(member){ return Number(member.verified_progress || 0) }
function render(data){
  document.querySelector('#period').textContent=data.period||'Semana actual';
  const members=data.team||fallback.team, average=Math.round(members.reduce((n,m)=>n+score(m),0)/members.length);
  document.querySelector('#data-source').textContent='Fuente: reportes verificados por GitHub Actions';
  document.querySelector('#team').innerHTML=members.map(m=>`<article class="person"><div class="person-top"><div><h3>${m.name}</h3><p class="role">${m.role}</p></div><span class="chip">${m.login==='por-asignar'?'MAPEO PENDIENTE':'VALIDABLE'}</span></div><div class="percent">${score(m)}%</div><div class="bar"><i style="width:${score(m)}%"></i></div><div class="person-foot"><span>${m.verified_prs||0} PR validados</span><span>${m.open_reports||0} por validar</span></div></article>`).join('');
  document.querySelector('#metrics').innerHTML=`<article class="metric"><span>Avance promedio validado</span><strong>${average}%</strong></article><article class="metric"><span>PR con evidencia aprobada</span><strong>${members.reduce((n,m)=>n+(m.verified_prs||0),0)}</strong></article><article class="metric"><span>Reportes pendientes</span><strong>${members.reduce((n,m)=>n+(m.open_reports||0),0)}</strong></article>`;
}
fetch(DATA).then(r=>r.ok?r.json():fallback).then(render).catch(()=>render(fallback));
