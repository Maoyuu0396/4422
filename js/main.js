class ClockTowerScene {
    constructor() {
        this.canvas = document.getElementById('webgl-canvas');
        this.gl = this.canvas.getContext('webgl2');
        this.program = null;
        this.animationId = null;
        this.isAnimating = true;
        
        // 相机参数
        this.camera = {
            rotationX: -0.5,
            rotationY: 0.5,
            distance: 8,
            target: [0, 2, 0]
        };
        
        // 动画状态
        this.animationState = {
            hourAngle: 0,
            minuteAngle: 0,
            secondAngle: 0,
            gearAngle: 0,
            time: 0
        };
        
        this.mouse = { x: 0, y: 0, isDown: false };
        
        this.init();
    }

    init() {
        if (!this.gl) {
            alert('WebGL 2.0 is not available in your browser!');
            return;
        }

        this.setupShaders();
        this.setupBuffers();
        this.setupEventListeners();
        this.render();
    }

    setupShaders() {
        const gl = this.gl;
        
        // 创建着色器程序
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, shaders.vertexShader);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, shaders.fragmentShader);
        
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Shader program link error:', gl.getProgramInfoLog(this.program));
        }
        
        gl.useProgram(this.program);
        
        // 获取attribute和uniform位置
        this.attribLocations = {
            position: gl.getAttribLocation(this.program, 'aPosition'),
            normal: gl.getAttribLocation(this.program, 'aNormal')
        };
        
        this.uniformLocations = {
            modelViewMatrix: gl.getUniformLocation(this.program, 'uModelViewMatrix'),
            projectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix'),
            normalMatrix: gl.getUniformLocation(this.program, 'uNormalMatrix'),
            lightPosition: gl.getUniformLocation(this.program, 'uLightPosition'),
            lightColor: gl.getUniformLocation(this.program, 'uLightColor'),
            ambientColor: gl.getUniformLocation(this.program, 'uAmbientColor'),
            diffuseColor: gl.getUniformLocation(this.program, 'uDiffuseColor'),
            specularColor: gl.getUniformLocation(this.program, 'uSpecularColor'),
            shininess: gl.getUniformLocation(this.program, 'uShininess')
        };
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }

    setupBuffers() {
        this.buffers = {
            cube: this.createCubeBuffer(),
            cylinder: this.createCylinderBuffer(12),
            plane: this.createPlaneBuffer()
        };
    }

    createCubeBuffer() {
        const gl = this.gl;
        
        // 立方体顶点数据 (位置 + 法线)
        const vertices = new Float32Array([
            // 前面
            -0.5, -0.5,  0.5,  0.0,  0.0,  1.0,
             0.5, -0.5,  0.5,  0.0,  0.0,  1.0,
             0.5,  0.5,  0.5,  0.0,  0.0,  1.0,
            -0.5,  0.5,  0.5,  0.0,  0.0,  1.0,
            
            // 后面
            -0.5, -0.5, -0.5,  0.0,  0.0, -1.0,
            -0.5,  0.5, -0.5,  0.0,  0.0, -1.0,
             0.5,  0.5, -0.5,  0.0,  0.0, -1.0,
             0.5, -0.5, -0.5,  0.0,  0.0, -1.0,
            
            // 上面
            -0.5,  0.5, -0.5,  0.0,  1.0,  0.0,
            -0.5,  0.5,  0.5,  0.0,  1.0,  0.0,
             0.5,  0.5,  0.5,  0.0,  1.0,  0.0,
             0.5,  0.5, -0.5,  0.0,  1.0,  0.0,
            
            // 下面
            -0.5, -0.5, -0.5,  0.0, -1.0,  0.0,
             0.5, -0.5, -0.5,  0.0, -1.0,  0.0,
             0.5, -0.5,  0.5,  0.0, -1.0,  0.0,
            -0.5, -0.5,  0.5,  0.0, -1.0,  0.0,
            
            // 右面
             0.5, -0.5, -0.5,  1.0,  0.0,  0.0,
             0.5,  0.5, -0.5,  1.0,  0.0,  0.0,
             0.5,  0.5,  0.5,  1.0,  0.0,  0.0,
             0.5, -0.5,  0.5,  1.0,  0.0,  0.0,
            
            // 左面
            -0.5, -0.5, -0.5, -1.0,  0.0,  0.0,
            -0.5, -0.5,  0.5, -1.0,  0.0,  0.0,
            -0.5,  0.5,  0.5, -1.0,  0.0,  0.0,
            -0.5,  0.5, -0.5, -1.0,  0.0,  0.0
        ]);

        const indices = new Uint16Array([
            0, 1, 2,  0, 2, 3,    // 前面
            4, 5, 6,  4, 6, 7,    // 后面
            8, 9, 10, 8, 10, 11,  // 上面
            12, 13, 14, 12, 14, 15, // 下面
            16, 17, 18, 16, 18, 19, // 右面
            20, 21, 22, 20, 22, 23  // 左面
        ]);

        return this.createBuffer(vertices, indices);
    }

    createCylinderBuffer(sides = 12) {
        const gl = this.gl;
        const vertices = [];
        const indices = [];
        
        // 顶部中心
        vertices.push(0, 0.5, 0, 0, 1, 0);
        // 底部中心
        vertices.push(0, -0.5, 0, 0, -1, 0);
        
        for (let i = 0; i <= sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const x = Math.cos(angle);
            const z = Math.sin(angle);
            
            // 顶部顶点
            vertices.push(x, 0.5, z, 0, 1, 0);
            // 底部顶点
            vertices.push(x, -0.5, z, 0, -1, 0);
            // 侧面顶部
            vertices.push(x, 0.5, z, x, 0, z);
            // 侧面底部
            vertices.push(x, -0.5, z, x, 0, z);
        }
        
        // 顶部三角形
        for (let i = 0; i < sides; i++) {
            indices.push(0, 2 + i * 4, 2 + (i + 1) * 4);
        }
        
        // 底部三角形
        for (let i = 0; i < sides; i++) {
            indices.push(1, 3 + i * 4, 3 + (i + 1) * 4);
        }
        
        // 侧面四边形
        for (let i = 0; i < sides; i++) {
            const start = 4 + i * 4;
            indices.push(
                start, start + 1, start + 5,
                start, start + 5, start + 4
            );
        }
        
        return this.createBuffer(new Float32Array(vertices), new Uint16Array(indices));
    }

    createPlaneBuffer() {
        const gl = this.gl;
        
        const vertices = new Float32Array([
            -10, 0, -10,  0, 1, 0,
             10, 0, -10,  0, 1, 0,
             10, 0,  10,  0, 1, 0,
            -10, 0,  10,  0, 1, 0
        ]);

        const indices = new Uint16Array([
            0, 1, 2, 0, 2, 3
        ]);

        return this.createBuffer(vertices, indices);
    }

    createBuffer(vertices, indices) {
        const gl = this.gl;
        
        const buffer = {
            vao: gl.createVertexArray(),
            vertexBuffer: gl.createBuffer(),
            indexBuffer: gl.createBuffer(),
            vertexCount: indices.length
        };
        
        gl.bindVertexArray(buffer.vao);
        
        // 设置顶点缓冲区
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        // 设置位置属性
        gl.enableVertexAttribArray(this.attribLocations.position);
        gl.vertexAttribPointer(this.attribLocations.position, 3, gl.FLOAT, false, 24, 0);
        
        // 设置法线属性
        gl.enableVertexAttribArray(this.attribLocations.normal);
        gl.vertexAttribPointer(this.attribLocations.normal, 3, gl.FLOAT, false, 24, 12);
        
        // 设置索引缓冲区
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        
        gl.bindVertexArray(null);
        
        return buffer;
    }

    setupEventListeners() {
        const gl = this.gl;
        
        // 鼠标事件控制相机
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.isDown = true;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        this.canvas.addEventListener('mouseup', () => {
            this.mouse.isDown = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.mouse.isDown) return;
            
            const dx = e.clientX - this.mouse.x;
            const dy = e.clientY - this.mouse.y;
            
            this.camera.rotationY += dx * 0.01;
            this.camera.rotationX += dy * 0.01;
            this.camera.rotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotationX));
            
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        this.canvas.addEventListener('wheel', (e) => {
            this.camera.distance += e.deltaY * 0.01;
            this.camera.distance = Math.max(3, Math.min(20, this.camera.distance));
            e.preventDefault();
        });

        // 按钮控制
        document.getElementById('rotateClockwise').addEventListener('click', () => {
            this.animationState.gearAngle += 0.1;
        });

        document.getElementById('rotateCounterClockwise').addEventListener('click', () => {
            this.animationState.gearAngle -= 0.1;
        });

        document.getElementById('toggleAnimation').addEventListener('click', () => {
            this.isAnimating = !this.isAnimating;
        });
    }

    updateAnimations(deltaTime) {
        if (!this.isAnimating) return;
        
        this.animationState.time += deltaTime;
        
        // 秒针：每60秒转一圈
        this.animationState.secondAngle = (this.animationState.time / 60) * Math.PI * 2;
        // 分针：每3600秒转一圈
        this.animationState.minuteAngle = (this.animationState.time / 3600) * Math.PI * 2;
        // 时针：每43200秒转一圈
        this.animationState.hourAngle = (this.animationState.time / 43200) * Math.PI * 2;
        // 齿轮：持续旋转
        this.animationState.gearAngle += deltaTime * 0.5;
    }

    render() {
        const gl = this.gl;
        const currentTime = performance.now();
        const deltaTime = (currentTime - (this.lastTime || currentTime)) / 1000;
        this.lastTime = currentTime;
        
        this.updateAnimations(deltaTime);
        
        // 清除画布
        gl.clearColor(0.7, 0.8, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        
        // 设置投影矩阵
        const projectionMatrix = Matrix4.create();
        Matrix4.perspective(projectionMatrix, 
            Math.PI/4, 
            this.canvas.width/this.canvas.height, 
            0.1, 100
        );
        
        // 设置视图矩阵（相机）
        const viewMatrix = Matrix4.create();
        Matrix4.translate(viewMatrix, viewMatrix, [0, 0, -this.camera.distance]);
        Matrix4.rotateY(viewMatrix, viewMatrix, this.camera.rotationY);
        Matrix4.rotateY(viewMatrix, viewMatrix, this.camera.rotationX);
        Matrix4.translate(viewMatrix, viewMatrix, [
            -this.camera.target[0], 
            -this.camera.target[1], 
            -this.camera.target[2]
        ]);
        
        // 设置灯光
        gl.uniform3f(this.uniformLocations.lightPosition, 5, 8, 5);
        gl.uniform3f(this.uniformLocations.lightColor, 1.0, 1.0, 1.0);
        
        // 绘制地面
        this.drawPlane(viewMatrix, projectionMatrix);
        
        // 绘制钟楼主体
        this.drawTower(viewMatrix, projectionMatrix);
        
        // 绘制时钟面
        this.drawClockFace(viewMatrix, projectionMatrix);
        
        // 绘制指针
        this.drawClockHands(viewMatrix, projectionMatrix);
        
        // 绘制齿轮
        this.drawGears(viewMatrix, projectionMatrix);
        
        this.animationId = requestAnimationFrame(() => this.render());
    }

    drawPlane(viewMatrix, projectionMatrix) {
        const gl = this.gl;
        const modelMatrix = Matrix4.create();
        
        Matrix4.translate(modelMatrix, modelMatrix, [0, -0.5, 0]);
        
        this.setMatrixUniforms(modelMatrix, viewMatrix, projectionMatrix);
        this.setMaterial(0.3, 0.6, 0.3, 0.8, 0.8, 0.8, 0.2, 0.2, 0.2, 32);
        
        gl.bindVertexArray(this.buffers.plane.vao);
        gl.drawElements(gl.TRIANGLES, this.buffers.plane.vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    drawTower(viewMatrix, projectionMatrix) {
        const gl = this.gl;
        
        // 钟楼主体
        const towerMatrix = Matrix4.create();
        Matrix4.translate(towerMatrix, towerMatrix, [0, 1.5, 0]);
        Matrix4.multiply(towerMatrix, towerMatrix, this.createScaleMatrix(1, 3, 1));
        
        this.setMatrixUniforms(towerMatrix, viewMatrix, projectionMatrix);
        this.setMaterial(0.8, 0.7, 0.6, 0.8, 0.7, 0.6, 0.3, 0.3, 0.3, 32);
        
        gl.bindVertexArray(this.buffers.cube.vao);
        gl.drawElements(gl.TRIANGLES, this.buffers.cube.vertexCount, gl.UNSIGNED_SHORT, 0);
        
        // 钟楼顶部
        const roofMatrix = Matrix4.create();
        Matrix4.translate(roofMatrix, roofMatrix, [0, 3.2, 0]);
        Matrix4.multiply(roofMatrix, roofMatrix, this.createScaleMatrix(1.5, 0.4, 1.5));
        
        this.setMatrixUniforms(roofMatrix, viewMatrix, projectionMatrix);
        this.setMaterial(0.6, 0.3, 0.2, 0.6, 0.3, 0.2, 0.2, 0.2, 0.2, 32);
        
        gl.drawElements(gl.TRIANGLES, this.buffers.cube.vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    drawClockFace(viewMatrix, projectionMatrix) {
        const gl = this.gl;
        
        const clockFaceMatrix = Matrix4.create();
        Matrix4.translate(clockFaceMatrix, clockFaceMatrix, [0, 2.5, 1.01]);
        Matrix4.multiply(clockFaceMatrix, clockFaceMatrix, this.createScaleMatrix(0.8, 0.8, 0.1));
        
        this.setMatrixUniforms(clockFaceMatrix, viewMatrix, projectionMatrix);
        this.setMaterial(0.9, 0.9, 0.8, 0.9, 0.9, 0.8, 0.5, 0.5, 0.5, 64);
        
        gl.bindVertexArray(this.buffers.cube.vao);
        gl.drawElements(gl.TRIANGLES, this.buffers.cube.vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    drawClockHands(viewMatrix, projectionMatrix) {
        const gl = this.gl;
        
        // 时针
        const hourHandMatrix = Matrix4.create();
        Matrix4.translate(hourHandMatrix, hourHandMatrix, [0, 2.5, 1.02]);
        Matrix4.rotateY(hourHandMatrix, hourHandMatrix, -this.animationState.hourAngle);
        Matrix4.multiply(hourHandMatrix, hourHandMatrix, this.createScaleMatrix(0.02, 0.3, 0.01));
        Matrix4.translate(hourHandMatrix, hourHandMatrix, [0, 0.15, 0]);
        
        this.setMatrixUniforms(hourHandMatrix, viewMatrix, projectionMatrix);
        this.setMaterial(0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1, 32);
        gl.drawElements(gl.TRIANGLES, this.buffers.cube.vertexCount, gl.UNSIGNED_SHORT, 0);
        
        // 分针
        const minuteHandMatrix = Matrix4.create();
        Matrix4.translate(minuteHandMatrix, minuteHandMatrix, [0, 2.5, 1.03]);
        Matrix4.rotateY(minuteHandMatrix, minuteHandMatrix, -this.animationState.minuteAngle);
        Matrix4.multiply(minuteHandMatrix, minuteHandMatrix, this.createScaleMatrix(0.015, 0.4, 0.01));
        Matrix4.translate(minuteHandMatrix, minuteHandMatrix, [0, 0.2, 0]);
        
        this.setMatrixUniforms(minuteHandMatrix, viewMatrix, projectionMatrix);
        this.setMaterial(0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.2, 0.2, 0.2, 32);
        gl.drawElements(gl.TRIANGLES, this.buffers.cube.vertexCount, gl.UNSIGNED_SHORT, 0);
        
        // 秒针
        const secondHandMatrix = Matrix4.create();
        Matrix4.translate(secondHandMatrix, secondHandMatrix, [0, 2.5, 1.04]);
        Matrix4.rotateY(secondHandMatrix, secondHandMatrix, -this.animationState.secondAngle);
        Matrix4.multiply(secondHandMatrix, secondHandMatrix, this.createScaleMatrix(0.01, 0.45, 0.005));
        Matrix4.translate(secondHandMatrix, secondHandMatrix, [0, 0.225, 0]);
        
        this.setMatrixUniforms(secondHandMatrix, viewMatrix, projectionMatrix);
        this.setMaterial(0.8, 0.2, 0.2, 0.8, 0.2, 0.2, 0.3, 0.3, 0.3, 32);
        gl.drawElements(gl.TRIANGLES, this.buffers.cube.vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    drawGears(viewMatrix, projectionMatrix) {
        const gl = this.gl;
        
        // 主齿轮
        const mainGearMatrix = Matrix4.create();
        Matrix4.translate(mainGearMatrix, mainGearMatrix, [-1.5, 0.8, 0]);
        Matrix4.rotateY(mainGearMatrix, mainGearMatrix, this.animationState.gearAngle);
        Matrix4.multiply(mainGearMatrix, mainGearMatrix, this.createScaleMatrix(0.4, 0.1, 0.4));
        
        this.setMatrixUniforms(mainGearMatrix, viewMatrix, projectionMatrix);
        this.setMaterial(0.7, 0.5, 0.3, 0.7, 0.5, 0.3, 0.4, 0.4, 0.4, 64);
        
        gl.bindVertexArray(this.buffers.cylinder.vao);
        gl.drawElements(gl.TRIANGLES, this.buffers.cylinder.vertexCount, gl.UNSIGNED_SHORT, 0);
        
        // 小齿轮
        const smallGearMatrix = Matrix4.create();
        Matrix4.translate(smallGearMatrix, smallGearMatrix, [-2.2, 0.8, 0]);
        Matrix4.rotateY(smallGearMatrix, smallGearMatrix, -this.animationState.gearAngle * 2);
        Matrix4.multiply(smallGearMatrix, smallGearMatrix, this.createScaleMatrix(0.2, 0.1, 0.2));
        
        this.setMatrixUniforms(smallGearMatrix, viewMatrix, projectionMatrix);
        this.setMaterial(0.5, 0.5, 0.7, 0.5, 0.5, 0.7, 0.4, 0.4, 0.4, 64);
        
        gl.drawElements(gl.TRIANGLES, this.buffers.cylinder.vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    createScaleMatrix(sx, sy, sz) {
        const matrix = Matrix4.create();
        matrix[0] = sx;
        matrix[5] = sy;
        matrix[10] = sz;
        return matrix;
    }

    setMatrixUniforms(modelMatrix, viewMatrix, projectionMatrix) {
        const gl = this.gl;
        
        const modelViewMatrix = Matrix4.create();
        Matrix4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
        
        const normalMatrix = Matrix4.create();
        Matrix4.multiply(normalMatrix, modelViewMatrix, modelViewMatrix);
        // 这里简化了法线矩阵的计算
        
        gl.uniformMatrix4fv(this.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv(this.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(this.uniformLocations.normalMatrix, false, normalMatrix);
    }

    setMaterial(ar, ag, ab, dr, dg, db, sr, sg, sb, shininess) {
        const gl = this.gl;
        
        gl.uniform3f(this.uniformLocations.ambientColor, ar, ag, ab);
        gl.uniform3f(this.uniformLocations.diffuseColor, dr, dg, db);
        gl.uniform3f(this.uniformLocations.specularColor, sr, sg, sb);
        gl.uniform1f(this.uniformLocations.shininess, shininess);
    }
}

// 启动场景
window.addEventListener('load', () => {
    new ClockTowerScene();
});
