const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height, waterLine;
let fishes = [];
let trashes = [];
let particles = [];
let bubbles = [];
let isGameOver = false;
let frames = 0;

let scoreInfo = {
    trashRemoved: 0,
    fishDied: 0,
    maxFishDied: 5
};

const trashScoreEl = document.getElementById('trashScore');
const fishDeathScoreEl = document.getElementById('fishDeathScore');
const gameOverScreen = document.getElementById('gameOver');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverMessage = document.getElementById('gameOverMessage');
const restartBtn = document.getElementById('restartBtn');

// Mouse control
const mouse = { x: 0, y: 0, isDown: false, draggedTrash: null };

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    waterLine = height * 0.2; 
}
window.addEventListener('resize', resize);
resize();

// Input Listeners
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    mouse.x = clickX;
    mouse.y = clickY;
    mouse.isDown = true;

    // 1. Check if clicked on a trapped turtle to save it
    for (let f of fishes) {
        if (f.type === 'turtle' && f.isTrapped) {
            const dist = Math.hypot(clickX - f.x, clickY - f.y);
            if (dist < f.size * 2) {
                f.saveClick();
                createParticles(f.x, f.y, '#FFF');
                return; 
            }
        }
    }

    // 2. Click to Remove Trash (Instant Removal with generous hitbox)
    for (let i = trashes.length - 1; i >= 0; i--) {
        const t = trashes[i];
        const dist = Math.hypot(clickX - t.x, clickY - t.y);
        if (dist <= t.radius + 15) { // Increased hit area for easier clicking
            scoreInfo.trashRemoved++;
            trashScoreEl.textContent = scoreInfo.trashRemoved;
            createParticles(t.x, t.y, '#4CAF50');
            trashes.splice(i, 1); 
            return;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

canvas.addEventListener('mouseup', () => {
    mouse.isDown = false;
});

// Base Animal Class
class Animal {
    constructor() {
        this.init();
    }

    init() {
        this.x = Math.random() > 0.5 ? -100 : width + 100;
        this.y = waterLine + 100 + Math.random() * (height - waterLine - 200);
        this.isDead = false;
        this.isTrapped = false;
        this.deathTimer = 0;
    }

    die() {
        if(this.isDead) return;
        this.isDead = true;
        this.vx = 0;
        createParticles(this.x, this.y, '#f44336');
        scoreInfo.fishDied++;
        fishDeathScoreEl.textContent = scoreInfo.fishDied;
        if (scoreInfo.fishDied >= scoreInfo.maxFishDied) endGame();
    }

    checkCollision() {
        for (let t of trashes) {
            if (!t.isDragged) {
                const dist = Math.hypot(this.x - t.x, this.y - t.y);
                if (dist < this.size + t.radius) {
                    this.onEatTrash(t);
                    break;
                }
            }
        }
    }

    onEatTrash(trash) {
        const idx = trashes.indexOf(trash);
        if(idx !== -1) trashes.splice(idx, 1);
        this.die();
    }
}

class Fish extends Animal {
    constructor(fast = false) {
        super();
        this.type = 'fish';
        this.fast = fast;
        this.size = fast ? 12 : 20 + Math.random() * 10;
        this.color = fast ? '#FFD700' : `hsl(${Math.random() * 360}, 80%, 60%)`;
        this.vx = (Math.random() * (fast ? 5 : 2) + (fast ? 3 : 1)) * (this.x < 0 ? 1 : -1);
        this.vy = (Math.random() - 0.5) * 1;
    }

    update() {
        if (this.isDead) {
            this.y -= 2;
            if (this.y < waterLine) this.init();
            return;
        }
        this.x += this.vx;
        this.y += this.vy;
        if (this.y < waterLine + this.size || this.y > height - this.size) this.vy *= -1;
        if (this.x < -200 || this.x > width + 200) this.init();
        this.checkCollision();
        if (Math.random() < 0.02) bubbles.push(new Bubble(this.x, this.y));
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.vx < 0) ctx.scale(-1, 1);
        if (this.isDead) ctx.scale(1, -1);
        ctx.fillStyle = this.isDead ? '#999' : this.color;
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.8, 0);
        ctx.lineTo(-this.size * 1.5, -this.size * 0.5);
        ctx.lineTo(-this.size * 1.5, this.size * 0.5);
        ctx.fill();
        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.size * 0.5, -this.size * 0.2, this.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.size * 0.5, -this.size * 0.2, this.size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Turtle extends Animal {
    constructor() {
        super();
        this.type = 'turtle';
        this.size = 35;
        this.vx = (Math.random() * 0.5 + 0.5) * (this.x < 0 ? 1 : -1);
        this.vy = 0;
        this.clicksToSave = 0;
    }

    onEatTrash(trash) {
        const idx = trashes.indexOf(trash);
        if(idx !== -1) trashes.splice(idx, 1);
        this.isTrapped = true;
        this.clicksToSave = 5;
    }

    saveClick() {
        this.clicksToSave--;
        if (this.clicksToSave <= 0) {
            this.isTrapped = false;
        }
    }

    update() {
        if (this.isTrapped) {
            this.y += Math.sin(frames * 0.1) * 0.5; // Slight struggle
            return;
        }
        if (this.isDead) { // Should not die instantly anymore, but just in case
            this.y -= 1;
            if (this.y < waterLine) this.init();
            return;
        }
        this.x += this.vx;
        if (this.x < -200 || this.x > width + 200) this.init();
        this.checkCollision();
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.vx < 0) ctx.scale(-1, 1);
        
        ctx.fillStyle = '#458B00'; // Dark green
        // Shell
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2E5900';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Head
        ctx.fillStyle = '#66BB66';
        ctx.beginPath();
        ctx.arc(this.size * 0.9, -this.size * 0.1, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Flippers
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.5, this.size * 0.5, this.size * 0.4, this.size * 0.2, Math.PI/4, 0, Math.PI * 2);
        ctx.ellipse(this.size * 0.5, this.size * 0.5, this.size * 0.4, this.size * 0.2, -Math.PI/4, 0, Math.PI * 2);
        ctx.fill();

        if (this.isTrapped) {
            ctx.strokeStyle = 'red';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 10, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText(`HELP! (${this.clicksToSave})`, -30, -this.size - 10);
        }

        ctx.restore();
    }
}

class Jellyfish extends Animal {
    constructor() {
        super();
        this.type = 'jellyfish';
        this.size = 25;
        this.pulse = 0;
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
    }

    update() {
        this.pulse += 0.05;
        const movement = Math.sin(this.pulse) * 2;
        this.y += this.vy + (movement > 0 ? movement : 0);
        this.x += this.vx;
        
        if (this.y < waterLine + 50 || this.y > height - 50) this.vy *= -1;
        if (this.x < 50 || this.x > width - 50) this.vx *= -1;
        
        this.checkCollision();
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255, 100, 255, 0.8)';
        ctx.fillStyle = 'rgba(255, 180, 255, 0.6)';
        
        // Bell
        ctx.beginPath();
        ctx.arc(0, 0, this.size, Math.PI, 0);
        ctx.fill();

        // Tentacles
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 180, 255, 0.4)';
        for(let i=-2; i<=2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 6, 0);
            ctx.bezierCurveTo(i * 6, 20, Math.sin(this.pulse + i) * 10 + i * 6, 30, Math.sin(this.pulse + i) * 10 + i * 6, 40);
            ctx.stroke();
        }
        ctx.restore();
    }
}

