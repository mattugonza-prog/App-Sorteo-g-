let participantes = [];
let premios = [];
let ganadores = [];
let revelados = [];
const canalSorteo = new BroadcastChannel('sorteo_pro_channel');

const numGanadoresInput = document.getElementById('numGanadores');
const prizeSetupArea = document.getElementById('prizeSetupArea');
const btnPreparar = document.getElementById('btnPreparar');
const btnRevelar = document.getElementById('btnRevelar');
const btnExportar = document.getElementById('btnExportar');

function guardarEstado() {
    localStorage.setItem('sorteoProData', JSON.stringify({ participantes, premios, ganadores, revelados }));
}

function restaurarEstado() {
    const data = localStorage.getItem('sorteoProData');
    if (data) {
        const estado = JSON.parse(data);
        if (estado.ganadores && estado.ganadores.length > 0) {
            participantes = estado.participantes; premios = estado.premios;
            ganadores = estado.ganadores; revelados = estado.revelados;
            
            document.getElementById('broadcastStatus').classList.replace('offline', 'online');
            document.getElementById('statusText').innerText = revelados.length === ganadores.length ? "FINALIZADO" : "EN VIVO";
            btnPreparar.disabled = true; document.getElementById('inputExcel').disabled = true; numGanadoresInput.disabled = true;
            
            if (revelados.length < ganadores.length) btnRevelar.disabled = false;
            else btnExportar.disabled = false;

            document.getElementById('operatorWinnersBoard').innerHTML = '';
            revelados.forEach(g => actualizarMonitorOperador(g, true));
        }
    }
}

function renderPrizeInputs() {
    const num = parseInt(numGanadoresInput.value) || 1;
    prizeSetupArea.innerHTML = '';
    for(let i = 1; i <= num; i++) {
        prizeSetupArea.innerHTML += `
            <div class="input-group">
                <input type="text" class="modern-input prize-input" data-puesto="${i}" placeholder="Premio Puesto #${i}" value="Premio Sorpresa">
            </div>`;
    }
}
numGanadoresInput.addEventListener('input', renderPrizeInputs);
renderPrizeInputs();

document.getElementById('inputExcel').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('fileStatus').innerText = `Leyendo...`;
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {header: 1});
        let nombresBrutos = [];
        json.forEach(row => {
            row.forEach(cell => {
                if (typeof cell === 'string' && cell.trim() !== '' && cell.toLowerCase() !== 'nombres') {
                    nombresBrutos.push(cell.trim().toUpperCase());
                }
            });
        });
        participantes = [...new Set(nombresBrutos)];
        document.getElementById('fileStatus').innerText = `✅ ${participantes.length} listos.`;
        btnPreparar.disabled = false;
    };
    reader.readAsArrayBuffer(file);
});

function shuffleCriptografico(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        const randomBuffer = new Uint32Array(1);
        window.crypto.getRandomValues(randomBuffer);
        randomIndex = Math.floor((randomBuffer[0] / (0xffffffff + 1)) * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

btnPreparar.addEventListener('click', () => {
    if(participantes.length < parseInt(numGanadoresInput.value)) { alert("Error: Hay más premios que participantes."); return; }
    premios = Array.from(document.querySelectorAll('.prize-input')).map(input => ({
        puesto: parseInt(input.getAttribute('data-puesto')), detalle: input.value
    }));
    const mezclados = shuffleCriptografico([...participantes]);
    ganadores = premios.map((p, index) => ({ puesto: p.puesto, premio: p.detalle, nombre: mezclados[index] }));
    
    document.getElementById('broadcastStatus').classList.replace('offline', 'online');
    document.getElementById('statusText').innerText = "EN VIVO";
    btnPreparar.disabled = true; btnRevelar.disabled = false;
    document.getElementById('inputExcel').disabled = true; numGanadoresInput.disabled = true;
    
    guardarEstado();
    canalSorteo.postMessage({ action: 'SETUP_INICIAL', total: ganadores.length });
});

btnRevelar.addEventListener('click', () => {
    const orden = document.getElementById('revealOrder').value; 
    let pendientes = ganadores.filter(g => !revelados.some(r => r.puesto === g.puesto));
    if (pendientes.length === 0) return;

    let siguiente = orden === 'desc' ? pendientes[pendientes.length - 1] : pendientes[0];
    revelados.push(siguiente);
    guardarEstado();
    actualizarMonitorOperador(siguiente);
    canalSorteo.postMessage({ action: 'REVELAR_GANADOR', data: siguiente });

    if (revelados.length === ganadores.length) {
        btnRevelar.disabled = true; btnRevelar.classList.remove('pulse-effect');
        btnExportar.disabled = false; document.getElementById('statusText').innerText = "FINALIZADO";
    }
});

function actualizarMonitorOperador(ganador, append = false) {
    const board = document.getElementById('operatorWinnersBoard');
    if(revelados.length === 1 && board.querySelector('.empty-state')) board.innerHTML = ''; 
    const row = document.createElement('div');
    row.style.padding = '10px 0'; row.style.borderBottom = '1px solid var(--glass-border)';
    row.innerHTML = `<strong style="color: var(--accent-color)">#${ganador.puesto}</strong> - ${ganador.nombre} <br><span style="color: var(--text-muted); font-size: 0.85rem">${ganador.premio}</span>`;
    append ? board.appendChild(row) : board.prepend(row);
}

btnExportar.addEventListener('click', () => {
    if (revelados.length === 0) return;
    const dataParaExcel = [...revelados].sort((a,b) => a.puesto - b.puesto).map(g => ({
        Puesto: g.puesto, Premio: g.premio, Ganador: g.nombre
    }));
    const ws = XLSX.utils.json_to_sheet(dataParaExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ganadores");
    XLSX.writeFile(wb, "Acta_Ganadores.xlsx");
});

function abrirPantallaPublico() {
    window.open('public.html', 'PantallaPublico', 'width=1280,height=720,menubar=no,toolbar=no,location=no');
    setTimeout(() => { if(ganadores.length > 0) canalSorteo.postMessage({ action: 'SETUP_INICIAL', total: ganadores.length }); }, 1000);
}

restaurarEstado();