// Data store
let students = [];
let role = 'teacher';

const MAX = { cie: 30, online: 40, profile: 20, portfolio: 30 };
const TOTAL_MAX = 240;

const byId = id => document.getElementById(id);

function init() {
  byId('roleSelect').addEventListener('change', e => {
    role = e.target.value;
    updateRoleUI();
    render();
  });
  byId('branchSelect').addEventListener('change', render);
  byId('uploadCsv').addEventListener('change', handleUpload);
  byId('downloadTemplate').addEventListener('click', downloadTemplate);
  byId('addBtn').addEventListener('click', addStudent);
  byId('exportBtn').addEventListener('click', exportCSV);
  updateRoleUI();
  render();
}

function updateRoleUI(){
  const isHod = role === 'hod';
  byId('exportBtn').disabled = !isHod;
  byId('exportBtn').classList.toggle('primary', isHod);
}

function addStudent(){
  const usn = byId('addUSN').value.trim();
  const name = byId('addName').value.trim();
  const branch = byId('addBranch').value;
  if(!usn || !name){ alert('Please enter USN and Name'); return; }
  students.push({USN: usn, Name: name, Branch: branch, lock:false,
    CIE1:'',CIE2:'',CIE3:'',CIE4:'',CIE5:'', Online:'', Profile:'', Portfolio:''});
  byId('addUSN').value=''; byId('addName').value='';
  render();
}

function handleUpload(evt){
  const file = evt.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    const text = e.target.result;
    const rows = text.split(/\r?\n/).filter(r=>r.trim().length>0);
    const header = rows.shift().split(',').map(h=>h.trim().toLowerCase());
    const idxUSN = header.indexOf('usn');
    const idxName = header.indexOf('name');
    const idxBranch = header.indexOf('branch');
    if(idxUSN===-1 || idxName===-1 || idxBranch===-1){
      alert('CSV must have headers: USN,Name,Branch');
      return;
    }
    rows.forEach(r=>{
      const cols = r.split(',');
      if(cols.length < 3) return;
      students.push({
        USN: cols[idxUSN].trim(),
        Name: cols[idxName].trim(),
        Branch: cols[idxBranch].trim(),
        lock:false,
        CIE1:'',CIE2:'',CIE3:'',CIE4:'',CIE5:'',
        Online:'',Profile:'',Portfolio:''
      });
    });
    render();
  };
  reader.readAsText(file);
  evt.target.value='';
}

function numberOrZero(v){ const n = parseFloat(v); return isNaN(n) ? 0 : n; }

function calcTotal(s){
  const total = ['CIE1','CIE2','CIE3','CIE4','CIE5','Online','Profile','Portfolio']
    .reduce((acc,k)=>acc+numberOrZero(s[k]),0);
  return Math.min(total, TOTAL_MAX);
}

function completion(s){
  const filled = ['CIE1','CIE2','CIE3','CIE4','CIE5','Online','Profile','Portfolio']
    .filter(k=>s[k]!=='' && !isNaN(parseFloat(s[k]))).length;
  return Math.round((filled/8)*100);
}

function boundValue(key, val, prevVal){
  if(val === '') return '';
  let v = parseFloat(val);
  if(isNaN(v)) {
    alert("Invalid entry: Please enter a number.");
    return prevVal;
  }
  const limits = {CIE1:MAX.cie, CIE2:MAX.cie, CIE3:MAX.cie, CIE4:MAX.cie, CIE5:MAX.cie,
                  Online:MAX.online, Profile:MAX.profile, Portfolio:MAX.portfolio};
  if(v < 0 || v > limits[key]) {
    alert(`Invalid entry: ${key} must be between 0 and ${limits[key]}.`);
    return prevVal;
  }
  return v;
}

function onEdit(idx, key, val){
  const s = students[idx];
  if(s.lock && role!=='hod') return; // locked by HOD
  const prevVal = s[key];
  s[key] = boundValue(key, val, prevVal);
  renderStats();
  updateRow(idx);
}

function lockRow(idx, locked){
  if(role!=='hod') return;
  students[idx].lock = locked;
  render();
}

function removeRow(idx){
  if(role!=='hod' && students[idx].lock){ alert('Locked by HOD'); return; }
  students.splice(idx,1);
  render();
}

function render(){
  const tbody = byId('studentsBody');
  tbody.innerHTML='';
  const branchFilter = byId('branchSelect').value;
  const isHod = role==='hod';
  let index=0;
  students.forEach((s,i)=>{
    if(branchFilter!=='All' && s.Branch!==branchFilter) return;
    index++;
    const tr = document.createElement('tr');

    const total = calcTotal(s);
    const perc = total ? Math.round((total/TOTAL_MAX)*100) : 0;

    tr.innerHTML = `
      <td>${index}</td>
      <td>${s.USN}</td>
      <td>${s.Name}</td>
      <td>${s.Branch}</td>
      ${['CIE1','CIE2','CIE3','CIE4','CIE5','Online','Profile','Portfolio'].map(key=>`
        <td><input type="number" min="0" step="1" max="${key.startsWith('CIE')?MAX.cie:(key==='Online'?MAX.online:(key==='Profile'?MAX.profile:MAX.portfolio))}"
          value="${s[key]}"
          ${s.lock && role!=='hod' ? 'disabled' : ''}
          oninput="onEdit(${i}, '${key}', this.value)"/></td>
      `).join('')}
      <td><strong>${total}</strong></td>
      <td>${perc}%</td>
      <td class="${isHod?'':'hod-hidden'}">
        <input type="checkbox" ${s.lock?'checked':''} onchange="lockRow(${i}, this.checked)" />
      </td>
      <td><button class="del-btn" onclick="removeRow(${i})">×</button></td>
    `;
    tbody.appendChild(tr);
  });
  renderStats();
}

function renderStats(){
  const branchFilter = byId('branchSelect').value;
  const filtered = students.filter(s=>branchFilter==='All' || s.Branch===branchFilter);
  const count = filtered.length;
  const avg = count ? Math.round(filtered.reduce((a,s)=>a+calcTotal(s),0)/count) : 0;
  const comp = count ? Math.round(filtered.reduce((a,s)=>a+completion(s),0)/count) : 0;
  byId('kCount').textContent = count;
  byId('kAvg').textContent = avg;
  byId('kCompletion').textContent = comp + '%';
}

function downloadTemplate(){
  const csv = 'USN,Name,Branch\n1KS21CS001,Student One,Computer Science\n1KS21ME001,Student Two,Mechanical\n';
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'KS_Pathway_Student_Template.csv'; a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(){
  if(role!=='hod'){ alert('Only HOD can export CSV. Switch role to HOD.'); return; }
  const branch = byId('branchSelect').value;
  const filtered = students.filter(s=>branch==='All' || s.Branch===branch);
  if(filtered.length===0){ alert('No records to export for the selected filter'); return; }
  const header = ['USN','Name','Branch','CIE1','CIE2','CIE3','CIE4','CIE5','Online','Profile','Portfolio','Total','Percentage','Locked'];
  const lines = [header.join(',')];
  filtered.forEach(s=>{
    const total = calcTotal(s);
    const perc = total ? Math.round((total/TOTAL_MAX)*100) : 0;
    const row = [s.USN,s.Name,s.Branch,s.CIE1,s.CIE2,s.CIE3,s.CIE4,s.CIE5,s.Online,s.Profile,s.Portfolio,total,perc,(s.lock?'Yes':'No')];
    lines.push(row.join(','));
  });
  const csv = lines.join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const filename = `KS_Pathway_${branch==='All'?'AllBranches':branch}_Export.csv`;
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

window.onload = init;
