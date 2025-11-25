import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        this.controls = new PointerLockControls(this.camera, this.renderer.domElement);

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

        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            space: false
        };

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

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
                disableDefaultUI: true,
                showRoadLabels: false,
                clickToGo: false,
                linksControl: false,
                panControl: false,
                enableCloseButton: false
            }
        );
        this.panorama = panorama;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.ShadowMaterial({
            opacity: 0.5 // Adjust if you want to see shadows more/less clearly
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.ground = ground;

        // Obstacles removed for Street View integration

        this.camera.position.y = this.player.height;
        this.camera.position.z = 5;

        this.spawnEnemies(5);
    }

    spawnEnemies(count) {
        // 道路に沿った特定のパス（直線的な道路を想定）
        const roadPaths = [
            { x: 0, z: 0 },      // 中心
            { x: 5, z: 0 },      // 東
            { x: -5, z: 0 },     // 西
            { x: 0, z: 5 },      // 北
            { x: 0, z: -5 },     // 南
            { x: 3, z: 3 },      // 北東
            { x: -3, z: 3 },     // 北西
            { x: 3, z: -3 },     // 南東
            { x: -3, z: -3 },    // 南西
        ];

        for (let i = 0; i < count; i++) {
            const geometry = new THREE.BoxGeometry(1, 2, 1);
            const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            const enemy = new THREE.Mesh(geometry, material);

            // 道路パス上の位置を選択
            const pathIndex = i % roadPaths.length;
            const roadPoint = roadPaths[pathIndex];

            // 道路パス上にスポーン（わずかなランダム性を追加）
            enemy.position.set(
                roadPoint.x + (Math.random() - 0.5) * 2,
                1,
                roadPoint.z + (Math.random() - 0.5) * 2
            );

            enemy.castShadow = true;
            enemy.receiveShadow = true;

            enemy.userData = {
                hp: 50,
                speed: 0.02, // さらに遅く
                isEnemy: true,
                lastDamageTime: 0,
                roadConstraint: true,
                spawnPoint: enemy.position.clone(), // スポーン位置を記憶
                maxWanderDistance: 5, // スポーン位置から5ユニット以内のみ
                wanderAngle: Math.random() * Math.PI * 2
            };

            this.enemies.push(enemy);
            this.scene.add(enemy);
        }
        this.updateUI();
    }

    setupEventListeners() {
        this.renderer.domElement.addEventListener('click', () => {
            if (!this.controls.isLocked && !this.isGameOver) {
                this.controls.lock();
            }
        });

        this.controls.addEventListener('lock', () => {
            document.getElementById('instructions').style.display = 'none';
        });

        this.controls.addEventListener('unlock', () => {
            if (!this.isGameOver) {
                document.getElementById('instructions').style.display = 'block';
            }
        });

        document.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.forward = true; break;
                case 'KeyS': this.keys.backward = true; break;
                case 'KeyA': this.keys.left = true; break;
                case 'KeyD': this.keys.right = true; break;
                case 'Space':
                    e.preventDefault();
                    if (this.player.onGround) {
                        this.player.velocity.y = this.player.jumpSpeed;
                        this.player.onGround = false;
                    }
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.forward = false; break;
                case 'KeyS': this.keys.backward = false; break;
                case 'KeyA': this.keys.left = false; break;
                case 'KeyD': this.keys.right = false; break;
            }
        });

        this.renderer.domElement.addEventListener('click', () => {
            if (this.controls.isLocked && !this.isGameOver) {
                this.shoot();
            }
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
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
        if (!this.controls.isLocked) return;

        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(this.camera.up, direction).normalize();

        const moveVector = new THREE.Vector3();

        if (this.keys.forward) {
            moveVector.add(direction.clone().multiplyScalar(this.player.speed));
        }
        if (this.keys.backward) {
            moveVector.add(direction.clone().multiplyScalar(-this.player.speed));
        }
        if (this.keys.left) {
            moveVector.add(right.clone().multiplyScalar(this.player.speed));
        }
        if (this.keys.right) {
            moveVector.add(right.clone().multiplyScalar(-this.player.speed));
        }

        this.camera.position.add(moveVector);

        this.player.velocity.y -= 0.02;
        this.camera.position.y += this.player.velocity.y;

        if (this.camera.position.y <= this.player.height) {
            this.camera.position.y = this.player.height;
            this.player.velocity.y = 0;
            this.player.onGround = true;
        }

        const maxDistance = 95;
        if (Math.abs(this.camera.position.x) > maxDistance) {
            this.camera.position.x = Math.sign(this.camera.position.x) * maxDistance;
        }
        if (Math.abs(this.camera.position.z) > maxDistance) {
            this.camera.position.z = Math.sign(this.camera.position.z) * maxDistance;
        }

        // Sync Street View POV
        if (this.panorama) {
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);

            // Convert direction vector to heading and pitch
            // Heading: angle in degrees clockwise from North (0)
            // Three.js: -Z is forward (North), +X is right (East)
            // atan2(x, z) gives angle from +Z axis (South)
            // We need to adjust to match Google Maps heading

            let heading = THREE.MathUtils.radToDeg(Math.atan2(-direction.x, -direction.z));
            if (heading < 0) heading += 360;

            const pitch = THREE.MathUtils.radToDeg(Math.asin(direction.y));

            this.panorama.setPov({
                heading: heading,
                pitch: pitch
            });
        }
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

            enemy.lookAt(this.camera.position.x, enemy.position.y, this.camera.position.z);

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
        document.getElementById('onGround').textContent = this.player.onGround;
    }

    gameOver() {
        this.isGameOver = true;
        this.controls.unlock();
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


