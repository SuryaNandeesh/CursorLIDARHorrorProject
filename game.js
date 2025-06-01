// Three.js setup
console.log('Initializing Three.js...');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Post-processing setup
const composer = new THREE.EffectComposer(renderer);
const renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);

// Camera shader setup
const cameraShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: document.getElementById('cameraShader').textContent
};

const cameraPass = new THREE.ShaderPass(cameraShader);
composer.addPass(cameraPass);

// Game state
const gameState = {
    player: {
        position: new THREE.Vector3(0, 1.6, 0), // Eye level
        rotation: new THREE.Euler(0, 0, 0),
        speed: 0.05, // Reduced from 0.1
        scanRadius: 30,
        scanAngle: Math.PI / 3,
        isScanning: false,
        scanProgress: 0,
        lastScanTime: 0,
        scanCooldown: 0,
        scanCooldownTime: 2000, // Reduced from 5000 to 2000 (2 seconds)
        canScan: true,
        scanWaveHeight: 0,
        scanWaveSpeed: 2,
        scanHeight: 1.6,
        scanHeightRange: 4.0,
        fieldOfView: Math.PI / 3,
        scanConeAngle: Math.PI / 4,
        collisionRadius: 0.5, // Added collision radius for player
        scannerModel: null, // Added for scanner model
        laserLines: [], // Added for laser lines
        scanBeams: [], // Added for tracking active scan beams
        scanSweepProgress: 0, // Added for tracking sweep progress
        scanBeamCount: 12, // Reduced from 16 for less frequent scanning
        scanBeamWidth: 0.02,
        scanBeamLength: 100, // Increased from 50
        scanBeamSpeed: 0.2, // Slowed down from 0.3
        scanBeamNoise: 0.02,
        maxScanDistance: 80, // Increased from 40
        minScanDistance: 5,
        hasSeenShip: false,
        cooldownBar: null,
        verticalScanRange: Math.PI / 2,
        horizontalScanRange: Math.PI, // Full horizontal sweep
        scanPointDensity: {
            base: 1.0, // Base density at minimum distance
            falloff: 0.8, // How quickly density falls off with distance
            minDensity: 0.05 // Minimum density at max distance
        },
        lidarIndicator: null, // Added for LIDAR indicator
    },
    poles: [],
    walls: [],
    monster: {
        position: new THREE.Vector3(10, 1, 10),
        speed: 0.02,
        size: 1,
        isActive: true,
        spawnTimer: 0,
        collisionRadius: 1.0,
        stalkingDistance: 15,
        attackDistance: 2,
        isAttacking: false,
        attackSpeed: 0.05,
        mesh: null,
        debugMode: false,
        isVisible: false,
        // AI properties
        targetPosition: null,
        pathUpdateTimer: 0,
        pathUpdateInterval: 1000, // Update path every second
        waypoints: [],
        currentWaypointIndex: 0,
        searchRadius: 30, // How far to look for path points
        pathPointDistance: 5, // Distance between path points
        lastKnownPlayerPosition: null,
        hasBeenScanned: false,
        hasBeenScannedTwice: false,
        isRunningAway: false,
        runAwaySpeed: 0.04,
        runAwayDistance: 30,
        runAwayTimer: 0,
        runAwayDuration: 5000,
    },
    keys: {
        w: false,
        s: false,
        a: false,
        d: false,
        space: false,
        p: false
    },
    lastTime: 0,
    mouseSensitivity: 0.002,
    ship: {
        position: new THREE.Vector3(0, 0, 0),
        size: 3
    },
    gameWon: false,
    scanHistory: [],
    scanDecayTime: 10000,
    maxScanOpacity: 0.3,
    minScanOpacity: 0.05,
    isPaused: false,
    isGameStarted: false,
    gameOver: false,
    debugMode: {
        showWalls: false,
        showPoles: false,
        showShip: false
    }
};

// Create materials
const poleMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x808080,
    transparent: true,
    opacity: 0.1,
    visible: false // Start invisible
});
const wallMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x404040,
    transparent: true,
    opacity: 0.1,
    visible: false // Start invisible
});
const shipMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.9,
    visible: false // Start invisible
});
const monsterMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
const groundMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x101010,
    transparent: true,
    opacity: 0.2
});

// Create LIDAR line material
const lidarMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.3
});

// Add spawn validation function
function findSafeSpawnPosition() {
    const maxAttempts = 50;
    const spawnRadius = 20; // Keep spawn relatively close to center
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate random position within spawn radius
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * spawnRadius;
        const testPosition = new THREE.Vector3(
            Math.cos(angle) * distance,
            1.6, // Eye level
            Math.sin(angle) * distance
        );
        
        // Check if position is safe
        let isSafe = true;
        
        // Check wall collisions
        for (const wall of gameState.walls) {
            const wallPos = wall.position;
            const wallSize = new THREE.Vector3(5, 3, 0.5);
            const wallRotation = wall.rotation.y;
            
            const localX = testPosition.x - wallPos.x;
            const localZ = testPosition.z - wallPos.z;
            
            const rotatedX = localX * Math.cos(-wallRotation) - localZ * Math.sin(-wallRotation);
            const rotatedZ = localX * Math.sin(-wallRotation) + localZ * Math.cos(-wallRotation);
            
            if (Math.abs(rotatedX) < wallSize.x/2 + gameState.player.collisionRadius * 2 && 
                Math.abs(rotatedZ) < wallSize.z/2 + gameState.player.collisionRadius * 2) {
                isSafe = false;
                break;
            }
        }
        
        // Check pole collisions
        if (isSafe) {
            for (const pole of gameState.poles) {
                const polePos = pole.position;
                const poleRadius = 0.2 + gameState.player.collisionRadius * 2;
                const dx = testPosition.x - polePos.x;
                const dz = testPosition.z - polePos.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < poleRadius) {
                    isSafe = false;
                    break;
                }
            }
        }
        
        // If position is safe, return it
        if (isSafe) {
            return testPosition;
        }
    }
    
    // If no safe position found, return a default position
    console.warn('No safe spawn position found, using default position');
    return new THREE.Vector3(0, 1.6, 0);
}

