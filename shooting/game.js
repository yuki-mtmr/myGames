import * as THREE from 'three';


export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);



        this.player = {
            height: 2,
            speed: 0.15,
            jumpSpeed: 0.5,
            velocity: new THREE.Vector3(),
            onGround: true,
            hp: 100,
            maxHp: 100
        };

        this.enemies = [];
        this.projectiles = [];
        this.score = 0;
        this.isGameOver = false;

        // Street View service for road validation
        this.streetViewService = new google.maps.StreetViewService();
        this.roadPoints = []; // 道路上の有効なポイント



        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.textureLoader = new THREE.TextureLoader();
        this.enemyTexture = this.textureLoader.load('/enemy.png');
        this.enemyTexture.magFilter = THREE.NearestFilter;
        this.enemyTexture.minFilter = THREE.NearestFilter;
        this.enemyTexture.colorSpace = THREE.SRGBColorSpace;

        this.init();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        // Street View setup
        const panorama = new google.maps.StreetViewPanorama(
            document.getElementById('street-view'),
            {
                position: { lat: 35.463708, lng: 139.512965 },
                pov: {
                    heading: 0,
                    pitch: 0
                },
                zoom: 0,
                disableDefaultUI: false,
                showRoadLabels: true,
                clickToGo: true,
                linksControl: true,
                panControl: false,
                enableCloseButton: false,
                motionTracking: false,
                motionTrackingControl: false
            }
        );
        this.panorama = panorama;

        // Sync Three.js camera to Street View
        this.panorama.addListener('pov_changed', () => {
            const pov = this.panorama.getPov();
            const headingRad = THREE.MathUtils.degToRad(pov.heading);
            const pitchRad = THREE.MathUtils.degToRad(pov.pitch);
            this.camera.rotation.set(pitchRad, -headingRad, 0, 'YXZ');
        });

        // パノラマのリンク（道路のつながり）が変更されたら敵を再配置
        this.panorama.addListener('links_changed', () => {
            const links = this.panorama.getLinks();
            if (links && links.length > 0) {
                // 既存の敵を削除
                this.enemies.forEach(enemy => this.scene.remove(enemy));
                this.enemies = [];

                // 道路情報に基づいて敵をスポーン
                this.spawnEnemiesOnRoad(links, 5);
            }
        });

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // 地面（影を受けるため、透明にする）
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.ground = ground;

        // Obstacles removed for Street View integration

        this.camera.position.y = this.player.height;
        this.camera.position.z = 5;
    }

    spawnEnemiesOnRoad(links, count) {
        // リンク（道路の方向）を使って敵を配置
        // linksには隣接するパノラマへのheading（角度）が含まれている

        for (let i = 0; i < count; i++) {
            // ランダムに道路（リンク）を選ぶ
            const link = links[Math.floor(Math.random() * links.length)];
            const roadHeading = link.heading; // 道路の方角（度数法）

            // 度数法をラジアンに変換（Three.jsは反時計回りが正、Google Mapsは時計回りが正なので調整）
            // Google Maps: 北=0, 東=90. Three.js: -Z方向が基準
            // 変換: rad = (heading - 180) * Math.PI / 180 (これで-Z方向を0度とした角度になる...はずだが調整が必要)

            // 単純に計算:
            // Z = -cos(heading)
            // X = sin(heading)
            const rad = roadHeading * Math.PI / 180;
            const dirX = Math.sin(rad);
            const dirZ = -Math.cos(rad); // 北(0度)へ向かうとZはマイナス

            const material = new THREE.SpriteMaterial({ map: this.enemyTexture });
            const enemy = new THREE.Sprite(material);
            enemy.scale.set(2, 2, 1);

            // 距離をランダムに設定（10〜40メートル先）
            const distance = 15 + Math.random() * 25;

            // 道路の幅のブレ（±2メートル）
            // 進行方向に対して垂直なベクトルを計算
            const perpX = dirZ;
            const perpZ = -dirX;
            const offset = (Math.random() - 0.5) * 4;

            enemy.position.set(
                dirX * distance + perpX * offset,
                1,
                dirZ * distance + perpZ * offset
            );

            enemy.castShadow = true;
            enemy.receiveShadow = true;

            enemy.userData = {
                hp: 50,
                speed: 0.03,
                isEnemy: true,
                lastDamageTime: 0,
                roadConstraint: true,
                spawnPoint: enemy.position.clone(),
                maxWanderDistance: 5,
                wanderAngle: Math.random() * Math.PI * 2
            };

            this.enemies.push(enemy);
            this.scene.add(enemy);
        }
        this.updateUI();
    }

    spawnEnemies(count) {
        // プレイヤーの現在の視線方向に敵を配置
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(this.camera.up, direction).normalize();

        for (let i = 0; i < count; i++) {
            const material = new THREE.SpriteMaterial({ map: this.enemyTexture });
            const enemy = new THREE.Sprite(material);
            enemy.scale.set(2, 2, 1);

            const distance = 15 + i * 8;
            const lateralOffset = (Math.random() - 0.5) * 4;

            // カメラの前方に配置
            const spawnPos = this.camera.position.clone()
                .add(direction.clone().multiplyScalar(distance))
                .add(right.clone().multiplyScalar(lateralOffset));

            spawnPos.y = 1;
            enemy.position.copy(spawnPos);

            enemy.castShadow = true;
            enemy.receiveShadow = true;

            enemy.userData = {
                hp: 50,
                speed: 0.03,
                isEnemy: true,
                lastDamageTime: 0,
                roadConstraint: true,
                spawnPoint: enemy.position.clone(),
                maxWanderDistance: 3,
                wanderAngle: Math.random() * Math.PI * 2
            };

            this.enemies.push(enemy);
            this.scene.add(enemy);
        }
        this.updateUI();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.shoot();
            }
        });
    }

    shoot() {
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const projectile = new THREE.Mesh(geometry, material);

        projectile.position.copy(this.camera.position);

        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        projectile.userData = {
            velocity: direction.multiplyScalar(1),
            isProjectile: true,
            lifetime: 0
        };

        this.projectiles.push(projectile);
        this.scene.add(projectile);
    }

    updatePlayer() {
        // No physics needed for Street View navigation
    }

    updateEnemies() {
        const currentTime = Date.now();

        this.enemies.forEach(enemy => {
            const distanceToPlayer = enemy.position.distanceTo(this.camera.position);

            // プレイヤーとの距離に応じて動作を変更
            let direction;
            if (distanceToPlayer > 15) {
                // 遠い場合：徘徊モード（スポーン位置周辺を動く）
                enemy.userData.wanderAngle += (Math.random() - 0.5) * 0.2;
                direction = new THREE.Vector3(
                    Math.cos(enemy.userData.wanderAngle),
                    0,
                    Math.sin(enemy.userData.wanderAngle)
                );
            } else {
                // 近い場合：プレイヤーを追跡
                direction = new THREE.Vector3()
                    .subVectors(this.camera.position, enemy.position)
                    .normalize();
                direction.y = 0;
            }

            // 新しい位置を計算
            const newPosition = enemy.position.clone().add(direction.multiplyScalar(enemy.userData.speed));

            // スポーン位置からの距離を計算
            const distanceFromSpawn = newPosition.distanceTo(enemy.userData.spawnPoint);

            // スポーン位置から一定距離内のみ移動可能
            if (distanceFromSpawn < enemy.userData.maxWanderDistance) {
                enemy.position.copy(newPosition);
            } else {
                // 範囲外の場合、スポーン位置方向に引き戻す
                const toSpawn = new THREE.Vector3()
                    .subVectors(enemy.userData.spawnPoint, enemy.position)
                    .normalize();
                enemy.position.add(toSpawn.multiplyScalar(enemy.userData.speed * 2));

                // 徘徊角度を変更
                enemy.userData.wanderAngle += Math.PI / 2;
            }

            // enemy.lookAt(this.camera.position.x, enemy.position.y, this.camera.position.z); // Sprite always faces camera

            const distance = enemy.position.distanceTo(this.camera.position);
            if (distance < 2 && currentTime - enemy.userData.lastDamageTime > 1000) {
                this.player.hp -= 10;
                enemy.userData.lastDamageTime = currentTime;
                this.updateUI();

                if (this.player.hp <= 0) {
                    this.gameOver();
                }
            }
        });
    }

    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];

            projectile.position.add(projectile.userData.velocity);
            projectile.userData.lifetime += 1;

            if (projectile.userData.lifetime > 300) {
                this.scene.remove(projectile);
                this.projectiles.splice(i, 1);
                continue;
            }

            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const distance = projectile.position.distanceTo(enemy.position);

                if (distance < 1.5) {
                    enemy.userData.hp -= 25;

                    this.scene.remove(projectile);
                    this.projectiles.splice(i, 1);

                    if (enemy.userData.hp <= 0) {
                        this.scene.remove(enemy);
                        this.enemies.splice(j, 1);
                        this.score += 100;
                        this.updateUI();

                        if (this.enemies.length === 0) {
                            this.spawnEnemies(Math.min(5 + Math.floor(this.score / 500), 15));
                        }
                    }
                    break;
                }
            }
        }
    }

    updateUI() {
        document.getElementById('hp').textContent = Math.max(0, this.player.hp);
        document.getElementById('score').textContent = this.score;
        document.getElementById('enemies').textContent = this.enemies.length;
    }

    gameOver() {
        this.isGameOver = true;
        document.getElementById('game-over').style.display = 'block';
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over-text').textContent = 'GAME OVER';
    }

    animate() {
        if (!this.isGameOver) {
            requestAnimationFrame(() => this.animate());

            this.updatePlayer();
            this.updateEnemies();
            this.updateProjectiles();
            this.updateUI();

            this.renderer.render(this.scene, this.camera);
        }
    }
}


