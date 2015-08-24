// Copyright (c) 2011-2012 Turbulenz Limited
var WebGLInputDevice = (function () {
    function WebGLInputDevice() {
    }
    WebGLInputDevice.prototype.update = function () {
        if (!this.isWindowFocused) {
            return;
        }
        this.updateGamePad();
    };
    WebGLInputDevice.prototype.addEventListener = function (eventType, eventListener) {
        var i;
        var length;
        var eventHandlers;
        if (this.handlers.hasOwnProperty(eventType)) {
            eventHandlers = this.handlers[eventType];
            if (eventListener) {
                length = eventHandlers.length;
                for (i = 0; i < length; i += 1) {
                    if (eventHandlers[i] === eventListener) {
                        return;
                    }
                }
                eventHandlers.push(eventListener);
            }
        }
    };
    WebGLInputDevice.prototype.removeEventListener = function (eventType, eventListener) {
        var i;
        var length;
        var eventHandlers;
        if (this.handlers.hasOwnProperty(eventType)) {
            eventHandlers = this.handlers[eventType];
            if (eventListener) {
                length = eventHandlers.length;
                for (i = 0; i < length; i += 1) {
                    if (eventHandlers[i] === eventListener) {
                        eventHandlers.splice(i, 1);
                        break;
                    }
                }
            }
        }
    };
    WebGLInputDevice.prototype.lockMouse = function () {
        if (this.isHovering &&
            this.isWindowFocused) {
            this.isMouseLocked = true;
            this.hideMouse();
            this.requestBrowserLock();
            this.setEventHandlersLock();
            return true;
        }
        else {
            return false;
        }
    };
    WebGLInputDevice.prototype.unlockMouse = function () {
        if (this.isMouseLocked) {
            this.isMouseLocked = false;
            this.showMouse();
            this.requestBrowserUnlock();
            this.setEventHandlersUnlock();
            if (this.isOutsideEngine) {
                this.isOutsideEngine = false;
                this.isHovering = false;
                this.setEventHandlersMouseLeave();
                this.sendEventToHandlers(this.handlers.mouseleave);
            }
            this.sendEventToHandlers(this.handlers.mouselocklost);
            return true;
        }
        else {
            return false;
        }
    };
    WebGLInputDevice.prototype.isLocked = function () {
        return this.isMouseLocked;
    };
    WebGLInputDevice.prototype.hideMouse = function () {
        if (this.isHovering) {
            if (!this.isCursorHidden) {
                this.isCursorHidden = true;
                this.previousCursor = document.body.style.cursor;
                document.body.style.cursor = 'none';
                if (this.webkit) {
                    this.ignoreNextMouseMoves = 2;
                }
            }
            return true;
        }
        else {
            return false;
        }
    };
    WebGLInputDevice.prototype.showMouse = function () {
        if (this.isCursorHidden &&
            !this.isMouseLocked) {
            this.isCursorHidden = false;
            document.body.style.cursor = this.previousCursor;
            return true;
        }
        else {
            return false;
        }
    };
    WebGLInputDevice.prototype.isHidden = function () {
        return this.isCursorHidden;
    };
    WebGLInputDevice.prototype.isFocused = function () {
        return this.isWindowFocused;
    };
    WebGLInputDevice.prototype.convertToUnicode = function (keyCodeArray) {
        var keyCodeToUnicode = this.keyCodeToUnicode;
        var result = {};
        var length = keyCodeArray.length;
        var i;
        var keyCode;
        for (i = 0; i < length; i += 1) {
            keyCode = keyCodeArray[i];
            result[keyCode] = keyCodeToUnicode[keyCode] || "";
        }
        return result;
    };
    WebGLInputDevice.prototype.sendEventToHandlers = function (eventHandlers, arg0, arg1, arg2, arg3, arg4, arg5) {
        var i;
        var length = eventHandlers.length;
        if (length) {
            for (i = 0; i < length; i += 1) {
                eventHandlers[i](arg0, arg1, arg2, arg3, arg4, arg5);
            }
        }
    };
    WebGLInputDevice.prototype.sendEventToHandlersASync = function (handlers, a0, a1, a2, a3, a4, a5) {
        var sendEvent = WebGLInputDevice.prototype.sendEventToHandlers;
        TurbulenzEngine.setTimeout(function callSendEventToHandlersFn() {
            sendEvent(handlers, a0, a1, a2, a3, a4, a5);
        }, 0);
    };
    WebGLInputDevice.prototype.updateGamePad = function () {
        var magnitude;
        var normalizedMagnitude;
        var gamepads = (navigator.gamepads ||
            navigator.webkitGamepads ||
            (navigator.getGamepads && navigator.getGamepads()) ||
            (navigator.webkitGetGamepads && navigator.webkitGetGamepads()));
        if (gamepads) {
            var deadZone = this.padAxisDeadZone;
            var maxAxisRange = this.maxAxisRange;
            var sendEvent = this.sendEventToHandlersASync;
            var handlers = this.handlers;
            var padButtons = this.padButtons;
            var padMap = this.padMap;
            var leftThumbX = 0;
            var leftThumbY = 0;
            var rightThumbX = 0;
            var rightThumbY = 0;
            var numGamePads = gamepads.length;
            for (var i = 0; i < numGamePads; i += 1) {
                var gamepad = gamepads[i];
                if (gamepad) {
                    var buttons = gamepad.buttons;
                    if (this.padTimestampUpdate < gamepad.timestamp) {
                        this.padTimestampUpdate = gamepad.timestamp;
                        var numButtons = buttons.length;
                        for (var n = 0; n < numButtons; n += 1) {
                            var value = buttons[n];
                            if (typeof value === "object") {
                                value = value.value;
                            }
                            if (padButtons[n] !== value) {
                                padButtons[n] = value;
                                var padCode = padMap[n];
                                if (padCode !== undefined) {
                                    if (value) {
                                        sendEvent(handlers.paddown, padCode);
                                    }
                                    else {
                                        sendEvent(handlers.padup, padCode);
                                    }
                                }
                            }
                        }
                    }
                    var axes = gamepad.axes;
                    if (axes.length <= 4) {
                        var lX = axes[0];
                        var lY = -axes[1];
                        magnitude = ((lX * lX) + (lY * lY));
                        if (magnitude > (deadZone * deadZone)) {
                            magnitude = Math.sqrt(magnitude);
                            lX = (lX / magnitude);
                            lY = (lY / magnitude);
                            if (magnitude > maxAxisRange) {
                                magnitude = maxAxisRange;
                            }
                            magnitude -= deadZone;
                            normalizedMagnitude = (magnitude / (maxAxisRange - deadZone));
                            leftThumbX = (lX * normalizedMagnitude);
                            leftThumbY = (lY * normalizedMagnitude);
                        }
                        var rX = axes[2];
                        var rY = -axes[3];
                        magnitude = ((rX * rX) + (rY * rY));
                        if (magnitude > (deadZone * deadZone)) {
                            magnitude = Math.sqrt(magnitude);
                            rX = (rX / magnitude);
                            rY = (rY / magnitude);
                            if (magnitude > maxAxisRange) {
                                magnitude = maxAxisRange;
                            }
                            magnitude -= deadZone;
                            normalizedMagnitude = (magnitude / (maxAxisRange - deadZone));
                            rightThumbX = (rX * normalizedMagnitude);
                            rightThumbY = (rY * normalizedMagnitude);
                        }
                        sendEvent(handlers.padmove, leftThumbX, leftThumbY, buttons[6], rightThumbX, rightThumbY, buttons[7]);
                    }
                    break;
                }
            }
        }
    };
    WebGLInputDevice.prototype.getLocale = function () {
        return "";
    };
    WebGLInputDevice.prototype.getCanvasPosition = function (event, position) {
        if (event.offsetX !== undefined) {
            position.x = event.offsetX;
            position.y = event.offsetY;
        }
        else if (event.layerX !== undefined) {
            position.x = event.layerX;
            position.y = event.layerY;
        }
    };
    WebGLInputDevice.prototype.resetKeyStates = function () {
        var k;
        var pressedKeys = this.pressedKeys;
        var keyUpHandlers = this.handlers.keyup;
        for (k in pressedKeys) {
            if (pressedKeys.hasOwnProperty(k) && pressedKeys[k]) {
                k = parseInt(k, 10);
                pressedKeys[k] = false;
                this.sendEventToHandlers(keyUpHandlers, k);
            }
        }
    };
    WebGLInputDevice.prototype.onMouseOver = function (event) {
        var position = {};
        var mouseOverHandlers = this.handlers.mouseover;
        event.stopPropagation();
        event.preventDefault();
        this.getCanvasPosition(event, position);
        this.lastX = event.screenX;
        this.lastY = event.screenY;
        this.sendEventToHandlers(mouseOverHandlers, position.x, position.y);
    };
    WebGLInputDevice.prototype.onMouseMove = function (event) {
        var mouseMoveHandlers = this.handlers.mousemove;
        var deltaX, deltaY;
        event.stopPropagation();
        event.preventDefault();
        if (this.ignoreNextMouseMoves) {
            this.ignoreNextMouseMoves -= 1;
            return;
        }
        if (event.movementX !== undefined) {
            deltaX = event.movementX;
            deltaY = event.movementY;
        }
        else if (event.mozMovementX !== undefined) {
            deltaX = event.mozMovementX;
            deltaY = event.mozMovementY;
        }
        else if (event.webkitMovementX !== undefined) {
            deltaX = event.webkitMovementX;
            deltaY = event.webkitMovementY;
        }
        else {
            deltaX = (event.screenX - this.lastX);
            deltaY = (event.screenY - this.lastY);
            if (0 === deltaX && 0 === deltaY) {
                return;
            }
        }
        this.lastX = event.screenX;
        this.lastY = event.screenY;
        this.sendEventToHandlers(mouseMoveHandlers, deltaX, deltaY);
    };
    WebGLInputDevice.prototype.onWheel = function (event) {
        var mouseWheelHandlers = this.handlers.mousewheel;
        var scrollDelta;
        event.stopPropagation();
        event.preventDefault();
        if (event.wheelDelta) {
            if (window.opera) {
                scrollDelta = event.wheelDelta < 0 ? 1 : -1;
            }
            else {
                scrollDelta = event.wheelDelta > 0 ? 1 : -1;
            }
        }
        else {
            scrollDelta = event.detail < 0 ? 1 : -1;
        }
        this.sendEventToHandlers(mouseWheelHandlers, scrollDelta);
    };
    WebGLInputDevice.prototype.emptyEvent = function (event) {
        event.stopPropagation();
        event.preventDefault();
    };
    WebGLInputDevice.prototype.onWindowFocus = function () {
        if (this.isHovering &&
            window.document.activeElement === this.canvas) {
            this.addInternalEventListener(window, 'mousedown', this.onMouseDown);
        }
    };
    WebGLInputDevice.prototype.onFocus = function () {
        var canvas = this.canvas;
        var handlers = this.handlers;
        var focusHandlers = handlers.focus;
        if (!this.isWindowFocused) {
            this.isWindowFocused = true;
            window.focus();
            canvas.focus();
            this.setEventHandlersFocus();
            canvas.oncontextmenu = function () {
                return false;
            };
            this.sendEventToHandlers(focusHandlers);
        }
    };
    WebGLInputDevice.prototype.onBlur = function () {
        if (this.ignoreNextBlur) {
            this.ignoreNextBlur = false;
            return;
        }
        var canvas = this.canvas;
        var handlers = this.handlers;
        var blurHandlers = handlers.blur;
        if (this.isMouseLocked) {
            this.unlockMouse();
        }
        if (this.isWindowFocused) {
            this.isWindowFocused = false;
            this.resetKeyStates();
            this.setEventHandlersBlur();
            canvas.oncontextmenu = null;
            this.sendEventToHandlers(blurHandlers);
        }
    };
    WebGLInputDevice.prototype.onMouseDown = function (event) {
        var handlers = this.handlers;
        if (this.isHovering) {
            var mouseDownHandlers = handlers.mousedown;
            var button = event.button;
            var position = {};
            this.onFocus();
            event.stopPropagation();
            event.preventDefault();
            if (button < 3) {
                button = this.mouseMap[button];
            }
            this.getCanvasPosition(event, position);
            this.sendEventToHandlers(mouseDownHandlers, button, position.x, position.y);
        }
        else {
            this.onBlur();
        }
    };
    WebGLInputDevice.prototype.onMouseUp = function (event) {
        var mouseUpHandlers = this.handlers.mouseup;
        if (this.isHovering) {
            var button = event.button;
            var position = {};
            event.stopPropagation();
            event.preventDefault();
            if (button < 3) {
                button = this.mouseMap[button];
            }
            this.getCanvasPosition(event, position);
            this.sendEventToHandlers(mouseUpHandlers, button, position.x, position.y);
        }
    };
    WebGLInputDevice.prototype.onKeyDown = function (event) {
        var keyDownHandlers = this.handlers.keydown;
        var pressedKeys = this.pressedKeys;
        var keyCodes = this.keyCodes;
        event.stopPropagation();
        event.preventDefault();
        var keyCode = event.keyCode;
        keyCode = this.keyMap[keyCode];
        if (undefined !== keyCode &&
            (keyCodes.ESCAPE !== keyCode)) {
            var keyLocation = (typeof event.location === "number" ? event.location : event.keyLocation);
            if (2 === keyLocation) {
                keyCode = keyCode + 1;
            }
            if (!pressedKeys[keyCode]) {
                pressedKeys[keyCode] = true;
                this.sendEventToHandlers(keyDownHandlers, keyCode);
            }
        }
    };
    WebGLInputDevice.prototype.onKeyUp = function (event) {
        var keyUpHandlers = this.handlers.keyup;
        var pressedKeys = this.pressedKeys;
        var keyCodes = this.keyCodes;
        event.stopPropagation();
        event.preventDefault();
        var keyCode = event.keyCode;
        keyCode = this.keyMap[keyCode];
        if (keyCode === keyCodes.ESCAPE) {
            this.unlockMouse();
            if (document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement) {
                if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                }
                else if (document.cancelFullScreen) {
                    document.cancelFullScreen();
                }
                else if (document['mozCancelFullScreen']) {
                    document['mozCancelFullScreen']();
                }
                else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                else if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }
        else if (undefined !== keyCode) {
            var keyLocation = (typeof event.location === "number" ? event.location : event.keyLocation);
            if (2 === keyLocation) {
                keyCode = keyCode + 1;
            }
            if (pressedKeys[keyCode]) {
                pressedKeys[keyCode] = false;
                this.sendEventToHandlers(keyUpHandlers, keyCode);
                if ((627 === keyCode || 628 === keyCode) && (this.macosx)) {
                    this.resetKeyStates();
                }
            }
        }
    };
    WebGLInputDevice.prototype.onTouchStart = function (event) {
        var eventHandlers = this.handlers.touchstart;
        event.preventDefault();
        this.addTouches(event.changedTouches);
        event = this.convertW3TouchEventToTurbulenzTouchEvent(event);
        this.sendEventToHandlers(eventHandlers, event);
    };
    WebGLInputDevice.prototype.onTouchEnd = function (event) {
        var eventHandlers = this.handlers.touchend;
        event.preventDefault();
        event = this.convertW3TouchEventToTurbulenzTouchEvent(event);
        this.removeTouches(event.changedTouches);
        this.sendEventToHandlers(eventHandlers, event);
    };
    WebGLInputDevice.prototype.onTouchMove = function (event) {
        var eventHandlers = this.handlers.touchmove;
        event.preventDefault();
        this.addTouches(event.changedTouches);
        event = this.convertW3TouchEventToTurbulenzTouchEvent(event);
        this.sendEventToHandlers(eventHandlers, event);
    };
    WebGLInputDevice.prototype.onTouchEnter = function (event) {
        var eventHandlers = this.handlers.touchenter;
        event.preventDefault();
        event = this.convertW3TouchEventToTurbulenzTouchEvent(event);
        this.sendEventToHandlers(eventHandlers, event);
    };
    WebGLInputDevice.prototype.onTouchLeave = function (event) {
        var eventHandlers = this.handlers.touchleave;
        event.preventDefault();
        event = this.convertW3TouchEventToTurbulenzTouchEvent(event);
        this.sendEventToHandlers(eventHandlers, event);
    };
    WebGLInputDevice.prototype.onTouchCancel = function (event) {
        var eventHandlers = this.handlers.touchcancel;
        event.preventDefault();
        event = this.convertW3TouchEventToTurbulenzTouchEvent(event);
        this.removeTouches(event.changedTouches);
        this.sendEventToHandlers(eventHandlers, event);
    };
    WebGLInputDevice.prototype.convertW3TouchEventToTurbulenzTouchEvent = function (w3TouchEvent) {
        var changedTouches = this.convertW3TouchListToTurbulenzTouchList(w3TouchEvent.changedTouches);
        var gameTouches = this.convertW3TouchListToTurbulenzTouchList(w3TouchEvent.targetTouches);
        var touches = this.convertW3TouchListToTurbulenzTouchList(w3TouchEvent.touches);
        var touchEventParams = {
            changedTouches: changedTouches,
            gameTouches: gameTouches,
            touches: touches
        };
        return WebGLTouchEvent.create(touchEventParams);
    };
    WebGLInputDevice.prototype.convertW3TouchListToTurbulenzTouchList = function (w3TouchList) {
        var w3TouchListLength = w3TouchList.length;
        var touchList = [];
        var touch;
        var touchIndex;
        touchList.length = w3TouchListLength;
        for (touchIndex = 0; touchIndex < w3TouchListLength; touchIndex += 1) {
            touch = this.getTouchById(w3TouchList[touchIndex].identifier);
            touchList[touchIndex] = touch;
        }
        return touchList;
    };
    WebGLInputDevice.prototype.convertW3TouchToTurbulenzTouch = function (w3Touch) {
        var canvasElement = this.canvas;
        var canvasRect = canvasElement.getBoundingClientRect();
        var touchParams = {
            force: (w3Touch.force || w3Touch.webkitForce || 0),
            identifier: w3Touch.identifier,
            isGameTouch: (w3Touch.target === canvasElement),
            positionX: (w3Touch.pageX - canvasRect.left),
            positionY: (w3Touch.pageY - canvasRect.top),
            radiusX: (w3Touch.radiusX || w3Touch.webkitRadiusX || 1),
            radiusY: (w3Touch.radiusY || w3Touch.webkitRadiusY || 1),
            rotationAngle: (w3Touch.rotationAngle || w3Touch.webkitRotationAngle || 0)
        };
        return Touch.create(touchParams);
    };
    WebGLInputDevice.prototype.addTouches = function (w3TouchList) {
        var w3TouchListLength = w3TouchList.length;
        var touchIndex;
        var touch;
        for (touchIndex = 0; touchIndex < w3TouchListLength; touchIndex += 1) {
            touch = this.convertW3TouchToTurbulenzTouch(w3TouchList[touchIndex]);
            this.addTouch(touch);
        }
    };
    WebGLInputDevice.prototype.removeTouches = function (w3TouchList) {
        var w3TouchListLength = w3TouchList.length;
        var touchIndex;
        var touchId;
        for (touchIndex = 0; touchIndex < w3TouchListLength; touchIndex += 1) {
            touchId = w3TouchList[touchIndex].identifier;
            this.removeTouchById(touchId);
        }
    };
    WebGLInputDevice.prototype.addTouch = function (touch) {
        this.touches[touch.identifier] = touch;
    };
    WebGLInputDevice.prototype.getTouchById = function (id) {
        return this.touches[id];
    };
    WebGLInputDevice.prototype.removeTouchById = function (id) {
        delete this.touches[id];
    };
    WebGLInputDevice.prototype.canvasOnMouseOver = function (event) {
        var mouseEnterHandlers = this.handlers.mouseenter;
        if (!this.isMouseLocked) {
            this.isHovering = true;
            this.lastX = event.screenX;
            this.lastY = event.screenY;
            this.setEventHandlersMouseEnter();
            this.sendEventToHandlers(mouseEnterHandlers);
        }
        else {
            this.isOutsideEngine = false;
        }
    };
    WebGLInputDevice.prototype.canvasOnMouseOut = function () {
        var mouseLeaveHandlers = this.handlers.mouseleave;
        if (!this.isMouseLocked) {
            this.isHovering = false;
            if (this.isCursorHidden) {
                this.showMouse();
            }
            this.setEventHandlersMouseLeave();
            this.sendEventToHandlers(mouseLeaveHandlers);
        }
        else {
            this.isOutsideEngine = true;
        }
    };
    WebGLInputDevice.prototype.canvasOnMouseDown = function (event) {
        var mouseEnterHandlers = this.handlers.mouseenter;
        this.canvas.onmousedown = null;
        if (!this.isHovering) {
            this.isHovering = true;
            this.lastX = event.screenX;
            this.lastY = event.screenY;
            this.setEventHandlersMouseEnter();
            this.sendEventToHandlers(mouseEnterHandlers);
            this.onMouseDown(event);
        }
        return false;
    };
    WebGLInputDevice.prototype.onFullscreenChanged = function () {
        if (this.isMouseLocked) {
            if (document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement) {
                this.ignoreNextMouseMoves = 2;
                this.requestBrowserLock();
            }
            else {
                this.unlockMouse();
            }
        }
    };
    WebGLInputDevice.prototype.setEventHandlersMouseEnter = function () {
        if (!this.isFocused()) {
            this.addInternalEventListener(window, 'mousedown', this.onMouseDown);
        }
        this.addInternalEventListener(window, 'mouseup', this.onMouseUp);
        this.addInternalEventListener(window, 'mousemove', this.onMouseOver);
        this.addInternalEventListener(window, 'DOMMouseScroll', this.onWheel);
        this.addInternalEventListener(window, 'mousewheel', this.onWheel);
        this.addInternalEventListener(window, 'click', this.emptyEvent);
    };
    WebGLInputDevice.prototype.setEventHandlersMouseLeave = function () {
        if (!this.isFocused()) {
            this.removeInternalEventListener(window, 'mousedown', this.onMouseDown);
        }
        this.removeInternalEventListener(window, 'mouseup', this.onMouseUp);
        this.removeInternalEventListener(window, 'mousemove', this.onMouseOver);
        this.removeInternalEventListener(window, 'DOMMouseScroll', this.onWheel);
        this.removeInternalEventListener(window, 'mousewheel', this.onWheel);
        this.removeInternalEventListener(window, 'click', this.emptyEvent);
    };
    WebGLInputDevice.prototype.setEventHandlersFocus = function () {
        this.addInternalEventListener(window, 'keydown', this.onKeyDown);
        this.addInternalEventListener(window, 'keyup', this.onKeyUp);
    };
    WebGLInputDevice.prototype.setEventHandlersBlur = function () {
        this.removeInternalEventListener(window, 'keydown', this.onKeyDown);
        this.removeInternalEventListener(window, 'keyup', this.onKeyUp);
        this.removeInternalEventListener(window, 'mousedown', this.onMouseDown);
    };
    WebGLInputDevice.prototype.setEventHandlersLock = function () {
        this.removeInternalEventListener(window, 'mousemove', this.onMouseOver);
        this.addInternalEventListener(window, 'mousemove', this.onMouseMove);
        this.addInternalEventListener(document, 'fullscreenchange', this.onFullscreenChanged);
        this.addInternalEventListener(document, 'mozfullscreenchange', this.onFullscreenChanged);
        this.addInternalEventListener(document, 'webkitfullscreenchange', this.onFullscreenChanged);
        this.addInternalEventListener(document, 'MSFullscreenChange', this.onFullscreenChanged);
    };
    WebGLInputDevice.prototype.setEventHandlersUnlock = function () {
        this.removeInternalEventListener(document, 'webkitfullscreenchange', this.onFullscreenChanged);
        this.removeInternalEventListener(document, 'mozfullscreenchange', this.onFullscreenChanged);
        this.removeInternalEventListener(document, 'MSFullscreenChange', this.onFullscreenChanged);
        this.removeInternalEventListener(window, 'mousemove', this.onMouseMove);
        this.addInternalEventListener(window, 'mousemove', this.onMouseOver);
    };
    WebGLInputDevice.prototype.setEventHandlersCanvas = function () {
        var canvas = this.canvas;
        this.addInternalEventListener(canvas, 'mouseover', this.canvasOnMouseOver);
        this.addInternalEventListener(canvas, 'mouseout', this.canvasOnMouseOut);
        this.addInternalEventListener(canvas, 'mousedown', this.canvasOnMouseDown);
    };
    WebGLInputDevice.prototype.setEventHandlersWindow = function () {
        this.addInternalEventListener(window, 'blur', this.onBlur);
        this.addInternalEventListener(window, 'focus', this.onWindowFocus);
    };
    WebGLInputDevice.prototype.removeEventHandlersWindow = function () {
        this.removeInternalEventListener(window, 'blur', this.onBlur);
        this.removeInternalEventListener(window, 'focus', this.onWindowFocus);
    };
    WebGLInputDevice.prototype.setEventHandlersTouch = function () {
        var canvas = this.canvas;
        this.addInternalEventListener(canvas, 'touchstart', this.onTouchStart);
        this.addInternalEventListener(canvas, 'touchend', this.onTouchEnd);
        this.addInternalEventListener(canvas, 'touchenter', this.onTouchEnter);
        this.addInternalEventListener(canvas, 'touchleave', this.onTouchLeave);
        this.addInternalEventListener(canvas, 'touchmove', this.onTouchMove);
        this.addInternalEventListener(canvas, 'touchcancel', this.onTouchCancel);
    };
    WebGLInputDevice.prototype.addInternalEventListener = function (element, eventName, eventHandler) {
        var elementEventFlag = this.elementEventFlags[element];
        if (!elementEventFlag) {
            this.elementEventFlags[element] = elementEventFlag = {};
        }
        if (!elementEventFlag[eventName]) {
            elementEventFlag[eventName] = true;
            var boundEventHandler = this.boundFunctions[eventHandler];
            if (!boundEventHandler) {
                this.boundFunctions[eventHandler] = boundEventHandler = eventHandler.bind(this);
            }
            element.addEventListener(eventName, boundEventHandler, false);
        }
    };
    WebGLInputDevice.prototype.removeInternalEventListener = function (element, eventName, eventHandler) {
        var elementEventFlag = this.elementEventFlags[element];
        if (elementEventFlag) {
            if (elementEventFlag[eventName]) {
                elementEventFlag[eventName] = false;
                var boundEventHandler = this.boundFunctions[eventHandler];
                element.removeEventListener(eventName, boundEventHandler, false);
            }
        }
    };
    WebGLInputDevice.prototype.destroy = function () {
        if (this.isLocked()) {
            this.setEventHandlersUnlock();
        }
        if (this.isHovering) {
            this.setEventHandlersMouseLeave();
        }
        if (this.isWindowFocused) {
            this.setEventHandlersBlur();
        }
        this.removeEventHandlersWindow();
        var canvas = this.canvas;
        canvas.onmouseover = null;
        canvas.onmouseout = null;
        canvas.onmousedown = null;
    };
    WebGLInputDevice.prototype.isSupported = function (name) {
        var canvas = this.canvas;
        if ((canvas) && (name === "POINTER_LOCK")) {
            var havePointerLock = ('pointerLockElement' in document) ||
                ('mozPointerLockElement' in document) ||
                ('webkitPointerLockElement' in document);
            var requestPointerLock = (canvas.requestPointerLock ||
                canvas.mozRequestPointerLock ||
                canvas.webkitRequestPointerLock);
            if (havePointerLock && requestPointerLock) {
                return true;
            }
        }
        return false;
    };
    WebGLInputDevice.create = function (canvas) {
        var id = new WebGLInputDevice();
        id.lastX = 0;
        id.lastY = 0;
        id.touches = {};
        id.boundFunctions = {};
        id.elementEventFlags = {};
        id.canvas = canvas;
        id.isMouseLocked = false;
        id.isHovering = false;
        id.isWindowFocused = false;
        id.isCursorHidden = false;
        id.isOutsideEngine = false;
        id.previousCursor = '';
        id.ignoreNextMouseMoves = 0;
        id.ignoreNextBlur = false;
        id.pressedKeys = {};
        id.handlers =
            {
                keydown: [],
                keyup: [],
                mousedown: [],
                mouseup: [],
                mousewheel: [],
                mouseover: [],
                mousemove: [],
                paddown: [],
                padup: [],
                padmove: [],
                mouseenter: [],
                mouseleave: [],
                focus: [],
                blur: [],
                mouselocklost: [],
                touchstart: [],
                touchend: [],
                touchenter: [],
                touchleave: [],
                touchmove: [],
                touchcancel: []
            };
        var keyCodeToUnicodeTable = {};
        var keyCodes = id.keyCodes;
        for (var k in keyCodes) {
            if (keyCodes.hasOwnProperty(k)) {
                var code = keyCodes[k];
                keyCodeToUnicodeTable[code] = k;
            }
        }
        keyCodeToUnicodeTable[keyCodes.SPACE] = ' ';
        keyCodeToUnicodeTable[keyCodes.NUMBER_0] = '0';
        keyCodeToUnicodeTable[keyCodes.NUMBER_1] = '1';
        keyCodeToUnicodeTable[keyCodes.NUMBER_2] = '2';
        keyCodeToUnicodeTable[keyCodes.NUMBER_3] = '3';
        keyCodeToUnicodeTable[keyCodes.NUMBER_4] = '4';
        keyCodeToUnicodeTable[keyCodes.NUMBER_5] = '5';
        keyCodeToUnicodeTable[keyCodes.NUMBER_6] = '6';
        keyCodeToUnicodeTable[keyCodes.NUMBER_7] = '7';
        keyCodeToUnicodeTable[keyCodes.NUMBER_8] = '8';
        keyCodeToUnicodeTable[keyCodes.NUMBER_9] = '9';
        keyCodeToUnicodeTable[keyCodes.GRAVE] = '`';
        keyCodeToUnicodeTable[keyCodes.MINUS] = '-';
        keyCodeToUnicodeTable[keyCodes.EQUALS] = '=';
        keyCodeToUnicodeTable[keyCodes.LEFT_BRACKET] = '[';
        keyCodeToUnicodeTable[keyCodes.RIGHT_BRACKET] = ']';
        keyCodeToUnicodeTable[keyCodes.SEMI_COLON] = ';';
        keyCodeToUnicodeTable[keyCodes.APOSTROPHE] = "'";
        keyCodeToUnicodeTable[keyCodes.COMMA] = ',';
        keyCodeToUnicodeTable[keyCodes.PERIOD] = '.';
        keyCodeToUnicodeTable[keyCodes.SLASH] = '/';
        keyCodeToUnicodeTable[keyCodes.BACKSLASH] = '\\';
        var keyMap = {};
        keyMap[65] = 0;
        keyMap[66] = 1;
        keyMap[67] = 2;
        keyMap[68] = 3;
        keyMap[69] = 4;
        keyMap[70] = 5;
        keyMap[71] = 6;
        keyMap[72] = 7;
        keyMap[73] = 8;
        keyMap[74] = 9;
        keyMap[75] = 10;
        keyMap[76] = 11;
        keyMap[77] = 12;
        keyMap[78] = 13;
        keyMap[79] = 14;
        keyMap[80] = 15;
        keyMap[81] = 16;
        keyMap[82] = 17;
        keyMap[83] = 18;
        keyMap[84] = 19;
        keyMap[85] = 20;
        keyMap[86] = 21;
        keyMap[87] = 22;
        keyMap[88] = 23;
        keyMap[89] = 24;
        keyMap[90] = 25;
        keyMap[48] = 100;
        keyMap[49] = 101;
        keyMap[50] = 102;
        keyMap[51] = 103;
        keyMap[52] = 104;
        keyMap[53] = 105;
        keyMap[54] = 106;
        keyMap[55] = 107;
        keyMap[56] = 108;
        keyMap[57] = 109;
        keyMap[37] = 200;
        keyMap[39] = 201;
        keyMap[38] = 202;
        keyMap[40] = 203;
        keyMap[16] = 300;
        keyMap[17] = 302;
        keyMap[18] = 304;
        keyMap[0] = 305;
        keyMap[27] = 400;
        keyMap[9] = 401;
        keyMap[32] = 402;
        keyMap[8] = 403;
        keyMap[13] = 404;
        keyMap[223] = 500;
        keyMap[173] = 501;
        keyMap[189] = 501;
        keyMap[61] = 502;
        keyMap[187] = 502;
        keyMap[219] = 503;
        keyMap[221] = 504;
        keyMap[59] = 505;
        keyMap[186] = 505;
        keyMap[192] = 500;
        keyMap[188] = 507;
        keyMap[190] = 508;
        keyMap[222] = 506;
        if (navigator.appVersion.indexOf("Mac") !== -1) {
            keyMap[0] = 500;
        }
        keyMap[112] = 600;
        keyMap[113] = 601;
        keyMap[114] = 602;
        keyMap[115] = 603;
        keyMap[116] = 604;
        keyMap[117] = 605;
        keyMap[118] = 606;
        keyMap[119] = 607;
        keyMap[120] = 608;
        keyMap[121] = 609;
        keyMap[122] = 610;
        keyMap[123] = 611;
        keyMap[96] = 612;
        keyMap[97] = 613;
        keyMap[98] = 614;
        keyMap[99] = 615;
        keyMap[100] = 616;
        keyMap[12] = 617;
        keyMap[101] = 617;
        keyMap[144] = 617;
        keyMap[102] = 618;
        keyMap[103] = 619;
        keyMap[104] = 620;
        keyMap[105] = 621;
        keyMap[111] = 623;
        keyMap[191] = 623;
        keyMap[106] = 624;
        keyMap[107] = 625;
        keyMap[109] = 626;
        keyMap[91] = 627;
        keyMap[224] = 627;
        keyMap[92] = 628;
        keyMap[93] = 628;
        keyMap[20] = 631;
        keyMap[45] = 632;
        keyMap[46] = 633;
        keyMap[36] = 634;
        keyMap[35] = 635;
        keyMap[33] = 636;
        keyMap[34] = 637;
        id.keyMap = keyMap;
        var mouseMap = {
            0: 0,
            1: 2,
            2: 1
        };
        id.mouseMap = mouseMap;
        var padMap = {
            0: 4,
            1: 5,
            2: 6,
            3: 7,
            4: 10,
            5: 11,
            8: 19,
            9: 18,
            10: 12,
            11: 15,
            12: 0,
            13: 2,
            14: 1,
            15: 3
        };
        id.padMap = padMap;
        id.keyCodeToUnicode = keyCodeToUnicodeTable;
        id.padButtons = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        id.padMap = padMap;
        id.padAxisDeadZone = 0.26;
        id.maxAxisRange = 1.0;
        id.padTimestampUpdate = 0;
        var requestPointerLock = (canvas.requestPointerLock ||
            canvas.mozRequestPointerLock ||
            canvas.webkitRequestPointerLock);
        if (requestPointerLock) {
            var exitPointerLock = (document.exitPointerLock ||
                document.mozExitPointerLock ||
                document.webkitExitPointerLock);
            id.onPointerLockChanged = function onPointerLockChangedFn() {
                var pointerLockElement = (document.pointerLockElement ||
                    document.mozPointerLockElement ||
                    document.webkitPointerLockElement);
                if (pointerLockElement !== id.canvas) {
                    id.unlockMouse();
                }
            };
            id.onPointerLockError = function onPointerLockErrorFn() {
                id.unlockMouse();
            };
            if ('mozPointerLockElement' in document) {
                id.setEventHandlersPointerLock = function setEventHandlersPointerLockFn() {
                    this.ignoreNextBlur = true;
                    document.addEventListener('mozpointerlockchange', this.onPointerLockChanged, false);
                    document.addEventListener('mozpointerlockerror', this.onPointerLockError, false);
                };
                id.setEventHandlersPointerUnlock = function setEventHandlersPointerUnlockFn() {
                    this.ignoreNextBlur = false;
                    document.removeEventListener('mozpointerlockchange', this.onPointerLockChanged, false);
                    document.removeEventListener('mozpointerlockerror', this.onPointerLockError, false);
                };
            }
            else if ('webkitPointerLockElement' in document) {
                id.setEventHandlersPointerLock = function setEventHandlersPointerLockFn() {
                    document.addEventListener('webkitpointerlockchange', this.onPointerLockChanged, false);
                    document.addEventListener('webkitpointerlockerror', this.onPointerLockError, false);
                };
                id.setEventHandlersPointerUnlock = function setEventHandlersPointerUnlockFn() {
                    document.removeEventListener('webkitpointerlockchange', this.onPointerLockChanged, false);
                    document.removeEventListener('webkitpointerlockerror', this.onPointerLockError, false);
                };
            }
            else if ('pointerLockElement' in document) {
                id.setEventHandlersPointerLock = function setEventHandlersPointerLockFn() {
                    document.addEventListener('pointerlockchange', this.onPointerLockChanged, false);
                    document.addEventListener('pointerlockerror', this.onPointerLockError, false);
                };
                id.setEventHandlersPointerUnlock = function setEventHandlersPointerUnlockFn() {
                    document.removeEventListener('pointerlockchange', this.onPointerLockChanged, false);
                    document.removeEventListener('pointerlockerror', this.onPointerLockError, false);
                };
            }
            id.requestBrowserLock = function requestBrowserLockFn() {
                var pointerLockElement = (document.pointerLockElement ||
                    document.mozPointerLockElement ||
                    document.webkitPointerLockElement);
                if (pointerLockElement !== canvas) {
                    this.setEventHandlersPointerLock();
                    requestPointerLock.call(canvas);
                }
            };
            id.requestBrowserUnlock = function requestBrowserUnlockFn() {
                this.setEventHandlersPointerUnlock();
                var pointerLockElement = (document.pointerLockElement ||
                    document.mozPointerLockElement ||
                    document.webkitPointerLockElement);
                if (pointerLockElement === canvas) {
                    exitPointerLock.call(document);
                }
            };
        }
        else {
            var pointer = (navigator.pointer || navigator.webkitPointer);
            if (pointer) {
                id.requestBrowserLock = function requestBrowserLockFn() {
                    if (!pointer.isLocked) {
                        pointer.lock(canvas);
                    }
                };
                id.requestBrowserUnlock = function requestBrowserUnlockFn() {
                    if (pointer.isLocked) {
                        pointer.unlock();
                    }
                };
            }
            else {
                id.requestBrowserLock = function requestBrowserLockFn() { };
                id.requestBrowserUnlock = function requestBrowserUnlockFn() { };
            }
        }
        id.setEventHandlersCanvas();
        id.setEventHandlersWindow();
        id.setEventHandlersTouch();
        var sysInfo = TurbulenzEngine.getSystemInfo();
        id.macosx = ("Darwin" === sysInfo.osName);
        id.webkit = (/WebKit/.test(navigator.userAgent));
        return id;
    };
    WebGLInputDevice.version = 1;
    return WebGLInputDevice;
})();
WebGLInputDevice.prototype.keyCodes = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    E: 4,
    F: 5,
    G: 6,
    H: 7,
    I: 8,
    J: 9,
    K: 10,
    L: 11,
    M: 12,
    N: 13,
    O: 14,
    P: 15,
    Q: 16,
    R: 17,
    S: 18,
    T: 19,
    U: 20,
    V: 21,
    W: 22,
    X: 23,
    Y: 24,
    Z: 25,
    NUMBER_0: 100,
    NUMBER_1: 101,
    NUMBER_2: 102,
    NUMBER_3: 103,
    NUMBER_4: 104,
    NUMBER_5: 105,
    NUMBER_6: 106,
    NUMBER_7: 107,
    NUMBER_8: 108,
    NUMBER_9: 109,
    LEFT: 200,
    RIGHT: 201,
    UP: 202,
    DOWN: 203,
    LEFT_SHIFT: 300,
    RIGHT_SHIFT: 301,
    LEFT_CONTROL: 302,
    RIGHT_CONTROL: 303,
    LEFT_ALT: 304,
    RIGHT_ALT: 305,
    ESCAPE: 400,
    TAB: 401,
    SPACE: 402,
    BACKSPACE: 403,
    RETURN: 404,
    GRAVE: 500,
    MINUS: 501,
    EQUALS: 502,
    LEFT_BRACKET: 503,
    RIGHT_BRACKET: 504,
    SEMI_COLON: 505,
    APOSTROPHE: 506,
    COMMA: 507,
    PERIOD: 508,
    SLASH: 509,
    BACKSLASH: 510,
    F1: 600,
    F2: 601,
    F3: 602,
    F4: 603,
    F5: 604,
    F6: 605,
    F7: 606,
    F8: 607,
    F9: 608,
    F10: 609,
    F11: 610,
    F12: 611,
    NUMPAD_0: 612,
    NUMPAD_1: 613,
    NUMPAD_2: 614,
    NUMPAD_3: 615,
    NUMPAD_4: 616,
    NUMPAD_5: 617,
    NUMPAD_6: 618,
    NUMPAD_7: 619,
    NUMPAD_8: 620,
    NUMPAD_9: 621,
    NUMPAD_ENTER: 622,
    NUMPAD_DIVIDE: 623,
    NUMPAD_MULTIPLY: 624,
    NUMPAD_ADD: 625,
    NUMPAD_SUBTRACT: 626,
    LEFT_WIN: 627,
    RIGHT_WIN: 628,
    LEFT_OPTION: 629,
    RIGHT_OPTION: 630,
    CAPS_LOCK: 631,
    INSERT: 632,
    DELETE: 633,
    HOME: 634,
    END: 635,
    PAGE_UP: 636,
    PAGE_DOWN: 637,
    BACK: 638
};
WebGLInputDevice.prototype.mouseCodes = {
    BUTTON_0: 0,
    BUTTON_1: 1,
    BUTTON_2: 2,
    DELTA_X: 100,
    DELTA_Y: 101,
    MOUSE_WHEEL: 102
};
WebGLInputDevice.prototype.padCodes = {
    UP: 0,
    LEFT: 1,
    DOWN: 2,
    RIGHT: 3,
    A: 4,
    B: 5,
    X: 6,
    Y: 7,
    LEFT_TRIGGER: 8,
    RIGHT_TRIGGER: 9,
    LEFT_SHOULDER: 10,
    RIGHT_SHOULDER: 11,
    LEFT_THUMB: 12,
    LEFT_THUMB_X: 13,
    LEFT_THUMB_Y: 14,
    RIGHT_THUMB: 15,
    RIGHT_THUMB_X: 16,
    RIGHT_THUMB_Y: 17,
    START: 18,
    BACK: 19
};
