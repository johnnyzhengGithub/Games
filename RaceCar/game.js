// HTML5 Canvas 赛车游戏 - 主游戏逻辑
class RacingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'start';
        this.gameTime = 0;
        this.lastTime = 0;
        
        // 游戏数据
        this.player = null;
        this.enemies = [];
        this.obstacles = [];
        this.bullets = [];
        this.items = [];
        this.particles = [];
        this.finalBoss = null;
        
        // 经验和升级系统
        this.level = 1;
        this.exp = 0;
        this.maxExp = 100;
        this.score = 0;
        
        // 道具效果
        this.activeEffects = new Map();
        
        // 游戏设置
        this.stageProgress = 0;
        this.keys = {};
        this.enemySpawnRate = 120;
        this.itemSpawnRate = 300;
        this.roadSpeed = 3;
        this.roadY = 0;
        
        this.setupInput();
        this.setupButtons();
        
        console.log(' 赛车游戏初始化完成!');
    }
    
    // 玩家赛车类
    createPlayer() {
        return {
            x: this.canvas.width / 2 - 25,
            y: this.canvas.height - 80,
            width: 50,
            height: 70,
            speed: 0,
            maxSpeed: 8,
            acceleration: 0.5,
            friction: 0.95,
            health: 100,
            maxHealth: 100,
            invulnerable: 0,
            size: 1,
            color: '#4ecdc4',
            
            update() {
                if (game.keys['ArrowLeft'] && this.x > 0) {
                    this.x -= 5;
                }
                if (game.keys['ArrowRight'] && this.x < game.canvas.width - this.width) {
                    this.x += 5;
                }
                if (game.keys['ArrowUp'] && this.speed < this.maxSpeed) {
                    this.speed += this.acceleration;
                }
                if (game.keys['ArrowDown'] && this.speed > -this.maxSpeed/2) {
                    this.speed -= this.acceleration;
                }
                
                this.speed *= this.friction;
                
                if (this.invulnerable > 0) {
                    this.invulnerable--;
                }
                
                this.x = Math.max(0, Math.min(this.x, game.canvas.width - this.width));
            },
            
            takeDamage(damage) {
                if (this.invulnerable > 0) return false;
                
                if (game.activeEffects.has('armor')) {
                    damage = Math.floor(damage / 2);
                }
                
                this.health -= damage;
                this.invulnerable = 60;
                
                if (this.health <= 0) {
                    this.health = 0;
                    game.gameOver();
                }
                
                return true;
            },
            
            draw() {
                const ctx = game.ctx;
                const drawWidth = this.width * this.size;
                const drawHeight = this.height * this.size;
                const drawX = this.x - (drawWidth - this.width) / 2;
                const drawY = this.y - (drawHeight - this.height) / 2;
                
                ctx.save();
                
                if (this.invulnerable > 0 && Math.floor(this.invulnerable / 5) % 2) {
                    ctx.globalAlpha = 0.5;
                }
                
                // 绘制玩家赛车
                ctx.fillStyle = this.color;
                ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
                
                // 车窗
                ctx.fillStyle = '#fff';
                ctx.fillRect(drawX + 5 * this.size, drawY + 10 * this.size, 10 * this.size, 15 * this.size);
                ctx.fillRect(drawX + 35 * this.size, drawY + 10 * this.size, 10 * this.size, 15 * this.size);
                
                // 车头灯
                ctx.fillStyle = '#ffeb3b';
                ctx.fillRect(drawX + 15 * this.size, drawY, 20 * this.size, 8 * this.size);
                
                ctx.restore();
            }
        };
    }
    
    // 敌人赛车类
    createEnemy(type = 'normal') {
        const enemy = {
            x: Math.random() * (this.canvas.width - 50),
            y: -80,
            width: 50,
            height: 70,
            speed: 2 + Math.random() * 3,
            health: 1,
            maxHealth: 1,
            type: type,
            color: '#ff6b6b',
            attackTimer: 0,
            movePattern: 0,
            
            update() {
                this.y += this.speed + game.roadSpeed;
                
                if (this.type === 'miniBoss') {
                    this.movePattern += 0.05;
                    this.x += Math.sin(this.movePattern) * 2;
                    
                    this.attackTimer++;
                    if (this.attackTimer > 60) {
                        const obstacle = game.createObstacle(this.x + this.width/2, this.y + this.height, 'mine');
                        game.obstacles.push(obstacle);
                        this.attackTimer = 0;
                    }
                }
                
                this.x = Math.max(0, Math.min(this.x, game.canvas.width - this.width));
                
                return this.y < game.canvas.height + 100;
            },
            
            takeDamage(damage) {
                this.health -= damage;
                if (this.health <= 0) {
                    game.destroyEnemy(this);
                    return true;
                }
                return false;
            },
            
            draw() {
                const ctx = game.ctx;
                
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.width, this.height);
                
                if (this.type === 'miniBoss') {
                    ctx.fillStyle = '#ff9800';
                    ctx.fillRect(this.x - 5, this.y, 60, this.height);
                    
                    // 血条
                    const barWidth = 60;
                    const barHeight = 6;
                    ctx.fillStyle = '#333';
                    ctx.fillRect(this.x - 5, this.y - 15, barWidth, barHeight);
                    ctx.fillStyle = '#ff4444';
                    ctx.fillRect(this.x - 5, this.y - 15, (this.health / this.maxHealth) * barWidth, barHeight);
                }
                
                // 车轮
                ctx.fillStyle = '#333';
                ctx.fillRect(this.x + 5, this.y + 50, 10, 15);
                ctx.fillRect(this.x + 35, this.y + 50, 10, 15);
            }
        };
        
        if (type === 'miniBoss') {
            enemy.health = enemy.maxHealth = 5;
            enemy.color = '#ff9800';
            enemy.width = 60;
            enemy.speed = 1.5;
        }
        
        return enemy;
    }
    
    // 终局BOSS - 机械战车王
    createFinalBoss() {
        return {
            x: this.canvas.width / 2 - 100,
            y: 50,
            width: 200,
            height: 150,
            health: 50,
            maxHealth: 50,
            speed: 1,
            attackTimer: 0,
            skillTimer: 0,
            moveDirection: 1,
            phase: 1,
            defeated: false,
            
            update() {
                // 移动
                this.x += this.moveDirection * this.speed;
                if (this.x <= 0 || this.x >= game.canvas.width - this.width) {
                    this.moveDirection *= -1;
                }
                
                this.attackTimer++;
                this.skillTimer++;
                
                // 发射地雷
                if (this.attackTimer > 40) {
                    const mineX = this.x + Math.random() * this.width;
                    const obstacle = game.createObstacle(mineX, this.y + this.height, 'mine');
                    game.obstacles.push(obstacle);
                    this.attackTimer = 0;
                }
                
                // 使用技能
                if (this.skillTimer > 180) {
                    this.useSkill();
                    this.skillTimer = 0;
                }
                
                // 阶段切换
                if (this.health < this.maxHealth * 0.5 && this.phase === 1) {
                    this.phase = 2;
                    this.speed = 2;
                }
            },
            
            useSkill() {
                const skillType = Math.floor(Math.random() * 3);
                
                switch (skillType) {
                    case 0: // 旋转刀轮
                        for (let i = 0; i < 3; i++) {
                            const blade = game.createObstacle(
                                this.x + i * (this.width / 3) + 20,
                                this.y + this.height,
                                'blade'
                            );
                            game.obstacles.push(blade);
                        }
                        break;
                        
                    case 1: // 电磁脉冲
                        game.applyEffect('slowdown', 120);
                        game.addParticle(this.x + this.width/2, this.y + this.height/2, 'emp');
                        break;
                        
                    case 2: // 呼叫无人机
                        for (let i = 0; i < 2; i++) {
                            const drone = game.createEnemy('normal');
                            drone.x = this.x + i * 100;
                            drone.y = this.y + 100;
                            game.enemies.push(drone);
                        }
                        break;
                }
                
                console.log('🤖 BOSS使用技能!');
            },
            
            takeDamage(damage) {
                this.health -= damage;
                if (this.health <= 0) {
                    this.health = 0;
                    this.defeated = true;
                    game.victory();
                }
                return this.health <= 0;
            },
            
            draw() {
                const ctx = game.ctx;
                
                // BOSS主体
                ctx.fillStyle = '#666';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                
                // 装甲板
                ctx.fillStyle = '#888';
                for (let i = 0; i < 4; i++) {
                    ctx.fillRect(this.x + i * 50, this.y, 40, this.height);
                }
                
                // 武器系统
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(this.x + 20, this.y + this.height - 20, 20, 30);
                ctx.fillRect(this.x + this.width - 40, this.y + this.height - 20, 20, 30);
                
                // 驾驶舱
                ctx.fillStyle = '#4ecdc4';
                ctx.fillRect(this.x + this.width/2 - 30, this.y + 20, 60, 40);
                
                // BOSS血条
                const barWidth = this.width;
                const barHeight = 12;
                ctx.fillStyle = '#333';
                ctx.fillRect(this.x, this.y - 25, barWidth, barHeight);
                ctx.fillStyle = '#ff1744';
                ctx.fillRect(this.x, this.y - 25, (this.health / this.maxHealth) * barWidth, barHeight);
                
                // BOSS名称
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('🤖 机械战车王', this.x + this.width/2, this.y - 30);
            }
        };
    }
    
    // 道具系统
    createItem(x, y) {
        const itemTypes = [
            { type: 'jet', color: '#2196f3', emoji: '🚀' },
            { type: 'cannon', color: '#ff9800', emoji: '💥' },
            { type: 'armor', color: '#4caf50', emoji: '🛡️' },
            { type: 'growth', color: '#9c27b0', emoji: '⭐' },
            { type: 'coin', color: '#ffeb3b', emoji: '💰' }
        ];
        
        const item = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        
        return {
            x: x,
            y: y,
            width: 30,
            height: 30,
            type: item.type,
            color: item.color,
            emoji: item.emoji,
            collectTimer: 0,
            
            update() {
                this.y += game.roadSpeed + 1;
                this.collectTimer++;
                return this.y < game.canvas.height + 50;
            },
            
            draw() {
                const ctx = game.ctx;
                const pulse = Math.sin(this.collectTimer * 0.2) * 0.2 + 1;
                
                ctx.save();
                ctx.scale(pulse, pulse);
                
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x / pulse, this.y / pulse, this.width, this.height);
                
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.emoji, (this.x + this.width/2) / pulse, (this.y + 20) / pulse);
                
                ctx.restore();
            }
        };
    }
    
    // 障碍物系统
    createObstacle(x, y, type = 'mine') {
        const obstacle = {
            x: x,
            y: y,
            width: 25,
            height: 25,
            type: type,
            rotation: 0,
            speed: type === 'blade' ? 5 : 3,
            
            update() {
                this.y += this.speed + game.roadSpeed;
                
                if (this.type === 'blade') {
                    this.rotation += 0.3;
                }
                
                return this.y < game.canvas.height + 50;
            },
            
            draw() {
                const ctx = game.ctx;
                
                ctx.save();
                ctx.translate(this.x + this.width/2, this.y + this.height/2);
                ctx.rotate(this.rotation);
                
                if (this.type === 'mine') {
                    ctx.fillStyle = '#333';
                    ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                    ctx.fillStyle = '#ff4444';
                    ctx.fillRect(-5, -5, 10, 10);
                } else if (this.type === 'blade') {
                    ctx.fillStyle = '#666';
                    ctx.fillRect(-this.width/2, -3, this.width, 6);
                    ctx.fillRect(-3, -this.height/2, 6, this.height);
                    ctx.fillStyle = '#ff6b6b';
                    ctx.fillRect(-2, -2, 4, 4);
                }
                
                ctx.restore();
            }
        };
        
        return obstacle;
    }
    
    // 子弹系统
    createBullet(x, y, direction = -1) {
        return {
            x: x,
            y: y,
            width: 6,
            height: 12,
            speed: 10 * direction,
            damage: 1,
            
            update() {
                this.y += this.speed;
                return this.y > -20 && this.y < game.canvas.height + 20;
            },
            
            draw() {
                const ctx = game.ctx;
                ctx.fillStyle = '#ffeb3b';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                
                ctx.fillStyle = '#ff9800';
                ctx.fillRect(this.x + 1, this.y + this.height/2, this.width - 2, 2);
            }
        };
    }
    
    // 粒子效果系统
    addParticle(x, y, type = 'explosion') {
        const particleCount = type === 'emp' ? 20 : 10;
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                maxLife: 30,
                color: type === 'emp' ? '#4ecdc4' : '#ff6b6b',
                size: Math.random() * 5 + 2,
                
                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.vx *= 0.98;
                    this.vy *= 0.98;
                    this.life--;
                    return this.life > 0;
                },
                
                draw() {
                    const ctx = game.ctx;
                    const alpha = this.life / this.maxLife;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = this.color;
                    ctx.fillRect(this.x, this.y, this.size, this.size);
                    ctx.restore();
                }
            });
        }
    }
    
    // 道具效果系统
    applyEffect(type, duration) {
        this.activeEffects.set(type, duration);
        
        switch (type) {
            case 'jet':
                this.player.maxSpeed = 12;
                this.roadSpeed = 6;
                break;
            case 'armor':
                break;
            case 'growth':
                this.player.size = 1.5;
                break;
            case 'slowdown':
                this.player.maxSpeed = 3;
                this.roadSpeed = 1;
                break;
        }
        
        this.updateEffectsDisplay();
    }
    
    updateEffectsDisplay() {
        const effectsContainer = document.getElementById('activeEffects');
        effectsContainer.innerHTML = '';
        
        for (let [effect, duration] of this.activeEffects) {
            const effectElement = document.createElement('div');
            effectElement.className = 'effect';
            
            const emojis = {
                jet: '🚀',
                armor: '🛡️',
                growth: '⭐',
                slowdown: '🐌'
            };
            
            effectElement.textContent = `${emojis[effect]} ${Math.ceil(duration/60)}s`;
            effectsContainer.appendChild(effectElement);
        }
    }
    
    // 经验和升级系统
    gainExp(amount) {
        this.exp += amount;
        
        while (this.exp >= this.maxExp) {
            this.exp -= this.maxExp;
            this.levelUp();
        }
        
        this.updateUI();
    }
    
    levelUp() {
        this.level++;
        this.maxExp = this.level * 100;
        
        const upgrades = [
            '普通加速',
            '解锁双喷气推进',
            '获得穿透子弹',
            '增加道具触发概率',
            '生命值提升',
            '攻击力增强',
            '移动速度提升',
            '道具效果延长'
        ];
        
        const upgradesList = document.getElementById('upgradesList');
        const newUpgrade = document.createElement('li');
        newUpgrade.textContent = `等级 ${this.level}: ${upgrades[Math.min(this.level - 1, upgrades.length - 1)]}`;
        upgradesList.appendChild(newUpgrade);
        
        switch (this.level) {
            case 2:
                this.player.acceleration = 0.7;
                break;
            case 3:
                break;
            case 4:
                this.itemSpawnRate = 200;
                break;
            case 5:
                this.player.maxHealth += 20;
                this.player.health = Math.min(this.player.health + 20, this.player.maxHealth);
                break;
        }
        
        console.log(`🎉 升级到等级 ${this.level}!`);
    }
    
    // 敌人击败处理
    destroyEnemy(enemy) {
        let expGain = enemy.type === 'miniBoss' ? 50 : 20;
        this.gainExp(expGain);
        
        this.score += enemy.type === 'miniBoss' ? 200 : 50;
        
        if (Math.random() < (enemy.type === 'miniBoss' ? 0.8 : 0.3)) {
            this.items.push(this.createItem(enemy.x, enemy.y));
        }
        
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
        }
        
        this.addParticle(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
        this.updateUI();
    }
    
    // 道具收集处理
    collectItem(item) {
        switch (item.type) {
            case 'jet':
                this.applyEffect('jet', 300);
                break;
            case 'cannon':
                for (let i = 0; i < (this.level >= 2 ? 2 : 1); i++) {
                    this.bullets.push(this.createBullet(
                        this.player.x + this.player.width/2 - 3 + i * 6,
                        this.player.y,
                        -1
                    ));
                }
                break;
            case 'armor':
                this.applyEffect('armor', 180);
                break;
            case 'growth':
                this.applyEffect('growth', 240);
                break;
            case 'coin':
                this.gainExp(10);
                this.score += 25;
                break;
        }
        
        const index = this.items.indexOf(item);
        if (index > -1) {
            this.items.splice(index, 1);
        }
        
        console.log(`🎁 收集道具: ${item.type}`);
    }
    
    // 碰撞检测
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    // 游戏主循环
    gameLoop(currentTime) {
        if (this.gameState !== 'playing') return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.gameTime += deltaTime;
        
        this.update();
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update() {
        // 更新玩家
        this.player.update();
        
        // 更新效果计时器
        for (let [effect, duration] of this.activeEffects) {
            this.activeEffects.set(effect, duration - 1);
            if (duration <= 1) {
                this.removeEffect(effect);
            }
        }
        
        // 更新敌人
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.update()) {
                if (this.checkCollision(this.player, enemy)) {
                    if (this.player.takeDamage(enemy.type === 'miniBoss' ? 15 : 10)) {
                        this.addParticle(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
                    }
                    this.destroyEnemy(enemy);
                    return false;
                }
                return true;
            }
            return false;
        });
        
        // 更新终局BOSS
        if (this.finalBoss && !this.finalBoss.defeated) {
            this.finalBoss.update();
            
            if (this.checkCollision(this.player, this.finalBoss)) {
                if (this.player.takeDamage(20)) {
                    this.addParticle(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
                }
            }
        }
        
        // 更新障碍物
        this.obstacles = this.obstacles.filter(obstacle => {
            if (obstacle.update()) {
                if (this.checkCollision(this.player, obstacle)) {
                    if (this.player.takeDamage(15)) {
                        this.addParticle(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
                    }
                    return false;
                }
                return true;
            }
            return false;
        });
        
        // 更新子弹
        this.bullets = this.bullets.filter(bullet => {
            if (bullet.update()) {
                for (let enemy of this.enemies) {
                    if (this.checkCollision(bullet, enemy)) {
                        enemy.takeDamage(bullet.damage);
                        return false;
                    }
                }
                
                if (this.finalBoss && !this.finalBoss.defeated && this.checkCollision(bullet, this.finalBoss)) {
                    this.finalBoss.takeDamage(bullet.damage);
                    this.addParticle(bullet.x, bullet.y);
                    return false;
                }
                
                return true;
            }
            return false;
        });
        
        // 更新道具
        this.items = this.items.filter(item => {
            if (item.update()) {
                if (this.checkCollision(this.player, item)) {
                    this.collectItem(item);
                    return false;
                }
                return true;
            }
            return false;
        });
        
        // 更新粒子
        this.particles = this.particles.filter(particle => particle.update());
        
        // 生成敌人
        if (this.gameTime % this.enemySpawnRate === 0) {
            this.spawnEnemy();
        }
        
        // 生成道具
        if (this.gameTime % this.itemSpawnRate === 0) {
            this.items.push(this.createItem(
                Math.random() * (this.canvas.width - 30),
                -30
            ));
        }
        
        // 阶段推进
        this.stageProgress++;
        if (this.stageProgress > 1800 && !this.finalBoss) {
            this.spawnFinalBoss();
        }
        
        this.updateUI();
    }
    
    spawnEnemy() {
        const enemyType = Math.random() < 0.1 ? 'miniBoss' : 'normal';
        this.enemies.push(this.createEnemy(enemyType));
    }
    
    spawnFinalBoss() {
        this.finalBoss = this.createFinalBoss();
        console.log('🤖 终局BOSS "机械战车王" 已出现!');
    }
    
    removeEffect(effect) {
        this.activeEffects.delete(effect);
        
        switch (effect) {
            case 'jet':
                this.player.maxSpeed = 8;
                this.roadSpeed = 3;
                break;
            case 'growth':
                this.player.size = 1;
                break;
            case 'slowdown':
                this.player.maxSpeed = 8;
                this.roadSpeed = 3;
                break;
        }
        
        this.updateEffectsDisplay();
    }
    
    render() {
        // 清空画布
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制道路
        this.drawRoad();
        
        // 绘制游戏对象
        this.player.draw();
        
        this.enemies.forEach(enemy => enemy.draw());
        
        if (this.finalBoss && !this.finalBoss.defeated) {
            this.finalBoss.draw();
        }
        
        this.obstacles.forEach(obstacle => obstacle.draw());
        this.bullets.forEach(bullet => bullet.draw());
        this.items.forEach(item => item.draw());
        this.particles.forEach(particle => particle.draw());
        
        // 绘制UI提示
        if (this.finalBoss && !this.finalBoss.defeated) {
            this.ctx.fillStyle = '#ff1744';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⚠️ 终局BOSS战！击败它或超越终点！', this.canvas.width/2, 30);
        }
    }
    
    drawRoad() {
        // 道路背景
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 道路标线
        this.ctx.fillStyle = '#ffeb3b';
        this.roadY += this.roadSpeed;
        if (this.roadY > 40) this.roadY = 0;
        
        for (let y = -40 + this.roadY; y < this.canvas.height; y += 40) {
            this.ctx.fillRect(this.canvas.width/2 - 2, y, 4, 20);
        }
        
        // 道路边缘
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(0, 0, 20, this.canvas.height);
        this.ctx.fillRect(this.canvas.width - 20, 0, 20, this.canvas.height);
    }
    
    // 输入处理
    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Space' && this.gameState === 'playing') {
                e.preventDefault();
                this.useItem();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    setupButtons() {
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
    }
    
    useItem() {
        this.bullets.push(this.createBullet(
            this.player.x + this.player.width/2 - 3,
            this.player.y,
            -1
        ));
    }
    
    // 游戏状态管理
    startGame() {
        this.gameState = 'playing';
        this.player = this.createPlayer();
        this.gameTime = 0;
        this.lastTime = performance.now();
        
        document.getElementById('startScreen').classList.add('hidden');
        
        console.log('🏁 游戏开始!');
        this.gameLoop(this.lastTime);
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            console.log('⏸️ 游戏暂停');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.lastTime = performance.now();
            this.gameLoop(this.lastTime);
            console.log('▶️ 游戏继续');
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('gameOverTitle').textContent = '💥 游戏结束';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
        document.getElementById('gameOverScreen').classList.remove('hidden');
        console.log('💥 游戏结束!');
    }
    
    victory() {
        this.gameState = 'victory';
        document.getElementById('gameOverTitle').textContent = '🏆 胜利！';
        document.getElementById('gameOverContent').innerHTML = `
            <p>🎉 恭喜！你击败了终局BOSS "机械战车王"！</p>
            <p>最终分数: <span id="finalScore">${this.score}</span></p>
            <p>最高等级: <span id="finalLevel">${this.level}</span></p>
        `;
        document.getElementById('gameOverScreen').classList.remove('hidden');
        console.log('🏆 胜利！击败了终局BOSS!');
    }
    
    restart() {
        this.gameState = 'start';
        this.player = null;
        this.enemies = [];
        this.obstacles = [];
        this.bullets = [];
        this.items = [];
        this.particles = [];
        this.finalBoss = null;
        this.activeEffects.clear();
        
        this.level = 1;
        this.exp = 0;
        this.maxExp = 100;
        this.score = 0;
        this.stageProgress = 0;
        this.gameTime = 0;
        
        const upgradesList = document.getElementById('upgradesList');
        upgradesList.innerHTML = '<li>等级 1: 普通加速</li>';
        
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
        
        this.updateUI();
        console.log('🔄 游戏重置');
    }
    
    updateUI() {
        document.getElementById('level').textContent = this.level;
        document.getElementById('exp').textContent = this.exp;
        document.getElementById('maxExp').textContent = this.maxExp;
        document.getElementById('health').textContent = this.player ? this.player.health : 100;
        document.getElementById('score').textContent = this.score;
    }
}

// 初始化游戏
const game = new RacingGame();
console.log('🏎️ HTML5 Canvas 赛车游戏加载完成！');
