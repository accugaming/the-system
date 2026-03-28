let state = JSON.parse(localStorage.getItem('system_v12')) || {
    level: 1, hp: 100, str: 10, vit: 10, agi: 10, ap: 0, reps: 0, fatigue: 0, 
    penalty: false, lastActive: Date.now()
};

function initializeSystem() {
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    setupAI();
    startPenaltyTimer();
    refresh();
}

async function setupAI() {
    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
    pose.setOptions({ modelComplexity: 0, minDetectionConfidence: 0.5 });
    pose.onResults(onPose);

    const camera = new Camera(document.getElementById('webcam'), {
        onFrame: async () => { await pose.send({image: document.getElementById('webcam')}); },
        width: 320, height: 240
    });
    camera.start();
}

function onPose(results) {
    if (!results.poseLandmarks) return;
    const p = results.poseLandmarks;
    const shY = (p[11].y + p[12].y) / 2;
    const elY = (p[13].y + p[14].y) / 2;

    if (elY > shY + 0.06) this.down = true;
    if (elY < shY && this.down) {
        this.down = false;
        state.reps++;
        state.fatigue = Math.min(100, state.fatigue + 10);
        
        // Mobile Vibration Feedback
        if (window.navigator.vibrate) window.navigator.vibrate(50); 
        
        if (state.reps >= 100) {
            state.level++; state.ap += 3; state.reps = 0;
            if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]); 
        }
        refresh();
    }
}

function startPenaltyTimer() {
    setInterval(() => {
        state.fatigue = Math.max(0, state.fatigue - 1);
        
        // If no reps for too long, trigger Penalty
        let idleTime = Date.now() - state.lastActive;
        if (idleTime > 86400000 && state.reps < 100) { // 24 hours
            state.penalty = true;
            state.hp -= 1;
        } else {
            state.penalty = false;
        }
        refresh();
    }, 5000);
}

function refresh() {
    localStorage.setItem('system_v12', JSON.stringify(state));
    document.getElementById('hp-fill').style.width = state.hp + "%";
    document.getElementById('mp-fill').style.width = (100 - state.fatigue) + "%";
    document.getElementById('fatigue-val').innerText = state.fatigue;
    document.getElementById('stat-str').innerText = state.str;
    document.getElementById('stat-vit').innerText = state.vit;
    document.getElementById('stat-agi').innerText = state.agi;
    document.getElementById('stat-ap').innerText = state.ap;
    document.getElementById('rep-count').innerText = state.reps;

    // Penalty Visuals
    const overlay = document.getElementById('penalty-overlay');
    overlay.style.display = state.penalty ? 'block' : 'none';
}

function addStat(s) { if(state.ap > 0) { state[s]++; state.ap--; refresh(); } }