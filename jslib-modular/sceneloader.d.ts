declare class SceneLoader {
    public scene: Scene;
    public assetPath: string;
    public textureManager: TextureManager;
    public shaderManager: ShaderManager;
    public effectManager: EffectManager;
    public animationManager: AnimationManager;
    public preSceneLoadFn: (sceneData: any) => void;
    public postSceneLoadFn: (scene: Scene) => void;
    public dependenciesLoaded: boolean;
    public sceneAssetsRequested: boolean;
    public pathRemapping: {
        [path: string]: string;
    };
    public pathPrefix: string;
    public requestHandler: RequestHandler;
    public keepLights: boolean;
    public keepCameras: boolean;
    public sceneLoaded: boolean;
    public request: (url: string, onload: any) => void;
    public complete(): boolean;
    public load(parameters): void;
    public setPathRemapping(prm, assetUrl): void;
    static create(): SceneLoader;
}
