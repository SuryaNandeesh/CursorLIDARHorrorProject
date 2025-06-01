const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Game state
const gameState = {
    player: {
        x: canvas.width / 2,
        y: canvas.height / 2,
        angle: 0,
        speed: 3,
        scanRadius: 300,
        scanAngle: Math.PI * 2,
        isScanning: false,
        scanProgress: 0,
        lastScanTime: 0,
        scanCooldown: 0,
        canScan: true
    },
    poles: [],
    walls: [],
    monster: {
        x: 100,
        y: 100,
        speed: 1.2,
        size: 20,
        isActive: false,
        spawnTimer: 0
    },
    keys: {
        w: false,
        s: false,
        a: false,
        d: false,
        space: false
    },
    lastTime: 0,
    mouseSensitivity: 0.002,
    ship: {
        x: 0,
        y: 0,
        size: 30
    },
    gameWon: false
};

// Generate environment
function generateEnvironment() {
    // Generate thick steel poles
    for (let i = 0; i < 100; i++) {
        gameState.poles.push({
            x: Math.random() * canvas.width * 2,
            y: Math.random() * canvas.height * 2,
            size: 10 + Math.random() * 10 // Thicker poles
        });
    }

    // Generate walls
    for (let i = 0; i < 20; i++) {
        const isHorizontal = Math.random() > 0.5;
        const length = 100 + Math.random() * 200;
        const x = Math.random() * canvas.width * 2;
        const y = Math.random() * canvas.height * 2;
        
        gameState.walls.push({
            x: x,
            y: y,
            width: isHorizontal ? length : 20,
            height: isHorizontal ? 20 : length
        });
    }

    // Place ship at the edge of the environment
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.min(canvas.width, canvas.height) * 1.5;
    gameState.ship.x = Math.cos(angle) * distance;
    gameState.ship.y = Math.sin(angle) * distance;
}

// Handle mouse movement
canvas.addEventListener('mousemove', (e) => {
    const movementX = e.movementX || 0;
    gameState.player.angle += movementX * gameState.mouseSensitivity;
});

// Lock pointer for better mouse control
canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

// Handle keyboard input
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() in gameState.keys) {
        gameState.keys[e.key.toLowerCase()] = true;
    }
    if (e.code === 'Space') {
        gameState.keys.space = true;
        if (!gameState.player.isScanning && gameState.player.canScan) {
            gameState.player.isScanning = true;
            gameState.player.scanProgress = 0;
            gameState.player.lastScanTime = performance.now();
            gameState.player.canScan = false;
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() in gameState.keys) {
        gameState.keys[e.key.toLowerCase()] = false;
    }
    if (e.code === 'Space') {
        gameState.keys.space = false;
    }
});

// Update player position based on input
function updatePlayer(deltaTime) {
    const moveX = (gameState.keys.d ? 1 : 0) - (gameState.keys.a ? 1 : 0);
    const moveY = (gameState.keys.s ? 1 : 0) - (gameState.keys.w ? 1 : 0);
    
    if (moveX !== 0 || moveY !== 0) {
        const angle = gameState.player.angle + Math.atan2(moveY, moveX);
        const newX = gameState.player.x + Math.cos(angle) * gameState.player.speed;
        const newY = gameState.player.y + Math.sin(angle) * gameState.player.speed;
        
        // Check collisions with walls
        let canMove = true;
        for (const wall of gameState.walls) {
            if (newX > wall.x && newX < wall.x + wall.width &&
                newY > wall.y && newY < wall.y + wall.height) {
                canMove = false;
                break;
            }
        }
        
        if (canMove) {
            gameState.player.x = newX;
            gameState.player.y = newY;
        }
        
        // Update monster spawn timer when player moves
        if (!gameState.monster.isActive) {
            gameState.monster.spawnTimer += deltaTime;
            if (gameState.monster.spawnTimer >= 60000) {
                gameState.monster.isActive = true;
                const spawnAngle = Math.random() * Math.PI * 2;
                const spawnDistance = 400;
                gameState.monster.x = gameState.player.x + Math.cos(spawnAngle) * spawnDistance;
                gameState.monster.y = gameState.player.y + Math.sin(spawnAngle) * spawnDistance;
            }
        }
    }

    // Update scan cooldown
    if (!gameState.player.canScan) {
        gameState.player.scanCooldown += deltaTime;
        if (gameState.player.scanCooldown >= 5000) { // 5 second cooldown
            gameState.player.canScan = true;
            gameState.player.scanCooldown = 0;
        }
    }

    // Check if player reached the ship
    const dx = gameState.player.x - gameState.ship.x;
    const dy = gameState.player.y - gameState.ship.y;
    const distanceToShip = Math.sqrt(dx * dx + dy * dy);
    if (distanceToShip < gameState.ship.size) {
        gameState.gameWon = true;
    }
}