class Trash {
    constructor() {
        this.radius = 20;
        this.x = Math.random() * (width - 40) + 20;
        this.y = -50;
        this.vy = Math.random() * 1 + 0.5;
        this.isDragged = false;
        const types = ['#8D6E63', '#90A4AE', '#FFF59D', '#E57373'];
        this.color = types[Math.floor(Math.random() * types.length)];
        this.type = Math.floor(Math.random() * 3);
    }
    update() {
        if (!this.isDragged) {
            this.y += this.vy;
            if (this.y > waterLine) {
                this.x += Math.sin(this.y * 0.05) * 0.5;
                this.vy *= 0.99;
                if(this.vy < 0.5) this.vy = 0.5;
            }
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.isDragged) ctx.scale(1.2, 1.2);
        ctx.fillStyle = this.color;
        if (this.type === 0) { ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill(); }
        else if (this.type === 1) { ctx.fillRect(-this.radius, -this.radius*1.2, this.radius*2, this.radius*2.4); }
        else { ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(10, -18); ctx.lineTo(18, 5); ctx.lineTo(5, 18); ctx.lineTo(-18, 10); ctx.closePath(); ctx.fill(); }
        if (this.isDragged) { ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke(); }
        ctx.restore();
    }
}

class Bubble {
    constructor(x, y) { this.x = x; this.y = y; this.size = Math.random() * 5 + 2; this.vy = - (Math.random() * 2 + 1); }
    update() { this.y += this.vy; this.x += Math.sin(this.y * 0.1) * 1; }
    draw() { ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.stroke(); }
}

