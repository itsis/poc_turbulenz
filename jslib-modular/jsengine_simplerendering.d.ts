declare class SimpleRendering {
    static version: number;
    static numPasses: number;
    static passIndex: {
        opaque: number;
        decal: number;
        transparent: number;
    };
    static v4One: Float32Array;
    static identityUVTransform: Float32Array;
    public md: MathDevice;
    public sm: ShaderManager;
    public lightPositionUpdated: boolean;
    public lightPosition: any;
    public eyePositionUpdated: boolean;
    public eyePosition: any;
    public globalTechniqueParameters: TechniqueParameters;
    public passes: DrawParameters[][];
    public defaultSkinBufferSize: number;
    public camera: Camera;
    public scene: Scene;
    public wireframe: boolean;
    public wireframeInfo: any;
    public simplePrepare: (geometryInstance: GeometryInstance) => void;
    public simpleUpdate: (camera: Camera) => void;
    public simpleSkinnedUpdate: (camera: Camera) => void;
    public updateShader(sm: ShaderManager): void;
    public sortRenderablesAndLights(camera, scene): void;
    public update(gd, camera, scene, currentTime): void;
    public updateBuffers(gd?, deviceWidth?, deviceHeight?): boolean;
    public draw(gd: GraphicsDevice, clearColor: any, drawDecalsFn?: () => void, drawTransparentFn?: () => void, drawDebugFn?: () => void): void;
    public setGlobalLightPosition(pos): void;
    public setGlobalLightColor(color): void;
    public setAmbientColor(color): void;
    public setDefaultTexture(tex): void;
    public setWireframe(wireframeEnabled, wireframeInfo): void;
    public getDefaultSkinBufferSize(): number;
    public destroy(): void;
    static simplePrepare(geometryInstance): void;
    static create(gd, md, shaderManager, effectsManager): SimpleRendering;
}