// Update generateEnvironment function
function generateEnvironment() {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x202020);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.name = 'ground'; // Add name for LIDAR scanning
    scene.add(ground);

    // Generate walls first
    for (let i = 0; i < 20; i++) {
        const width = 5 + Math.random() * 10;
        const height = 3;
        const depth = 0.5;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const wall = new THREE.Mesh(geometry, wallMaterial);
        
        wall.position.x = (Math.random() - 0.5) * 100;
        wall.position.z = (Math.random() - 0.5) * 100;
        wall.position.y = height / 2;
        wall.rotation.y = Math.random() * Math.PI;
        
        scene.add(wall);
        gameState.walls.push(wall);
    }

    // Generate poles
    for (let i = 0; i < 100; i++) {
        const height = 5 + Math.random() * 5;
        const geometry = new THREE.CylinderGeometry(0.2, 0.2, height);
        const pole = new THREE.Mesh(geometry, poleMaterial);
        
        pole.position.x = (Math.random() - 0.5) * 100;
        pole.position.z = (Math.random() - 0.5) * 100;
        pole.position.y = height / 2;
        
        scene.add(pole);
        gameState.poles.push(pole);
    }

    // Find safe spawn position and set player position
    const safeSpawnPosition = findSafeSpawnPosition();
    gameState.player.position.copy(safeSpawnPosition);
    camera.position.copy(safeSpawnPosition);

    // Create ship with enhanced design
    const shipGroup = new THREE.Group();
    
    // Main body
    const bodyGeometry = new THREE.CylinderGeometry(1, 1.5, 4, 8);
    const body = new THREE.Mesh(bodyGeometry, shipMaterial);
    body.rotation.x = Math.PI / 2;
    shipGroup.add(body);
    
    // Wings
    const wingGeometry = new THREE.BoxGeometry(6, 0.2, 1.5);
    const wing = new THREE.Mesh(wingGeometry, shipMaterial);
    wing.position.y = 0.2;
    shipGroup.add(wing);
    
    // Cockpit
    const cockpitGeometry = new THREE.SphereGeometry(0.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpit = new THREE.Mesh(cockpitGeometry, shipMaterial);
    cockpit.position.y = 0.8;
    cockpit.rotation.x = Math.PI;
    shipGroup.add(cockpit);
    
    // Engine
    const engineGeometry = new THREE.CylinderGeometry(0.4, 0.6, 1, 8);
    const engine = new THREE.Mesh(engineGeometry, shipMaterial);
    engine.position.z = -2;
    engine.rotation.x = Math.PI / 2;
    shipGroup.add(engine);
    
    // Position the ship
    const angle = Math.random() * Math.PI * 2;
    const distance = 50;
    shipGroup.position.x = Math.cos(angle) * distance;
    shipGroup.position.z = Math.sin(angle) * distance;
    shipGroup.position.y = 1;
    shipGroup.rotation.y = Math.random() * Math.PI * 2;
    scene.add(shipGroup);
    gameState.ship.mesh = shipGroup;

    // Create monster with visible model
    const monsterGeometry = new THREE.SphereGeometry(1, 32, 32);
    const monsterMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
    });
    const monster = new THREE.Mesh(monsterGeometry, monsterMaterial);
    monster.position.copy(gameState.monster.position);
    monster.visible = false; // Start invisible
    scene.add(monster);
    gameState.monster.mesh = monster;

    // Create scanner model
    const scannerGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const scannerMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
    });
    gameState.player.scannerModel = new THREE.Mesh(scannerGeometry, scannerMaterial);
    gameState.player.scannerModel.position.set(0.5, -0.3, -0.5); // Position in front of player
    camera.add(gameState.player.scannerModel);
    scene.add(camera);

    // Create game over screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'gameOverScreen';
    gameOverScreen.style.display = 'none';
    gameOverScreen.style.position = 'fixed';
    gameOverScreen.style.top = '0';
    gameOverScreen.style.left = '0';
    gameOverScreen.style.width = '100%';
    gameOverScreen.style.height = '100%';
    gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    gameOverScreen.style.color = 'red';
    gameOverScreen.style.fontFamily = 'Arial, sans-serif';
    gameOverScreen.style.fontSize = '48px';
    gameOverScreen.style.textAlign = 'center';
    gameOverScreen.style.paddingTop = '20%';
    gameOverScreen.style.zIndex = '1000';
    
    const gameOverText = document.createElement('h1');
    gameOverText.textContent = 'GAME OVER';
    gameOverScreen.appendChild(gameOverText);
    
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Return to Title Screen';
    restartButton.style.padding = '20px 40px';
    restartButton.style.fontSize = '24px';
    restartButton.style.marginTop = '20px';
    restartButton.style.cursor = 'pointer';
    restartButton.onclick = () => {
        location.reload();
    };
    gameOverScreen.appendChild(restartButton);
    
    document.body.appendChild(gameOverScreen);

    // Create UI elements
    const uiContainer = document.createElement('div');
    uiContainer.style.position = 'fixed';
    uiContainer.style.bottom = '20px';
    uiContainer.style.left = '0';
    uiContainer.style.width = '100%';
    uiContainer.style.pointerEvents = 'none';
    uiContainer.style.zIndex = '1000';
    document.body.appendChild(uiContainer);

    // Create cooldown bar container
    const cooldownContainer = document.createElement('div');
    cooldownContainer.style.width = '200px';
    cooldownContainer.style.height = '20px';
    cooldownContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    cooldownContainer.style.border = '2px solid #00ff00';
    cooldownContainer.style.borderRadius = '10px';
    cooldownContainer.style.margin = '0 auto';
    cooldownContainer.style.overflow = 'hidden';
    cooldownContainer.style.position = 'relative'; // Added for indicator positioning
    uiContainer.appendChild(cooldownContainer);

    // Create cooldown bar
    const cooldownBar = document.createElement('div');
    cooldownBar.style.width = '100%';
    cooldownBar.style.height = '100%';
    cooldownBar.style.backgroundColor = '#00ff00';
    cooldownBar.style.transition = 'width 0.1s linear';
    cooldownBar.style.transform = 'scaleX(0)';
    cooldownBar.style.transformOrigin = 'left';
    cooldownContainer.appendChild(cooldownBar);
    gameState.player.cooldownBar = cooldownBar;

    // Create LIDAR indicator
    const lidarIndicator = document.createElement('div');
    lidarIndicator.style.width = '12px';
    lidarIndicator.style.height = '12px';
    lidarIndicator.style.borderRadius = '50%';
    lidarIndicator.style.backgroundColor = '#00ff00';
    lidarIndicator.style.position = 'absolute';
    lidarIndicator.style.top = '-16px';
    lidarIndicator.style.left = '50%';
    lidarIndicator.style.transform = 'translateX(-50%)';
    lidarIndicator.style.transition = 'background-color 0.3s ease';
    lidarIndicator.style.boxShadow = '0 0 8px currentColor';
    cooldownContainer.appendChild(lidarIndicator);
    gameState.player.lidarIndicator = lidarIndicator;

    // Create controls display
    const controlsDisplay = document.createElement('div');
    controlsDisplay.style.position = 'fixed';
    controlsDisplay.style.bottom = '20px';
    controlsDisplay.style.left = '20px';
    controlsDisplay.style.color = '#00ff00';
    controlsDisplay.style.fontFamily = 'monospace';
    controlsDisplay.style.fontSize = '14px';
    controlsDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    controlsDisplay.style.padding = '10px';
    controlsDisplay.style.borderRadius = '5px';
    controlsDisplay.style.border = '1px solid #00ff00';
    controlsDisplay.innerHTML = `
        <div>WASD - Move</div>
        <div>Mouse - Look</div>
        <div>Space - LIDAR Scan</div>
        <div>P - Pause</div>
        <div>M - Toggle Monster (Debug)</div>
        <div>V - Toggle Walls/Poles (Debug)</div>
        <div>B - Toggle Ship (Debug)</div>
    `;
    document.body.appendChild(controlsDisplay);

    // Create win screen
    const winScreen = document.createElement('div');
    winScreen.id = 'winScreen';
    winScreen.style.display = 'none';
    winScreen.style.position = 'fixed';
    winScreen.style.top = '0';
    winScreen.style.left = '0';
    winScreen.style.width = '100%';
    winScreen.style.height = '100%';
    winScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    winScreen.style.color = '#ffff00';
    winScreen.style.fontFamily = 'Arial, sans-serif';
    winScreen.style.fontSize = '48px';
    winScreen.style.textAlign = 'center';
    winScreen.style.paddingTop = '20%';
    winScreen.style.zIndex = '1000';
    
    const winText = document.createElement('h1');
    winText.textContent = 'MISSION ACCOMPLISHED';
    winScreen.appendChild(winText);
    
    const winSubText = document.createElement('p');
    winSubText.textContent = 'You have found the escape ship!';
    winSubText.style.fontSize = '24px';
    winSubText.style.marginTop = '20px';
    winScreen.appendChild(winSubText);
    
    const winRestartButton = document.createElement('button');
    winRestartButton.textContent = 'Return to Title Screen';
    winRestartButton.style.padding = '20px 40px';
    winRestartButton.style.fontSize = '24px';
    winRestartButton.style.marginTop = '20px';
    winRestartButton.style.cursor = 'pointer';
    winRestartButton.style.backgroundColor = '#ffff00';
    winRestartButton.style.color = '#000000';
    winRestartButton.style.border = 'none';
    winRestartButton.style.borderRadius = '5px';
    winRestartButton.onclick = () => {
        location.reload();
    };
    winScreen.appendChild(winRestartButton);
    
    document.body.appendChild(winScreen);
}

