if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('System Protocol: Initialized'))
      .catch(err => console.log('System Protocol: Failed', err));
  });
}
const now = new Date();
const today = now.toDateString(); 
const dayOfWeek = now.getDay(); 

let state = JSON.parse(localStorage.getItem('sys_monarch_v1')) || {
    level: 1, xp: 0, rank: "E", lastDoneDate: ""
};

// THE 3-DAY SPLIT ROTATION
const splitSchedule = {
    1: { name: "PUSH-UPS", type: "push" }, // Mon
    2: { name: "SIT-UPS", type: "core" },  // Tue
    3: { name: "SQUATS", type: "legs" },   // Wed
    4: { name: "PUSH-UPS", type: "push" }, // Thu
    5: { name: "SIT-UPS", type: "core" },  // Fri
    6: { name: "SQUATS", type: "legs" },   // Sat
    0: null                                // Sun
};

const rankConfig = {
    "E": { reps: 10, sets: 2 },
    "D": { reps: 15, sets: 3 },
    "C": { reps: 20, sets: 4 }, // SET CAP REACHED
    "B": { reps: 30, sets: 4 },
    "A": { reps: 40, sets: 4 },
    "S": { reps: 50, sets: 4 },
    "SS": { reps: 75, sets: 4 },
    "SSS": { reps: 100, sets: 4 }
};

let curSet = 1;
let curReps = 0;
let stage = "up";
let isResting = false;

window.onload = () => {
    // 1. Sunday Check
    if (dayOfWeek === 0) {
        document.getElementById('sunday-screen').style.display = 'flex';
        document.getElementById('init-screen').style.display = 'none';
        return;
    }

    // 2. Load Task Name
    const taskName = splitSchedule[dayOfWeek].name;
    document.getElementById('day-task-label').innerText = taskName;
    document.getElementById('rank-display').innerText = state.rank + "-RANK";

    // 3. 24-Hour Lockout Check
    if (state.lastDoneDate === today) {
        const btn = document.getElementById('accept-btn');
        btn.innerText = "LOCKED: COMPLETED";
        btn.disabled = true;
    }
};

function startQuest() {
    document.getElementById('sfx-quest').play();
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    updateHUD();
    setupAI();
}

async function setupAI() {
    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
    pose.setOptions({ modelComplexity: 0, minDetectionConfidence: 0.7 });
    pose.onResults(onPose);
    const camera = new Camera(document.getElementById('webcam'), {
        onFrame: async () => { await pose.send({image: document.getElementById('webcam')}); },
        width: 640, height: 480
    });
    camera.start();
}

function onPose(results) {
    if (!results.poseLandmarks || isResting) return;
    const p = results.poseLandmarks;
    const taskType = splitSchedule[dayOfWeek].type;

    if (taskType === "push") {
        let sY = (p[11].y + p[12].y) / 2;
        let eY = (p[13].y + p[14].y) / 2;
        if (eY < sY - 0.05) stage = "down";
        if (eY > sY + 0.05 && stage === "down") { stage = "up"; countRep(); }
    } 
    else if (taskType === "core") {
        let shY = p[11].y; let hY = p[23].y;
        if (shY > hY + 0.05) stage = "down";
        if (shY < hY - 0.1 && stage === "down") { stage = "up"; countRep(); }
    } 
    else if (taskType === "legs") {
        let hY = (p[23].y + p[24].y) / 2; let kY = (p[25].y + p[26].y) / 2;
        if (hY > kY - 0.1) stage = "down";
        if (hY < kY - 0.2 && stage === "down") { stage = "up"; countRep(); }
    }
}

function countRep() {
    curReps++;
    document.getElementById('c-reps').innerText = curReps;
    document.getElementById('sfx-ping').play();
    if (window.navigator.vibrate) window.navigator.vibrate([40, 30, 40]);

    const target = rankConfig[state.rank];
    if (curReps >= target.reps) {
        if (curSet < target.sets) {
            startRest();
        } else {
            finishQuest();
        }
    }
}

function startRest() {
    isResting = true;
    document.getElementById('rest-screen').style.display = 'flex';
    let time = 60;
    const timer = setInterval(() => {
        time--;
        document.getElementById('rest-timer').innerText = time;
        if (time <= 0) {
            clearInterval(timer);
            isResting = false;
            curSet++; curReps = 0;
            document.getElementById('rest-screen').style.display = 'none';
            updateHUD();
        }
    }, 1000);
}

function finishQuest() {
    state.lastDoneDate = today;
    state.xp += 100;
    
    // Level Up (Every 200-300 XP)
    let xpNeeded = 200 + (state.level * 20);
    if (state.xp >= xpNeeded) {
        state.level++;
        state.xp = 0;
        
        // Check for Rank Evolution (Level 15 = D-Rank)
        const ranks = ["E", "D", "C", "B", "A", "S", "SS", "SSS"];
        let newRank = ranks[Math.min(Math.floor(state.level / 15), 7)];
        
        if (newRank !== state.rank) {
            triggerRankUp(newRank);
        }
        state.rank = newRank;
    }
    
    localStorage.setItem('sys_monarch_v1', JSON.stringify(state));
    setTimeout(() => { location.reload(); }, 2000);
}

function triggerRankUp(r) {
    const ov = document.getElementById('levelup-overlay');
    document.getElementById('new-rank').innerText = r;
    ov.style.display = 'flex';
}

function updateHUD() {
    const config = rankConfig[state.rank];
    document.getElementById('active-task-hud').innerText = splitSchedule[dayOfWeek].name;
    document.getElementById('cur-set').innerText = curSet;
    document.getElementById('total-sets').innerText = config.sets;
    document.getElementById('c-reps').innerText = curReps;
    document.getElementById('g-reps').innerText = config.reps;
}