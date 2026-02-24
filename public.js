const canalSorteo = new BroadcastChannel('sorteo_pro_channel');
const audioDrum = document.getElementById('audioDrum');
const audioWin = document.getElementById('audioWin');

canalSorteo.onmessage = (event) => {
    const { action, data } = event.data;
    if (action === 'SETUP_INICIAL') document.getElementById('showContainer').classList.remove('hidden');
    if (action === 'REVELAR_GANADOR') ejecutarRevelacion(data);
};

function ejecutarRevelacion(ganador) {
    const card = document.getElementById('winnerCard');
    const nameDisplay = document.getElementById('nameDisplay');
    
    card.classList.remove('reveal-anim');
    void card.offsetWidth; 
    
    document.getElementById('positionDisplay').innerText = `PUESTO #${ganador.puesto}`;
    document.getElementById('prizeDisplay').innerText = ganador.premio;
    nameDisplay.innerText = "???";
    
    card.classList.remove('hidden');
    audioDrum.play().catch(e => console.log("Audio autoplay bloqueado, requiere interacción previa."));

    let iteraciones = 0;
    const intervalo = setInterval(() => {
        nameDisplay.innerText = Math.random().toString(36).substring(2, 10).toUpperCase();
        iteraciones++;
        
        if (iteraciones > 25) {
            clearInterval(intervalo);
            nameDisplay.innerText = ganador.nombre;
            audioDrum.pause(); audioDrum.currentTime = 0;
            audioWin.play().catch(e => console.log("Audio autoplay bloqueado."));
            confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
            card.classList.add('reveal-anim');
            agregarALeaderboard(ganador);
        }
    }, 80);
}

function agregarALeaderboard(ganador) {
    const board = document.getElementById('leaderboard');
    board.classList.remove('hidden');
    const item = document.createElement('div');
    item.className = 'leaderboard-item glass-card';
    item.innerHTML = `<span>#${ganador.puesto} ${ganador.nombre}</span> <span class="prize-mini">${ganador.premio}</span>`;
    board.prepend(item);
}