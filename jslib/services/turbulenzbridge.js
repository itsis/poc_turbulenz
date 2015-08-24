// Copyright (c) 2011-2013 Turbulenz Limited
/*global window: false*/
/*global TurbulenzServices: false*/
/*global debug: false*/
/*jshint nomen: false*/
var TurbulenzBridge = (function () {
    function TurbulenzBridge() {
    }
    TurbulenzBridge._initInstance = function () {
        var Turbulenz = window.top.Turbulenz;
        if (Turbulenz && Turbulenz.Services) {
            var bridge = Turbulenz.Services.bridge;
            if (!bridge) {
                return;
            }
            this._bridge = bridge;
            this.emit = bridge.emit;
            this.on = bridge.gameListenerOn || bridge.addListener || bridge.setListener;
            this.addListener = bridge.gameListenerOn || bridge.addListener || bridge.setListener;
            this.setListener = bridge.gameListenerOn || bridge.setListener;
        }
        else {
            debug.log("No turbulenz services");
        }
        if (typeof TurbulenzServices !== 'undefined') {
            TurbulenzServices.addBridgeEvents();
        }
    };
    TurbulenzBridge.isInitialised = function () {
        return (this._bridge !== undefined);
    };
    TurbulenzBridge.emit = function (serviceName, request, arg) {
    };
    TurbulenzBridge.on = function (serviceName, cb) {
    };
    TurbulenzBridge.addListener = function () { };
    TurbulenzBridge.setListener = function (eventName, listener) {
    };
    TurbulenzBridge.setOnReceiveConfig = function (callback) {
        this.on('config.set', callback);
    };
    TurbulenzBridge.triggerRequestConfig = function () {
        this.emit('config.request');
    };
    TurbulenzBridge.startLoading = function () {
        this.emit('status.loading.start');
    };
    TurbulenzBridge.startSaving = function () {
        this.emit('status.saving.start');
    };
    TurbulenzBridge.stopLoading = function () {
        this.emit('status.loading.stop');
    };
    TurbulenzBridge.stopSaving = function () {
        this.emit('status.saving.stop');
    };
    TurbulenzBridge.createdGameSession = function (gameSessionId) {
        this.emit('game.session.created', gameSessionId);
    };
    TurbulenzBridge.destroyedGameSession = function (gameSessionId) {
        this.emit('game.session.destroyed', gameSessionId);
    };
    TurbulenzBridge.setGameSessionStatus = function (gameSessionId, status) {
        this.emit('game.session.status', gameSessionId, status);
    };
    TurbulenzBridge.setGameSessionInfo = function (info) {
        this.emit('game.session.info', info);
    };
    TurbulenzBridge.updateUserBadge = function (badge) {
        this.emit('userbadge.update', badge);
    };
    TurbulenzBridge.updateLeaderBoard = function (scoreData) {
        this.emit('leaderboards.update', scoreData);
    };
    TurbulenzBridge.setOnMultiplayerSessionToJoin = function (callback) {
        this.on('multiplayer.session.join', callback);
    };
    TurbulenzBridge.triggerJoinedMultiplayerSession = function (session) {
        this.emit('multiplayer.session.joined', session);
    };
    TurbulenzBridge.triggerLeaveMultiplayerSession = function (sessionId) {
        this.emit('multiplayer.session.leave', sessionId);
    };
    TurbulenzBridge.triggerMultiplayerSessionMakePublic = function (sessionId) {
        this.emit('multiplayer.session.makepublic', sessionId);
    };
    TurbulenzBridge.setOnBasketUpdate = function (callback) {
        this.on('basket.site.update', callback);
    };
    TurbulenzBridge.triggerBasketUpdate = function (basket) {
        this.emit('basket.game.update.v2', basket);
    };
    TurbulenzBridge.triggerUserStoreUpdate = function (items) {
        this.emit('store.user.update', items);
    };
    TurbulenzBridge.setOnPurchaseConfirmed = function (callback) {
        this.on('purchase.confirmed', callback);
    };
    TurbulenzBridge.setOnPurchaseRejected = function (callback) {
        this.on('purchase.rejected', callback);
    };
    TurbulenzBridge.triggerShowConfirmPurchase = function () {
        this.emit('purchase.show.confirm');
    };
    TurbulenzBridge.triggerFetchStoreMeta = function () {
        this.emit('fetch.store.meta');
    };
    TurbulenzBridge.setOnStoreMeta = function (callback) {
        this.on('store.meta.v2', callback);
    };
    TurbulenzBridge.triggerSendInstantNotification = function (notification) {
        this.emit('notifications.ingame.sendInstant', notification);
    };
    TurbulenzBridge.triggerSendDelayedNotification = function (notification) {
        this.emit('notifications.ingame.sendDelayed', notification);
    };
    TurbulenzBridge.setOnNotificationSent = function (callback) {
        this.on('notifications.ingame.sent', callback);
    };
    TurbulenzBridge.triggerCancelNotificationByID = function (params) {
        this.emit('notifications.ingame.cancelByID', params);
    };
    TurbulenzBridge.triggerCancelNotificationsByKey = function (params) {
        this.emit('notifications.ingame.cancelByKey', params);
    };
    TurbulenzBridge.triggerCancelAllNotifications = function (params) {
        this.emit('notifications.ingame.cancelAll', params);
    };
    TurbulenzBridge.triggerInitNotificationManager = function (params) {
        this.emit('notifications.ingame.initNotificationManager', params);
    };
    TurbulenzBridge.setOnReceiveNotification = function (callback) {
        this.on('notifications.ingame.receive', callback);
    };
    TurbulenzBridge.changeAspectRatio = function (ratio) {
        this.emit('change.viewport.ratio', ratio);
    };
    TurbulenzBridge.setOnViewportHide = function (callback) {
        this.on('change.viewport.hide', callback);
    };
    TurbulenzBridge.setOnViewportShow = function (callback) {
        this.on('change.viewport.show', callback);
    };
    TurbulenzBridge.setOnFullscreenOn = function (callback) {
        this.on('change.viewport.fullscreen.on', callback);
    };
    TurbulenzBridge.setOnFullscreenOff = function (callback) {
        this.on('change.viewport.fullscreen.off', callback);
    };
    TurbulenzBridge.setOnMenuStateChange = function (callback) {
        this.on('change.menu.state', callback);
    };
    TurbulenzBridge.setOnUserStateChange = function (callback) {
        this.on('change.user.state', callback);
    };
    TurbulenzBridge.triggerOnFullscreen = function () {
        this.emit('trigger.viewport.fullscreen');
    };
    TurbulenzBridge.triggerOnViewportVisibility = function () {
        this.emit('trigger.viewport.visibility');
    };
    TurbulenzBridge.triggerOnMenuStateChange = function () {
        this.emit('trigger.menu.state');
    };
    TurbulenzBridge.triggerOnUserStateChange = function () {
        this.emit('trigger.user.state');
    };
    TurbulenzBridge.queryFullscreen = function (callback) {
        this.emit('query.viewport.fullscreen', callback);
    };
    TurbulenzBridge.queryViewportVisibility = function (callback) {
        this.emit('query.viewport.visibility', callback);
    };
    TurbulenzBridge.queryMenuState = function (callback) {
        this.emit('query.menu.state', callback);
    };
    TurbulenzBridge.queryUserState = function (callback) {
        this.emit('query.user.state', callback);
    };
    TurbulenzBridge._bridge = undefined;
    return TurbulenzBridge;
})();
if (!TurbulenzBridge.isInitialised()) {
    TurbulenzBridge._initInstance();
}