// Title screen and pause menu handling
console.log('Setting up UI elements...');
const titleScreen = document.getElementById('titleScreen');
const pauseMenu = document.getElementById('pauseMenu');
const playButton = document.getElementById('playButton');
const resumeButton = document.getElementById('resumeButton');

console.log('Title screen element:', titleScreen);
console.log('Play button element:', playButton);

// Ensure title screen is visible at start
if (titleScreen) {
    console.log('Making title screen visible...');
    titleScreen.style.display = 'flex';
} else {
    console.error('Title screen element not found!');
}

function startGame() {
    console.log('Starting game...');
    if (titleScreen) {
        console.log('Hiding title screen...');
        titleScreen.style.display = 'none';
    } else {
        console.error('Title screen element not found when trying to hide it!');
    }
    gameState.isGameStarted = true;
    gameState.isPaused = false;
    document.body.requestPointerLock();
    
    // Ensure player is at safe position
    const safeSpawnPosition = findSafeSpawnPosition();
    gameState.player.position.copy(safeSpawnPosition);
    camera.position.copy(safeSpawnPosition);
    camera.rotation.y = gameState.player.rotation.y;
}

// Add click event listener to play button
if (playButton) {
    console.log('Adding click listener to play button...');
    playButton.addEventListener('click', () => {
        console.log('Play button clicked');
        startGame();
    });
} else {
    console.error('Play button element not found!');
}

resumeButton.addEventListener('click', () => {
    pauseMenu.style.display = 'none';
    gameState.isPaused = false;
    document.body.requestPointerLock();
});

// Handle mouse movement
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body && !gameState.isPaused && gameState.isGameStarted) {
        gameState.player.rotation.y -= e.movementX * gameState.mouseSensitivity;
        camera.rotation.y = gameState.player.rotation.y;
    }
});

// Lock pointer on click
renderer.domElement.addEventListener('click', () => {
    if (gameState.isGameStarted && !gameState.isPaused) {
        document.body.requestPointerLock();
    }
});

