/* jshint esversion: 6, loopfunc: true */
// ===== 2.5D飞机大战游戏 =====
class PlaneWarGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'menu'; // menu, playing, paused, gameOver, victory
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // 游戏数据
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.explosions = [];
        this.particles = [];
        this.powerups = [];
        this.boss = null;
        
        // 游戏状态
        this.score = 0;
        this.level = 1;
        this.exp = 0;
        this.maxExp = 100;
        this.enemiesDefeated = 0;
        this.gameTime = 0;
        this.bossTime = 30000; // 30秒后BOSS出现
        
        // 背景视差层
        this.backgroundLayers = [];
        this.perspectiveLines = [];
        
        // 输入控制
        this.keys = {};
        this.lastShotTime = 0;
        this.shotCooldown = 150;
        
        // 🔥 持续射击系统
        this.spacePressed = false;
        this.spacePressStartTime = 0;
        this.spacePressedDuration = 0;
        this.weaponLevel = 1; // 1-4级武器
        this.maxWeaponLevel = 4;
        
        // 🎮 关卡系统
        this.currentStage = 1;
        this.maxStages = 10; // 10个精彩关卡
        this.stageStartTime = 0;
        this.stageDuration = 45000; // 每关45秒
        this.stageEnemiesDefeated = 0;
        this.stageRequiredKills = 10; // 每关需要击败的敌人数
        this.currentStageTheme = 'classic'; // 当前关卡主题
        this.playerLevel = 1; // 玩家飞机等级
        
        // 音效和特效
        this.screenShake = 0;
        this.activeEffects = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupUI();
        this.createBackgroundLayers();
        this.createPerspectiveLines();
        this.extendCanvasContext();
        this.gameLoop();
    }

    // 扩展Canvas上下文
    extendCanvasContext() {
        // 添加星形绘制方法
        CanvasRenderingContext2D.prototype.star = function(x, y, spikes, outerRadius, innerRadius) {
            let rot = Math.PI / 2 * 3;
            let cx = x;
            let cy = y;
            const step = Math.PI / spikes;

            this.beginPath();
            this.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                const xOut = cx + Math.cos(rot) * outerRadius;
                const yOut = cy + Math.sin(rot) * outerRadius;
                this.lineTo(xOut, yOut);
                rot += step;

                const xIn = cx + Math.cos(rot) * innerRadius;
                const yIn = cy + Math.sin(rot) * innerRadius;
                this.lineTo(xIn, yIn);
                rot += step;
            }
            this.lineTo(cx, cy - outerRadius);
            this.closePath();
        };
    }

    // ===== 事件监听 =====
    setupEventListeners() {
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === ' ') {
                e.preventDefault();
                // 🔥 持续射击系统
                if (!this.spacePressed) {
                    this.spacePressed = true;
                    this.spacePressStartTime = Date.now();
                    this.lastShotTime = 0; // 重置射击时间，确保立即开始射击
                    this.weaponLevel = 1; // 重置武器等级
                    this.addFloatingText(this.canvas.width / 2, 100, '🔥 连续射击激活！', '#40c9ff');
                    
                    // 立即射击第一发
                    this.shootByWeaponLevel();
                    this.lastShotTime = Date.now();
                }
            }
            if (e.key === 'z' || e.key === 'Z') {
                this.usePowerup();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            if (e.key === ' ') {
                // 重置持续射击
                const finalLevel = this.weaponLevel;
                const duration = this.spacePressedDuration / 1000;
                
                this.spacePressed = false;
                this.spacePressedDuration = 0;
                this.weaponLevel = 1;
                
                // 显示持续射击结束信息
                if (finalLevel > 1) {
                    this.addFloatingText(this.canvas.width / 2, 100, 
                        `💥 持续射击结束！达到${finalLevel}级武器！`, '#ff6b6b');
                    this.addFloatingText(this.canvas.width / 2, 120, 
                        `⏱️ 持续时间: ${duration.toFixed(1)}秒`, '#ffaa00');
                } else {
                    this.addFloatingText(this.canvas.width / 2, 100, '🔧 武器冷却', '#ff6b6b');
                }
            }
        });

        // UI按钮事件
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
    }

    setupUI() {
        this.updateUI();
    }

    // ===== 背景视差系统 =====
    createBackgroundLayers() {
        this.backgroundLayers = [
            // 🌌 远景星空层
            {
                type: 'stars',
                elements: this.generateStars(80),
                speed: 0.3,
                opacity: 0.4,
                size: 1,
                color: '#ffffff'
            },
            // 🌠 流星层
            {
                type: 'meteors',
                elements: this.generateMeteors(8),
                speed: 3,
                opacity: 0.7,
                size: 2,
                color: '#40c9ff'
            },
            // ☁️ 科幻云层
            {
                type: 'clouds',
                elements: this.generateClouds(12),
                speed: 1.5,
                opacity: 0.3,
                size: 3,
                color: '#106ebe'
            },
            // ✨ 近景星点
            {
                type: 'starfield',
                elements: this.generateStarfield(40),
                speed: 2.5,
                opacity: 0.8,
                size: 2,
                color: '#4ecdc4'
            }
        ];
    }

    generateStars(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                brightness: Math.random(),
                twinkle: Math.random() * Math.PI * 2
            });
        }
        return stars;
    }

    generateMeteors(count) {
        const meteors = [];
        for (let i = 0; i < count; i++) {
            meteors.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                length: 20 + Math.random() * 40,
                angle: Math.PI * 0.25 + (Math.random() - 0.5) * 0.5,
                brightness: 0.5 + Math.random() * 0.5,
                speed: 2 + Math.random() * 3
            });
        }
        return meteors;
    }

    generateClouds(count) {
        const clouds = [];
        for (let i = 0; i < count; i++) {
            clouds.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                width: 40 + Math.random() * 80,
                height: 20 + Math.random() * 40,
                opacity: 0.1 + Math.random() * 0.3,
                drift: Math.random() * 2 - 1
            });
        }
        return clouds;
    }

    generateStarfield(count) {
        const starfield = [];
        for (let i = 0; i < count; i++) {
            starfield.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 1 + Math.random() * 3,
                brightness: Math.random(),
                pulse: Math.random() * Math.PI * 2,
                color: Math.random() > 0.7 ? '#40c9ff' : '#ffffff'
            });
        }
        return starfield;
    }

    // ===== 透视线系统 =====
    createPerspectiveLines() {
        this.perspectiveLines = [];
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height * 0.3;
        
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            this.perspectiveLines.push({
                angle: angle,
                distance: 0,
                speed: 2,
                opacity: 0.3 + Math.random() * 0.4,
                centerX: centerX,
                centerY: centerY
            });
        }
    }

    // ===== 游戏逻辑 =====
    startGame() {
        this.gameState = 'playing';
        this.player = new Player(this.canvas.width / 2, this.canvas.height - 100);
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.explosions = [];
        this.particles = [];
        this.powerups = [];
        this.boss = null;
        this.score = 0;
        this.level = 1;
        this.exp = 0;
        this.maxExp = 100;
        this.enemiesDefeated = 0;
        this.gameTime = 0;
        this.activeEffects = [];
        
        // 🎮 初始化关卡系统
        this.currentStage = 1;
        this.stageStartTime = 0;
        this.stageEnemiesDefeated = 0;
        this.adjustStageSettings(); // 设置第一关的参数
        
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        
        // 显示第一关开始
        this.showStageTransition();
        
        // 确保UI正确初始化
        setTimeout(() => {
            this.updateUI();
        }, 100);
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
        }
    }

    restart() {
        this.startGame();
    }

    gameLoop(currentTime = 0) {
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (this.gameState === 'playing') {
            this.update();
        }
        
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update() {
        this.gameTime += this.deltaTime;
        
        // 更新玩家
        if (this.player && this.player.health > 0) {
            this.player.update(this.keys, this.deltaTime);
        } else if (this.player && this.player.health <= 0) {
            this.gameOver();
            return;
        }

        // 🔥 更新持续射击系统
        this.updateContinuousShooting();

        // 🎮 更新关卡系统
        this.updateStageSystem();

        // 生成敌人
        this.spawnEnemies();
        
        // 生成BOSS
        if (this.shouldSpawnBoss()) {
            this.spawnBoss();
        }

        // 更新所有游戏对象
        this.updateEnemies();
        this.updateBoss();
        this.updateBullets();
        this.updateEnemyBullets();
        this.updateExplosions();
        this.updateParticles();
        this.updatePowerups();
        this.updateActiveEffects();
        this.updateBackgroundLayers();
        this.updatePerspectiveLines();

        // 碰撞检测
        this.checkCollisions();
        
        // 检查胜利条件
        this.checkVictory();
        
        // 更新屏幕震动
        this.updateScreenShake();
        
        this.updateUI();
    }

    // ===== 敌人生成 =====
    spawnEnemies() {
        // 🎮 根据关卡配置生成敌人
        const spawnChance = this.enemySpawnRate ? (1000 / this.enemySpawnRate) * 0.001 : 0.02;
        
        if (Math.random() < spawnChance) {
            const x = Math.random() * (this.canvas.width - 60) + 30;
            
            // 根据关卡配置选择敌人类型
            let enemyType = 'normal';
            if (Math.random() < (this.specialEnemyChance || 0.1)) {
                const types = ['fighter', 'scout', 'bomber', 'interceptor'];
                enemyType = types[Math.floor(Math.random() * types.length)];
            }
            
            const enemy = new Enemy(x, -50, enemyType);
            
            // 🎮 应用关卡难度加成
            if (this.enemyHealthMultiplier) {
                enemy.health = Math.floor(enemy.health * this.enemyHealthMultiplier);
                enemy.maxHealth = enemy.health;
            }
            if (this.enemySpeedMultiplier) {
                enemy.speed *= this.enemySpeedMultiplier;
            }
            
            this.enemies.push(enemy);
        }
    }

    spawnBoss() {
        const bossType = this.stageBossType || 'normal';
        this.boss = new Boss(this.canvas.width / 2, -100, bossType, this.currentStage);
        document.getElementById('bossHealthBar').classList.remove('hidden');
        
        // 根据关卡显示不同的BOSS名称
        const bossNames = {
            scout_boss: '🔍 侦察机甲',
            guard_boss: '🌲 森林守护者',
            tank_boss: '🏜️ 沙漠战车',
            battleship_boss: '🌊 海洋战舰',
            fire_boss: '🌋 熔岩巨兽',
            mothership_boss: '🚀 太空母舰',
            void_boss: '🕳️ 虚空领主',
            energy_boss: '⚡ 能量核心',
            time_boss: '⏰ 时空守护者',
            ultimate_boss: '🌌 终极维度王'
        };
        
        const bossName = bossNames[bossType] || '👹 神秘BOSS';
        document.querySelector('.boss-name').textContent = bossName;
        
        this.addFloatingText(this.canvas.width / 2, 200, `⚠️ ${bossName} 降临！`, '#ff0000');
        this.addParticles(this.canvas.width / 2, 100, '#ff6b6b', 30);
        this.screenShake = 30;
    }

    // ===== 射击系统 =====
    shoot() {
        if (this.gameState !== 'playing' || !this.player) return;
        
        const currentTime = Date.now();
        if (currentTime - this.lastShotTime > this.shotCooldown) {
            
            // 🔥 根据武器等级射击
            this.shootByWeaponLevel();
            
            this.lastShotTime = currentTime;
        }
    }

    // 🔥 持续射击系统更新
    updateContinuousShooting() {
        if (this.spacePressed && this.gameState === 'playing') {
            const currentTime = Date.now();
            this.spacePressedDuration = currentTime - this.spacePressStartTime;
            
            // 根据持续时间更新武器等级
            let newWeaponLevel = 1;
            if (this.spacePressedDuration >= 10000) {
                newWeaponLevel = 4; // 10秒后无比强大
            } else if (this.spacePressedDuration >= 5000) {
                newWeaponLevel = 3; // 5秒后更强
            } else if (this.spacePressedDuration >= 3000) {
                newWeaponLevel = 2; // 3秒后升级
            }
            
            // 武器升级提示
            if (newWeaponLevel > this.weaponLevel) {
                this.weaponLevel = newWeaponLevel;
                this.showWeaponUpgrade(newWeaponLevel);
            }
            
            // 🔥 持续射击 - 根据武器等级设置不同的射击频率
            const shootIntervals = { 1: 80, 2: 60, 3: 45, 4: 30 }; // 武器等级越高射击越快
            const shootInterval = shootIntervals[this.weaponLevel] || 80;
            
            if (currentTime - this.lastShotTime >= shootInterval) {
                this.shootByWeaponLevel();
                this.lastShotTime = currentTime;
            }
        }
    }

    // 显示武器升级效果
    showWeaponUpgrade(level) {
        const messages = {
            2: '🔥 火力升级！三重射击！',
            3: '⚡ 超级武器！五重射击！',
            4: '🌟 终极火力！全方位轰炸！'
        };
        
        const descriptions = {
            2: '射击频率提升 + 三方向射击',
            3: '超高频射击 + 五方向扇射',
            4: '极速射击 + 全屏覆盖火力'
        };
        
        this.addFloatingText(this.canvas.width / 2, 150, messages[level], '#ffd700');
        this.addFloatingText(this.canvas.width / 2, 170, descriptions[level], '#ffaa00');
        
        // 根据武器等级调整震动强度
        this.screenShake = 15 + (level * 5);
        
        // 添加升级特效 - 等级越高粒子越多
        this.addParticles(this.canvas.width / 2, 150, '#ffd700', 10 + (level * 5));
        
        // 额外的升级音效提示（视觉）
        for (let i = 0; i < level; i++) {
            setTimeout(() => {
                this.addParticles(this.canvas.width / 2, 150, '#ffffff', 8);
            }, i * 100);
        }
    }

    // 根据武器等级射击
    shootByWeaponLevel() {
        const playerX = this.player.x;
        const playerY = this.player.y - 20;
        
        switch(this.weaponLevel) {
            case 1: // 基础单发
                this.bullets.push(new Bullet(playerX, playerY, -8, 'player'));
                break;
                
            case 2: // 三重射击
                this.bullets.push(new Bullet(playerX, playerY, -8, 'player'));
                this.bullets.push(new Bullet(playerX - 20, playerY, -8, 'player'));
                this.bullets.push(new Bullet(playerX + 20, playerY, -8, 'player'));
                break;
                
            case 3: // 五重射击
                for (let i = -2; i <= 2; i++) {
                    this.bullets.push(new Bullet(playerX + i * 15, playerY, -8, 'player'));
                }
                break;
                
            case 4: // 全方位轰炸
                // 直射 - 7发
                for (let i = -3; i <= 3; i++) {
                    this.bullets.push(new Bullet(playerX + i * 12, playerY, -8, 'player'));
                }
                // 斜射上层 - 5发
                for (let i = -2; i <= 2; i++) {
                    this.bullets.push(new Bullet(playerX + i * 20, playerY, -6, 'player', i * 2));
                }
                // 斜射下层 - 3发
                for (let i = -1; i <= 1; i++) {
                    this.bullets.push(new Bullet(playerX + i * 25, playerY + 10, -5, 'player', i * 3));
                }
                // 侧射 - 4发
                this.bullets.push(new Bullet(playerX - 35, playerY, -4, 'player', -4));
                this.bullets.push(new Bullet(playerX + 35, playerY, -4, 'player', 4));
                this.bullets.push(new Bullet(playerX - 25, playerY + 15, -3, 'player', -3));
                this.bullets.push(new Bullet(playerX + 25, playerY + 15, -3, 'player', 3));
                
                // 额外的终极火力特效
                this.addParticles(playerX, playerY, '#ffd700', 3);
                break;
        }
        
        // 调整射击冷却
        const cooldowns = { 1: 150, 2: 120, 3: 80, 4: 50 };
        this.shotCooldown = cooldowns[this.weaponLevel] || 150;
    }

    usePowerup() {
        // 道具使用逻辑
        if (this.activeEffects.length > 0) {
            const effect = this.activeEffects[0];
            if (effect.type === 'speed') {
                this.player.speed *= 1.5;
                this.addFloatingText(this.player.x, this.player.y, '加速！', '#4ecdc4');
            }
        }
    }

    // 🎮 关卡系统更新
    updateStageSystem() {
        // 检查是否应该进入下一关
        if (this.stageEnemiesDefeated >= this.stageRequiredKills || 
            (this.gameTime - this.stageStartTime) >= this.stageDuration) {
            this.nextStage();
        }
    }

    // 进入下一关
    nextStage() {
        if (this.currentStage < this.maxStages) {
            this.currentStage++;
            this.stageStartTime = this.gameTime;
            this.stageEnemiesDefeated = 0;
            
            // 根据关卡调整难度
            this.adjustStageSettings();
            
            // 显示关卡切换
            this.showStageTransition();
        }
    }

    // 调整关卡设置
    adjustStageSettings() {
        const stageConfigs = {
            1: {
                name: "第一关 - 侦察部队",
                theme: "classic",
                requiredKills: 10,
                enemySpawnRate: 2000,
                enemyHealthMultiplier: 1,
                enemySpeedMultiplier: 1,
                specialEnemyChance: 0.1,
                bossType: "scout_boss",
                bgColor: "#001122",
                description: "🔍 基础战斗训练"
            },
            2: {
                name: "第二关 - 轻型护卫",
                theme: "forest",
                requiredKills: 15,
                enemySpawnRate: 1800,
                enemyHealthMultiplier: 1.2,
                enemySpeedMultiplier: 1.1,
                specialEnemyChance: 0.2,
                bossType: "guard_boss",
                bgColor: "#003300",
                description: "🌲 森林上空作战"
            },
            3: {
                name: "第三关 - 中型战队",
                theme: "desert",
                requiredKills: 20,
                enemySpawnRate: 1500,
                enemyHealthMultiplier: 1.5,
                enemySpeedMultiplier: 1.2,
                specialEnemyChance: 0.3,
                bossType: "tank_boss",
                bgColor: "#332200",
                description: "🏜️ 沙漠风暴战役"
            },
            4: {
                name: "第四关 - 重型部队",
                theme: "ocean",
                requiredKills: 25,
                enemySpawnRate: 1200,
                enemyHealthMultiplier: 2,
                enemySpeedMultiplier: 1.3,
                specialEnemyChance: 0.4,
                bossType: "battleship_boss",
                bgColor: "#001133",
                description: "🌊 海洋要塞攻坚"
            },
            5: {
                name: "第五关 - 精英舰队",
                theme: "volcano",
                requiredKills: 30,
                enemySpawnRate: 1000,
                enemyHealthMultiplier: 2.5,
                enemySpeedMultiplier: 1.4,
                specialEnemyChance: 0.5,
                bossType: "fire_boss",
                bgColor: "#330011",
                description: "🌋 火山口激战"
            },
            6: {
                name: "第六关 - 母舰突袭",
                theme: "space",
                requiredKills: 35,
                enemySpawnRate: 800,
                enemyHealthMultiplier: 3,
                enemySpeedMultiplier: 1.5,
                specialEnemyChance: 0.6,
                bossType: "mothership_boss",
                bgColor: "#110033",
                description: "🚀 太空母舰决战"
            },
            7: {
                name: "第七关 - 宇宙深渊",
                theme: "abyss",
                requiredKills: 40,
                enemySpawnRate: 700,
                enemyHealthMultiplier: 3.5,
                enemySpeedMultiplier: 1.6,
                specialEnemyChance: 0.7,
                bossType: "void_boss",
                bgColor: "#000000",
                description: "🕳️ 深渊虚空挑战"
            },
            8: {
                name: "第八关 - 能量风暴",
                theme: "energy",
                requiredKills: 45,
                enemySpawnRate: 600,
                enemyHealthMultiplier: 4,
                enemySpeedMultiplier: 1.7,
                specialEnemyChance: 0.8,
                bossType: "energy_boss",
                bgColor: "#220033",
                description: "⚡ 能量风暴领域"
            },
            9: {
                name: "第九关 - 时空裂缝",
                theme: "time",
                requiredKills: 50,
                enemySpawnRate: 500,
                enemyHealthMultiplier: 4.5,
                enemySpeedMultiplier: 1.8,
                specialEnemyChance: 0.9,
                bossType: "time_boss",
                bgColor: "#003322",
                description: "⏰ 时空扭曲战场"
            },
            10: {
                name: "第十关 - 终极维度",
                theme: "ultimate",
                requiredKills: 0, // 终极BOSS关
                enemySpawnRate: 400,
                enemyHealthMultiplier: 5,
                enemySpeedMultiplier: 2,
                specialEnemyChance: 1.0,
                bossType: "ultimate_boss",
                bgColor: "#220011",
                description: "🌌 终极维度决战"
            }
        };

        const config = stageConfigs[this.currentStage];
        if (config) {
            this.currentStageName = config.name;
            this.stageRequiredKills = config.requiredKills;
            this.enemySpawnRate = config.enemySpawnRate;
            this.enemyHealthMultiplier = config.enemyHealthMultiplier;
            this.enemySpeedMultiplier = config.enemySpeedMultiplier;
            this.specialEnemyChance = config.specialEnemyChance;
            this.currentStageTheme = config.theme;
            this.stageDescription = config.description;
            this.stageBgColor = config.bgColor;
            this.stageBossType = config.bossType;
            
            // 玩家飞机升级
            this.upgradePlayerAircraft();
            
            // 应用主题背景
            this.applyStageTheme();
        }
    }

    // 显示关卡过渡
    showStageTransition() {
        const stageName = this.currentStageName || `第${this.currentStage}关`;
        this.addFloatingText(this.canvas.width / 2, this.canvas.height / 2, stageName, '#00ff88');
        if (this.stageRequiredKills > 0) {
            this.addFloatingText(this.canvas.width / 2, this.canvas.height / 2 + 40, 
                `击败${this.stageRequiredKills}个敌人进入下一关！`, '#ffffff');
        } else {
            this.addFloatingText(this.canvas.width / 2, this.canvas.height / 2 + 40, 
                '准备迎接最终BOSS！', '#ff6b6b');
        }
        
        // 屏幕震动效果
        this.screenShake = 15;
        
        // 添加关卡切换粒子效果
        this.addParticles(this.canvas.width / 2, this.canvas.height / 2, '#00ff88', 20);
    }

    // 🎨 应用关卡主题
    applyStageTheme() {
        // 更新canvas背景颜色
        if (this.stageBgColor) {
            document.body.style.backgroundColor = this.stageBgColor;
        }
        
        // 根据主题调整背景层
        this.updateBackgroundForTheme();
    }

    // 🚁 升级玩家飞机
    upgradePlayerAircraft() {
        this.playerLevel = Math.min(10, this.currentStage);
        if (this.player) {
            this.player.level = this.playerLevel;
            this.player.upgradeStats();
        }
    }

    // 🌌 根据主题更新背景
    updateBackgroundForTheme() {
        const themeColors = {
            classic: { star: '#ffffff', meteor: '#40c9ff', cloud: '#106ebe' },
            forest: { star: '#90ff90', meteor: '#00ff00', cloud: '#228B22' },
            desert: { star: '#ffdd44', meteor: '#ff8800', cloud: '#CD853F' },
            ocean: { star: '#87ceeb', meteor: '#4169e1', cloud: '#4682b4' },
            volcano: { star: '#ff6b6b', meteor: '#ff4500', cloud: '#8b0000' },
            space: { star: '#ffffff', meteor: '#9370db', cloud: '#483d8b' },
            abyss: { star: '#666666', meteor: '#8b00ff', cloud: '#2f2f2f' },
            energy: { star: '#00ffff', meteor: '#ff00ff', cloud: '#4b0082' },
            time: { star: '#ffd700', meteor: '#32cd32', cloud: '#008b8b' },
            ultimate: { star: '#ff1493', meteor: '#00ffff', cloud: '#ff4500' }
        };
        
        const colors = themeColors[this.currentStageTheme] || themeColors.classic;
        
        // 更新背景层颜色
        this.backgroundLayers.forEach(layer => {
            if (layer.type === 'stars') layer.color = colors.star;
            if (layer.type === 'meteors') layer.color = colors.meteor;
            if (layer.type === 'clouds') layer.color = colors.cloud;
        });
    }

    // 检查是否应该生成BOSS
    shouldSpawnBoss() {
        // 每3关生成一次BOSS，或第10关终极BOSS
        return ((this.currentStage % 3 === 0 || this.currentStage === 10) && this.stageEnemiesDefeated >= this.stageRequiredKills && !this.boss) ||
               (this.gameTime > this.bossTime && !this.boss);
    }

    // ===== 更新方法 =====
    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(this.deltaTime);
            
            // 敌人射击
            if (Math.random() < 0.003) {
                this.enemyBullets.push(new Bullet(enemy.x, enemy.y + 20, 5, 'enemy'));
            }
            
            // 移除超出屏幕的敌人
            if (enemy.y > this.canvas.height + 50) {
                this.enemies.splice(i, 1);
            }
        }
    }

    updateBoss() {
        if (this.boss) {
            this.boss.update(this.deltaTime);
            
            // BOSS攻击
            if (Math.random() < 0.02) {
                this.enemyBullets.push(new Bullet(this.boss.x - 20, this.boss.y + 40, 6, 'boss'));
                this.enemyBullets.push(new Bullet(this.boss.x + 20, this.boss.y + 40, 6, 'boss'));
            }
            
            // 更新BOSS血条
            const healthPercent = (this.boss.health / this.boss.maxHealth) * 100;
            document.getElementById('bossHealthFill').style.width = healthPercent + '%';
            
            // BOSS阶段
            const phase = this.boss.health > this.boss.maxHealth * 0.5 ? 1 : 2;
            document.getElementById('bossPhase').textContent = '阶段 ' + phase;
        }
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(this.deltaTime);
            
            if (bullet.y < -10 || bullet.y > this.canvas.height + 10) {
                this.bullets.splice(i, 1);
            }
        }
    }

    updateEnemyBullets() {
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.update(this.deltaTime);
            
            if (bullet.y < -10 || bullet.y > this.canvas.height + 10) {
                this.enemyBullets.splice(i, 1);
            }
        }
    }

    updateExplosions() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.update(this.deltaTime);
            
            if (explosion.finished) {
                this.explosions.splice(i, 1);
            }
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(this.deltaTime);
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updatePowerups() {
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];
            powerup.update(this.deltaTime);
            
            if (powerup.y > this.canvas.height + 50) {
                this.powerups.splice(i, 1);
            }
        }
    }

    updateActiveEffects() {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            effect.duration -= this.deltaTime;
            
            if (effect.duration <= 0) {
                this.activeEffects.splice(i, 1);
            }
        }
    }

    updateBackgroundLayers() {
        this.backgroundLayers.forEach(layer => {
            layer.elements.forEach(element => {
                switch(layer.type) {
                    case 'stars':
                        element.y += layer.speed;
                        element.twinkle += 0.1;
                        if (element.y > this.canvas.height) {
                            element.y = -10;
                            element.x = Math.random() * this.canvas.width;
                            element.brightness = Math.random();
                        }
                        break;
                        
                    case 'meteors':
                        element.x += Math.cos(element.angle) * element.speed;
                        element.y += Math.sin(element.angle) * element.speed + layer.speed;
                        if (element.y > this.canvas.height + 50 || element.x > this.canvas.width + 50) {
                            element.x = -50;
                            element.y = Math.random() * this.canvas.height * 0.3;
                            element.speed = 2 + Math.random() * 3;
                        }
                        break;
                        
                    case 'clouds':
                        element.y += layer.speed;
                        element.x += element.drift * 0.3;
                        if (element.y > this.canvas.height + element.height) {
                            element.y = -element.height;
                            element.x = Math.random() * this.canvas.width;
                        }
                        break;
                        
                    case 'starfield':
                        element.y += layer.speed;
                        element.pulse += 0.15;
                        if (element.y > this.canvas.height) {
                            element.y = -10;
                            element.x = Math.random() * this.canvas.width;
                        }
                        break;
                }
            });
        });
    }

    updatePerspectiveLines() {
        this.perspectiveLines.forEach(line => {
            line.distance += line.speed;
            if (line.distance > 1000) {
                line.distance = 0;
            }
        });
    }

    updateScreenShake() {
        if (this.screenShake > 0) {
            this.screenShake -= this.deltaTime * 0.01;
            if (this.screenShake < 0) this.screenShake = 0;
        }
    }

    // ===== 碰撞检测 =====
    checkCollisions() {
        // 玩家子弹 vs 敌人
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // vs 普通敌人
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (this.isColliding(bullet, enemy)) {
                    this.bullets.splice(i, 1);
                    enemy.health--;
                    
                    if (enemy.health <= 0) {
                        this.destroyEnemy(enemy, j);
                    }
                    this.addParticles(enemy.x, enemy.y, '#ff6b6b', 5);
                    break;
                }
            }
            
            // vs BOSS
            if (this.boss && this.isColliding(bullet, this.boss)) {
                this.bullets.splice(i, 1);
                this.boss.health--;
                this.addParticles(this.boss.x, this.boss.y, '#ff6b6b', 8);
                this.screenShake = 10;
                
                if (this.boss.health <= 0) {
                    this.destroyBoss();
                }
            }
        }

        // 敌人子弹 vs 玩家
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            if (this.player && this.isColliding(bullet, this.player)) {
                this.enemyBullets.splice(i, 1);
                this.player.takeDamage(10);
                this.addParticles(this.player.x, this.player.y, '#4ecdc4', 5);
                this.screenShake = 15;
            }
        }

        // 玩家 vs 敌人
        if (this.player) {
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                if (this.isColliding(this.player, enemy)) {
                    this.player.takeDamage(20);
                    this.destroyEnemy(enemy, i);
                    this.screenShake = 20;
                }
            }
        }

        // 玩家 vs 道具
        if (this.player) {
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const powerup = this.powerups[i];
                if (this.isColliding(this.player, powerup)) {
                    this.collectPowerup(powerup);
                    this.powerups.splice(i, 1);
                }
            }
        }
    }

    isColliding(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (obj1.radius || 15) + (obj2.radius || 15);
    }

    // ===== 游戏事件处理 =====
    destroyEnemy(enemy, index) {
        this.enemies.splice(index, 1);
        this.explosions.push(new Explosion(enemy.x, enemy.y));
        this.addExp(10);
        this.score += 100;
        this.enemiesDefeated++;
        
        // 🎮 关卡系统：增加本关击败数
        this.stageEnemiesDefeated++;
        
        // 掉落道具
        if (Math.random() < 0.2) {
            this.powerups.push(new Powerup(enemy.x, enemy.y));
        }
    }

    destroyBoss() {
        this.explosions.push(new Explosion(this.boss.x, this.boss.y, 'large'));
        this.addExp(100);
        this.score += 1000;
        this.boss = null;
        document.getElementById('bossHealthBar').classList.add('hidden');
        this.victory();
    }

    collectPowerup(powerup) {
        this.addFloatingText(powerup.x, powerup.y, powerup.type.toUpperCase(), '#ffeaa7');
        
        // 激活玩家道具效果
        this.player.activateEffect(5000);
        
        // 根据道具类型应用效果
        switch(powerup.type) {
            case 'speed':
                this.player.speed *= 1.5;
                setTimeout(() => { this.player.speed /= 1.5; }, 5000);
                break;
            case 'health':
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
                break;
            case 'weapon':
                this.shotCooldown = Math.max(50, this.shotCooldown * 0.5);
                setTimeout(() => { this.shotCooldown *= 2; }, 5000);
                break;
            case 'shield':
                // 临时无敌效果在碰撞检测中处理
                break;
        }
        
        this.activeEffects.push({
            type: powerup.type,
            duration: 5000,
            text: this.getPowerupText(powerup.type)
        });
    }

    getPowerupText(type) {
        switch(type) {
            case 'speed': return '⚡ 加速';
            case 'health': return '❤️ 治疗';
            case 'weapon': return '🔫  火力';
            case 'shield': return '🛡️ 护盾';
            default: return type;
        }
    }

    addExp(amount) {
        this.exp += amount;
        if (this.exp >= this.maxExp) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.exp = 0;
        this.maxExp = Math.floor(this.maxExp * 1.2);
        this.showLevelUpNotification();
        
        // 升级奖励
        if (this.level === 2) {
            this.shotCooldown = 120;
        } else if (this.level === 3) {
            // 三重射击在shoot方法中处理
        } else if (this.level >= 4) {
            this.player.maxHealth += 20;
            this.player.health = this.player.maxHealth;
        }
    }

    showLevelUpNotification() {
        const notification = document.getElementById('levelUpNotification');
        const message = document.getElementById('levelUpMessage');
        message.textContent = `升级到等级 ${this.level}`;
        
        notification.classList.remove('hidden');
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }

    addFloatingText(x, y, text, color) {
        this.particles.push(new FloatingText(x, y, text, color));
    }

    addParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    victory() {
        this.gameState = 'victory';
        document.getElementById('gameOverTitle').textContent = '🎉 胜利！';
        this.showGameOver();
    }

    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('gameOverTitle').textContent = '💥 游戏结束';
        this.showGameOver();
    }

    showGameOver() {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
        document.getElementById('enemiesDefeated').textContent = this.enemiesDefeated;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    checkVictory() {
        if (this.boss && this.boss.health <= 0) {
            this.victory();
        }
    }

    // ===== UI更新 =====
    updateUI() {
        document.getElementById('level').textContent = this.level;
        document.getElementById('exp').textContent = this.exp;
        document.getElementById('maxExp').textContent = this.maxExp;
        document.getElementById('score').textContent = this.score;
        
        if (this.player) {
            document.getElementById('health').textContent = this.player.health;
            const healthPercent = (this.player.health / this.player.maxHealth) * 100;
            document.getElementById('healthFill').style.width = healthPercent + '%';
        }
        
        const expPercent = (this.exp / this.maxExp) * 100;
        document.getElementById('expFill').style.width = expPercent + '%';
        
        // 🎮 更新关卡信息
        this.updateStageUI();
        
        // 🔥 更新武器等级显示
        this.updateWeaponUI();
        
        // 更新升级列表
        this.updateUpgradesList();
        
        // 更新道具效果
        this.updateActiveEffectsUI();
    }

    // 🎮 更新关卡UI
    updateStageUI() {
        // 使用HTML中已有的元素
        const currentStageEl = document.getElementById('currentStage');
        const stageProgressEl = document.getElementById('stageProgress');
        const stageNameEl = document.getElementById('stageName');
        
        if (currentStageEl) currentStageEl.textContent = this.currentStage;
        if (stageProgressEl) stageProgressEl.textContent = 
            `${this.stageEnemiesDefeated}/${this.stageRequiredKills}`;
        if (stageNameEl) stageNameEl.textContent = 
            this.currentStageName || `第${this.currentStage}关`;
        
        // 显示关卡描述（如果有）
        if (this.stageDescription) {
            if (stageNameEl) {
                stageNameEl.textContent = `${this.currentStageName} - ${this.stageDescription}`;
            }
        }
    }

    // 🔥 更新武器等级UI
    updateWeaponUI() {
        // 使用HTML中已有的元素
        const weaponLevelEl = document.getElementById('weaponLevel');
        const weaponDescriptionEl = document.getElementById('weaponDescription');
        const weaponDurationEl = document.getElementById('weaponDuration');
        const weaponNextUpgradeEl = document.getElementById('weaponNextUpgrade');
        
        if (weaponLevelEl) weaponLevelEl.textContent = `Lv.${this.weaponLevel}`;
        
        const weaponPowers = {
            1: '基础激光炮',
            2: '🔥 三重射击',
            3: '⚡ 五重射击',
            4: '🌟 全方位轰炸'
        };
        if (weaponDescriptionEl) weaponDescriptionEl.textContent = weaponPowers[this.weaponLevel] || '基础激光炮';
        
        // 显示持续时间和下一级提示
        if (this.spacePressed && this.spacePressedDuration > 0) {
            const seconds = (this.spacePressedDuration / 1000).toFixed(1);
            if (weaponDurationEl) weaponDurationEl.textContent = `${seconds}s`;
            
            // 显示下一级武器提示
            const nextUpgrade = {
                1: { time: 3, name: '三重射击' },
                2: { time: 5, name: '五重射击' },
                3: { time: 10, name: '全方位轰炸' },
                4: { time: null, name: '已达最高级' }
            };
            
            const next = nextUpgrade[this.weaponLevel];
            if (weaponNextUpgradeEl) {
                if (next.time && parseFloat(seconds) < next.time) {
                    const remaining = (next.time - parseFloat(seconds)).toFixed(1);
                    weaponNextUpgradeEl.textContent = `${remaining}秒后升级为: ${next.name}`;
                } else if (next.time === null) {
                    weaponNextUpgradeEl.textContent = '🎯 已达最高级！';
                } else {
                    weaponNextUpgradeEl.textContent = '';
                }
            }
        } else {
            if (weaponDurationEl) weaponDurationEl.textContent = '0.0s';
            if (weaponNextUpgradeEl) weaponNextUpgradeEl.textContent = 
                this.spacePressed ? '' : '按住空格键连续射击升级';
        }
    }

    updateUpgradesList() {
        const upgradesList = document.getElementById('upgradesList');
        const upgrades = [
            '等级 1: 基础火力',
            '等级 2: 射击冷却-20%',
            '等级 3: 三重射击',
            '等级 4+: 生命值+20'
        ];
        
        upgradesList.innerHTML = '';
        for (let i = 0; i < this.level && i < upgrades.length; i++) {
            const li = document.createElement('li');
            li.className = 'upgrade-item';
            li.innerHTML = `
                <span class="upgrade-icon">⭐</span>
                <span class="upgrade-text">${upgrades[i]}</span>
            `;
            upgradesList.appendChild(li);
        }
    }

    updateActiveEffectsUI() {
        const container = document.getElementById('activeEffects');
        container.innerHTML = '';
        
        this.activeEffects.forEach(effect => {
            const div = document.createElement('div');
            div.className = 'effect';
            div.textContent = `${effect.text} ${Math.ceil(effect.duration / 1000)}s`;
            container.appendChild(div);
        });
    }

    // ===== 渲染系统 =====
    render() {
        this.ctx.save();
        
        // 应用屏幕震动
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(shakeX, shakeY);
        }

        // 清空画布
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 渲染背景
        this.renderBackground();
        this.renderPerspectiveLines();

        if (this.gameState === 'playing' || this.gameState === 'paused') {
            // 渲染游戏对象
            this.renderPowerups();
            this.renderEnemies();
            this.renderBoss();
            this.renderPlayer();
            this.renderBullets();
            this.renderEnemyBullets();
            this.renderExplosions();
            this.renderParticles();
        }

        // 渲染暂停提示
        if (this.gameState === 'paused') {
            this.renderPauseScreen();
        }

        this.ctx.restore();
    }

    renderBackground() {
        this.backgroundLayers.forEach(layer => {
            this.ctx.save();
            this.ctx.globalAlpha = layer.opacity;
            
            switch(layer.type) {
                case 'stars':
                    this.renderStarLayer(layer);
                    break;
                case 'meteors':
                    this.renderMeteorLayer(layer);
                    break;
                case 'clouds':
                    this.renderCloudLayer(layer);
                    break;
                case 'starfield':
                    this.renderStarfieldLayer(layer);
                    break;
            }
            
            this.ctx.restore();
        });
    }

    renderStarLayer(layer) {
        layer.elements.forEach(star => {
            const brightness = star.brightness * (0.5 + Math.sin(star.twinkle) * 0.5);
            const size = layer.size * (0.5 + brightness * 0.5);
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 星星闪烁效果
            if (brightness > 0.7) {
                this.ctx.shadowColor = 'white';
                this.ctx.shadowBlur = 8;
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, size * 0.5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        });
    }

    renderMeteorLayer(layer) {
        layer.elements.forEach(meteor => {
            const endX = meteor.x + Math.cos(meteor.angle) * meteor.length;
            const endY = meteor.y + Math.sin(meteor.angle) * meteor.length;
            
            // 流星尾迹渐变
            const gradient = this.ctx.createLinearGradient(meteor.x, meteor.y, endX, endY);
            gradient.addColorStop(0, `rgba(64, 201, 255, ${meteor.brightness})`);
            gradient.addColorStop(0.7, `rgba(135, 206, 250, ${meteor.brightness * 0.6})`);
            gradient.addColorStop(1, 'rgba(64, 201, 255, 0)');
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(meteor.x, meteor.y);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            
            // 流星头部发光
            this.ctx.shadowColor = '#40c9ff';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(meteor.x, meteor.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }

    renderCloudLayer(layer) {
        layer.elements.forEach(cloud => {
            const gradient = this.ctx.createRadialGradient(
                cloud.x + cloud.width/2, cloud.y + cloud.height/2, 0,
                cloud.x + cloud.width/2, cloud.y + cloud.height/2, cloud.width/2
            );
            gradient.addColorStop(0, `rgba(16, 110, 190, ${cloud.opacity})`);
            gradient.addColorStop(0.7, `rgba(16, 110, 190, ${cloud.opacity * 0.5})`);
            gradient.addColorStop(1, 'rgba(16, 110, 190, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.ellipse(
                cloud.x + cloud.width/2, 
                cloud.y + cloud.height/2, 
                cloud.width/2, 
                cloud.height/2, 
                0, 0, Math.PI * 2
            );
            this.ctx.fill();
        });
    }

    renderStarfieldLayer(layer) {
        layer.elements.forEach(star => {
            const pulse = 0.7 + Math.sin(star.pulse) * 0.3;
            const size = star.size * pulse;
            
            // 星点光晕
            const starGradient = this.ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, size * 2);
            starGradient.addColorStop(0, star.color);
            starGradient.addColorStop(0.5, `${star.color}80`);
            starGradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = starGradient;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, size * 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 星点核心
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, size * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    renderPerspectiveLines() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = '#4ecdc4';
        this.ctx.lineWidth = 1;

        this.perspectiveLines.forEach(line => {
            const startX = line.centerX;
            const startY = line.centerY;
            const endX = startX + Math.cos(line.angle) * line.distance;
            const endY = startY + Math.sin(line.angle) * line.distance;

            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        });

        this.ctx.restore();
    }

    renderPlayer() {
        if (this.player) {
            this.player.render(this.ctx);
        }
    }

    renderEnemies() {
        this.enemies.forEach(enemy => {
            enemy.render(this.ctx);
        });
    }

    renderBoss() {
        if (this.boss) {
            this.boss.render(this.ctx);
        }
    }

    renderBullets() {
        this.bullets.forEach(bullet => {
            bullet.render(this.ctx);
        });
    }

    renderEnemyBullets() {
        this.enemyBullets.forEach(bullet => {
            bullet.render(this.ctx);
        });
    }

    renderExplosions() {
        this.explosions.forEach(explosion => {
            explosion.render(this.ctx);
        });
    }

    renderParticles() {
        this.particles.forEach(particle => {
            particle.render(this.ctx);
        });
    }

    renderPowerups() {
        this.powerups.forEach(powerup => {
            powerup.render(this.ctx);
        });
    }

    renderPauseScreen() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('游戏暂停', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText('按暂停键继续游戏', this.canvas.width / 2, this.canvas.height / 2 + 50);
        this.ctx.restore();
    }
}

// ===== 玩家类 =====
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.speed = 5;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.radius = 20;
        
        // 飞机等级系统
        this.level = 1;
        this.maxLevel = 10;
        this.baseStats = {
            width: 40,
            height: 60,
            speed: 5,
            maxHealth: 100
        };
        
        // 2.5D效果属性
        this.scale = 1;
        this.rotation = 0;
        this.shadowOffset = { x: 3, y: 8 };
        
        // 尾迹粒子
        this.trailParticles = [];
        
        // 道具效果状态
        this.hasActiveEffect = false;
        this.effectTimer = 0;
        
        // 升级特效
        this.upgradeEffect = {
            active: false,
            timer: 0,
            particles: []
        };
    }

    // 🚁 升级飞机属性
    upgradeStats() {
        const upgradeFactor = 1 + (this.level - 1) * 0.1; // 每级10%提升
        
        // 保持当前生命值比例
        const healthRatio = this.health / this.maxHealth;
        
        // 升级属性
        this.width = this.baseStats.width * Math.min(1.5, upgradeFactor);
        this.height = this.baseStats.height * Math.min(1.5, upgradeFactor);
        this.speed = this.baseStats.speed * Math.min(1.8, upgradeFactor);
        this.maxHealth = this.baseStats.maxHealth * upgradeFactor;
        this.health = this.maxHealth * healthRatio;
        this.radius = 20 * Math.min(1.3, upgradeFactor);
        
        // 激活升级特效
        this.activateUpgradeEffect();
    }

    // 激活升级特效
    activateUpgradeEffect() {
        this.upgradeEffect.active = true;
        this.upgradeEffect.timer = 3000; // 3秒特效
        this.upgradeEffect.particles = [];
        
        // 生成升级粒子
        for (let i = 0; i < 20; i++) {
            this.upgradeEffect.particles.push({
                x: this.x + (Math.random() - 0.5) * 40,
                y: this.y + (Math.random() - 0.5) * 40,
                life: 1,
                velocity: {
                    x: (Math.random() - 0.5) * 4,
                    y: (Math.random() - 0.5) * 4
                },
                color: this.getUpgradeColor(),
                size: 2 + Math.random() * 3
            });
        }
    }

    // 获取升级特效颜色
    getUpgradeColor() {
        const colors = ['#40c9ff', '#00ff88', '#ffaa00', '#ff6b6b', '#9966ff'];
        return colors[Math.floor(this.level / 2) % colors.length];
    }

    update(keys, deltaTime) {
        // 移动控制
        if (keys.ArrowLeft && this.x > this.width / 2) {
            this.x -= this.speed;
            this.rotation = -0.2; // 左倾
        } else if (keys.ArrowRight && this.x < 900 - this.width / 2) {
            this.x += this.speed;
            this.rotation = 0.2; // 右倾
        } else {
            this.rotation *= 0.9; // 回正
        }

        if (keys.ArrowUp && this.y > this.height / 2) {
            this.y -= this.speed;
            this.scale = 0.9; // 缩小模拟高度
        } else if (keys.ArrowDown && this.y < 700 - this.height / 2) {
            this.y += this.speed;
            this.scale = 1.1; // 放大模拟降低
        } else {
            this.scale = 1; // 恢复正常大小
        }

        // 更新道具效果
        this.updateEffects(deltaTime);

        // 更新升级特效
        this.updateUpgradeEffect(deltaTime);

        // 更新尾迹粒子
        this.updateTrailParticles(deltaTime);
        
        // 添加新的尾迹粒子（更频繁、更亮）
        if (Math.random() < 0.5) {
            this.trailParticles.push({
                x: this.x + (Math.random() - 0.5) * 20,
                y: this.y + 25,
                life: 1,
                maxLife: 1,
                velocity: { x: (Math.random() - 0.5) * 2, y: Math.random() * 3 + 2 },
                size: 1 + Math.random() * 2,
                brightness: 0.5 + Math.random() * 0.5
            });
        }
    }

    updateEffects(deltaTime) {
        if (this.effectTimer > 0) {
            this.effectTimer -= deltaTime;
            this.hasActiveEffect = true;
        } else {
            this.hasActiveEffect = false;
        }
    }

    // 更新升级特效
    updateUpgradeEffect(deltaTime) {
        if (this.upgradeEffect.active) {
            this.upgradeEffect.timer -= deltaTime;
            
            // 更新升级粒子
            for (let i = this.upgradeEffect.particles.length - 1; i >= 0; i--) {
                const particle = this.upgradeEffect.particles[i];
                particle.life -= deltaTime * 0.001;
                particle.x += particle.velocity.x;
                particle.y += particle.velocity.y;
                
                if (particle.life <= 0) {
                    this.upgradeEffect.particles.splice(i, 1);
                }
            }
            
            // 结束特效
            if (this.upgradeEffect.timer <= 0) {
                this.upgradeEffect.active = false;
                this.upgradeEffect.particles = [];
            }
        }
    }

    activateEffect(duration = 5000) {
        this.effectTimer = duration;
        this.hasActiveEffect = true;
    }

    updateTrailParticles(deltaTime) {
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const particle = this.trailParticles[i];
            particle.life -= deltaTime * 0.002;
            particle.x += particle.velocity.x;
            particle.y += particle.velocity.y;
            
            if (particle.life <= 0) {
                this.trailParticles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        ctx.save();
        
        // 渲染升级特效
        this.renderUpgradeEffect(ctx);
        
        // 渲染飞机光圈（道具效果时）
        this.renderAura(ctx);
        
        // 渲染阴影（模糊半透明）
        this.renderShadow(ctx);
        
        // 渲染尾迹
        this.renderTrail(ctx);
        
        // 主体渲染
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        // 🚀 精绘飞机贴图 - 科幻未来风
        this.renderSciFiAircraft(ctx);
        
        ctx.restore();
    }

    // 渲染升级特效
    renderUpgradeEffect(ctx) {
        if (this.upgradeEffect.active) {
            this.upgradeEffect.particles.forEach(particle => {
                ctx.save();
                ctx.globalAlpha = particle.life;
                ctx.fillStyle = particle.color;
                ctx.shadowColor = particle.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }
    }

    renderSciFiAircraft(ctx) {
        // 根据等级获取颜色主题
        const levelColors = this.getLevelColors();
        
        // 飞机机身 - 根据等级变化颜色
        const bodyGradient = ctx.createLinearGradient(0, -30, 0, 30);
        bodyGradient.addColorStop(0, levelColors.primary);
        bodyGradient.addColorStop(0.3, levelColors.secondary);
        bodyGradient.addColorStop(0.7, levelColors.accent);
        bodyGradient.addColorStop(1, levelColors.dark);
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-15, 15);
        ctx.lineTo(-8, 25);
        ctx.lineTo(0, 20);
        ctx.lineTo(8, 25);
        ctx.lineTo(15, 15);
        ctx.lineTo(12, 0);
        ctx.closePath();
        ctx.fill();
        
        // 金属光泽边缘
        ctx.strokeStyle = levelColors.glow;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 驾驶舱窗户反光
        const cockpitGradient = ctx.createRadialGradient(0, -15, 2, 0, -15, 8);
        cockpitGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        cockpitGradient.addColorStop(0.5, `rgba(135, 206, 250, 0.6)`);
        cockpitGradient.addColorStop(1, 'rgba(0, 100, 200, 0.2)');
        
        ctx.fillStyle = cockpitGradient;
        ctx.beginPath();
        ctx.ellipse(0, -15, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 等级相关的特殊装备
        this.renderLevelUpgrades(ctx, levelColors);
        
        // 侧翼装甲细节
        ctx.fillStyle = levelColors.armor;
        ctx.fillRect(-10, -5, 4, 15);
        ctx.fillRect(6, -5, 4, 15);
        
        // 武器装载点 - 根据等级增加数量
        this.renderWeaponMounts(ctx, levelColors);
        
        // 推进器 - 根据等级增强
        this.renderEngines(ctx, levelColors);
    }

    // 获取等级对应的颜色主题
    getLevelColors() {
        const colorThemes = [
            // 等级1-2: 蓝色基础
            { primary: '#00a8ff', secondary: '#0078d4', accent: '#106ebe', dark: '#1e3a5f', glow: '#40c9ff', armor: '#2c5282' },
            // 等级3-4: 绿色进阶
            { primary: '#00d2d3', secondary: '#00a8a8', accent: '#007272', dark: '#1e3a3f', glow: '#00ffff', armor: '#2c5252' },
            // 等级5-6: 紫色高级
            { primary: '#7209b7', secondary: '#5a0a8a', accent: '#430764', dark: '#2d1b3d', glow: '#a855f7', armor: '#553c6b' },
            // 等级7-8: 橙色传说
            { primary: '#ff6b35', secondary: '#e55039', accent: '#c44536', dark: '#3a1f1a', glow: '#ff8c42', armor: '#7a4a3a' },
            // 等级9-10: 金色终极
            { primary: '#ffd700', secondary: '#ffa500', accent: '#ff8c00', dark: '#8b6914', glow: '#ffff00', armor: '#cd853f' }
        ];
        
        const themeIndex = Math.min(Math.floor((this.level - 1) / 2), colorThemes.length - 1);
        return colorThemes[themeIndex];
    }

    // 渲染等级升级装备
    renderLevelUpgrades(ctx, colors) {
        // 护盾生成器 (等级3+)
        if (this.level >= 3) {
            ctx.strokeStyle = colors.glow;
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // 装甲强化 (等级5+)
        if (this.level >= 5) {
            ctx.fillStyle = colors.armor;
            ctx.fillRect(-18, -10, 6, 20);
            ctx.fillRect(12, -10, 6, 20);
            ctx.fillRect(-8, -25, 16, 4);
        }
        
        // 能量核心 (等级7+)
        if (this.level >= 7) {
            const coreGradient = ctx.createRadialGradient(0, 0, 2, 0, 0, 8);
            coreGradient.addColorStop(0, '#ffffff');
            coreGradient.addColorStop(0.5, colors.glow);
            coreGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 量子翼 (等级9+)
        if (this.level >= 9) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = colors.glow;
            ctx.lineWidth = 3;
            ctx.shadowColor = colors.glow;
            ctx.shadowBlur = 15;
            
            // 量子翼效果
            ctx.beginPath();
            ctx.moveTo(-20, -5);
            ctx.lineTo(-35, -15);
            ctx.lineTo(-30, 10);
            ctx.lineTo(-15, 5);
            
            ctx.moveTo(20, -5);
            ctx.lineTo(35, -15);
            ctx.lineTo(30, 10);
            ctx.lineTo(15, 5);
            ctx.stroke();
            
            ctx.restore();
        }
    }

    // 渲染武器装载点
    renderWeaponMounts(ctx, colors) {
        ctx.fillStyle = colors.dark;
        
        // 基础武器点
        ctx.beginPath();
        ctx.arc(-12, 5, 2, 0, Math.PI * 2);
        ctx.arc(12, 5, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 高级武器点 (等级4+)
        if (this.level >= 4) {
            ctx.beginPath();
            ctx.arc(-18, 0, 2, 0, Math.PI * 2);
            ctx.arc(18, 0, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 重武器点 (等级6+)
        if (this.level >= 6) {
            ctx.beginPath();
            ctx.arc(0, -20, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 终极武器点 (等级8+)
        if (this.level >= 8) {
            ctx.beginPath();
            ctx.arc(-8, -18, 2, 0, Math.PI * 2);
            ctx.arc(8, -18, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 渲染引擎系统
    renderEngines(ctx, colors) {
        const engineCount = Math.min(4, Math.floor(this.level / 2) + 2); // 2-4个引擎
        const enginePositions = [
            [{ x: -6, y: 18 }, { x: 6, y: 18 }], // 基础2个
            [{ x: -6, y: 18 }, { x: 6, y: 18 }, { x: -12, y: 20 }], // 3个
            [{ x: -6, y: 18 }, { x: 6, y: 18 }, { x: -12, y: 20 }, { x: 12, y: 20 }] // 4个
        ];
        
        const positions = enginePositions[Math.min(engineCount - 2, 2)];
        
        positions.forEach(pos => {
            // 引擎主体
            const engineGradient = ctx.createRadialGradient(pos.x, pos.y, 2, pos.x, pos.y, 6);
            engineGradient.addColorStop(0, '#ffffff');
            engineGradient.addColorStop(0.3, colors.glow);
            engineGradient.addColorStop(0.7, colors.secondary);
            engineGradient.addColorStop(1, 'transparent');
            
            ctx.shadowColor = colors.glow;
            ctx.shadowBlur = 20;
            ctx.fillStyle = engineGradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // 引擎尾焰
            for (let i = 0; i < 3; i++) {
                const offset = (Math.random() - 0.5) * 4;
                const alpha = 0.3 + Math.random() * 0.4;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = colors.glow;
                ctx.beginPath();
                ctx.arc(pos.x + offset, pos.y + 4 + i * 2, 1 + Math.random(), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });
    }

    renderAura(ctx) {
        // 飞机光圈效果（道具激活时）
        if (this.hasActiveEffect) {
            ctx.save();
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
            
            const auraGradient = ctx.createRadialGradient(this.x, this.y, 20, this.x, this.y, 40);
            auraGradient.addColorStop(0, 'rgba(64, 201, 255, 0.6)');
            auraGradient.addColorStop(1, 'rgba(64, 201, 255, 0)');
            
            ctx.fillStyle = auraGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    renderShadow(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        
        ctx.translate(this.x + this.shadowOffset.x, this.y + this.shadowOffset.y);
        ctx.scale(this.scale * 0.8, this.scale * 0.4); // 扁平阴影
        
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    renderTrail(ctx) {
        this.trailParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            const size = particle.size || 2;
            const brightness = particle.brightness || 0.6;
            
            ctx.save();
            ctx.globalAlpha = alpha * brightness;
            
            // 🌠 子弹尾焰 - 渐变光效
            const trailGradient = ctx.createRadialGradient(
                particle.x, particle.y, 0, 
                particle.x, particle.y, size * alpha * 2
            );
            trailGradient.addColorStop(0, '#ffffff');
            trailGradient.addColorStop(0.3, '#40c9ff');
            trailGradient.addColorStop(1, 'rgba(64, 201, 255, 0)');
            
            ctx.fillStyle = trailGradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, size * alpha * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // 核心亮点
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, size * alpha * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health < 0) this.health = 0;
    }
}

// ===== 敌人类 =====
class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        
        // 根据类型设置属性
        if (type === 'boss') {
            this.width = 60;
            this.height = 60;
            this.speed = 1;
            this.health = 5;
            this.enemyType = 'heavy';
        } else {
            this.width = 30;
            this.height = 30;
            this.speed = 2;
            this.health = 1;
            // 随机敌机子类型
            const subtypes = ['fighter', 'scout', 'bomber', 'interceptor'];
            this.enemyType = subtypes[Math.floor(Math.random() * subtypes.length)];
        }
        
        this.maxHealth = this.health;
        this.radius = this.width / 2;
        
        // 2.5D效果
        this.rotation = 0;
        this.scale = 1;
        this.bobOffset = Math.random() * Math.PI * 2;
        
        // 移动模式
        this.movePattern = Math.random() < 0.3 ? 'zigzag' : 'straight';
        this.moveTimer = 0;
        
        // 动画效果
        this.propellerRotation = 0;
        this.eyeGlow = 0;
        this.thrusterPulse = 0;
    }

    update(deltaTime) {
        this.moveTimer += deltaTime;
        
        // 移动逻辑
        if (this.movePattern === 'zigzag') {
            this.x += Math.sin(this.moveTimer * 0.003) * 2;
        }
        
        this.y += this.speed;
        
        // 浮动效果
        this.scale = 1 + Math.sin(this.moveTimer * 0.005 + this.bobOffset) * 0.1;
        this.rotation = Math.sin(this.moveTimer * 0.002) * 0.2;
        
        // 动画更新
        this.propellerRotation += deltaTime * 0.02;
        this.eyeGlow = 0.5 + Math.sin(this.moveTimer * 0.008) * 0.5;
        this.thrusterPulse = 0.6 + Math.sin(this.moveTimer * 0.01) * 0.4;
    }

    render(ctx) {
        ctx.save();
        
        // 渲染阴影
        this.renderShadow(ctx);
        
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        if (this.type === 'boss') {
            this.renderMiniBoss(ctx);
        } else {
            // 👾 敌机多样建模 - 根据子类型渲染
            switch (this.enemyType) {
                case 'fighter':
                    this.renderFighter(ctx);
                    break;
                case 'scout':
                    this.renderScout(ctx);
                    break;
                case 'bomber':
                    this.renderBomber(ctx);
                    break;
                case 'interceptor':
                    this.renderInterceptor(ctx);
                    break;
                default:
                    this.renderFighter(ctx);
            }
        }
        
        ctx.restore();
    }

    // 🚁 战斗机 - 标准敌机
    renderFighter(ctx) {
        // 机身主体 - 红色金属渐变
        const bodyGradient = ctx.createLinearGradient(0, -15, 0, 15);
        bodyGradient.addColorStop(0, '#ff4757');
        bodyGradient.addColorStop(0.5, '#ff3838');
        bodyGradient.addColorStop(1, '#c44569');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(0, 15);
        ctx.lineTo(-12, -5);
        ctx.lineTo(-6, -15);
        ctx.lineTo(0, -12);
        ctx.lineTo(6, -15);
        ctx.lineTo(12, -5);
        ctx.closePath();
        ctx.fill();
        
        // 金属边框
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        
        // 💀 发光眼睛
        const eyeGlow = this.eyeGlow;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8 * eyeGlow;
        ctx.fillStyle = `rgba(255, 0, 0, ${eyeGlow})`;
        ctx.beginPath();
        ctx.arc(-4, -8, 2, 0, Math.PI * 2);
        ctx.arc(4, -8, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // 武器系统
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(-2, 5, 4, 8);
        
        // 推进器尾焰
        this.renderThrusterFlame(ctx);
    }

    // 🛸 侦察机 - 轻型快速
    renderScout(ctx) {
        // 流线型机身
        const bodyGradient = ctx.createRadialGradient(0, 0, 3, 0, 0, 15);
        bodyGradient.addColorStop(0, '#00d2d3');
        bodyGradient.addColorStop(0.7, '#0abde3');
        bodyGradient.addColorStop(1, '#006ba6');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 侦察装置（发光）
        ctx.shadowColor = '#00d2d3';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -10, 3 * this.eyeGlow, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // 侧翼
        ctx.fillStyle = '#54a0ff';
        ctx.beginPath();
        ctx.ellipse(-10, 5, 3, 8, 0, 0, Math.PI * 2);
        ctx.ellipse(10, 5, 3, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        this.renderThrusterFlame(ctx, '#00d2d3');
    }

    // 💣 轰炸机 - 重型装甲
    renderBomber(ctx) {
        // 厚重机身
        const bodyGradient = ctx.createLinearGradient(0, -18, 0, 18);
        bodyGradient.addColorStop(0, '#8e44ad');
        bodyGradient.addColorStop(0.5, '#9c88ff');
        bodyGradient.addColorStop(1, '#5f3dc4');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.roundRect(-15, -18, 30, 36, 8);
        ctx.fill();
        
        // 装甲细节
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(-12, -10, 24, 4);
        ctx.fillRect(-12, 0, 24, 4);
        ctx.fillRect(-12, 10, 24, 4);
        
        // 炸弹挂载点
        ctx.fillStyle = '#34495e';
        ctx.beginPath();
        ctx.arc(-8, 15, 3, 0, Math.PI * 2);
        ctx.arc(8, 15, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 威胁性红眼
        ctx.shadowColor = '#e74c3c';
        ctx.shadowBlur = 12 * this.eyeGlow;
        ctx.fillStyle = `rgba(231, 76, 60, ${this.eyeGlow})`;
        ctx.beginPath();
        ctx.arc(-6, -12, 2.5, 0, Math.PI * 2);
        ctx.arc(6, -12, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        this.renderThrusterFlame(ctx, '#8e44ad');
    }

    // ⚡ 拦截机 - 高速机动
    renderInterceptor(ctx) {
        // 尖锐机身
        const bodyGradient = ctx.createLinearGradient(0, -20, 0, 20);
        bodyGradient.addColorStop(0, '#f39c12');
        bodyGradient.addColorStop(0.5, '#e67e22');
        bodyGradient.addColorStop(1, '#d35400');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(-8, 10);
        ctx.lineTo(-12, 20);
        ctx.lineTo(0, 15);
        ctx.lineTo(12, 20);
        ctx.lineTo(8, 10);
        ctx.closePath();
        ctx.fill();
        
        // 高能引擎
        ctx.shadowColor = '#f39c12';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-5, 12, 3, 0, Math.PI * 2);
        ctx.arc(5, 12, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // 激光炮
        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-3, -15);
        ctx.lineTo(-3, -8);
        ctx.moveTo(3, -15);
        ctx.lineTo(3, -8);
        ctx.stroke();
        
        // 橙色发光眼
        ctx.shadowColor = '#f39c12';
        ctx.shadowBlur = 10 * this.eyeGlow;
        ctx.fillStyle = `rgba(243, 156, 18, ${this.eyeGlow})`;
        ctx.beginPath();
        ctx.arc(0, -12, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        this.renderThrusterFlame(ctx, '#f39c12');
    }

    // 🔥 推进器尾焰效果
    renderThrusterFlame(ctx, color = '#ff4757') {
        const pulse = this.thrusterPulse;
        
        ctx.save();
        ctx.globalAlpha = pulse * 0.8;
        
        const flameGradient = ctx.createRadialGradient(0, 15, 2, 0, 20, 8);
        flameGradient.addColorStop(0, '#ffffff');
        flameGradient.addColorStop(0.3, color);
        flameGradient.addColorStop(1, 'rgba(255, 71, 87, 0)');
        
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.arc(-3, 18, 3 * pulse, 0, Math.PI * 2);
        ctx.arc(3, 18, 3 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // 尾焰粒子
        for (let i = 0; i < 2; i++) {
            const offset = (Math.random() - 0.5) * 6;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(offset, 20 + i * 3, 1 * pulse, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    renderMiniBoss(ctx) {
        // 小BOSS外观
        const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 30);
        gradient.addColorStop(0, '#fd79a8');
        gradient.addColorStop(0.7, '#e84393');
        gradient.addColorStop(1, '#a29bfe');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // 装甲板
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(-20, -5, 40, 10);
        ctx.fillRect(-5, -20, 10, 40);
        
        // 武器系统
        ctx.shadowColor = '#fd79a8';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#fd79a8';
        ctx.beginPath();
        ctx.arc(-15, 0, 4, 0, Math.PI * 2);
        ctx.arc(15, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderShadow(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#000';
        
        ctx.translate(this.x + 2, this.y + 5);
        ctx.scale(this.scale * 0.8, this.scale * 0.3);
        
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// ===== BOSS类 =====
class Boss {
    constructor(x, y, type = 'normal', stage = 1) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.stage = stage;
        this.width = 120;
        this.height = 80;
        this.speed = 1;
        this.radius = 50;
        
        // 根据类型和关卡设置属性
        this.setupBossStats();
        
        // 移动模式
        this.moveDirection = 1;
        this.moveTimer = 0;
        this.phase = 1;
        
        // 2.5D效果
        this.scale = 1;
        this.rotation = 0;
        this.glowIntensity = 1;
        this.specialEffect = 0;
    }

    // 🎯 设置BOSS属性
    setupBossStats() {
        const bossConfigs = {
            scout_boss: { baseHealth: 150, speedMult: 1.2, sizeMult: 0.9, color: '#00ff00' },
            guard_boss: { baseHealth: 200, speedMult: 1.0, sizeMult: 1.0, color: '#228B22' },
            tank_boss: { baseHealth: 300, speedMult: 0.8, sizeMult: 1.3, color: '#CD853F' },
            battleship_boss: { baseHealth: 350, speedMult: 0.9, sizeMult: 1.4, color: '#4682b4' },
            fire_boss: { baseHealth: 400, speedMult: 1.1, sizeMult: 1.2, color: '#ff4500' },
            mothership_boss: { baseHealth: 500, speedMult: 0.7, sizeMult: 1.5, color: '#9370db' },
            void_boss: { baseHealth: 600, speedMult: 1.3, sizeMult: 1.1, color: '#8b00ff' },
            energy_boss: { baseHealth: 700, speedMult: 1.4, sizeMult: 1.2, color: '#00ffff' },
            time_boss: { baseHealth: 800, speedMult: 1.5, sizeMult: 1.3, color: '#ffd700' },
            ultimate_boss: { baseHealth: 1000, speedMult: 1.2, sizeMult: 1.6, color: '#ff1493' }
        };
        
        const config = bossConfigs[this.type] || bossConfigs.scout_boss;
        
        // 基础属性
        this.maxHealth = config.baseHealth + (this.stage - 1) * 50;
        this.health = this.maxHealth;
        this.speed = config.speedMult;
        this.width *= config.sizeMult;
        this.height *= config.sizeMult;
        this.radius *= config.sizeMult;
        this.primaryColor = config.color;
        
        // 特殊技能
        this.specialAbilities = this.getSpecialAbilities();
        this.lastSpecialAttack = 0;
    }

    // 🌟 获取特殊技能
    getSpecialAbilities() {
        const abilities = {
            scout_boss: ['quick_shot', 'teleport'],
            guard_boss: ['shield', 'forest_strike'],
            tank_boss: ['heavy_shot', 'armor_boost'],
            battleship_boss: ['torpedo', 'water_blast'],
            fire_boss: ['fire_rain', 'volcano_eruption'],
            mothership_boss: ['laser_beam', 'drone_swarm'],
            void_boss: ['void_portal', 'darkness'],
            energy_boss: ['energy_burst', 'electric_storm'],
            time_boss: ['time_slow', 'temporal_strike'],
            ultimate_boss: ['dimension_rift', 'ultimate_blast', 'reality_warp']
        };
        
        return abilities[this.type] || ['basic_attack'];
    }

    update(deltaTime) {
        this.moveTimer += deltaTime;
        
        // 进入位置
        if (this.y < 100) {
            this.y += this.speed;
        } else {
            // 左右移动
            this.x += this.moveDirection * 2;
            if (this.x < 60 || this.x > 840) {
                this.moveDirection *= -1;
            }
        }
        
        // 相位变化
        if (this.health <= this.maxHealth * 0.5 && this.phase === 1) {
            this.phase = 2;
            this.speed = 1.5;
        }
        
        // 视觉效果
        this.scale = 1 + Math.sin(this.moveTimer * 0.003) * 0.1;
        this.rotation = Math.sin(this.moveTimer * 0.001) * 0.1;
        this.glowIntensity = 0.8 + Math.sin(this.moveTimer * 0.005) * 0.2;
    }

    render(ctx) {
        ctx.save();
        
        // 渲染阴影
        this.renderShadow(ctx);
        
        // 主体变换
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        // 根据类型渲染不同的BOSS
        this.renderBossByType(ctx);
        
        ctx.restore();
    }

    // 🎨 根据类型渲染BOSS
    renderBossByType(ctx) {
        const color = this.primaryColor || '#ff6b6b';
        
        // 特殊效果
        this.specialEffect += 0.05;
        
        // 主体渐变
        const gradient = ctx.createRadialGradient(0, 0, 20, 0, 0, 60);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, this.adjustColor(color, -0.3));
        gradient.addColorStop(1, '#2d3436');
        
        ctx.fillStyle = gradient;
        
        // 根据类型绘制不同的外形
        switch(this.type) {
            case 'scout_boss':
                this.renderScoutBoss(ctx, color);
                break;
            case 'guard_boss':
                this.renderGuardBoss(ctx, color);
                break;
            case 'tank_boss':
                this.renderTankBoss(ctx, color);
                break;
            case 'battleship_boss':
                this.renderBattleshipBoss(ctx, color);
                break;
            case 'fire_boss':
                this.renderFireBoss(ctx, color);
                break;
            case 'mothership_boss':
                this.renderMothershipBoss(ctx, color);
                break;
            case 'void_boss':
                this.renderVoidBoss(ctx, color);
                break;
            case 'energy_boss':
                this.renderEnergyBoss(ctx, color);
                break;
            case 'time_boss':
                this.renderTimeBoss(ctx, color);
                break;
            case 'ultimate_boss':
                this.renderUltimateBoss(ctx, color);
                break;
            default:
                this.renderDefaultBoss(ctx, color);
        }
        
        // 核心发光
        this.renderCore(ctx, color);
    }

    // 调整颜色亮度
    adjustColor(color, factor) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + factor * 255));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + factor * 255));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + factor * 255));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }

    // 默认BOSS渲染
    renderDefaultBoss(ctx, color) {
        // 主体
        ctx.beginPath();
        ctx.roundRect(-50, -30, 100, 60, 10);
        ctx.fill();
        
        // 装甲细节
        ctx.fillStyle = '#636e72';
        ctx.fillRect(-40, -20, 80, 8);
        ctx.fillRect(-40, 0, 80, 8);
        ctx.fillRect(-40, 20, 80, 8);
        
        // 武器
        this.renderWeapons(ctx, color);
    }

    // 渲染武器系统
    renderWeapons(ctx, color) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 20 * this.glowIntensity;
        ctx.fillStyle = color;
        
        // 主炮
        ctx.beginPath();
        ctx.arc(-30, 0, 8, 0, Math.PI * 2);
        ctx.arc(30, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // 副炮
        ctx.beginPath();
        ctx.arc(-15, -25, 5, 0, Math.PI * 2);
        ctx.arc(15, -25, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }

    // 核心发光
    renderCore(ctx, color) {
        const coreGradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 15);
        coreGradient.addColorStop(0, '#fff');
        coreGradient.addColorStop(0.5, color);
        coreGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 15 * this.glowIntensity, 0, Math.PI * 2);
        ctx.fill();
    }

    // 🔍 侦察机甲BOSS
    renderScoutBoss(ctx, color) {
        // 流线型主体
        ctx.beginPath();
        ctx.ellipse(0, 0, 45, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 侦察设备
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -15, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    // 🌲 森林守护者BOSS
    renderGuardBoss(ctx, color) {
        // 装甲化主体
        ctx.beginPath();
        ctx.roundRect(-50, -30, 100, 60, 5);
        ctx.fill();
        
        // 护盾投射器
        ctx.fillStyle = this.adjustColor(color, 0.3);
        ctx.fillRect(-60, -10, 20, 20);
        ctx.fillRect(40, -10, 20, 20);
    }

    // 🏜️ 沙漠战车BOSS
    renderTankBoss(ctx, color) {
        // 重装甲主体
        ctx.beginPath();
        ctx.roundRect(-60, -35, 120, 70, 8);
        ctx.fill();
        
        // 履带
        ctx.fillStyle = '#636e72';
        ctx.fillRect(-65, -40, 130, 15);
        ctx.fillRect(-65, 25, 130, 15);
        
        // 主炮塔
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    // 🌊 海洋战舰BOSS
    renderBattleshipBoss(ctx, color) {
        // 舰体
        ctx.beginPath();
        ctx.moveTo(-70, -20);
        ctx.lineTo(70, -20);
        ctx.lineTo(60, 30);
        ctx.lineTo(-60, 30);
        ctx.closePath();
        ctx.fill();
        
        // 舰桥
        ctx.fillStyle = this.adjustColor(color, 0.2);
        ctx.fillRect(-20, -30, 40, 20);
    }

    // 🌋 熔岩巨兽BOSS
    renderFireBoss(ctx, color) {
        // 不规则熔岩体
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 45 + Math.sin(this.specialEffect + i) * 10;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius * 0.7;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // 火焰效果
        ctx.shadowColor = '#ff4500';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ff4500';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // 🚀 太空母舰BOSS
    renderMothershipBoss(ctx, color) {
        // 母舰主体
        ctx.beginPath();
        ctx.ellipse(0, 0, 70, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 引擎舱
        ctx.fillStyle = this.adjustColor(color, -0.2);
        ctx.fillRect(-80, -15, 30, 30);
        ctx.fillRect(50, -15, 30, 30);
        
        // 指挥塔
        ctx.fillStyle = this.adjustColor(color, 0.3);
        ctx.fillRect(-15, -50, 30, 25);
    }

    // 🕳️ 虚空领主BOSS
    renderVoidBoss(ctx, color) {
        // 虚空扭曲效果
        ctx.save();
        ctx.globalAlpha = 0.8;
        
        // 主体
        ctx.beginPath();
        ctx.ellipse(0, 0, 50, 30, this.specialEffect * 0.1, 0, Math.PI * 2);
        ctx.fill();
        
        // 虚空裂缝
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + this.specialEffect;
            const x1 = Math.cos(angle) * 30;
            const y1 = Math.sin(angle) * 30;
            const x2 = Math.cos(angle) * 60;
            const y2 = Math.sin(angle) * 60;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // ⚡ 能量核心BOSS
    renderEnergyBoss(ctx, color) {
        // 能量球
        const energyGradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 50);
        energyGradient.addColorStop(0, '#ffffff');
        energyGradient.addColorStop(0.3, color);
        energyGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = energyGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 50 + Math.sin(this.specialEffect) * 10, 0, Math.PI * 2);
        ctx.fill();
        
        // 能量环
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // ⏰ 时空守护者BOSS
    renderTimeBoss(ctx, color) {
        // 时钟形状
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // 时针分针
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        // 时针
        const hourAngle = this.specialEffect * 0.1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(hourAngle) * 25, Math.sin(hourAngle) * 25);
        ctx.stroke();
        
        // 分针
        const minuteAngle = this.specialEffect * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(minuteAngle) * 35, Math.sin(minuteAngle) * 35);
        ctx.stroke();
        
        // 刻度
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const x1 = Math.cos(angle) * 40;
            const y1 = Math.sin(angle) * 40;
            const x2 = Math.cos(angle) * 45;
            const y2 = Math.sin(angle) * 45;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    // 🌌 终极维度王BOSS
    renderUltimateBoss(ctx, color) {
        // 多层结构
        for (let layer = 3; layer >= 0; layer--) {
            const layerScale = 1 - layer * 0.2;
            const layerAlpha = 0.3 + layer * 0.2;
            const layerRotation = this.specialEffect * (layer + 1) * 0.1;
            
            ctx.save();
            ctx.globalAlpha = layerAlpha;
            ctx.rotate(layerRotation);
            ctx.scale(layerScale, layerScale);
            
            // 主体
            const layerGradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 60);
            layerGradient.addColorStop(0, '#ffffff');
            layerGradient.addColorStop(0.5, color);
            layerGradient.addColorStop(1, this.adjustColor(color, -0.5));
            
            ctx.fillStyle = layerGradient;
            ctx.beginPath();
            ctx.star(0, 0, 8, 60, 30);
            ctx.fill();
            
            ctx.restore();
        }
        
        // 中心核心
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
    }

    renderShadow(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#000';
        
        ctx.translate(this.x + 5, this.y + 10);
        ctx.scale(this.scale * 0.9, this.scale * 0.3);
        
        ctx.beginPath();
        ctx.ellipse(0, 0, 50, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// ===== 子弹类 =====
class Bullet {
    constructor(x, y, velocityY, type = 'player', velocityX = 0) {
        this.x = x;
        this.y = y;
        this.velocityY = velocityY;
        this.velocityX = velocityX || 0; // 支持水平速度
        this.type = type;
        this.radius = 3;
        this.life = 1;
        this.maxLife = 1;
        
        // 视觉效果
        this.scale = type === 'boss' ? 1.5 : 1;
        this.glowRadius = 0;
        this.trail = [];
    }

    update(deltaTime) {
        this.y += this.velocityY;
        this.x += this.velocityX; // 更新水平位置
        
        // 更新尾迹
        this.trail.push({ x: this.x, y: this.y, life: 0.5 });
        if (this.trail.length > 5) {
            this.trail.shift();
        }
        
        // 更新尾迹生命
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].life -= deltaTime * 0.002;
            if (this.trail[i].life <= 0) {
                this.trail.splice(i, 1);
            }
        }
        
        // 发光效果
        this.glowRadius = 5 + Math.sin(Date.now() * 0.01) * 2;
    }

    render(ctx) {
        // 渲染尾迹
        this.renderTrail(ctx);
        
        ctx.save();
        
        if (this.type === 'player') {
            this.renderPlayerBullet(ctx);
        } else {
            this.renderEnemyBullet(ctx);
        }
        
        ctx.restore();
    }

    renderTrail(ctx) {
        this.trail.forEach((point, index) => {
            const alpha = point.life;
            const size = (index / this.trail.length) * this.radius;
            
            ctx.save();
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = this.type === 'player' ? '#4ecdc4' : '#ff6b6b';
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    renderPlayerBullet(ctx) {
        // 🌟 科幻激光弹设计
        
        // 外层光晕
        const outerGlow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.glowRadius * 1.5);
        outerGlow.addColorStop(0, 'rgba(0, 168, 255, 0.6)');
        outerGlow.addColorStop(0.7, 'rgba(64, 201, 255, 0.3)');
        outerGlow.addColorStop(1, 'rgba(64, 201, 255, 0)');
        
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.glowRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // 中层能量环
        const energyRing = ctx.createRadialGradient(this.x, this.y, this.radius, this.x, this.y, this.glowRadius);
        energyRing.addColorStop(0, 'rgba(255, 255, 255, 0)');
        energyRing.addColorStop(0.8, 'rgba(0, 168, 255, 0.8)');
        energyRing.addColorStop(1, 'rgba(0, 168, 255, 0)');
        
        ctx.fillStyle = energyRing;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.glowRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 主体等离子核心
        const coreGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.4, '#40c9ff');
        coreGradient.addColorStop(0.8, '#0078d4');
        coreGradient.addColorStop(1, '#106ebe');
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 内部白色亮点
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // 能量波纹
        const pulse = Math.sin(Date.now() * 0.02) * 0.3 + 0.7;
        ctx.save();
        ctx.globalAlpha = pulse * 0.6;
        ctx.strokeStyle = '#40c9ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    renderEnemyBullet(ctx) {
        // 🔥 敌方等离子弹设计
        
        // 威胁性外光晕
        const threatGlow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.glowRadius * 1.8);
        threatGlow.addColorStop(0, 'rgba(255, 71, 87, 0.8)');
        threatGlow.addColorStop(0.6, 'rgba(255, 107, 107, 0.4)');
        threatGlow.addColorStop(1, 'rgba(255, 107, 107, 0)');
        
        ctx.fillStyle = threatGlow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.glowRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();
        
        // 能量脉冲
        const pulse = Math.sin(Date.now() * 0.025) * 0.4 + 0.6;
        const energyRing = ctx.createRadialGradient(
            this.x, this.y, this.radius * pulse, 
            this.x, this.y, this.glowRadius * pulse
        );
        energyRing.addColorStop(0, 'rgba(255, 255, 255, 0)');
        energyRing.addColorStop(0.7, 'rgba(255, 71, 87, 0.9)');
        energyRing.addColorStop(1, 'rgba(255, 71, 87, 0)');
        
        ctx.fillStyle = energyRing;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.glowRadius * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // 主体熔岩核心
        const coreGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * this.scale);
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.3, '#ff4757');
        coreGradient.addColorStop(0.7, '#e55039');
        coreGradient.addColorStop(1, '#c44569');
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * this.scale, 0, Math.PI * 2);
        ctx.fill();
        
        // 内部熔融效果
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#fffa65';
        ctx.beginPath();
        ctx.arc(this.x - 1, this.y - 1, this.radius * this.scale * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // 威胁光环
        ctx.save();
        ctx.globalAlpha = pulse * 0.5;
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * this.scale * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// ===== 爆炸类 =====
class Explosion {
    constructor(x, y, size = 'normal') {
        this.x = x;
        this.y = y;
        this.size = size;
        this.maxRadius = size === 'large' ? 80 : 40;
        this.radius = 0;
        this.life = 1;
        this.maxLife = 1;
        this.particles = [];
        this.finished = false;
        
        // 生成爆炸粒子
        const particleCount = size === 'large' ? 20 : 10;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            const speed = 2 + Math.random() * 3;
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                maxLife: 1,
                size: 2 + Math.random() * 3
            });
        }
    }

    update(deltaTime) {
        this.life -= deltaTime * 0.003;
        
        if (this.life > 0.7) {
            this.radius = this.maxRadius * (1 - this.life) / 0.3;
        } else {
            this.radius = this.maxRadius * (this.life / 0.7);
        }
        
        // 更新粒子
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= deltaTime * 0.002;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
        });
        
        if (this.life <= 0) {
            this.finished = true;
        }
    }

    render(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        
        // 💥 三层爆炸动画叠加（火焰 + 烟尘 + 光爆）
        
        // 第一层：光爆核心
        this.renderLightBlast(ctx);
        
        // 第二层：火焰环
        this.renderFlameRing(ctx);
        
        // 第三层：烟尘云
        this.renderSmokeCloud(ctx);
        
        // 第四层：火花粒子
        this.renderSparkParticles(ctx);
        
        ctx.restore();
    }

    renderLightBlast(ctx) {
        const alpha = this.life;
        const blastRadius = this.radius * 0.6;
        
        // 强烈白光核心
        const lightGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, blastRadius);
        lightGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        lightGradient.addColorStop(0.3, `rgba(255, 255, 200, ${alpha * 0.8})`);
        lightGradient.addColorStop(0.7, `rgba(255, 193, 7, ${alpha * 0.4})`);
        lightGradient.addColorStop(1, `rgba(255, 193, 7, 0)`);
        
        ctx.fillStyle = lightGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, blastRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 光爆冲击波
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * (1 - this.life) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    renderFlameRing(ctx) {
        const alpha = this.life * 0.8;
        const flameRadius = this.radius;
        
        // 火焰渐变环
        const flameGradient = ctx.createRadialGradient(this.x, this.y, flameRadius * 0.3, this.x, this.y, flameRadius);
        flameGradient.addColorStop(0, `rgba(255, 193, 7, ${alpha * 0.2})`);
        flameGradient.addColorStop(0.4, `rgba(255, 71, 87, ${alpha * 0.9})`);
        flameGradient.addColorStop(0.7, `rgba(231, 76, 60, ${alpha * 0.7})`);
        flameGradient.addColorStop(1, `rgba(192, 57, 43, 0)`);
        
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, flameRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 火焰波动效果
        const waveCount = 8;
        const waveRadius = flameRadius * 0.8;
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = '#ff4757';
        
        for (let i = 0; i < waveCount; i++) {
            const angle = (Math.PI * 2 / waveCount) * i + this.life * 10;
            const x = this.x + Math.cos(angle) * waveRadius * Math.random();
            const y = this.y + Math.sin(angle) * waveRadius * Math.random();
            const size = 3 + Math.random() * 5;
            
            ctx.beginPath();
            ctx.arc(x, y, size * this.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderSmokeCloud(ctx) {
        const alpha = this.life * 0.5;
        const smokeRadius = this.radius * 1.4;
        
        // 烟尘渐变
        const smokeGradient = ctx.createRadialGradient(this.x, this.y, smokeRadius * 0.2, this.x, this.y, smokeRadius);
        smokeGradient.addColorStop(0, `rgba(100, 100, 100, ${alpha * 0.1})`);
        smokeGradient.addColorStop(0.5, `rgba(70, 70, 70, ${alpha * 0.6})`);
        smokeGradient.addColorStop(0.8, `rgba(50, 50, 50, ${alpha * 0.4})`);
        smokeGradient.addColorStop(1, `rgba(30, 30, 30, 0)`);
        
        ctx.fillStyle = smokeGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, smokeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 烟雾旋涡
        const smokeParticles = 12;
        ctx.save();
        ctx.globalAlpha = alpha * 0.4;
        
        for (let i = 0; i < smokeParticles; i++) {
            const angle = (Math.PI * 2 / smokeParticles) * i + this.life * 3;
            const distance = (smokeRadius * 0.7) * (1 - this.life);
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            const size = 4 + Math.random() * 6;
            
            const smokeParticleGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            smokeParticleGradient.addColorStop(0, 'rgba(80, 80, 80, 0.6)');
            smokeParticleGradient.addColorStop(1, 'rgba(80, 80, 80, 0)');
            
            ctx.fillStyle = smokeParticleGradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderSparkParticles(ctx) {
        // 火花粒子系统
        this.particles.forEach(particle => {
            if (particle.life > 0) {
                const sparkAlpha = particle.life;
                const sparkSize = particle.size * particle.life;
                
                ctx.save();
                ctx.globalAlpha = sparkAlpha;
                
                // 火花发光效果
                const sparkGradient = ctx.createRadialGradient(
                    particle.x, particle.y, 0, 
                    particle.x, particle.y, sparkSize * 2
                );
                sparkGradient.addColorStop(0, '#ffffff');
                sparkGradient.addColorStop(0.4, '#ff4757');
                sparkGradient.addColorStop(1, 'rgba(255, 71, 87, 0)');
                
                ctx.fillStyle = sparkGradient;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, sparkSize * 2, 0, Math.PI * 2);
                ctx.fill();
                
                // 火花核心
                ctx.fillStyle = '#fffa65';
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, sparkSize, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }
        });
    }
}

// ===== 粒子类 =====
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 1;
        this.maxLife = 1;
        this.velocity = {
            x: (Math.random() - 0.5) * 4,
            y: (Math.random() - 0.5) * 4
        };
        this.size = 1 + Math.random() * 3;
        this.gravity = 0.1;
    }

    update(deltaTime) {
        this.life -= deltaTime * 0.002;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.velocity.y += this.gravity;
        this.velocity.x *= 0.99;
        this.velocity.y *= 0.99;
    }

    render(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ===== 道具类 =====
class Powerup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 2;
        this.type = this.getRandomType();
        this.radius = 15;
        this.rotation = 0;
        this.scale = 1;
        this.glowIntensity = 1;
    }

    getRandomType() {
        const types = ['speed', 'health', 'weapon', 'shield'];
        return types[Math.floor(Math.random() * types.length)];
    }

    update(deltaTime) {
        this.y += this.speed;
        this.rotation += deltaTime * 0.003;
        this.scale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
        this.glowIntensity = 0.8 + Math.sin(Date.now() * 0.008) * 0.2;
    }

    render(ctx) {
        ctx.save();
        
        // 发光效果
        const glowGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
        glowGradient.addColorStop(0, 'rgba(255, 234, 167, 0.6)');
        glowGradient.addColorStop(1, 'rgba(255, 234, 167, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2 * this.glowIntensity, 0, Math.PI * 2);
        ctx.fill();
        
        // 主体
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.5, '#ffeaa7');
        gradient.addColorStop(1, '#fdcb6e');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 类型图标
        ctx.fillStyle = '#2d3436';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const icon = this.getTypeIcon();
        ctx.fillText(icon, 0, 0);
        
        ctx.restore();
    }

    getTypeIcon() {
        switch (this.type) {
            case 'speed': return '⚡';
            case 'health': return '❤️';
            case 'weapon': return '🔫';
            case 'shield': return '🛡️';
            default: return '?';
        }
    }
}

// ===== 浮动文字类 =====
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1;
        this.maxLife = 1;
        this.velocity = { x: 0, y: -2 };
    }

    update(deltaTime) {
        this.life -= deltaTime * 0.001;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.velocity.y -= 0.05; // 向上加速
    }

    render(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// ===== 游戏初始化 =====
let planeGame;

document.addEventListener('DOMContentLoaded', () => {
    try {
        planeGame = new PlaneWarGame();
        console.log('游戏初始化成功');
    } catch (error) {
        console.error('游戏初始化失败:', error);
    }
});

// 确保在window对象上也有引用，以便HTML可以访问
window.planeGame = null;

// 等待DOM加载后设置全局引用
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (planeGame) {
            window.planeGame = planeGame;
        }
    }, 100);
}); 