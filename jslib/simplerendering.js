// Copyright (c) 2009-2013 Turbulenz Limited
var SimpleRendering = (function () {
    function SimpleRendering() {
    }
    SimpleRendering.prototype.updateShader = function (sm) {
    };
    SimpleRendering.prototype.sortRenderablesAndLights = function (camera, scene) {
        var index;
        var passes = this.passes;
        var numPasses = SimpleRendering.numPasses;
        for (index = 0; index < numPasses; index += 1) {
            passes[index].length = 0;
        }
        var drawParametersArray;
        var numDrawParameters;
        var drawParameters;
        var drawParametersIndex;
        var visibleRenderables = scene.getCurrentVisibleRenderables();
        var numVisibleRenderables = visibleRenderables.length;
        if (numVisibleRenderables > 0) {
            var renderable, meta, pass, passIndex;
            var transparent = SimpleRendering.passIndex.transparent;
            var n = 0;
            do {
                renderable = visibleRenderables[n];
                var rendererInfo = renderable.rendererInfo;
                if (!rendererInfo) {
                    rendererInfo = renderingCommonCreateRendererInfoFn(renderable);
                }
                renderable.renderUpdate(camera);
                drawParametersArray = renderable.drawParameters;
                numDrawParameters = drawParametersArray.length;
                for (drawParametersIndex = 0; drawParametersIndex < numDrawParameters; drawParametersIndex += 1) {
                    drawParameters = drawParametersArray[drawParametersIndex];
                    passIndex = drawParameters.userData.passIndex;
                    if (passIndex === transparent) {
                        if (rendererInfo.far) {
                            drawParameters.sortKey = 1.e38;
                        }
                        else {
                            drawParameters.sortKey = renderable.distance;
                        }
                    }
                    pass = passes[passIndex];
                    pass[pass.length] = drawParameters;
                }
                n += 1;
            } while (n < numVisibleRenderables);
        }
    };
    SimpleRendering.prototype.update = function (gd, camera, scene, currentTime) {
        scene.updateVisibleNodes(camera);
        this.sortRenderablesAndLights(camera, scene);
        var matrix = camera.matrix;
        if (matrix[9] !== this.eyePosition[0] ||
            matrix[10] !== this.eyePosition[1] ||
            matrix[11] !== this.eyePosition[2]) {
            this.eyePositionUpdated = true;
            this.eyePosition[0] = matrix[9];
            this.eyePosition[1] = matrix[10];
            this.eyePosition[2] = matrix[11];
        }
        else {
            this.eyePositionUpdated = false;
        }
        this.globalTechniqueParameters['time'] = currentTime;
        this.camera = camera;
        this.scene = scene;
    };
    SimpleRendering.prototype.updateBuffers = function (gd, deviceWidth, deviceHeight) {
        return true;
    };
    SimpleRendering.prototype.draw = function (gd, clearColor, drawDecalsFn, drawTransparentFn, drawDebugFn) {
        var globalTechniqueParameters = this.globalTechniqueParameters;
        var globalTechniqueParametersArray = [globalTechniqueParameters];
        gd.clear(clearColor, 1.0, 0);
        if (this.wireframe) {
            this.scene.drawWireframe(gd, this.sm, this.camera, this.wireframeInfo);
            if (drawDecalsFn) {
                drawDecalsFn();
            }
            if (drawTransparentFn) {
                drawTransparentFn();
            }
        }
        else {
            gd.drawArray(this.passes[SimpleRendering.passIndex.opaque], globalTechniqueParametersArray, -1);
            gd.drawArray(this.passes[SimpleRendering.passIndex.decal], globalTechniqueParametersArray, -1);
            if (drawDecalsFn) {
                drawDecalsFn();
            }
            gd.drawArray(this.passes[SimpleRendering.passIndex.transparent], globalTechniqueParametersArray, 1);
            if (drawTransparentFn) {
                drawTransparentFn();
            }
        }
        if (drawDebugFn) {
            drawDebugFn();
        }
        this.lightPositionUpdated = false;
    };
    SimpleRendering.prototype.setGlobalLightPosition = function (pos) {
        this.lightPositionUpdated = true;
        this.lightPosition[0] = pos[0];
        this.lightPosition[1] = pos[1];
        this.lightPosition[2] = pos[2];
    };
    SimpleRendering.prototype.setGlobalLightColor = function (color) {
        this.globalTechniqueParameters['lightColor'] = color;
    };
    SimpleRendering.prototype.setAmbientColor = function (color) {
        this.globalTechniqueParameters['ambientColor'] = color;
    };
    SimpleRendering.prototype.setDefaultTexture = function (tex) {
        this.globalTechniqueParameters['diffuse'] = tex;
    };
    SimpleRendering.prototype.setWireframe = function (wireframeEnabled, wireframeInfo) {
        this.wireframeInfo = wireframeInfo;
        this.wireframe = wireframeEnabled;
    };
    SimpleRendering.prototype.getDefaultSkinBufferSize = function () {
        return this.defaultSkinBufferSize;
    };
    SimpleRendering.prototype.destroy = function () {
        delete this.globalTechniqueParameters;
        delete this.lightPosition;
        delete this.eyePosition;
        delete this.passes;
    };
    SimpleRendering.simplePrepare = function (geometryInstance) {
        var drawParameters = TurbulenzEngine.getGraphicsDevice().createDrawParameters();
        drawParameters.userData = {};
        geometryInstance.drawParameters = [drawParameters];
        geometryInstance.prepareDrawParameters(drawParameters);
        var sharedMaterial = geometryInstance.sharedMaterial;
        drawParameters.technique = this.technique;
        drawParameters.setTechniqueParameters(0, sharedMaterial.techniqueParameters);
        drawParameters.setTechniqueParameters(1, geometryInstance.techniqueParameters);
        if (sharedMaterial.meta.decal) {
            drawParameters.userData.passIndex = SimpleRendering.passIndex.decal;
        }
        else if (sharedMaterial.meta.transparent) {
            drawParameters.userData.passIndex = SimpleRendering.passIndex.transparent;
        }
        else {
            drawParameters.userData.passIndex = SimpleRendering.passIndex.opaque;
        }
        drawParameters.sortKey = renderingCommonSortKeyFn(this.techniqueIndex, sharedMaterial.meta.materialIndex);
        if (!geometryInstance.sharedMaterial.techniqueParameters.materialColor &&
            !geometryInstance.techniqueParameters.materialColor) {
            geometryInstance.sharedMaterial.techniqueParameters.materialColor = SimpleRendering.v4One;
        }
        if (!geometryInstance.sharedMaterial.techniqueParameters.uvTransform &&
            !geometryInstance.techniqueParameters.uvTransform) {
            geometryInstance.sharedMaterial.techniqueParameters.uvTransform = SimpleRendering.identityUVTransform;
        }
        geometryInstance.renderUpdate = this.update;
    };
    SimpleRendering.create = function (gd, md, shaderManager, effectsManager) {
        var dr = new SimpleRendering();
        dr.md = md;
        dr.sm = shaderManager;
        dr.lightPositionUpdated = true;
        dr.lightPosition = md.v3Build(1000.0, 1000.0, 0.0);
        dr.eyePositionUpdated = true;
        dr.eyePosition = md.v3Build(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        dr.globalTechniqueParameters = gd.createTechniqueParameters({
            lightColor: md.v3BuildOne(),
            ambientColor: md.v3Build(0.2, 0.2, 0.3),
            time: 0.0
        });
        dr.passes = [[], [], []];
        var onShaderLoaded = function onShaderLoadedFn(shader) {
            var skinBones = shader.getParameter("skinBones");
            dr.defaultSkinBufferSize = skinBones.rows * skinBones.columns;
        };
        var simpleCGFX = 'shaders/simplerendering.cgfx';
        var debugCGFX = 'shaders/debug.cgfx';
        shaderManager.load(simpleCGFX, onShaderLoaded);
        shaderManager.load(debugCGFX);
        var simpleUpdate = function simpleUpdateFn(camera) {
            var techniqueParameters = this.techniqueParameters;
            var node = this.node;
            var matrix = node.world;
            var worldUpdate = node.worldUpdate;
            var lightPositionUpdated, eyePositionUpdated, worldInverse;
            techniqueParameters.worldViewProjection = md.m43MulM44(matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
            if (this.techniqueParametersUpdated !== worldUpdate) {
                this.techniqueParametersUpdated = worldUpdate;
                this.worldInverse = worldInverse = md.m43Inverse(matrix, worldInverse);
                lightPositionUpdated = true;
                eyePositionUpdated = true;
            }
            else {
                lightPositionUpdated = dr.lightPositionUpdated;
                eyePositionUpdated = dr.eyePositionUpdated;
                worldInverse = this.worldInverse;
            }
            if (lightPositionUpdated) {
                techniqueParameters.lightPosition = md.m43TransformPoint(worldInverse, dr.lightPosition, techniqueParameters.lightPosition);
            }
            if (eyePositionUpdated) {
                techniqueParameters.eyePosition = md.m43TransformPoint(worldInverse, dr.eyePosition, techniqueParameters.eyePosition);
            }
        };
        var simpleSkinnedUpdate = function simpleSkinnedUpdateFn(camera) {
            var techniqueParameters = this.techniqueParameters;
            var node = this.node;
            var matrix = node.world;
            var worldUpdate = node.worldUpdate;
            var lightPositionUpdated, eyePositionUpdated, worldInverse;
            techniqueParameters.worldViewProjection = md.m43MulM44(matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
            if (this.techniqueParametersUpdated !== worldUpdate) {
                this.techniqueParametersUpdated = worldUpdate;
                this.worldInverse = worldInverse = md.m43Inverse(matrix, worldInverse);
                lightPositionUpdated = true;
                eyePositionUpdated = true;
            }
            else {
                lightPositionUpdated = dr.lightPositionUpdated;
                eyePositionUpdated = dr.eyePositionUpdated;
                worldInverse = this.worldInverse;
            }
            if (lightPositionUpdated) {
                techniqueParameters.lightPosition = md.m43TransformPoint(worldInverse, dr.lightPosition, techniqueParameters.lightPosition);
            }
            if (eyePositionUpdated) {
                techniqueParameters.eyePosition = md.m43TransformPoint(worldInverse, dr.eyePosition, techniqueParameters.eyePosition);
            }
            var skinController = this.skinController;
            if (skinController) {
                techniqueParameters.skinBones = skinController.output;
                skinController.update();
            }
        };
        var simpleNoLightUpdate = function simpleNoLightUpdateFn(camera) {
            var techniqueParameters = this.techniqueParameters;
            techniqueParameters.worldViewProjection = md.m43MulM44(this.node.world, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
        };
        var simpleNoLightSkinnedUpdate = function simpleNoLightSkinnedUpdateFn(camera) {
            var techniqueParameters = this.techniqueParameters;
            techniqueParameters.worldViewProjection = md.m43MulM44(this.node.world, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
            var skinController = this.skinController;
            if (skinController) {
                techniqueParameters.skinBones = skinController.output;
                skinController.update();
            }
        };
        var simpleDebugNormalsUpdate = function simpleDebugNormalsUpdateFn(camera) {
            var techniqueParameters = this.techniqueParameters;
            var node = this.node;
            var matrix = node.world;
            var worldUpdate = node.worldUpdate;
            techniqueParameters.worldViewProjection = md.m43MulM44(matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
            if (this.techniqueParametersUpdated !== worldUpdate) {
                this.techniqueParametersUpdated = worldUpdate;
                techniqueParameters.worldInverseTranspose = md.m33InverseTranspose(matrix, techniqueParameters.worldInverseTranspose);
            }
        };
        var simpleDebugNormalsSkinnedUpdate = function simpleDebugNormalsSkinnedUpdateFn(camera) {
            var techniqueParameters = this.techniqueParameters;
            var node = this.node;
            var matrix = node.world;
            var worldUpdate = node.worldUpdate;
            techniqueParameters.worldViewProjection = md.m43MulM44(matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
            if (this.techniqueParametersUpdated !== worldUpdate) {
                this.techniqueParametersUpdated = worldUpdate;
                techniqueParameters.worldInverseTranspose = md.m33InverseTranspose(matrix, techniqueParameters.worldInverseTranspose);
            }
            var skinController = this.skinController;
            if (skinController) {
                techniqueParameters.skinBones = skinController.output;
                skinController.update();
            }
        };
        var simpleEnvUpdate = function simpleEnvUpdateFn(camera) {
            var techniqueParameters = this.techniqueParameters;
            var node = this.node;
            var matrix = node.world;
            var worldUpdate = node.worldUpdate;
            var worldInverse;
            techniqueParameters.worldViewProjection = md.m43MulM44(matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
            if (this.techniqueParametersUpdated !== worldUpdate) {
                this.techniqueParametersUpdated = worldUpdate;
                this.worldInverse = worldInverse = md.m43Inverse(matrix, worldInverse);
                techniqueParameters.worldInverseTranspose = md.m33InverseTranspose(matrix, techniqueParameters.worldInverseTranspose);
            }
            else {
                worldInverse = this.worldInverse;
            }
            techniqueParameters.eyePosition = md.m43TransformPoint(worldInverse, dr.eyePosition, techniqueParameters.eyePosition);
        };
        var simpleEnvSkinnedUpdate = function simpleEnvSkinnedUpdateFn(camera) {
            var techniqueParameters = this.techniqueParameters;
            var node = this.node;
            var matrix = node.world;
            var worldUpdate = node.worldUpdate;
            var worldInverse;
            techniqueParameters.worldViewProjection = md.m43MulM44(matrix, camera.viewProjectionMatrix, techniqueParameters.worldViewProjection);
            if (this.techniqueParametersUpdated !== worldUpdate) {
                this.techniqueParametersUpdated = worldUpdate;
                this.worldInverse = worldInverse = md.m43Inverse(matrix, worldInverse);
                techniqueParameters.worldInverseTranspose = md.m33InverseTranspose(matrix, techniqueParameters.worldInverseTranspose);
            }
            else {
                worldInverse = this.worldInverse;
            }
            techniqueParameters.eyePosition = md.m43TransformPoint(worldInverse, dr.eyePosition, techniqueParameters.eyePosition);
            var skinController = this.skinController;
            if (skinController) {
                techniqueParameters.skinBones = skinController.output;
                skinController.update();
            }
        };
        var debugLinesPrepare = function debugLinesPrepareFn(geometryInstance) {
            SimpleRendering.simplePrepare.call(this, geometryInstance);
            var techniqueParameters = geometryInstance.techniqueParameters;
            techniqueParameters.constantColor = geometryInstance.sharedMaterial.meta.constantColor;
        };
        var simplePrepare = function simplePrepareFn(geometryInstance) {
            SimpleRendering.simplePrepare.call(this, geometryInstance);
            var techniqueParameters = geometryInstance.sharedMaterial.techniqueParameters;
            var diffuse = techniqueParameters.diffuse;
            if (diffuse === undefined) {
                if (!techniqueParameters.materialColor) {
                    techniqueParameters.materialColor = md.v4BuildOne();
                }
            }
            else if (diffuse.length === 4) {
                techniqueParameters.diffuse = techniqueParameters.diffuse_map;
                techniqueParameters.materialColor = md.v4Build.apply(md, diffuse);
            }
        };
        var flatPrepare = function flatPrepareFn(geometryInstance) {
            simplePrepare.call(this, geometryInstance);
            var techniqueParameters = geometryInstance.sharedMaterial.techniqueParameters;
            if (!techniqueParameters.diffuse) {
                var shader = shaderManager.get(simpleCGFX);
                if (geometryInstance.geometryType === "skinned") {
                    geometryInstance.drawParameters[0].technique = shader.getTechnique("flat_skinned");
                }
                else {
                    geometryInstance.drawParameters[0].technique = shader.getTechnique("flat");
                }
            }
        };
        var loadTechniques = function loadTechniquesFn(shaderManager) {
            var that = this;
            var callback = function shaderLoadedCallbackFn(shader) {
                that.shader = shader;
                that.technique = shader.getTechnique(that.techniqueName);
                that.techniqueIndex = (that.technique ? that.technique.id : 0);
            };
            shaderManager.load(this.shaderName, callback);
        };
        dr.simplePrepare = simplePrepare;
        dr.simpleUpdate = simpleUpdate;
        dr.simpleSkinnedUpdate = simpleSkinnedUpdate;
        var effect;
        var effectTypeData;
        var skinned = "skinned";
        var rigid = "rigid";
        effect = Effect.create("constant");
        effectsManager.add(effect);
        effectTypeData = { prepare: flatPrepare,
            shaderName: simpleCGFX,
            techniqueName: "flat",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: flatPrepare,
            shaderName: simpleCGFX,
            techniqueName: "flat_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("lambert");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("blinn");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("blinn_nocull");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_nocull",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_skinned_nocull",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("phong");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("debug_lines_constant");
        effectsManager.add(effect);
        effectTypeData = { prepare: debugLinesPrepare,
            shaderName: debugCGFX,
            techniqueName: "debug_lines_constant",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effect = Effect.create("debug_normals");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: debugCGFX,
            techniqueName: "debug_normals",
            update: simpleDebugNormalsUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: debugCGFX,
            techniqueName: "debug_normals_skinned",
            update: simpleDebugNormalsSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("debug_tangents");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: debugCGFX,
            techniqueName: "debug_tangents",
            update: simpleDebugNormalsUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: debugCGFX,
            techniqueName: "debug_tangents_skinned",
            update: simpleDebugNormalsSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("debug_binormals");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: debugCGFX,
            techniqueName: "debug_binormals",
            update: simpleDebugNormalsUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: debugCGFX,
            techniqueName: "debug_binormals_skinned",
            update: simpleDebugNormalsSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("normalmap");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("normalmap_specularmap");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("normalmap_specularmap_alphamap");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap_alphamap",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effect = Effect.create("normalmap_alphatest");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_alphatest",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_alphatest_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("normalmap_specularmap_alphatest");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap_alphatest",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap_alphatest_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("normalmap_glowmap");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_glowmap",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_glowmap_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("normalmap_specularmap_glowmap");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap_glowmap",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap_glowmap_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("rxgb_normalmap");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("rxgb_normalmap_specularmap");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("rxgb_normalmap_alphatest");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_alphatest",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_alphatest_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("rxgb_normalmap_specularmap_alphatest");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap_alphatest",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap_alphatest_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("rxgb_normalmap_glowmap");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_glowmap",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_glowmap_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("rxgb_normalmap_specularmap_glowmap");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap_glowmap",
            update: simpleUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blinn_specularmap_glowmap_skinned",
            update: simpleSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("add");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "add",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "add_skinned",
            update: simpleNoLightSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("add_particle");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "add_particle",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effect = Effect.create("blend");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blend",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blend_skinned",
            update: simpleNoLightSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("blend_particle");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "blend_particle",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effect = Effect.create("translucent");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "translucent",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "translucent_skinned",
            update: simpleNoLightSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("translucent_particle");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "translucent_particle",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effect = Effect.create("filter");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "filter",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "filter_skinned",
            update: simpleNoLightSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("invfilter");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "invfilter",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effect = Effect.create("invfilter_particle");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "invfilter_particle",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effect = Effect.create("glass");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "glass",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effect = Effect.create("glass_env");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "glass_env",
            update: simpleEnvUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effect = Effect.create("modulate2");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "modulate2",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "modulate2_skinned",
            update: simpleNoLightSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("skybox");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "skybox",
            update: simpleEnvUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effect = Effect.create("env");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "env",
            update: simpleEnvUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "env_skinned",
            update: simpleEnvSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("flare");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "add",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectsManager.map("simple", "blinn");
        effect = Effect.create("glowmap");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "glowmap",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "glowmap_skinned",
            update: simpleNoLightSkinnedUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);
        effect = Effect.create("lightmap");
        effectsManager.add(effect);
        effectTypeData = { prepare: simplePrepare,
            shaderName: simpleCGFX,
            techniqueName: "lightmap",
            update: simpleNoLightUpdate,
            loadTechniques: loadTechniques };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);
        return dr;
    };
    SimpleRendering.version = 1;
    SimpleRendering.numPasses = 3;
    SimpleRendering.passIndex = { opaque: 0, decal: 1, transparent: 2 };
    SimpleRendering.v4One = new Float32Array([1.0, 1.0, 1.0, 1.0]);
    SimpleRendering.identityUVTransform = new Float32Array([1, 0, 0, 1, 0, 0]);
    return SimpleRendering;
})();
