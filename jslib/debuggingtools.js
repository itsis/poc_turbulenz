// Copyright (c) 2012-2014 Turbulenz Limited
var DebuggingTools = {
    dataBreakpoints: [],
    log: function DebuggingToolsLogFn(a0, a1, a2, a3, a4, a5) {
        var console = window.console;
        if (console) {
            console.log.apply(console, arguments);
        }
    },
    dataBreakpoint: function debuggingToolsDataBreakpointFn(object, propertyName, breakOnRead, breakOnWrite) {
        if (propertyName) {
            DebuggingTools.log("dataBreakpoint Property:" + propertyName);
        }
        if (propertyName) {
            var descriptor = Object.getOwnPropertyDescriptor(object, propertyName);
            if (descriptor.get === undefined && descriptor.set === undefined) {
                var breakpoint = {
                    object: object,
                    propertyName: propertyName,
                    currentValue: object[propertyName],
                    breakOnRead: breakOnRead !== undefined ? breakOnRead : true,
                    breakOnWrite: breakOnWrite !== undefined ? breakOnWrite : true
                };
                DebuggingTools.dataBreakpoints.push(breakpoint);
                object['__defineSetter__'].call(object, propertyName, function (value) {
                    if (breakpoint.breakOnWrite) {
                        debugger;
                    }
                    breakpoint.currentValue = value;
                });
                object['__defineGetter__'].call(object, propertyName, function () {
                    if (breakpoint.breakOnRead) {
                        debugger;
                    }
                    return breakpoint.currentValue;
                });
            }
            else {
                DebuggingTools.log("Skipping getter/setter. Property:" + propertyName);
            }
        }
        else {
            if (Array.isArray(object)) {
                var index;
                for (index = 0; index < object.length; index += 1) {
                    DebuggingTools.dataBreakpoint(object, String(index), breakOnRead, breakOnWrite);
                }
                DebuggingTools.dataBreakpoint(object, "length", breakOnRead, breakOnWrite);
            }
            else if (typeof object === 'object' || typeof object === 'function') {
                if (object.constructor === ArrayBuffer ||
                    object.constructor === Int8Array ||
                    object.constructor === Uint8Array ||
                    object.constructor === Int16Array ||
                    object.constructor === Uint16Array ||
                    object.constructor === Int32Array ||
                    object.constructor === Uint32Array ||
                    object.constructor === Float32Array ||
                    object.constructor === Float64Array) {
                    DebuggingTools.log("Type: Typed Arrays are not supported. Property:" + propertyName);
                }
                else {
                    var name;
                    for (name in object) {
                        if (object.hasOwnProperty(name)) {
                            DebuggingTools.dataBreakpoint(object, name, breakOnRead, breakOnWrite);
                        }
                    }
                }
            }
            else {
                DebuggingTools.log("Type: " + typeof object + " not supported. Property:" + propertyName);
            }
        }
    },
    clearDataBreakpoint: function debuggingToolsClearDataBreakpointFn(object, propertyName) {
        var matched = false;
        var i = 0;
        while (i < DebuggingTools.dataBreakpoints.length) {
            var breakpoint = DebuggingTools.dataBreakpoints[i];
            if (object === undefined ||
                (breakpoint.object === object &&
                    (propertyName === undefined || breakpoint.propertyName === propertyName))) {
                delete breakpoint.object[breakpoint.propertyName];
                breakpoint.object[breakpoint.propertyName] = breakpoint.currentValue;
                DebuggingTools.dataBreakpoints.splice(i, 1);
                matched = true;
            }
            else {
                i += 1;
            }
        }
        return matched;
    }
};