// Handle keyboard input
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() in gameState.keys) {
        gameState.keys[e.key.toLowerCase()] = true;
    }
    if (e.code === 'Space') {
        gameState.keys.space = true;
        if (!gameState.player.isScanning && gameState.player.canScan && !gameState.isPaused && gameState.isGameStarted) {
            gameState.player.isScanning = true;
            gameState.player.scanProgress = 0;
            gameState.player.lastScanTime = performance.now();
            gameState.player.canScan = false;
            gameState.player.cooldownBar.style.transform = 'scaleX(0)';
        }
    }
    if (e.key.toLowerCase() === 'p' && gameState.isGameStarted) {
        gameState.isPaused = !gameState.isPaused;
        pauseMenu.style.display = gameState.isPaused ? 'flex' : 'none';
        if (gameState.isPaused) {
            document.exitPointerLock();
        } else {
            document.body.requestPointerLock();
        }
    }
    // Add debug toggle for monster visibility
    if (e.key.toLowerCase() === 'm') {
        gameState.monster.debugMode = !gameState.monster.debugMode;
        gameState.monster.isVisible = gameState.monster.debugMode;
        gameState.monster.mesh.visible = gameState.monster.isVisible;
        
        if (gameState.monster.debugMode) {
            console.log('Monster debug mode enabled - monster visible');
        } else {
            console.log('Monster debug mode disabled - monster hidden');
        }
    }
    // Add debug toggle for walls and poles visibility
    if (e.key.toLowerCase() === 'v') {
        gameState.debugMode.showWalls = !gameState.debugMode.showWalls;
        gameState.debugMode.showPoles = !gameState.debugMode.showPoles;
        
        // Update visibility of all walls and poles
        gameState.walls.forEach(wall => {
            wall.material.visible = gameState.debugMode.showWalls;
        });
        gameState.poles.forEach(pole => {
            pole.material.visible = gameState.debugMode.showPoles;
        });
        
        console.log(`Debug mode: Walls and Poles ${gameState.debugMode.showWalls ? 'visible' : 'hidden'}`);
    }
    // Add debug toggle for ship visibility
    if (e.key.toLowerCase() === 'b') {
        gameState.debugMode.showShip = !gameState.debugMode.showShip;
        if (gameState.ship.mesh) {
            gameState.ship.mesh.children.forEach(child => {
                child.material.visible = gameState.debugMode.showShip;
            });
        }
        console.log(`Debug mode: Ship ${gameState.debugMode.showShip ? 'visible' : 'hidden'}`);
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

// Update player position
function updatePlayer(deltaTime) {
    if (!gameState.isGameStarted || gameState.isPaused || gameState.gameOver) return;

    const moveX = (gameState.keys.d ? 1 : 0) - (gameState.keys.a ? 1 : 0);
    const moveZ = (gameState.keys.s ? 1 : 0) - (gameState.keys.w ? 1 : 0);
    
    if (moveX !== 0 || moveZ !== 0) {
        // Get camera direction vectors
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(camera.up, cameraDirection).normalize();

        // Calculate movement vector based on camera orientation
        const moveVector = new THREE.Vector3();
        moveVector.addScaledVector(cameraDirection, -moveZ);
        moveVector.addScaledVector(cameraRight, -moveX);
        moveVector.normalize();
        moveVector.multiplyScalar(gameState.player.speed);

        // Calculate new position
        const newX = gameState.player.position.x + moveVector.x;
        const newZ = gameState.player.position.z + moveVector.z;
        
        // Check collisions with walls
        let canMove = true;
        for (const wall of gameState.walls) {
            const wallPos = wall.position;
            const wallSize = new THREE.Vector3(5, 3, 0.5);
            const wallRotation = wall.rotation.y;
            
            // Transform point to wall's local space
            const localX = newX - wallPos.x;
            const localZ = newZ - wallPos.z;
            
            // Rotate point to align with wall
            const rotatedX = localX * Math.cos(-wallRotation) - localZ * Math.sin(-wallRotation);
            const rotatedZ = localX * Math.sin(-wallRotation) + localZ * Math.cos(-wallRotation);
            
            // Check collision with wall's bounds with increased collision radius
            if (Math.abs(rotatedX) < wallSize.x/2 + gameState.player.collisionRadius * 1.2 && 
                Math.abs(rotatedZ) < wallSize.z/2 + gameState.player.collisionRadius * 1.2) {
                canMove = false;
                break;
            }
        }
        
        // Check collisions with poles
        if (canMove) {
            for (const pole of gameState.poles) {
                const polePos = pole.position;
                const poleRadius = 0.2 + gameState.player.collisionRadius * 1.2;
                const dx = newX - polePos.x;
                const dz = newZ - polePos.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < poleRadius) {
                    canMove = false;
                    break;
                }
            }
        }
        
        if (canMove) {
            gameState.player.position.x = newX;
            gameState.player.position.z = newZ;
            camera.position.copy(gameState.player.position);
        }
    }

    // Update scan cooldown
    updateScanCooldown(deltaTime);

    // Check if player reached the ship
    const distanceToShip = gameState.player.position.distanceTo(gameState.ship.mesh.position);
    if (distanceToShip < gameState.ship.size) {
        gameState.gameWon = true;
        document.getElementById('winScreen').style.display = 'block';
        document.exitPointerLock();
    }
}

// Helper function to find valid position
function findValidPosition(center, radius) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    const testPosition = new THREE.Vector3(
        center.x + Math.cos(angle) * distance,
        1, // Keep at ground level
        center.z + Math.sin(angle) * distance
    );
    
    // Check if position is valid (not inside walls or poles)
    for (const wall of gameState.walls) {
        const wallPos = wall.position;
        const wallSize = new THREE.Vector3(5, 3, 0.5);
        const wallRotation = wall.rotation.y;
        
        const localX = testPosition.x - wallPos.x;
        const localZ = testPosition.z - wallPos.z;
        
        const rotatedX = localX * Math.cos(-wallRotation) - localZ * Math.sin(-wallRotation);
        const rotatedZ = localX * Math.sin(-wallRotation) + localZ * Math.cos(-wallRotation);
        
        if (Math.abs(rotatedX) < wallSize.x/2 + gameState.monster.collisionRadius && 
            Math.abs(rotatedZ) < wallSize.z/2 + gameState.monster.collisionRadius) {
            return null; // Position is invalid
        }
    }
    
    for (const pole of gameState.poles) {
        const polePos = pole.position;
        const poleRadius = 0.2 + gameState.monster.collisionRadius;
        const dx = testPosition.x - polePos.x;
        const dz = testPosition.z - polePos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < poleRadius) {
            return null; // Position is invalid
        }
    }
    
    return testPosition;
}

