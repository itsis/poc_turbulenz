// Copyright (c) 2012 Turbulenz Limited
var SessionToken = (function () {
    function SessionToken() {
        this.randomMax = Math.pow(2, 32);
    }
    SessionToken.prototype.next = function () {
        this.counter += 1;
        var count = this.counter;
        var random = Math.random() * this.randomMax;
        var bytes = this.bytes;
        bytes[0] = random & 0x000000FF;
        bytes[1] = (random & 0x0000FF00) >>> 8;
        bytes[2] = (random & 0x00FF0000) >>> 16;
        bytes[3] = (random & 0xFF000000) >>> 24;
        bytes[4] = count & 0x000000FF;
        bytes[5] = (count & 0x0000FF00) >>> 8;
        return TurbulenzEngine.base64Encode(bytes);
    };
    SessionToken.create = function () {
        var sessionToken = new SessionToken();
        sessionToken.counter = 0;
        sessionToken.randomGenerator = null;
        sessionToken.bytes = [];
        return sessionToken;
    };
    SessionToken.version = 1;
    return SessionToken;
})();