class Particle {
    constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.vx = (Math.random() - 0.5) * 10; this.vy = (Math.random() - 0.5) * 10; this.life = 1.0; this.decay = Math.random() * 0.05 + 0.02; }
    update() { this.x += this.vx; this.y += this.vy; this.life -= this.decay; }
    draw() { ctx.fillStyle = this.color; ctx.globalAlpha = Math.max(0, this.life); ctx.beginPath(); ctx.arc(this.x, this.y, 4, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0; }
}

function createParticles(x, y, color) { for(let i=0; i<15; i++) particles.push(new Particle(x, y, color)); }

function spawnLogic() {
    frames++;
    
    // DIFFICULTY SCALING: Increase spawn frequency over time
    // Starts at 1 spawn every 120 frames (~2s), decreases to every 30 frames (~0.5s)
    let currentSpawnRate = Math.max(30, 120 - Math.floor(frames / 600) * 15);
    
    if (frames % currentSpawnRate === 0 && trashes.length < 40) {
        trashes.push(new Trash());
    }
    
    // Low level spawner for variety
    if (frames % 300 === 0) {
        const rand = Math.random();
        if (rand < 0.4) fishes.push(new Fish(true)); // Fast fish
        else if (rand < 0.7) fishes.push(new Turtle());
        else fishes.push(new Jellyfish());
    }
}

function initGame() {
    scoreInfo.trashRemoved = 0; scoreInfo.fishDied = 0;
    trashScoreEl.textContent = '0'; fishDeathScoreEl.textContent = '0';
    fishes = []; trashes = []; particles = []; bubbles = [];
    isGameOver = false; frames = 0;
    gameOverScreen.classList.add('hidden');
    for(let i=0; i<6; i++) {
        const f = new Fish(); f.x = Math.random() * width; fishes.push(f);
    }
}

function drawBackground() {
    // Dynamic Water Color based on pollution (fish deaths)
    const pollution = scoreInfo.fishDied / scoreInfo.maxFishDied;
    
    // Sky
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, width, waterLine);

    // Water Gradient with Pollution
    let waterGradient = ctx.createLinearGradient(0, waterLine, 0, height);
    
    // Interpolate colors: clean blue to murky greenish/brown
    const r = Math.floor(0 * (1-pollution) + 40 * pollution);
    const g = Math.floor(105 * (1-pollution) + 60 * pollution);
    const b = Math.floor(148 * (1-pollution) + 20 * pollution);
    
    waterGradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
    waterGradient.addColorStop(1, '#001A33');
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, waterLine, width, height - waterLine);
    
    // Surface Wave
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, waterLine);
    for(let i=0; i<width; i+=20) ctx.lineTo(i, waterLine + Math.sin(frames * 0.05 + i * 0.02) * 5);
    ctx.stroke();
}

function endGame() {
    isGameOver = true;
    gameOverScreen.classList.remove('hidden');
    gameOverMessage.textContent = `Você removeu ${scoreInfo.trashRemoved} lixos. O oceano agradece seu esforço!`;
}

restartBtn.addEventListener('click', initGame);

function gameLoop() {
    if (!isGameOver) {
        spawnLogic();
        fishes.forEach(f => f.update());
        trashes.forEach(t => t.update());
        bubbles.forEach((b, i) => { b.update(); if(b.y < waterLine) bubbles.splice(i, 1); });
        particles.forEach((p, i) => { p.update(); if(p.life <= 0) particles.splice(i, 1); });
        for(let i = trashes.length - 1; i >= 0; i--) if (trashes[i].y > height + 50) trashes.splice(i, 1);
    }

    drawBackground();
    bubbles.forEach(b => b.draw());
    let dragged = null;
    trashes.forEach(t => { if(t.isDragged) dragged = t; else t.draw(); });
    fishes.forEach(f => f.draw());
    particles.forEach(p => p.draw());
    if(dragged) dragged.draw();
    requestAnimationFrame(gameLoop);
}

initGame();
gameLoop();