// Generate path to target
function generatePath(start, target) {
    const path = [];
    const maxAttempts = 10;
    let currentPos = start.clone();
    let attempts = 0;
    
    while (currentPos.distanceTo(target) > gameState.monster.pathPointDistance && attempts < maxAttempts) {
        const direction = new THREE.Vector3()
            .subVectors(target, currentPos)
            .normalize();
        
        const nextPos = currentPos.clone().add(
            direction.multiplyScalar(gameState.monster.pathPointDistance)
        );
        
        // Try to find a valid position near the next position
        const validPos = findValidPosition(nextPos, gameState.monster.pathPointDistance);
        if (validPos) {
            path.push(validPos);
            currentPos = validPos;
        }
        
        attempts++;
    }
    
    // Add final target position
    path.push(target.clone());
    return path;
}

// Update monster position
function updateMonster() {
    if (!gameState.monster.isActive || !gameState.isGameStarted || gameState.isPaused) return;
    
    try {
        const currentTime = performance.now();
        const distanceToPlayer = gameState.monster.position.distanceTo(gameState.player.position);
        const distanceToShip = gameState.player.position.distanceTo(gameState.ship.mesh.position);
        
        // Check if player has seen the ship
        if (distanceToShip < 10) {
            gameState.player.hasSeenShip = true;
        }
        
        // Handle running away behavior
        if (gameState.monster.isRunningAway) {
            if (currentTime - gameState.monster.runAwayTimer > gameState.monster.runAwayDuration) {
                gameState.monster.isRunningAway = false;
                gameState.monster.pathUpdateTimer = 0; // Force path update
                console.log('Monster has stopped running away');
            } else {
                // Run away from player
                const awayDirection = new THREE.Vector3()
                    .subVectors(gameState.monster.position, gameState.player.position)
                    .normalize();
                
                const moveVector = awayDirection.multiplyScalar(gameState.monster.runAwaySpeed);
                const newPosition = gameState.monster.position.clone().add(moveVector);
                
                // Check collisions
                let canMove = true;
                
                // Check wall collisions
                for (const wall of gameState.walls) {
                    const wallPos = wall.position;
                    const wallSize = new THREE.Vector3(5, 3, 0.5);
                    const wallRotation = wall.rotation.y;
                    
                    const localX = newPosition.x - wallPos.x;
                    const localZ = newPosition.z - wallPos.z;
                    
                    const rotatedX = localX * Math.cos(-wallRotation) - localZ * Math.sin(-wallRotation);
                    const rotatedZ = localX * Math.sin(-wallRotation) + localZ * Math.cos(-wallRotation);
                    
                    if (Math.abs(rotatedX) < wallSize.x/2 + gameState.monster.collisionRadius && 
                        Math.abs(rotatedZ) < wallSize.z/2 + gameState.monster.collisionRadius) {
                        canMove = false;
                        break;
                    }
                }
                
                // Check pole collisions
                if (canMove) {
                    for (const pole of gameState.poles) {
                        const polePos = pole.position;
                        const poleRadius = 0.2 + gameState.monster.collisionRadius;
                        const dx = newPosition.x - polePos.x;
                        const dz = newPosition.z - polePos.z;
                        const distance = Math.sqrt(dx * dx + dz * dz);
                        
                        if (distance < poleRadius) {
                            canMove = false;
                            break;
                        }
                    }
                }
                
                if (canMove) {
                    gameState.monster.position.add(moveVector);
                    if (gameState.monster.mesh) {
                        gameState.monster.mesh.position.copy(gameState.monster.position);
                    }
                }
                return; // Skip normal pathfinding while running away
            }
        }
        
        // Update path periodically
        if (currentTime - gameState.monster.pathUpdateTimer > gameState.monster.pathUpdateInterval) {
            gameState.monster.pathUpdateTimer = currentTime;
            gameState.monster.lastKnownPlayerPosition = gameState.player.position.clone();
            
            // Generate new path
            if (gameState.monster.hasBeenScannedTwice) {
                // Chase player after being scanned twice
                gameState.monster.waypoints = [gameState.player.position.clone()];
                gameState.monster.speed = gameState.monster.attackSpeed; // Use attack speed when chasing
            } else {
                // Generate path to stalking position
                const stalkingOffset = new THREE.Vector3()
                    .subVectors(gameState.player.position, gameState.monster.position)
                    .normalize()
                    .multiplyScalar(-gameState.monster.stalkingDistance);
                const stalkingPosition = gameState.player.position.clone().add(stalkingOffset);
                gameState.monster.waypoints = generatePath(
                    gameState.monster.position,
                    stalkingPosition
                );
                gameState.monster.speed = gameState.monster.speed; // Use normal speed when stalking
            }
            gameState.monster.currentWaypointIndex = 0;
        }
        
        // Move along path
        if (gameState.monster.waypoints.length > 0) {
            const currentWaypoint = gameState.monster.waypoints[gameState.monster.currentWaypointIndex];
            const distanceToWaypoint = gameState.monster.position.distanceTo(currentWaypoint);
            
            if (distanceToWaypoint < 1) {
                // Reached waypoint, move to next
                gameState.monster.currentWaypointIndex++;
                if (gameState.monster.currentWaypointIndex >= gameState.monster.waypoints.length) {
                    gameState.monster.waypoints = [];
                }
            } else {
                // Move towards waypoint
                const direction = new THREE.Vector3()
                    .subVectors(currentWaypoint, gameState.monster.position)
                    .normalize();
                
                const moveSpeed = gameState.monster.isAttacking ? 
                    gameState.monster.attackSpeed : 
                    gameState.monster.speed;
                
                const moveVector = direction.multiplyScalar(moveSpeed);
                const newPosition = gameState.monster.position.clone().add(moveVector);
                
                // Check collisions
                let canMove = true;
                
                // Check wall collisions
                for (const wall of gameState.walls) {
                    const wallPos = wall.position;
                    const wallSize = new THREE.Vector3(5, 3, 0.5);
                    const wallRotation = wall.rotation.y;
                    
                    const localX = newPosition.x - wallPos.x;
                    const localZ = newPosition.z - wallPos.z;
                    
                    const rotatedX = localX * Math.cos(-wallRotation) - localZ * Math.sin(-wallRotation);
                    const rotatedZ = localX * Math.sin(-wallRotation) + localZ * Math.cos(-wallRotation);
                    
                    if (Math.abs(rotatedX) < wallSize.x/2 + gameState.monster.collisionRadius && 
                        Math.abs(rotatedZ) < wallSize.z/2 + gameState.monster.collisionRadius) {
                        canMove = false;
                        break;
                    }
                }
                
                // Check pole collisions
                if (canMove) {
                    for (const pole of gameState.poles) {
                        const polePos = pole.position;
                        const poleRadius = 0.2 + gameState.monster.collisionRadius;
                        const dx = newPosition.x - polePos.x;
                        const dz = newPosition.z - polePos.z;
                        const distance = Math.sqrt(dx * dx + dz * dz);
                        
                        if (distance < poleRadius) {
                            canMove = false;
                            break;
                        }
                    }
                }
                
                if (canMove) {
                    gameState.monster.position.add(moveVector);
                    if (gameState.monster.mesh) {
                        gameState.monster.mesh.position.copy(gameState.monster.position);
                    }
                } else {
                    // If blocked, try to find a new path
                    gameState.monster.pathUpdateTimer = 0; // Force path update
                }
            }
        }
        
        // Check for game over - monster catches player
        if (distanceToPlayer < gameState.monster.collisionRadius + gameState.player.collisionRadius) {
            gameState.gameOver = true;
            const gameOverScreen = document.getElementById('gameOverScreen');
            if (gameOverScreen) {
                gameOverScreen.style.display = 'block';
            }
            document.exitPointerLock();
        }
    } catch (error) {
        console.error('Error in monster update:', error);
    }
}