// Update monster position
function updateMonster() {
    if (!gameState.monster.isActive) return;
    
    const dx = gameState.player.x - gameState.monster.x;
    const dy = gameState.player.y - gameState.monster.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        const newX = gameState.monster.x + (dx / distance) * gameState.monster.speed;
        const newY = gameState.monster.y + (dy / distance) * gameState.monster.speed;
        
        // Check wall collisions for monster
        let canMove = true;
        for (const wall of gameState.walls) {
            if (newX > wall.x && newX < wall.x + wall.width &&
                newY > wall.y && newY < wall.y + wall.height) {
                canMove = false;
                break;
            }
        }
        
        if (canMove) {
            gameState.monster.x = newX;
            gameState.monster.y = newY;
        }
    }
}

// Draw LIDAR scan
function drawLIDARScan() {
    if (!gameState.player.isScanning) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - gameState.player.lastScanTime;
    gameState.player.scanProgress += deltaTime / 1000;
    
    if (gameState.player.scanProgress >= 2) {
        gameState.player.isScanning = false;
        return;
    }
    
    const scanPoints = [];
    const numRays = 100;
    const currentAngle = (gameState.player.scanProgress / 2) * Math.PI * 2;
    
    for (let i = 0; i < numRays; i++) {
        const angle = currentAngle + (Math.PI * 2 * i / numRays);
        
        // Check for pole intersections
        for (const pole of gameState.poles) {
            const dx = pole.x - gameState.player.x;
            const dy = pole.y - gameState.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < gameState.player.scanRadius) {
                const rayAngle = Math.atan2(dy, dx);
                if (Math.abs(rayAngle - angle) < 0.1) {
                    scanPoints.push({
                        x: pole.x,
                        y: pole.y,
                        distance: distance,
                        isMonster: false,
                        isWall: false
                    });
                }
            }
        }
        
        // Check for wall intersections
        for (const wall of gameState.walls) {
            const corners = [
                {x: wall.x, y: wall.y},
                {x: wall.x + wall.width, y: wall.y},
                {x: wall.x + wall.width, y: wall.y + wall.height},
                {x: wall.x, y: wall.y + wall.height}
            ];
            
            for (const corner of corners) {
                const dx = corner.x - gameState.player.x;
                const dy = corner.y - gameState.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < gameState.player.scanRadius) {
                    const rayAngle = Math.atan2(dy, dx);
                    if (Math.abs(rayAngle - angle) < 0.1) {
                        scanPoints.push({
                            x: corner.x,
                            y: corner.y,
                            distance: distance,
                            isMonster: false,
                            isWall: true
                        });
                    }
                }
            }
        }
        
        // Check for monster intersection
        if (gameState.monster.isActive) {
            const dx = gameState.monster.x - gameState.player.x;
            const dy = gameState.monster.y - gameState.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < gameState.player.scanRadius) {
                const rayAngle = Math.atan2(dy, dx);
                if (Math.abs(rayAngle - angle) < 0.1) {
                    scanPoints.push({
                        x: gameState.monster.x,
                        y: gameState.monster.y,
                        distance: distance,
                        isMonster: true,
                        isWall: false
                    });
                }
            }
        }

        // Check for ship intersection
        const dx = gameState.ship.x - gameState.player.x;
        const dy = gameState.ship.y - gameState.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < gameState.player.scanRadius) {
            const rayAngle = Math.atan2(dy, dx);
            if (Math.abs(rayAngle - angle) < 0.1) {
                scanPoints.push({
                    x: gameState.ship.x,
                    y: gameState.ship.y,
                    distance: distance,
                    isMonster: false,
                    isWall: false,
                    isShip: true
                });
            }
        }
    }
    
    // Draw scan lines
    for (const point of scanPoints) {
        ctx.beginPath();
        ctx.moveTo(gameState.player.x, gameState.player.y);
        ctx.lineTo(point.x, point.y);
        
        if (point.isMonster) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        } else if (point.isWall) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        } else if (point.isShip) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
        } else {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        }
        
        ctx.stroke();
    }
}

// Draw first-person view
function drawFirstPersonView() {
    // Draw black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw LIDAR scan
    drawLIDARScan();
    
    // Draw crosshair
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 10, canvas.height / 2);
    ctx.lineTo(canvas.width / 2 + 10, canvas.height / 2);
    ctx.moveTo(canvas.width / 2, canvas.height / 2 - 10);
    ctx.lineTo(canvas.width / 2, canvas.height / 2 + 10);
    ctx.stroke();
    
    // Draw scan progress indicator
    if (gameState.player.isScanning) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 
                50 + (gameState.player.scanProgress / 2) * 100, 
                0, Math.PI * 2);
        ctx.fill();
    }

    // Draw scan cooldown indicator
    if (!gameState.player.canScan) {
        const cooldownProgress = gameState.player.scanCooldown / 5000;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(10, canvas.height - 20, 200 * cooldownProgress, 10);
    }

    // Draw game won message
    if (gameState.gameWon) {
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ESCAPE SUCCESSFUL!', canvas.width / 2, canvas.height / 2);
    }
}

// Main game loop
function gameLoop(timestamp) {
    const deltaTime = timestamp - (gameState.lastTime || timestamp);
    gameState.lastTime = timestamp;
    
    // Update game state
    updatePlayer(deltaTime);
    updateMonster();
    
    // Draw first-person view
    drawFirstPersonView();
    
    requestAnimationFrame(gameLoop);
}

// Initialize game
generateEnvironment();
requestAnimationFrame(gameLoop); 