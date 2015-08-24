// Copyright (c) 2009-2012 Turbulenz Limited
"use strict";
;
;
var SoundManager = (function () {
    function SoundManager() {
    }
    SoundManager.prototype.get = function (path) {
        debug.abort("this method should be overridden");
        return {};
    };
    SoundManager.beep = function (amplitude, frequency, wavefrequency, length) {
        var sin = Math.sin;
        var twoPI = (2.0 * Math.PI);
        var dphi = (twoPI * wavefrequency / frequency);
        var numSamples = (frequency * length);
        var data, phase, value;
        if (typeof Float32Array !== "undefined") {
            data = new Float32Array(numSamples);
        }
        else {
            data = new Array(numSamples);
        }
        phase = 0;
        for (var k = 0; k < numSamples; k += 1) {
            value = (sin(phase) * amplitude);
            phase += dphi;
            if (phase >= twoPI) {
                phase -= twoPI;
            }
            data[k] = value;
        }
        return data;
    };
    SoundManager.create = function (sd, rh, ds, errorCallback, log) {
        if (!errorCallback) {
            errorCallback = function () { };
        }
        var defaultSoundName = "default";
        var defaultSound;
        if (ds) {
            defaultSound = ds;
        }
        else {
            var soundParams = {
                name: defaultSoundName,
                data: SoundManager.beep(1.0, 4000, 400, 1),
                channels: 1,
                frequency: 4000,
                uncompress: true,
                onload: function (s) {
                    defaultSound = s;
                }
            };
            if (!sd.createSound(soundParams)) {
                errorCallback("Default sound not created.");
            }
        }
        var sounds = {};
        var loadingSound = {};
        var loadedObservers = {};
        var numLoadingSounds = 0;
        var pathRemapping = null;
        var pathPrefix = "";
        sounds[defaultSoundName] = defaultSound;
        var loadSound = function loadSoundFn(path, uncompress, onSoundLoaded) {
            var sound = sounds[path];
            if (!sound) {
                if (!loadingSound[path]) {
                    loadingSound[path] = true;
                    numLoadingSounds += 1;
                    var observer = Observer.create();
                    loadedObservers[path] = observer;
                    if (onSoundLoaded) {
                        observer.subscribe(onSoundLoaded);
                    }
                    var soundLoaded = function soundLoadedFn(sound) {
                        if (sound) {
                            sounds[path] = sound;
                            observer.notify(sound);
                            delete loadedObservers[path];
                        }
                        else {
                            delete sounds[path];
                        }
                        delete loadingSound[path];
                        numLoadingSounds -= 1;
                    };
                    var requestSound = function requestSoundFn(url, onload) {
                        var sound = sd.createSound({
                            src: url,
                            uncompress: uncompress,
                            onload: onload
                        });
                        if (!sound) {
                            errorCallback("Sound '" + path + "' not created.");
                        }
                    };
                    rh.request({
                        src: ((pathRemapping && pathRemapping[path]) || (pathPrefix + path)),
                        requestFn: requestSound,
                        onload: soundLoaded
                    });
                }
                else if (onSoundLoaded) {
                    loadedObservers[path].subscribe(onSoundLoaded);
                }
                return defaultSound;
            }
            else if (onSoundLoaded) {
                TurbulenzEngine.setTimeout(function soundAlreadyLoadedFn() {
                    onSoundLoaded(sound);
                }, 0);
            }
            return sound;
        };
        var mapSound = function mapSoundFn(dst, src) {
            sounds[dst] = sounds[src];
        };
        var getSound = function getSoundFn(path) {
            var sound = sounds[path];
            if (!sound) {
                return defaultSound;
            }
            return sound;
        };
        var removeSound = function removeSoundFn(path) {
            if (typeof sounds[path] !== 'undefined') {
                delete sounds[path];
            }
        };
        var reloadSound = function reloadSoundFn(path) {
            removeSound(path);
            loadSound(path);
        };
        var sm = new SoundManager();
        if (log) {
            sm.load = function loadSoundLogFn(path, uncompress) {
                log.innerHTML += "SoundManager.load:&nbsp;'" + path + "'";
                return loadSound(path, uncompress);
            };
            sm.map = function mapSoundLogFn(dst, src) {
                log.innerHTML += "SoundManager.map:&nbsp;'" + src + "' -> '" + dst + "'";
                mapSound(dst, src);
            };
            sm.get = function getSoundLogFn(path) {
                log.innerHTML += "SoundManager.get:&nbsp;'" + path + "'";
                return getSound(path);
            };
            sm.remove = function removeSoundLogFn(path) {
                log.innerHTML += "SoundManager.remove:&nbsp;'" + path + "'";
                removeSound(path);
            };
            sm.reload = function reloadSoundLogFn(path) {
                log.innerHTML += "SoundManager. reload:&nbsp;'" + path + "'";
                reloadSound(path);
            };
        }
        else {
            sm.load = loadSound;
            sm.map = mapSound;
            sm.get = getSound;
            sm.remove = removeSound;
            sm.reload = reloadSound;
        }
        sm.reloadAll = function reloadAllSoundsFn() {
            for (var t in sounds) {
                if (sounds.hasOwnProperty(t) && t !== defaultSoundName) {
                    reloadSound(t);
                }
            }
        };
        sm.getAll = function getAllSoundsFn() {
            return sounds;
        };
        sm.getNumPendingSounds = function getNumPendingSoundsFn() {
            return numLoadingSounds;
        };
        sm.isSoundLoaded = function isSoundLoadedFn(path) {
            return !loadingSound[path];
        };
        sm.isSoundMissing = function isSoundMissingFn(path) {
            return !sounds[path];
        };
        sm.setPathRemapping = function setPathRemappingFn(prm, assetUrl) {
            pathRemapping = prm;
            pathPrefix = assetUrl;
        };
        sm.destroy = function shaderManagerDestroyFn() {
            if (sounds) {
                var p;
                for (p in sounds) {
                    if (sounds.hasOwnProperty(p)) {
                        var sound = sounds[p];
                        if (sound) {
                            sound.destroy();
                        }
                    }
                }
                sounds = null;
            }
            defaultSound = null;
            loadingSound = null;
            loadedObservers = null;
            numLoadingSounds = 0;
            pathRemapping = null;
            pathPrefix = null;
            rh = null;
            sd = null;
        };
        return sm;
    };
    SoundManager.version = 1;
    return SoundManager;
})();
