declare class TextureInstance {
    static version: number;
    name: string;
    texture: Texture;
    reference: Reference;
    textureChangedObserver: Observer;
    setTexture(texture: any): void;
    getTexture(): Texture;
    subscribeTextureChanged(observerFunction: any): void;
    unsubscribeTextureChanged(observerFunction: any): void;
    destroy(): void;
    static create(name: string, texture: Texture): TextureInstance;
}
interface TextureManagerDelayedTexture {
    nomipmaps: boolean;
    onload: {
        (texture: Texture): void;
    };
}
interface TextureManagerArchive {
    textures: {
        [path: string]: Texture;
    };
}
declare class TextureManager {
    static version: number;
    textureInstances: {
        [idx: string]: TextureInstance;
    };
    loadingTexture: {
        [idx: string]: boolean;
    };
    loadedTextureObservers: {
        [idx: string]: Observer;
    };
    delayedTextures: {
        [idx: string]: TextureManagerDelayedTexture;
    };
    numLoadingTextures: number;
    archivesLoaded: {
        [path: string]: TextureManagerArchive;
    };
    loadingArchives: {
        [path: string]: TextureManagerArchive;
    };
    loadedArchiveObservers: {
        [path: string]: Observer;
    };
    numLoadingArchives: number;
    internalTexture: {
        [path: string]: boolean;
    };
    pathRemapping: {
        [path: string]: string;
    };
    pathPrefix: string;
    graphicsDevice: GraphicsDevice;
    requestHandler: RequestHandler;
    defaultTexture: Texture;
    errorCallback: {
        (msg?: string): void;
    };
    onTextureInstanceDestroyed: {
        (textureInstance: TextureInstance): void;
    };
    prototype: any;
    add(name: any, texture: any, internal?: boolean): void;
    get(path: any): Texture;
    getInstance(path: any): TextureInstance;
    load(path: any, nomipmaps?: any, onTextureLoaded?: any): Texture;
    map(dst: any, src: any): void;
    remove(path: any): void;
    loadArchive(path: any, nomipmaps: any, onTextureLoaded: any, onArchiveLoaded: any): void;
    isArchiveLoaded(path: any): boolean;
    removeArchive(path: any): void;
    getAll(): {
        [path: string]: TextureInstance;
    };
    getNumPendingTextures(): number;
    isTextureLoaded(path: any): boolean;
    isTextureMissing(path: any): boolean;
    setPathRemapping(prm: any, assetUrl: any): void;
    addProceduralTexture(params: any): void;
    destroy(): void;
    static create(graphicsDevice: GraphicsDevice, requestHandler: RequestHandler, dt: Texture, errorCallback: any, log?: HTMLElement): TextureManager;
}
