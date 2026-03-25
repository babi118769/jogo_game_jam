const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height, waterLine;
let fishes = [];
let trashes = [];
let particles = [];
let bubbles = [];
let isGameOver = false;

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
    waterLine = height * 0.2; // Top 20% is air
}
window.addEventListener('resize', resize);
resize();

// Input Listeners
canvas.addEventListener('mousedown', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.isDown = true;

    // Check if clicked on trash
    // Reverse loop to pick top-most item
    for (let i = trashes.length - 1; i >= 0; i--) {
        const t = trashes[i];
        const dist = Math.hypot(mouse.x - t.x, mouse.y - t.y);
        if (dist <= t.radius) {
            t.isDragged = true;
            mouse.draggedTrash = t;
            break;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (mouse.isDown && mouse.draggedTrash) {
        mouse.draggedTrash.x = mouse.x;
        mouse.draggedTrash.y = mouse.y;
    }
});

canvas.addEventListener('mouseup', () => {
    mouse.isDown = false;
    if (mouse.draggedTrash) {
        // Did we release it above water?
        if (mouse.draggedTrash.y < waterLine) {
            // Trash removed!
            scoreInfo.trashRemoved++;
            trashScoreEl.textContent = scoreInfo.trashRemoved;
            createParticles(mouse.draggedTrash.x, mouse.draggedTrash.y, '#4CAF50');
            // Remove trash from array
            const idx = trashes.indexOf(mouse.draggedTrash);
            if(idx !== -1) trashes.splice(idx, 1);
        } else {
            // Dropped back in water
            mouse.draggedTrash.isDragged = false;
        }
        mouse.draggedTrash = null;
    }
});

// Classes
class Fish {
    constructor() {
        this.reset();
        this.y = waterLine + Math.random() * (height - waterLine - 50);
        this.isDead = false;
        this.size = 20 + Math.random() * 10;
        this.color = `hsl(${Math.random() * 360}, 80%, 60%)`;
    }

    reset() {
        this.x = Math.random() > 0.5 ? -100 : width + 100;
        this.y = waterLine + 50 + Math.random() * (height - waterLine - 100);
        this.vx = (Math.random() * 2 + 1) * (this.x < 0 ? 1 : -1);
        this.vy = (Math.random() - 0.5) * 1;
        this.isDead = false;
        this.deathTimer = 0;
    }

    update() {
        if (this.isDead) {
            this.vy = -2; // Float to top
            this.y += this.vy;
            this.deathTimer++;
            if (this.y < waterLine + 20 && this.deathTimer > 100) {
                 this.reset(); // Respawn as new fish after floating a bit
            }
            return;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Bounce off top/bottom of water
        if (this.y < waterLine + this.size) this.vy = Math.abs(this.vy);
        if (this.y > height - this.size) this.vy = -Math.abs(this.vy);

        // Reset if goes too far off screen
        if (this.x < -200 || this.x > width + 200) {
            this.reset();
        }

        // Collision with trash
        for (let t of trashes) {
            if (!t.isDragged) {
                const dist = Math.hypot(this.x - t.x, this.y - t.y);
                if (dist < this.size + t.radius) {
                    this.die();
                    // Consume trash
                    const idx = trashes.indexOf(t);
                    if(idx !== -1) trashes.splice(idx, 1);
                    break;
                }
            }
        }
        
        // Randomly spawn bubbles
        if (Math.random() < 0.02) {
            bubbles.push(new Bubble(this.x + (this.vx > 0 ? this.size : -this.size), this.y));
        }
    }

    die() {
        if(this.isDead) return;
        this.isDead = true;
        this.vx = 0;
        createParticles(this.x, this.y, '#f44336'); // Red particles
        scoreInfo.fishDied++;
        fishDeathScoreEl.textContent = scoreInfo.fishDied;
        if (scoreInfo.fishDied >= scoreInfo.maxFishDied) {
            endGame();
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Flip fish based on direction
        if (this.vx < 0 && !this.isDead) ctx.scale(-1, 1);
        if (this.isDead) {
            ctx.scale(1, -1); // Upside down
        }

        // Draw body
        ctx.fillStyle = this.isDead ? '#999' : this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw tail
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.8, 0);
        ctx.lineTo(-this.size * 1.5, -this.size * 0.5);
        ctx.lineTo(-this.size * 1.5, this.size * 0.5);
        ctx.closePath();
        ctx.fill();

        // Draw eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.size * 0.5, -this.size * 0.2, this.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = this.isDead ? 'black' : 'black';
        ctx.beginPath();
        ctx.arc(this.size * 0.5, -this.size * 0.2, this.size * 0.1, 0, Math.PI * 2);
        ctx.fill();

        if (this.isDead) {
            // X for eye
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.size * 0.4, -this.size * 0.3);
            ctx.lineTo(this.size * 0.6, -this.size * 0.1);
            ctx.moveTo(this.size * 0.6, -this.size * 0.3);
            ctx.lineTo(this.size * 0.4, -this.size * 0.1);
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
        this.vy = Math.random() * 1 + 0.5; // fall speed
        this.isDragged = false;
        
        // Trash types (colors/shapes representation)
        // Brown bag, grey wrapper, yellowish plastic, red cup
        const types = ['#8D6E63', '#90A4AE', '#FFF59D', '#E57373'];
        this.color = types[Math.floor(Math.random() * types.length)];
        this.type = Math.floor(Math.random() * 3); // 0=circle, 1=rect, 2=crumpled
    }

    update() {
        if (!this.isDragged) {
            this.y += this.vy;
            // Wiggle slightly in water
            if (this.y > waterLine) {
                this.x += Math.sin(this.y * 0.05) * 0.5;
                this.vy *= 0.99; // slow down in water
                if(this.vy < 0.5) this.vy = 0.5;
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.isDragged) {
            ctx.scale(1.2, 1.2); // pop slightly when grabbed
        }
        
        ctx.fillStyle = this.color;
        if (this.type === 0) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 1) {
            ctx.fillRect(-this.radius, -this.radius*1.2, this.radius*2, this.radius*2.4);
        } else {
            // crumpled shape
            ctx.beginPath();
            ctx.moveTo(-15, -15);
            ctx.lineTo(10, -18);
            ctx.lineTo(18, 5);
            ctx.lineTo(5, 18);
            ctx.lineTo(-18, 10);
            ctx.closePath();
            ctx.fill();
        }
        
        // Highlight logic
        if (this.isDragged) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();
    }
}

class Bubble {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.vy = - (Math.random() * 2 + 1);
    }
    update() {
        this.y += this.vy;
        this.x += Math.sin(this.y * 0.1) * 1;
    }
    draw() {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.stroke();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function createParticles(x, y, color) {
    for(let i=0; i<15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// Spawners
let frames = 0;
function spawnLogic() {
    frames++;
    if (frames % 120 === 0 && trashes.length < 15) { // Spawn trash every 2 sec
        trashes.push(new Trash());
    }
}

function initGame() {
    scoreInfo.trashRemoved = 0;
    scoreInfo.fishDied = 0;
    trashScoreEl.textContent = '0';
    fishDeathScoreEl.textContent = '0';
    fishes = [];
    trashes = [];
    particles = [];
    bubbles = [];
    isGameOver = false;
    gameOverScreen.classList.add('hidden');
    
    // Spawn initial fishes
    for(let i=0; i<8; i++) {
        fishes.push(new Fish());
        // Randomize initial positions more for start
        fishes[i].x = Math.random() * width;
    }
}

function drawBackground() {
    // Sky
    let skyGradient = ctx.createLinearGradient(0, 0, 0, waterLine);
    skyGradient.addColorStop(0, '#87CEEB'); // Light blue
    skyGradient.addColorStop(1, '#E0F6FF'); // Paler blue
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, waterLine);

    // Water
    let waterGradient = ctx.createLinearGradient(0, waterLine, 0, height);
    waterGradient.addColorStop(0, '#006994'); // Deep ocean blue
    waterGradient.addColorStop(1, '#001A33'); // Darker bottom
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, waterLine, width, height - waterLine);
    
    // Water surface line
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, waterLine);
    for(let i=0; i<width; i+=20) {
        ctx.lineTo(i, waterLine + Math.sin(frames * 0.05 + i * 0.02) * 5);
    }
    ctx.stroke();
}

function endGame() {
    isGameOver = true;
    gameOverScreen.classList.remove('hidden');
    gameOverMessage.textContent = `Você removeu ${scoreInfo.trashRemoved} lixos, mas 5 peixes morreram. O oceano precisa de mais ajuda!`;
}

restartBtn.addEventListener('click', initGame);

function gameLoop() {
    if (!isGameOver) {
        // Update
        spawnLogic();
        fishes.forEach(f => f.update());
        trashes.forEach(t => t.update());
        
        bubbles.forEach((b, i) => {
            b.update();
            if(b.y < waterLine) bubbles.splice(i, 1);
        });
        
        particles.forEach((p, i) => {
            p.update();
            if(p.life <= 0) particles.splice(i, 1);
        });
        
        // Remove offscreen trashes
        for(let i = trashes.length - 1; i >= 0; i--) {
            if (trashes[i].y > height + 50) {
                trashes.splice(i, 1); 
            }
        }
    }

    // Draw
    drawBackground();
    
    bubbles.forEach(b => b.draw());
    
    let dragged = null;
    trashes.forEach(t => {
        if(t.isDragged) dragged = t;
        else t.draw();
    });
    
    fishes.forEach(f => f.draw());
    particles.forEach(p => p.draw());
    
    if(dragged) dragged.draw();

    requestAnimationFrame(gameLoop);
}

// Start
initGame();
gameLoop();
