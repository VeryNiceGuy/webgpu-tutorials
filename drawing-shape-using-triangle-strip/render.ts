class Renderer {
    context!: GPUCanvasContext;
    device!: GPUDevice;
    vertexBuffer!: GPUBuffer;
    pipeline!: GPURenderPipeline;

    async init() {
        const canvas = <HTMLCanvasElement | null>document.querySelector("canvas");
        if(!canvas) {
            throw new Error("The canvas hasn't been found.");
        }

        if(!navigator.gpu) {
            throw new Error("WebGPU is not supported.");
        } 

        const context = canvas.getContext('webgpu');
        if (!context) {
            throw new Error("Failed to acquire WebGPU context.");
        }
        this.context = context;

        const adapter = await navigator.gpu.requestAdapter();
        if(!adapter) {
            throw new Error("Failed to request GPU adapter.")
        }

        this.device = await adapter.requestDevice();
        const textureFormat = navigator.gpu.getPreferredCanvasFormat();

        this.context.configure({
            device: this.device,
            format: textureFormat
        });
        
        await this.loadVertices("shape.vertices");

        const shaderModule = await this.createShaderModule("shaders.wgsl");
        this.pipeline = this.device.createRenderPipeline({
            vertex: {
                module: shaderModule,
                entryPoint: "vertexMain",
                buffers: [{
                    arrayStride: 12,
                    stepMode: "vertex",
                    attributes: [
                        {
                            shaderLocation: 0,
                            offset: 0,
                            format: "float32x3"
                        }
                    ]
                }]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragmentMain",
                targets: [{ format: textureFormat }],
            },
            primitive: { topology: "triangle-strip" },
            layout: "auto",
        });

        this.createCommandBuffer();
        this.render();
    }

    async loadVertices(filename: string) {
        const file = await fetch(filename);
        const text = await file.text();
        const coords = text.split(',').map(item => Number.parseFloat(item.trim()));

        this.vertexBuffer = this.device.createBuffer({
            size: coords.length * 4,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        const vertexBufferPtr = new Float32Array(this.vertexBuffer.getMappedRange());
        for(let i = 0; i < coords.length; ++i) {
            vertexBufferPtr[i] = coords[i];
        }
        this.vertexBuffer.unmap();
    }

    async createShaderModule(filename: string): Promise<GPUShaderModule> {
        const file = await fetch(filename);
        const code = await file.text();
        return this.device.createShaderModule({ code: code });
    }

    createCommandBuffer(): GPUCommandBuffer {
        const commandEncoder = this.device.createCommandEncoder();
        const texture = this.context.getCurrentTexture();
        const view = texture.createView();
        const pass = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: view,
                    clearValue: { r: 0.0, g: 0.0, b: 1.0, a: 1.0 },
                    loadOp: "clear",
                    storeOp: "store"
                }
            ]
        });
        
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setPipeline(this.pipeline);
        pass.draw(this.vertexBuffer.size / 12);
        pass.end();

        return commandEncoder.finish();
    }

    render() {
        this.device.queue.submit([this.createCommandBuffer()]);
        requestAnimationFrame(() => this.render());
    }
}

const renderer = new Renderer();
renderer.init();