// Draw LIDAR scan
function drawLIDARScan() {
    if (!gameState.isGameStarted || gameState.isPaused) return;
    
    try {
        if (gameState.player.isScanning) {
            const currentTime = performance.now();
            const deltaTime = currentTime - gameState.player.lastScanTime;
            gameState.player.scanProgress += deltaTime / 2000;
            gameState.player.scanSweepProgress += deltaTime * gameState.player.scanBeamSpeed;
            
            if (gameState.player.scanProgress >= 1) {
                gameState.player.isScanning = false;
                gameState.player.scanBeams.forEach(beam => {
                    if (beam && beam.geometry && beam.material) {
                        scene.remove(beam);
                        beam.geometry.dispose();
                        beam.material.dispose();
                    }
                });
                gameState.player.scanBeams = [];
                gameState.player.scanSweepProgress = 0;
                return;
            }
            
            const scannerPos = new THREE.Vector3();
            if (gameState.player.scannerModel) {
                gameState.player.scannerModel.getWorldPosition(scannerPos);
            }
            
            // Calculate current sweep position (0 to 1)
            const sweepProgress = (gameState.player.scanSweepProgress % 1);
            
            // Create or update scan beams
            for (let i = 0; i < gameState.player.scanBeamCount; i++) {
                // Calculate beam position in the sweep
                const beamProgress = (i / gameState.player.scanBeamCount + sweepProgress) % 1;
                
                // Calculate beam direction with noise
                const horizontalAngle = -gameState.player.horizontalScanRange / 2 + 
                    (gameState.player.horizontalScanRange * beamProgress);
                
                // Calculate vertical angle for full sweep
                const verticalAngle = -gameState.player.verticalScanRange / 2 + 
                    (gameState.player.verticalScanRange * sweepProgress);
                
                const rayDirection = new THREE.Vector3();
                rayDirection.copy(camera.getWorldDirection(new THREE.Vector3()));
                
                // Apply rotations with noise
                rayDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), 
                    horizontalAngle + (Math.random() - 0.5) * gameState.player.scanBeamNoise);
                const rightVector = new THREE.Vector3();
                rightVector.crossVectors(new THREE.Vector3(0, 1, 0), rayDirection).normalize();
                rayDirection.applyAxisAngle(rightVector, 
                    verticalAngle + (Math.random() - 0.5) * gameState.player.scanBeamNoise);
                
                // Create or update beam
                const beamGeometry = new THREE.BufferGeometry().setFromPoints([
                    scannerPos,
                    new THREE.Vector3().addVectors(scannerPos, 
                        rayDirection.clone().multiplyScalar(gameState.player.scanBeamLength))
                ]);
                
                const beamMaterial = new THREE.LineBasicMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.5
                });
                
                let beam;
                if (i < gameState.player.scanBeams.length) {
                    beam = gameState.player.scanBeams[i];
                    if (beam && beam.geometry) {
                        beam.geometry.dispose();
                    }
                    beam.geometry = beamGeometry;
                } else {
                    beam = new THREE.Line(beamGeometry, beamMaterial);
                    scene.add(beam);
                    gameState.player.scanBeams.push(beam);
                }
                
                const ray = new THREE.Raycaster(scannerPos, rayDirection);
                
                // Check intersections with objects
                const intersects = ray.intersectObjects([...gameState.poles, ...gameState.walls, 
                    ...(gameState.ship.mesh ? gameState.ship.mesh.children : []), 
                    gameState.monster.mesh, scene.getObjectByName('ground')].filter(Boolean));
                
                if (intersects.length > 0) {
                    const point = intersects[0].point;
                    const distance = point.distanceTo(scannerPos);
                    
                    // Skip if beyond max scan distance
                    if (distance > gameState.player.maxScanDistance) continue;
                    
                    // Calculate scan density based on distance
                    const densityFactor = calculateScanDensity(distance);
                    
                    // Only create points if random check passes based on distance
                    if (Math.random() < densityFactor) {
                        const object = intersects[0].object;
                        
                        // Handle ground scan points
                        if (object.name === 'ground') {
                            // Create a more natural ground scan pattern
                            const numPoints = Math.max(4, Math.floor(8 * densityFactor));
                            const baseRadius = 1.5; // Base radius for the scan pattern
                            
                            // Create concentric circles of points
                            for (let ring = 0; ring < 3; ring++) {
                                const ringRadius = baseRadius * (ring + 1) / 2;
                                const pointsInRing = Math.max(4, Math.floor(numPoints * (ring + 1) * densityFactor));
                                
                                for (let j = 0; j < pointsInRing; j++) {
                                    const angle = (j / pointsInRing) * Math.PI * 2;
                                    const radius = ringRadius * (0.9 + Math.random() * 0.2); // Add some randomness
                                    
                                    // Calculate point position with slight height variation
                                    const scanPoint = new THREE.Vector3(
                                        point.x + Math.cos(angle) * radius,
                                        point.y + 0.01 + Math.random() * 0.02, // Slight height variation
                                        point.z + Math.sin(angle) * radius
                                    );
                                    
                                    // Add some random points between rings
                                    if (Math.random() < 0.3) {
                                        const randomAngle = Math.random() * Math.PI * 2;
                                        const randomRadius = ringRadius * (0.5 + Math.random() * 0.5);
                                        const randomPoint = new THREE.Vector3(
                                            point.x + Math.cos(randomAngle) * randomRadius,
                                            point.y + 0.01 + Math.random() * 0.02,
                                            point.z + Math.sin(randomAngle) * randomRadius
                                        );
                                        createScanParticle(randomPoint, 0x00ff00, distance);
                                    }
                                    
                                    createScanParticle(scanPoint, 0x00ff00, distance);
                                }
                            }
                            
                            // Add some scattered points for more natural look
                            for (let i = 0; i < 8; i++) {
                                const scatterRadius = baseRadius * 2 * Math.random();
                                const scatterAngle = Math.random() * Math.PI * 2;
                                const scatterPoint = new THREE.Vector3(
                                    point.x + Math.cos(scatterAngle) * scatterRadius,
                                    point.y + 0.01 + Math.random() * 0.02,
                                    point.z + Math.sin(scatterAngle) * scatterRadius
                                );
                                createScanParticle(scatterPoint, 0x00ff00, distance);
                            }
                        }
                        // Handle monster scan points
                        else if (object === gameState.monster.mesh) {
                            // Update monster state when scanned
                            if (!gameState.monster.hasBeenScanned) {
                                gameState.monster.hasBeenScanned = true;
                                gameState.monster.isRunningAway = true;
                                gameState.monster.runAwayTimer = performance.now();
                                console.log('Monster detected! Running away...');
                            } else if (!gameState.monster.hasBeenScannedTwice && !gameState.monster.isRunningAway) {
                                gameState.monster.hasBeenScannedTwice = true;
                                gameState.monster.pathUpdateTimer = 0;
                                console.log('Monster is now aggressive!');
                            }
                            
                            // Create a sphere of points around the monster with distance-based density
                            const numPoints = Math.max(4, Math.floor(16 * densityFactor));
                            const numHeightPoints = Math.max(2, Math.floor(12 * densityFactor));
                            const monsterRadius = gameState.monster.size;
                            
                            for (let j = 0; j < numPoints; j++) {
                                const angle = (j / numPoints) * Math.PI * 2;
                                const radius = monsterRadius * (0.8 + Math.random() * 0.4);
                                const x = gameState.monster.position.x + Math.cos(angle) * radius;
                                const z = gameState.monster.position.z + Math.sin(angle) * radius;
                                
                                // Add points at different heights with reduced density at distance
                                for (let k = 0; k < numHeightPoints; k++) {
                                    if (Math.random() < densityFactor) {
                                        const height = gameState.monster.position.y - 1 + 
                                            (2 * k / (numHeightPoints - 1)) + 
                                            (Math.random() - 0.5) * 0.2;
                                        const scanPoint = new THREE.Vector3(x, height, z);
                                        createScanParticle(scanPoint, 0xff0000, distance);
                                    }
                                }
                            }
                        }
                        // Handle ship scan points
                        else if (gameState.ship.mesh && gameState.ship.mesh.children.includes(object)) {
                            const numPoints = Math.max(4, Math.floor(16 * densityFactor));
                            const numHeightPoints = Math.max(2, Math.floor(12 * densityFactor));
                            const shipRadius = 2;
                            
                            for (let j = 0; j < numPoints; j++) {
                                const angle = (j / numPoints) * Math.PI * 2;
                                const radius = shipRadius * (0.8 + Math.random() * 0.4);
                                const x = point.x + Math.cos(angle) * radius;
                                const z = point.z + Math.sin(angle) * radius;
                                
                                for (let k = 0; k < numHeightPoints; k++) {
                                    if (Math.random() < densityFactor) {
                                        const height = point.y - 1 + 
                                            (2 * k / (numHeightPoints - 1)) + 
                                            (Math.random() - 0.5) * 0.2;
                                        const scanPoint = new THREE.Vector3(x, height, z);
                                        createScanParticle(scanPoint, 0xffff00, distance);
                                    }
                                }
                            }
                        }
                        // Handle other objects (poles, walls)
                        else {
                            const numPoints = Math.max(4, Math.floor(12 * densityFactor));
                            const numHeightPoints = Math.max(2, Math.floor(8 * densityFactor));
                            
                            for (let j = 0; j < numPoints; j++) {
                                const angle = (j / numPoints) * Math.PI * 2;
                                const radius = 0.2 + Math.random() * 0.4;
                                const x = point.x + Math.cos(angle) * radius;
                                const z = point.z + Math.sin(angle) * radius;
                                
                                for (let k = 0; k < numHeightPoints; k++) {
                                    if (Math.random() < densityFactor) {
                                        const height = point.y - 2 + 
                                            (4 * k / (numHeightPoints - 1)) + 
                                            (Math.random() - 0.5) * 0.2;
                                        const scanPoint = new THREE.Vector3(x, height, z);
                                        createScanParticle(scanPoint, 0x00ff00, distance);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in LIDAR scan:', error);
        // Reset scanning state if error occurs
        gameState.player.isScanning = false;
        gameState.player.scanBeams.forEach(beam => {
            if (beam && beam.geometry && beam.material) {
                scene.remove(beam);
                beam.geometry.dispose();
                beam.material.dispose();
            }
        });
        gameState.player.scanBeams = [];
        gameState.player.scanSweepProgress = 0;
    }
}

// Create scan particle
function createScanParticle(point, color, distance) {
    const particleGeometry = new THREE.SphereGeometry(0.01, 8, 8); // Reduced particle size
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: calculateOpacity(distance) * 0.5 // Reduced opacity
    });
    
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.position.copy(point);
    
    // Add slight wave effect
    particle.position.y += Math.sin(gameState.player.scanProgress * gameState.player.scanWaveSpeed) * 0.02;
    
    scene.add(particle);
    gameState.scanHistory.push({
        particle: particle,
        timeAlive: 0
    });
}

// Update scan history
function updateScanHistory(deltaTime) {
    if (!gameState.isGameStarted || gameState.isPaused) return;
    
    for (let i = gameState.scanHistory.length - 1; i >= 0; i--) {
        const scan = gameState.scanHistory[i];
        scan.timeAlive += deltaTime;
        
        if (scan.timeAlive > gameState.scanDecayTime) {
            scene.remove(scan.particle);
            gameState.scanHistory.splice(i, 1);
        } else {
            const opacity = 1 - (scan.timeAlive / gameState.scanDecayTime);
            scan.particle.material.opacity = opacity;
        }
    }
    
    // Update laser lines opacity
    gameState.player.laserLines.forEach(line => {
        const opacity = 1 - (gameState.player.scanProgress);
        line.material.opacity = opacity * 0.3;
    });
}

// Calculate opacity based on distance
function calculateOpacity(distance) {
    const maxDistance = gameState.player.scanRadius;
    const opacity = gameState.maxScanOpacity * (1 - (distance / maxDistance));
    return Math.max(gameState.minScanOpacity, opacity);
}

// Calculate scan density based on distance
function calculateScanDensity(distance) {
    const normalizedDistance = (distance - gameState.player.minScanDistance) / 
        (gameState.player.maxScanDistance - gameState.player.minScanDistance);
    const density = gameState.player.scanPointDensity.base * 
        Math.pow(gameState.player.scanPointDensity.falloff, normalizedDistance * 10);
    return Math.max(gameState.player.scanPointDensity.minDensity, density);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Main game loop
function gameLoop(timestamp) {
    try {
        const deltaTime = timestamp - (gameState.lastTime || timestamp);
        gameState.lastTime = timestamp;
        
        // Cap deltaTime to prevent large jumps
        const cappedDeltaTime = Math.min(deltaTime, 100);
        
        // Update game state
        if (!gameState.isPaused && gameState.isGameStarted && !gameState.gameOver) {
            updatePlayer(cappedDeltaTime);
            updateMonster();
            updateScanHistory(cappedDeltaTime);
            updateLIDARIndicator(); // Add indicator update
            
            // Update camera shader time
            cameraShader.uniforms.time.value = timestamp * 0.001;
            
            // Draw LIDAR scan
            drawLIDARScan();
        }
        
        // Render scene
        composer.render();
        
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error('Error in game loop:', error);
        // Attempt to recover
        requestAnimationFrame(gameLoop);
    }
}

// Initialize game
generateEnvironment();
requestAnimationFrame(gameLoop);

// Update scan cooldown
function updateScanCooldown(deltaTime) {
    if (!gameState.player.canScan) {
        gameState.player.scanCooldown += deltaTime;
        const cooldownProgress = gameState.player.scanCooldown / gameState.player.scanCooldownTime;
        gameState.player.cooldownBar.style.transform = `scaleX(${cooldownProgress})`;
        
        if (gameState.player.scanCooldown >= gameState.player.scanCooldownTime) {
            gameState.player.canScan = true;
            gameState.player.scanCooldown = 0;
            gameState.player.cooldownBar.style.transform = 'scaleX(0)';
        }
    }
}

// Add new function to update LIDAR indicator
function updateLIDARIndicator() {
    if (!gameState.player.lidarIndicator) return;

    const distanceToShip = gameState.player.position.distanceTo(gameState.ship.mesh.position);
    const distanceToMonster = gameState.player.position.distanceTo(gameState.monster.position);
    
    // Determine indicator color based on conditions
    let indicatorColor = '#0000ff'; // Default blue for far away
    
    if (gameState.monster.hasBeenScannedTwice && distanceToMonster < 20) {
        indicatorColor = '#ff0000'; // Red for monster chasing
    } else if (distanceToShip < 10) {
        indicatorColor = '#00ff00'; // Green for very close to ship
    } else if (distanceToShip < 30) {
        indicatorColor = '#ffff00'; // Yellow for closer to ship
    }
    
    // Update indicator color
    gameState.player.lidarIndicator.style.backgroundColor = indicatorColor;
    gameState.player.lidarIndicator.style.color = indicatorColor;
    
    // Add blink effect when scanning
    if (gameState.player.isScanning) {
        gameState.player.lidarIndicator.style.animation = 'lidarBlink 0.5s infinite';
    } else {
        gameState.player.lidarIndicator.style.animation = 'none';
    }
}

// Add CSS animation for LIDAR blink
const style = document.createElement('style');
style.textContent = `
    @keyframes lidarBlink {
        0% { opacity: 1; }
        50% { opacity: 0.3; }
        100% { opacity: 1; }
    }
`;
document.head.appendChild(style); 