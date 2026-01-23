import { Renderer } from './Renderer.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

/**
 * ThreeJSRenderer - Three.jsベースの3Dレンダラー
 */
export class ThreeJSRenderer extends Renderer {
    constructor(canvas) {
        super();

        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // 3Dオブジェクトのキャッシュ
        this.boardGroup = null;
        this.piecesGroup = null;
        this.highlightGroup = null;
        this.capturedGroup = null;
        this.uiGroup = null;

        // 盤面サイズ（1マス = 1ユニット）
        this.cellSize = 1;
        this.boardSize = 9 * this.cellSize;

        // 駒メッシュのキャッシュ
        this.pieceMeshes = [];
        this.cellMeshes = [];

        // テクスチャキャッシュ（駒文字用）
        this.textureCache = new Map();

        // 駒ジオメトリキャッシュ
        this.pieceGeometry = null;

        // フォント
        this.font = null;

        // アニメーション
        this.animationId = null;

        // 初期化
        this.init();
    }

    /**
     * 初期化
     */
    async init() {
        // シーン作成
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1c23);

        // カメラ設定（斜め上から）
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);  // FOVを広げる
        this.camera.position.set(0, 14, 12);  // カメラを引いて全体を表示
        this.camera.lookAt(0, 0, 0);

        // レンダラー
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // OrbitControls
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enablePan = false;
        this.controls.minDistance = 8;
        this.controls.maxDistance = 25;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // ライティング
        this.setupLighting();

        // 盤面作成
        this.createBoard();

        // グループ初期化
        this.piecesGroup = new THREE.Group();
        this.scene.add(this.piecesGroup);

        this.highlightGroup = new THREE.Group();
        this.scene.add(this.highlightGroup);

        this.capturedGroup = new THREE.Group();
        this.scene.add(this.capturedGroup);

        // イベントリスナー
        this.canvas.addEventListener('click', this.onMouseClick.bind(this));
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // アニメーションループ開始
        this.animate();
    }

    /**
     * ライティング設定（3点ライティング）
     */
    setupLighting() {
        // 環境光（全体を明るく）
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        // メインライト（上から）
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(0, 15, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);

        // フィルライト（影を和らげる）
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(-5, 8, -5);
        this.scene.add(fillLight);

        // バックライト（輪郭を際立たせる）
        const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
        backLight.position.set(5, 5, -8);
        this.scene.add(backLight);
    }

    /**
     * 盤面を作成
     */
    createBoard() {
        this.boardGroup = new THREE.Group();

        // 盤面の土台
        const boardGeometry = new THREE.BoxGeometry(this.boardSize + 0.5, 0.3, this.boardSize + 0.5);
        const boardMaterial = new THREE.MeshStandardMaterial({
            color: 0xd4a76a,
            roughness: 0.6,
            metalness: 0.1
        });
        const boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
        boardMesh.position.y = -0.15;
        boardMesh.receiveShadow = true;
        this.boardGroup.add(boardMesh);

        // 盤面上面（明るい木目色）
        const surfaceGeometry = new THREE.PlaneGeometry(this.boardSize, this.boardSize);
        const surfaceMaterial = new THREE.MeshStandardMaterial({
            color: 0xe6cfa1,
            roughness: 0.4,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
        surfaceMesh.rotation.x = -Math.PI / 2;
        surfaceMesh.position.y = 0.01;
        surfaceMesh.receiveShadow = true;
        this.boardGroup.add(surfaceMesh);

        // グリッド線
        this.createGridLines();

        // セルのクリック検出用の透明メッシュ
        this.createCellMeshes();

        this.scene.add(this.boardGroup);

        // 駒台
        this.createPieceStands();
    }

    /**
     * グリッド線を作成
     */
    createGridLines() {
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x2c1810, linewidth: 2 });
        const halfSize = this.boardSize / 2;

        // 縦線
        for (let i = 0; i <= 9; i++) {
            const x = -halfSize + i * this.cellSize;
            const points = [
                new THREE.Vector3(x, 0.02, -halfSize),
                new THREE.Vector3(x, 0.02, halfSize)
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial);
            this.boardGroup.add(line);
        }

        // 横線
        for (let i = 0; i <= 9; i++) {
            const z = -halfSize + i * this.cellSize;
            const points = [
                new THREE.Vector3(-halfSize, 0.02, z),
                new THREE.Vector3(halfSize, 0.02, z)
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial);
            this.boardGroup.add(line);
        }

        // 星（中央と四隅の印）- 点を追加
        const starPositions = [
            { row: 2, col: 2 }, { row: 2, col: 6 },
            { row: 6, col: 2 }, { row: 6, col: 6 }
        ];

        const starGeometry = new THREE.CircleGeometry(0.05, 16);
        const starMaterial = new THREE.MeshBasicMaterial({ color: 0x2c1810 });

        for (const pos of starPositions) {
            const star = new THREE.Mesh(starGeometry, starMaterial);
            star.rotation.x = -Math.PI / 2;
            star.position.set(
                this.colToX(pos.col) + this.cellSize / 2,
                0.03,
                this.rowToZ(pos.row) + this.cellSize / 2
            );
            this.boardGroup.add(star);
        }
    }

    /**
     * クリック検出用のセルメッシュを作成
     */
    createCellMeshes() {
        const cellGeometry = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
        const cellMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = new THREE.Mesh(cellGeometry, cellMaterial.clone());
                cell.rotation.x = -Math.PI / 2;
                cell.position.set(
                    this.colToX(col) + this.cellSize / 2,
                    0.05,
                    this.rowToZ(row) + this.cellSize / 2
                );
                cell.userData = { row, col, type: 'cell' };
                this.cellMeshes.push(cell);
                this.boardGroup.add(cell);
            }
        }
    }

    /**
     * 座標表示を作成（テキストの代わりにスプライト）
     */
    createCoordinates() {
        const halfSize = this.boardSize / 2;

        // 横座標 (9-1) - 盤の手前側すぐに配置
        // col=0が9筋（画面左）、col=8が1筋（画面右）で2Dと同じ
        for (let col = 0; col < 9; col++) {
            const num = 9 - col;  // col=0→9, col=8→1
            const sprite = this.createTextSprite(num.toString(), 0xffffff);
            const x = this.colToX(col) + this.cellSize / 2;
            sprite.position.set(
                x,
                0.1,
                halfSize + 0.35  // 盤のすぐ手前
            );
            sprite.scale.set(0.4, 0.4, 1);
            this.boardGroup.add(sprite);
        }

        // 縦座標 (一〜九) - 盤の右側に配置（2Dと同じ位置）
        // 一段目が奥（CPU側）、九段目が手前（プレイヤー側）
        const kanjiNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
        for (let i = 0; i < 9; i++) {
            const sprite = this.createTextSprite(kanjiNumbers[i], 0xffffff);
            // rowToZと同じ計算を使用
            const z = this.rowToZ(i) + this.cellSize / 2;
            sprite.position.set(
                halfSize + 0.6,  // 右側に配置（2Dと同じ）
                0.5,
                z
            );
            sprite.scale.set(0.5, 0.5, 1);
            this.boardGroup.add(sprite);
        }
    }

    /**
     * テキストスプライトを作成（座標表示用）
     */
    createTextSprite(text, color = 0x000000) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;

        // 高品質アンチエイリアス
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.font = 'bold 96px "Yu Mincho", "Hiragino Mincho Pro", "MS Mincho", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        return sprite;
    }

    /**
     * 駒のジオメトリを作成（ExtrudeGeometryで将棋駒の五角形形状）
     */
    createPieceGeometry() {
        // 将棋駒の五角形の形状を定義
        const shape = new THREE.Shape();

        // 駒のサイズ
        const width = 0.7;   // 横幅
        const height = 0.85; // 縦の高さ
        const shoulderY = height * 0.35;  // 肩の位置

        // 五角形を描画（底辺から時計回り）
        shape.moveTo(-width / 2, -height / 2);           // 左下
        shape.lineTo(width / 2, -height / 2);            // 右下
        shape.lineTo(width / 2, shoulderY);              // 右肩
        shape.lineTo(0, height / 2);                     // 先端（上）
        shape.lineTo(-width / 2, shoulderY);             // 左肩
        shape.closePath();

        // 押し出し設定
        const extrudeSettings = {
            depth: 0.25,        // 駒の厚み
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.03,
            bevelSegments: 2
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // 中心をジオメトリの中心に移動
        geometry.center();

        // UVマッピングを調整
        const uvAttribute = geometry.getAttribute('uv');
        const posAttribute = geometry.getAttribute('position');
        const normalAttribute = geometry.getAttribute('normal');

        for (let i = 0; i < uvAttribute.count; i++) {
            const nz = normalAttribute.getZ(i);
            const x = posAttribute.getX(i);
            const y = posAttribute.getY(i);

            // 前面（Z方向を向いている面）にテクスチャを適用
            if (nz > 0.5) {
                const u = (x + width / 2) / width;
                const v = (y + height / 2) / height;
                uvAttribute.setXY(i, u, v);
            } else {
                // 側面・背面・ベベルは木目部分（テクスチャの端）を使用
                uvAttribute.setXY(i, 0.1, 0.9);
            }
        }

        uvAttribute.needsUpdate = true;

        return geometry;
    }

    /**
     * 駒用のテクスチャを作成（高解像度Canvas）
     */
    createTextTexture(text, isPromoted = false) {
        const canvas = document.createElement('canvas');
        const size = 512;  // 高解像度
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');

        // 高品質アンチエイリアス
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 背景（木目色）
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#e6cfa1');
        gradient.addColorStop(0.5, '#d4a574');
        gradient.addColorStop(1, '#c99a5e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // 木目風の線を追加
        ctx.strokeStyle = 'rgba(139, 90, 43, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * 30 + Math.random() * 10);
            ctx.bezierCurveTo(
                size * 0.3, i * 30 + Math.random() * 15,
                size * 0.7, i * 30 + Math.random() * 15,
                size, i * 30 + Math.random() * 10
            );
            ctx.stroke();
        }

        // 文字の影（立体感）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.font = `bold ${size * 0.55}px "Yu Mincho", "Hiragino Mincho Pro", "MS Mincho", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, size / 2 + 4, size * 0.42 + 4);

        // メイン文字
        ctx.fillStyle = isPromoted ? '#b8192c' : '#1a1a1a';
        ctx.fillText(text, size / 2, size * 0.42);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.anisotropy = 16;  // 斜めからの視認性向上

        return texture;
    }

    /**
     * テクスチャキャッシュからテクスチャを取得（または作成）
     */
    getTextTexture(pieceType, isPromoted) {
        const key = `${pieceType}_${isPromoted}`;
        if (!this.textureCache.has(key)) {
            const text = this.getPieceDisplay({ type: pieceType, promoted: isPromoted });
            this.textureCache.set(key, this.createTextTexture(text, isPromoted));
        }
        return this.textureCache.get(key);
    }

    /**
     * 駒用共通ジオメトリを取得（遅延初期化）
     */
    getPieceGeometry() {
        if (!this.pieceGeometry) {
            this.pieceGeometry = this.createPieceGeometry();
        }
        return this.pieceGeometry;
    }

    /**
     * 駒台を作成
     */
    createPieceStands() {
        const standGeometry = new THREE.BoxGeometry(1.8, 0.2, 2.5);  // 少し小さく
        const standMaterial = new THREE.MeshStandardMaterial({
            color: 0xd4a76a,
            roughness: 0.6,
            metalness: 0.1
        });

        // プレイヤーの駒台（盤の右下 = プレイヤーの右手側）
        const playerStand = new THREE.Mesh(standGeometry, standMaterial);
        playerStand.position.set(6, 0, 5.5);  // 盤の右下角の外側
        playerStand.receiveShadow = true;
        playerStand.userData = { type: 'playerStand' };
        this.scene.add(playerStand);

        // CPUの駒台（盤の左上 = CPUの右手側）
        const cpuStand = new THREE.Mesh(standGeometry, standMaterial);
        cpuStand.position.set(-6, 0, -5.5);  // 盤の左上角の外側
        cpuStand.receiveShadow = true;
        cpuStand.userData = { type: 'cpuStand' };
        this.scene.add(cpuStand);
    }

    /**
     * 行からZ座標に変換
     */
    rowToZ(row) {
        return -this.boardSize / 2 + row * this.cellSize;
    }

    /**
     * 列からX座標に変換
     * col=0が9筋（画面左）、col=8が1筋（画面右）で2Dと同じ向き
     */
    colToX(col) {
        return -this.boardSize / 2 + col * this.cellSize;
    }

    /**
     * 駒メッシュを作成（ExtrudeGeometry + 高解像度テクスチャ）
     */
    createPieceMesh(pieceType, owner, isPromoted) {
        // 共有ジオメトリをクローン
        const geometry = this.getPieceGeometry().clone();

        // テクスチャをキャッシュから取得
        const texture = this.getTextTexture(pieceType, isPromoted);

        // 駒用マテリアル（テクスチャ付き、両面表示）
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.5,
            metalness: 0.0,
            color: 0xd4a574,  // 木目のベースカラー
            side: THREE.DoubleSide,  // 両面表示
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // X軸で-90度回転（駒を立てる：前面が手前を向く）
        mesh.rotation.x = -Math.PI / 2;

        // CPUの駒はZ軸で180度回転（盤面上で反転、テクスチャは見える）
        if (owner === 'cpu') {
            mesh.rotation.z = Math.PI;
        }

        return mesh;
    }

    /**
     * 駒の表示文字を取得
     */
    getPieceDisplay(piece) {
        if (!piece) return '';

        if (piece.promoted) {
            const promotedMapping = {
                '!と': 'と', '!杏': '杏', '!圭': '圭',
                '!全': '全', '!馬': '馬', '!竜': '龍'
            };
            return promotedMapping[piece.type] || piece.type.substring(1);
        }
        return piece.type;
    }

    /**
     * 盤面を描画
     */
    renderBoard(board, lastMove) {
        // 既存の駒をクリア
        while (this.piecesGroup.children.length > 0) {
            const child = this.piecesGroup.children[0];
            this.piecesGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
        this.pieceMeshes = [];

        // 最後の手のハイライト
        this.highlightLastMove(lastMove);

        // 駒を配置
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = board[row][col];
                if (piece) {
                    const mesh = this.createPieceMesh(piece.type, piece.owner, piece.promoted);
                    mesh.position.set(
                        this.colToX(col) + this.cellSize / 2,
                        0.15,
                        this.rowToZ(row) + this.cellSize / 2
                    );
                    mesh.userData = { row, col, type: 'piece', pieceData: piece };
                    this.pieceMeshes.push(mesh);
                    this.piecesGroup.add(mesh);
                }
            }
        }
    }

    /**
     * 最後の手をハイライト
     */
    highlightLastMove(lastMove) {
        // 既存のハイライトをクリア
        while (this.highlightGroup.children.length > 0) {
            const child = this.highlightGroup.children[0];
            this.highlightGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }

        if (!lastMove) return;

        const highlightGeometry = new THREE.PlaneGeometry(this.cellSize * 0.9, this.cellSize * 0.9);

        // 移動元
        if (lastMove.from) {
            const fromMaterial = new THREE.MeshBasicMaterial({
                color: 0x90caf9,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            const fromMesh = new THREE.Mesh(highlightGeometry.clone(), fromMaterial);
            fromMesh.rotation.x = -Math.PI / 2;
            fromMesh.position.set(
                this.colToX(lastMove.from.col) + this.cellSize / 2,
                0.04,
                this.rowToZ(lastMove.from.row) + this.cellSize / 2
            );
            this.highlightGroup.add(fromMesh);
        }

        // 移動先
        if (lastMove.to) {
            const toMaterial = new THREE.MeshBasicMaterial({
                color: 0xffeb3b,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            });
            const toMesh = new THREE.Mesh(highlightGeometry.clone(), toMaterial);
            toMesh.rotation.x = -Math.PI / 2;
            toMesh.position.set(
                this.colToX(lastMove.to.col) + this.cellSize / 2,
                0.04,
                this.rowToZ(lastMove.to.row) + this.cellSize / 2
            );
            this.highlightGroup.add(toMesh);
        }
    }

    /**
     * 有効な移動先をハイライト
     */
    highlightValidMoves(row, col, validMoves) {
        // 既存のハイライトをクリア（最後の手以外）
        const lastMoveHighlights = [];
        while (this.highlightGroup.children.length > 0) {
            const child = this.highlightGroup.children[0];
            // 最後の手のハイライトは保持（色で判別）
            if (child.material && (child.material.color.getHex() === 0x90caf9 || child.material.color.getHex() === 0xffeb3b)) {
                lastMoveHighlights.push(child);
                this.highlightGroup.remove(child);
            } else {
                this.highlightGroup.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            }
        }

        // 最後の手のハイライトを戻す
        lastMoveHighlights.forEach(h => this.highlightGroup.add(h));

        // 選択したセルをハイライト
        const selectedGeometry = new THREE.PlaneGeometry(this.cellSize * 0.95, this.cellSize * 0.95);
        const selectedMaterial = new THREE.MeshBasicMaterial({
            color: 0x4caf50,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const selectedMesh = new THREE.Mesh(selectedGeometry, selectedMaterial);
        selectedMesh.rotation.x = -Math.PI / 2;
        selectedMesh.position.set(
            this.colToX(col) + this.cellSize / 2,
            0.045,
            this.rowToZ(row) + this.cellSize / 2
        );
        selectedMesh.userData = { isValidMoveHighlight: true };
        this.highlightGroup.add(selectedMesh);

        // 有効な移動先をハイライト
        const validMoveGeometry = new THREE.PlaneGeometry(this.cellSize * 0.85, this.cellSize * 0.85);
        const validMoveMaterial = new THREE.MeshBasicMaterial({
            color: 0x81c784,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        for (const move of validMoves) {
            const mesh = new THREE.Mesh(validMoveGeometry.clone(), validMoveMaterial.clone());
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(
                this.colToX(move.col) + this.cellSize / 2,
                0.045,
                this.rowToZ(move.row) + this.cellSize / 2
            );
            mesh.userData = { isValidMoveHighlight: true };
            this.highlightGroup.add(mesh);
        }
    }

    /**
     * ハイライトをクリア
     */
    clearHighlights() {
        // 有効手ハイライトのみクリア（最後の手は保持）
        const toRemove = [];
        for (const child of this.highlightGroup.children) {
            if (child.userData && child.userData.isValidMoveHighlight) {
                toRemove.push(child);
            }
        }
        for (const child of toRemove) {
            this.highlightGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
    }

    /**
     * 持ち駒を描画
     */
    renderCapturedPieces(playerCaptured, cpuCaptured, selectedCapturedPiece) {
        // 既存の持ち駒表示をクリア
        while (this.capturedGroup.children.length > 0) {
            const child = this.capturedGroup.children[0];
            this.capturedGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }

        // プレイヤーの持ち駒（盤の右下 = プレイヤーの右手側）
        this.renderCapturedPiecesForPlayer(playerCaptured, true, selectedCapturedPiece, 6, 5.5);

        // CPUの持ち駒（盤の左上 = CPUの右手側）
        this.renderCapturedPiecesForPlayer(cpuCaptured, false, null, -6, -5.5);
    }

    /**
     * 各プレイヤーの持ち駒を描画
     */
    renderCapturedPiecesForPlayer(captured, isPlayer, selectedPiece, baseX, baseZ) {
        const grouped = this.groupCapturedPieces(captured);
        const pieceOrder = ['飛', '角', '金', '銀', '桂', '香', '歩'];

        let index = 0;
        for (const [piece, count] of grouped) {
            const row = Math.floor(index / 3);
            const col = index % 3;

            const mesh = this.createPieceMesh(piece, isPlayer ? 'player' : 'cpu', false);
            mesh.scale.set(0.7, 0.7, 0.7);
            mesh.position.set(
                baseX + (col - 1) * 0.8,
                0.2,
                baseZ + (row - 1) * 0.9
            );

            // 選択中の持ち駒をハイライト
            if (isPlayer && selectedPiece === piece) {
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                materials.forEach(m => {
                    m.emissive = new THREE.Color(0x4caf50);
                    m.emissiveIntensity = 0.3;
                });
            }

            mesh.userData = {
                type: 'capturedPiece',
                piece: piece,
                isPlayer: isPlayer
            };

            this.capturedGroup.add(mesh);

            // 枚数表示（2枚以上の場合）
            if (count > 1) {
                const countSprite = this.createTextSprite(`×${count}`, 0x2c1810);
                countSprite.position.set(
                    baseX + (col - 1) * 0.8 + 0.3,
                    0.35,
                    baseZ + (row - 1) * 0.9
                );
                countSprite.scale.set(0.25, 0.25, 1);
                this.capturedGroup.add(countSprite);
            }

            index++;
        }
    }

    /**
     * 持ち駒をグループ化
     */
    groupCapturedPieces(capturedList) {
        const pieceOrder = ['飛', '角', '金', '銀', '桂', '香', '歩'];
        const grouped = {};

        for (const piece of capturedList) {
            grouped[piece] = (grouped[piece] || 0) + 1;
        }

        const sortedEntries = Object.entries(grouped).sort((a, b) => {
            const indexA = pieceOrder.indexOf(a[0]);
            const indexB = pieceOrder.indexOf(b[0]);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        return sortedEntries;
    }

    /**
     * 成り選択モーダルを表示（2D DOM使用）
     */
    showPromotionModal(callback) {
        // 3Dでの成り選択は複雑なので、2D DOMモーダルを使用
        let modal = document.getElementById('promotion-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'promotion-modal';
            modal.className = 'modal hidden';
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>成りますか？</h2>
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
                        <button id="promote-yes" class="difficulty-btn">成る</button>
                        <button id="promote-no" class="difficulty-btn" style="background: linear-gradient(135deg, #999 0%, #666 100%);">成らない</button>
                    </div>
                </div>
            `;
            document.getElementById('app').appendChild(modal);
        }

        modal.classList.remove('hidden');

        const yesBtn = document.getElementById('promote-yes');
        const noBtn = document.getElementById('promote-no');

        const handleYes = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
            callback(true);
        };

        const handleNo = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
            callback(false);
        };

        yesBtn.addEventListener('click', handleYes);
        noBtn.addEventListener('click', handleNo);
    }

    /**
     * 手番表示を更新（2D DOM）
     */
    updateTurnIndicator(currentPlayer) {
        const indicator = document.getElementById('turn-indicator');
        if (indicator) {
            indicator.textContent =
                currentPlayer === 'player' ? 'あなたの手番です' : 'CPUが考えています...';
        }
    }

    /**
     * 指し手履歴を更新（2D/3D両方のDOM）
     */
    updateMoveHistory(moveHistory) {
        const html = moveHistory.map(move =>
            `<div class="move-item ${move.player === 'cpu' ? 'cpu-move' : ''}">
            ${move.number}. ${move.text}
            </div>`
        ).join('');

        // 2D用の指し手リスト
        const moveList = document.getElementById('move-list');
        if (moveList) {
            moveList.innerHTML = html;
            moveList.scrollTop = moveList.scrollHeight;
        }

        // 3D用の指し手リスト
        const moveList3d = document.getElementById('move-list-3d');
        if (moveList3d) {
            moveList3d.innerHTML = html;
            moveList3d.scrollTop = moveList3d.scrollHeight;
        }
    }

    /**
     * ゲーム結果を表示（2D DOM）
     */
    showGameResult(resultText) {
        const gameResult = document.getElementById('game-result');
        const gameOver = document.getElementById('game-over');

        if (gameResult) gameResult.textContent = resultText;
        if (gameOver) gameOver.classList.remove('hidden');
    }

    /**
     * 形勢表示を更新（2D DOM）
     */
    updateEvaluation(score, playerPercent) {
        const evalBarFill = document.getElementById('eval-bar-fill');
        const evalPercentage = document.getElementById('eval-percentage');
        const evalScore = document.getElementById('eval-score');

        if (!evalBarFill || !evalPercentage || !evalScore) return;

        evalBarFill.style.width = `${playerPercent}%`;
        evalPercentage.textContent = `${Math.round(playerPercent)}% - ${Math.round(100 - playerPercent)}%`;
        evalScore.textContent = score > 0 ? `+${score}` : score.toString();

        evalScore.classList.remove('player-advantage', 'cpu-advantage', 'even-advantage');
        if (score > 100) {
            evalScore.classList.add('player-advantage');
        } else if (score < -100) {
            evalScore.classList.add('cpu-advantage');
        } else {
            evalScore.classList.add('even-advantage');
        }
    }

    /**
     * マウスクリックイベント
     */
    onMouseClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // 駒と持ち駒をチェック
        const allObjects = [...this.pieceMeshes, ...this.cellMeshes, ...this.capturedGroup.children];
        const intersects = this.raycaster.intersectObjects(allObjects, true);

        if (intersects.length > 0) {
            // 最初のヒット対象を取得（親を辿る）
            let target = intersects[0].object;
            while (target && !target.userData.type) {
                target = target.parent;
            }

            if (target && target.userData) {
                if (target.userData.type === 'cell' || target.userData.type === 'piece') {
                    // 盤面セルまたは駒クリック
                    const { row, col } = target.userData;
                    if (this.onCellClickCallback) {
                        this.onCellClickCallback(row, col);
                    }
                } else if (target.userData.type === 'capturedPiece' && target.userData.isPlayer) {
                    // 持ち駒クリック
                    if (this.onCapturedPieceClickCallback) {
                        this.onCapturedPieceClickCallback(target.userData.piece);
                    }
                }
            }
        }
    }

    /**
     * ウィンドウリサイズ
     */
    onWindowResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * アニメーションループ
     */
    animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * リソースを解放
     */
    dispose() {
        super.dispose();

        // アニメーション停止
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // イベントリスナー削除
        this.canvas.removeEventListener('click', this.onMouseClick);
        window.removeEventListener('resize', this.onWindowResize);

        // テクスチャキャッシュをクリア
        this.textureCache.forEach(texture => {
            if (texture.dispose) texture.dispose();
        });
        this.textureCache.clear();

        // 駒ジオメトリを解放
        if (this.pieceGeometry) {
            this.pieceGeometry.dispose();
            this.pieceGeometry = null;
        }

        // Three.jsリソース解放
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.controls) {
            this.controls.dispose();
        }

        // シーン内のオブジェクトを解放
        this.scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
    }
}
