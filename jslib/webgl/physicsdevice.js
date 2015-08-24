// Copyright (c) 2011-2014 Turbulenz Limited
/*global Float32Array: false*/
/*global Uint16Array: false*/
/*global Uint32Array: false*/
/*global VMath: false*/
/*global AABBTree: false*/
/*global TurbulenzEngine: false*/
"use strict";
var WebGLPhysicsShape = (function () {
    function WebGLPhysicsShape() {
    }
    WebGLPhysicsShape.version = 1;
    return WebGLPhysicsShape;
})();
var WebGLPhysicsConfig = {
    CONTACT_SLOP: 0.015,
    CONTACT_BAUMGRAUTE: 0.35,
    CONTACT_STATIC_BAUMGRAUTE: 0.65,
    CONTACT_MAX_Y_SEPERATION: 0.05,
    CONTACT_MAX_SQ_XZ_SEPERATION: 2 * (0.245 * 0.245),
    CONTACT_INHERIT_SQ_SEPERATION: 3 * (0.75 * 0.75),
    CONTACT_EQUAL_SQ_SEPERATION: 3 * (0.001 * 0.001),
    GJK_EPA_DISTANCE_THRESHOLD: 1e-4,
    GJK_FRACTIONAL_THRESHOLD: 1e-4,
    CONTINUOUS_LINEAR_SQ: 0.35,
    CONTINUOUS_ANGULAR_SQ: 0.25,
    CONTINUOUS_LINEAR_BULLET: 0.75,
    CONTINUOUS_ANGULAR_BULLET: 0.5,
    CONTINUOUS_SLOP: 0.015,
    SLEEP_LINEAR_SQ: 0.01,
    SLEEP_ANGULAR_SQ: 0.1,
    SLEEP_DELAY: 60,
    MAX_ANGULAR: Math.PI,
    QUADRATIC_THRESHOLD: 1e-8,
    DONT_NORMALIZE_THRESHOLD: 1e-8,
    COLLINEAR_THRESHOLD: 1e-10,
    COPLANAR_THRESHOLD: 1e-16
};
var webGLPhysicsClone = function webGLPhysicsCloneFn(dst, src) {
    for (var p in src) {
        if (src.hasOwnProperty(p)) {
            var v = src[p];
            if (v === null || v === undefined) {
                continue;
            }
            if (typeof v === "object" &&
                p !== "shape" &&
                p !== "userData" &&
                p !== "world" &&
                p !== "object" &&
                p !== "arbiters" &&
                p !== "islandRoot" &&
                p !== "island" &&
                p !== "bodyA" &&
                p !== "bodyB" &&
                p !== "triangleArray") {
                if ("slice" in v) {
                    v = v.slice();
                }
                else {
                    v = webGLPhysicsClone({}, v);
                }
            }
            dst[p] = v;
        }
    }
    return dst;
};
var initShapeProperties = function initShapePropertiesFn(s, type, nomargin) {
    if (!nomargin) {
        Object.defineProperty(s, "margin", {
            get: function shapeGetMargin() {
                return this._private.collisionRadius;
            },
            set: function shapeSetMargin(margin) {
                var pr = this._private;
                pr.halfExtents[0] += (margin - pr.collisionRadius);
                pr.halfExtents[1] += (margin - pr.collisionRadius);
                pr.halfExtents[2] += (margin - pr.collisionRadius);
                pr.radius += (margin - pr.collisionRadius);
                pr.collisionRadius = margin;
            },
            enumerable: true
        });
    }
    Object.defineProperty(s, "halfExtents", {
        get: function shapeGetHalfExtents() {
            return VMath.v3Copy(this._private.halfExtents);
        },
        enumerable: true
    });
    Object.defineProperty(s, "inertia", {
        get: function shapeGetInertia() {
            return VMath.v3Copy(this._private.inertia);
        },
        enumerable: true
    });
    Object.defineProperty(s, "radius", {
        get: function shapeGetRadius() {
            return this._private.radius;
        },
        enumerable: true
    });
    Object.defineProperty(s, "type", {
        value: type,
        enumerable: true
    });
};
var WebGLPhysicsPlaneShape = (function () {
    function WebGLPhysicsPlaneShape() {
    }
    WebGLPhysicsPlaneShape.prototype.rayTest = function (ray) {
        var dir = ray.direction;
        var origin = ray.origin;
        var dir0 = dir[0];
        var dir1 = dir[1];
        var dir2 = dir[2];
        var o0 = origin[0];
        var o1 = origin[1];
        var o2 = origin[2];
        var normal = this.normal;
        var n0 = normal[0];
        var n1 = normal[1];
        var n2 = normal[2];
        var dot = ((dir0 * n0) + (dir1 * n1) + (dir2 * n2));
        if ((dot * dot) < WebGLPhysicsConfig.COPLANAR_THRESHOLD) {
            return null;
        }
        var distance = ((this.distance - ((o0 * n0) + (o1 * n1) + (o2 * n2))) / dot);
        if (0 <= distance && distance <= ray.maxFactor) {
            if (dot > 0) {
                n0 = -n0;
                n1 = -n1;
                n2 = -n2;
            }
            var hit0 = (o0 + (dir0 * distance));
            var hit1 = (o1 + (dir1 * distance));
            var hit2 = (o2 + (dir2 * distance));
            return {
                factor: distance,
                hitPoint: VMath.v3Build(hit0, hit1, hit2),
                hitNormal: VMath.v3Build(n0, n1, n2)
            };
        }
        else {
            return null;
        }
    };
    WebGLPhysicsPlaneShape.create = function (params) {
        var retp = new WebGLPhysicsShape();
        var p = new WebGLPhysicsPlaneShape();
        retp._private = p;
        p._public = retp;
        p.collisionRadius = (params.margin !== undefined) ? params.margin : 0.04;
        p.distance = params.distance;
        var normal = p.normal = VMath.v3Copy(params.normal);
        var abs = Math.abs;
        var maxValue = Number.MAX_VALUE;
        p.radius = maxValue;
        var buffer = new Float32Array(6);
        if (abs(normal[0]) === 1) {
            p.halfExtents = VMath.v3Build(abs(p.distance), maxValue, maxValue, buffer.subarray(0, 3));
        }
        else if (abs(normal[1]) === 1) {
            p.halfExtents = VMath.v3Build(maxValue, abs(p.distance), maxValue, buffer.subarray(0, 3));
        }
        else if (abs(normal[2]) === 1) {
            p.halfExtents = VMath.v3Build(maxValue, maxValue, abs(p.distance), buffer.subarray(0, 3));
        }
        p.center = undefined;
        p.inertia = VMath.v3BuildZero(buffer.subarray(3, 6));
        initShapeProperties(retp, "PLANE");
        return retp;
    };
    WebGLPhysicsPlaneShape.version = 1;
    return WebGLPhysicsPlaneShape;
})();
WebGLPhysicsPlaneShape.prototype.type = "PLANE";
var WebGLPhysicsCapsuleShape = (function () {
    function WebGLPhysicsCapsuleShape() {
    }
    WebGLPhysicsCapsuleShape.prototype.rayTestCap = function (ray, height, scale) {
        var origin = ray.origin;
        var direction = ray.direction;
        var o0 = origin[0];
        var o1 = origin[1];
        var o2 = origin[2];
        var dir0 = direction[0];
        var dir1 = direction[1];
        var dir2 = direction[2];
        var radius = this.capsuleRadius;
        var a = ((dir0 * dir0) + (dir1 * dir1) + (dir2 * dir2));
        var dy = (o1 - height);
        var b = (2 * ((dir0 * o0) + (dir1 * dy) + (dir2 * o2)));
        var c = ((o0 * o0) + (dy * dy) + (o2 * o2) - (radius * radius));
        var d = ((b * b) - (4 * a * c));
        if (d < 0) {
            return null;
        }
        var distance;
        var normalScale = 1.0;
        var hit1;
        var rec = (1 / (2 * a));
        var rootD = Math.sqrt(d);
        distance = ((-b - rootD) * rec);
        hit1 = (o1 + (dir1 * distance));
        if (distance < 0 || (scale * (hit1 - height) < 0)) {
            distance += (2 * rootD * rec);
            hit1 = (o1 + (dir1 * distance));
            normalScale = -1.0;
        }
        if ((scale * (hit1 - height) >= 0) &&
            (0 <= distance && distance <= ray.maxFactor)) {
            var hit0 = (o0 + (dir0 * distance));
            var hit2 = (o2 + (dir2 * distance));
            var nScale = (normalScale / radius);
            return {
                factor: distance,
                hitPoint: VMath.v3Build(hit0, hit1, hit2),
                hitNormal: VMath.v3Build((hit0 * nScale), ((hit1 - height) * nScale), (hit2 * nScale))
            };
        }
        else {
            return null;
        }
    };
    WebGLPhysicsCapsuleShape.prototype.rayTest = function (ray) {
        var origin = ray.origin;
        var direction = ray.direction;
        var o0 = origin[0];
        var o1 = origin[1];
        var o2 = origin[2];
        var dir0 = direction[0];
        var dir1 = direction[1];
        var dir2 = direction[2];
        var maxFactor = ray.maxFactor;
        var radius = this.capsuleRadius;
        var halfHeight = this.halfHeight;
        var radius2 = (radius * radius);
        var distance;
        var normalScale = 1.0;
        var hit0;
        var hit1;
        var hit2;
        var a = ((dir0 * dir0) + (dir2 * dir2));
        if (a >= WebGLPhysicsConfig.QUADRATIC_THRESHOLD) {
            var b = (2 * ((o0 * dir0) + (o2 * dir2)));
            var c = ((o0 * o0) + (o2 * o2) - radius2);
            var d = ((b * b) - (4 * a * c));
            var rec = (1 / (2 * a));
            if (d < WebGLPhysicsConfig.QUADRATIC_THRESHOLD) {
                distance = (-b * rec);
            }
            else if (d > 0) {
                var rootD = Math.sqrt(d);
                distance = ((-b - rootD) * rec);
                if (distance < 0) {
                    distance += (rootD * 2 * rec);
                    normalScale = -1.0;
                }
            }
            var scale;
            hit1 = (o1 + (dir1 * distance));
            if (-halfHeight <= hit1 && hit1 <= halfHeight) {
                if (0 <= distance && distance <= maxFactor) {
                    hit0 = (o0 + (dir0 * distance));
                    hit2 = (o2 + (dir2 * distance));
                    scale = (normalScale / radius);
                    return {
                        factor: distance,
                        hitPoint: VMath.v3Build(hit0, hit1, hit2),
                        hitNormal: VMath.v3Build((hit0 * scale), 0.0, (hit2 * scale))
                    };
                }
                else {
                    return null;
                }
            }
        }
        return this.rayTestCap(ray, halfHeight, 1.0) || this.rayTestCap(ray, -halfHeight, -1.0);
    };
    WebGLPhysicsCapsuleShape.prototype.localSupportWithoutMargin = function (vec, dst) {
        dst[0] = 0;
        dst[1] = (vec[1] >= 0) ? this.halfHeight : (-this.halfHeight);
        dst[2] = 0;
    };
    WebGLPhysicsCapsuleShape.create = function (params) {
        var retc = new WebGLPhysicsShape();
        var c = new WebGLPhysicsCapsuleShape();
        retc._private = c;
        c._public = retc;
        var margin = (params.margin !== undefined) ? params.margin : 0.04;
        var radius = params.radius;
        var height = params.height;
        var halfHeight = (0.5 * height);
        var maxRadius = (radius + halfHeight);
        var h0 = (radius + margin);
        var h1 = (maxRadius + margin);
        var h2 = (radius + margin);
        var lx = (2.0 * h0);
        var ly = (2.0 * h1);
        var lz = (2.0 * h2);
        lx *= lx;
        ly *= ly;
        lz *= lz;
        var massRatio = (1.0 / 12.0);
        var buffer = new Float32Array(6);
        c.radius = maxRadius + margin;
        c.capsuleRadius = radius;
        c.halfHeight = halfHeight;
        c.halfExtents = VMath.v3Build(h0, h1, h2, buffer.subarray(0, 3));
        c.inertia = VMath.v3Build(massRatio * (ly + lz), massRatio * (lx + lz), massRatio * (lx + ly), buffer.subarray(3, 6));
        c.collisionRadius = radius + margin;
        c.center = undefined;
        Object.defineProperty(retc, "margin", {
            get: function capsuleShapeGetMargin() {
                return (this._private.collisionRadius - this._private.capsuleRadius);
            },
            set: function capsuleShapeSetMargin(margin) {
                var pr = this._private;
                pr.collisionRadius = (pr.capsuleRadius + margin);
                pr.halfExtents[0] = pr.capsuleRadius + margin;
                pr.halfExtents[1] = (pr.capsuleRadius + pr.halfHeight) + margin;
                pr.halfExtents[2] = pr.capsuleRadius + margin;
                pr.radius = (pr.capsuleRadius + pr.halfHeight) + margin;
            },
            enumerable: true
        });
        initShapeProperties(retc, "CAPSULE", true);
        return retc;
    };
    WebGLPhysicsCapsuleShape.version = 1;
    return WebGLPhysicsCapsuleShape;
})();
WebGLPhysicsShape.prototype.type = "CAPSULE";
var WebGLPhysicsSphereShape = (function () {
    function WebGLPhysicsSphereShape() {
    }
    WebGLPhysicsSphereShape.prototype.rayTest = function (ray) {
        var origin = ray.origin;
        var direction = ray.direction;
        var radius = this.sphereRadius;
        var dir0 = direction[0];
        var dir1 = direction[1];
        var dir2 = direction[2];
        var o0 = origin[0];
        var o1 = origin[1];
        var o2 = origin[2];
        var a = ((dir0 * dir0) + (dir1 * dir1) + (dir2 * dir2));
        var b = (2 * ((o0 * dir0) + (o1 * dir1) + (o2 * dir2)));
        var c = (((o0 * o0) + (o1 * o1) + (o2 * o2)) - (radius * radius));
        var distance;
        var d = ((b * b) - (4 * a * c));
        if (d <= 0) {
            return null;
        }
        var normalScale = 1.0;
        var rec = (1 / (2 * a));
        var rootD = Math.sqrt(d);
        distance = ((-b - rootD) * rec);
        if (distance < 0) {
            distance += (rootD * 2 * rec);
            normalScale = -1.0;
        }
        if (0 <= distance && distance < ray.maxFactor) {
            var hit0 = (o0 + (dir0 * distance));
            var hit1 = (o1 + (dir1 * distance));
            var hit2 = (o2 + (dir2 * distance));
            var scale = (normalScale / radius);
            return {
                factor: distance,
                hitPoint: VMath.v3Build(hit0, hit1, hit2),
                hitNormal: VMath.v3Build((hit0 * scale), (hit1 * scale), (hit2 * scale))
            };
        }
        else {
            return null;
        }
    };
    WebGLPhysicsSphereShape.prototype.localSupportWithoutMargin = function (vec, dst) {
        dst[0] = dst[1] = dst[2] = 0;
    };
    WebGLPhysicsSphereShape.create = function (params) {
        var rets = new WebGLPhysicsShape();
        var s = new WebGLPhysicsSphereShape();
        rets._private = s;
        s._public = rets;
        var margin = (params.margin !== undefined) ? params.margin : 0.04;
        var radius = params.radius;
        var i = (0.4 * radius * radius);
        var buffer = new Float32Array(6);
        s.sphereRadius = radius;
        s.radius = s.sphereRadius + margin;
        s.collisionRadius = radius + margin;
        s.halfExtents = VMath.v3Build(radius + margin, radius + margin, radius + margin, buffer.subarray(0, 3));
        s.inertia = VMath.v3Build(i, i, i, buffer.subarray(3, 6));
        s.center = undefined;
        Object.defineProperty(rets, "margin", {
            get: function sphereShapeGetMargin() {
                return (this._private.collisionRadius - this._private.radius);
            },
            set: function sphereShapeSetMargin(margin) {
                var pr = this._private;
                pr.collisionRadius = (pr.radius + margin);
                pr.halfExtents[0] = pr.collisionRadius;
                pr.halfExtents[1] = pr.collisionRadius;
                pr.halfExtents[2] = pr.collisionRadius;
                pr.radius = pr.collisionRadius;
            },
            enumerable: true
        });
        initShapeProperties(rets, "SPHERE", true);
        return rets;
    };
    WebGLPhysicsSphereShape.version = 1;
    return WebGLPhysicsSphereShape;
})();
WebGLPhysicsSphereShape.prototype.type = "SPHERE";
var WebGLPhysicsBoxShape = (function () {
    function WebGLPhysicsBoxShape() {
    }
    WebGLPhysicsBoxShape.prototype.rayTest = function (ray) {
        var origin = ray.origin;
        var direction = ray.direction;
        var o0 = origin[0];
        var o1 = origin[1];
        var o2 = origin[2];
        var d0 = direction[0];
        var d1 = direction[1];
        var d2 = direction[2];
        var halfExtents = this.halfExtents;
        var h0 = halfExtents[0];
        var h1 = halfExtents[1];
        var h2 = halfExtents[2];
        var minDistance;
        var axis;
        var t, f, hx, hy;
        if (d0 !== 0 && ((d0 > 0 && o0 <= -h0) || (d0 < 0 && o0 >= h0))) {
            f = (d0 > 0 ? (o0 >= -h0 ? h0 : -h0) : (o0 <= h0 ? -h0 : h0));
            t = (f - o0) / d0;
            if (minDistance === undefined || t < minDistance) {
                hx = o1 + (d1 * t);
                hy = o2 + (d2 * t);
                if ((-h1 <= hx && hx <= h1) &&
                    (-h2 <= hy && hy <= h2)) {
                    minDistance = t;
                    axis = 0;
                }
            }
        }
        if (d1 !== 0 && ((d1 > 0 && o1 <= -h1) || (d1 < 0 && o1 >= h1))) {
            f = (d1 > 0 ? (o1 >= -h1 ? h1 : -h1) : (o1 <= h1 ? -h1 : h1));
            t = (f - o1) / d1;
            if (minDistance === undefined || t < minDistance) {
                hx = o0 + (d0 * t);
                hy = o2 + (d2 * t);
                if ((-h0 <= hx && hx <= h0) &&
                    (-h2 <= hy && hy <= h2)) {
                    minDistance = t;
                    axis = 1;
                }
            }
        }
        if (d2 !== 0 && ((d2 > 0 && o2 <= -h2) || (d2 < 0 && o2 >= h2))) {
            f = (d2 > 0 ? (o2 >= -h2 ? h2 : -h2) : (o2 <= h2 ? -h2 : h2));
            t = (f - o2) / d2;
            if (minDistance === undefined || t < minDistance) {
                hx = o1 + (d1 * t);
                hy = o0 + (d0 * t);
                if ((-h1 <= hx && hx <= h1) &&
                    (-h0 <= hy && hy <= h0)) {
                    minDistance = t;
                    axis = 2;
                }
            }
        }
        if (minDistance !== undefined && minDistance < ray.maxFactor) {
            return {
                hitPoint: VMath.v3Build(o0 + d0 * minDistance, o1 + d1 * minDistance, o2 + d2 * minDistance),
                hitNormal: VMath.v3Build(axis === 0 ? (d0 > 0 ? -1 : 1) : 0, axis === 1 ? (d1 > 0 ? -1 : 1) : 0, axis === 2 ? (d2 > 0 ? -1 : 1) : 0),
                factor: minDistance
            };
        }
        else {
            return null;
        }
    };
    WebGLPhysicsBoxShape.prototype.localSupportWithoutMargin = function (vec, dst) {
        var v0 = vec[0];
        var v1 = vec[1];
        var v2 = vec[2];
        var halfExtents = this.halfExtents;
        var h0 = halfExtents[0];
        var h1 = halfExtents[1];
        var h2 = halfExtents[2];
        dst[0] = ((v0 < 0) ? -h0 : h0);
        dst[1] = ((v1 < 0) ? -h1 : h1);
        dst[2] = ((v2 < 0) ? -h2 : h2);
    };
    WebGLPhysicsBoxShape.create = function (params) {
        var retb = new WebGLPhysicsShape();
        var b = new WebGLPhysicsBoxShape();
        retb._private = b;
        b._public = retb;
        var margin = (params.margin !== undefined) ? params.margin : 0.04;
        var halfExtents = params.halfExtents;
        var h0 = (halfExtents[0] + margin);
        var h1 = (halfExtents[1] + margin);
        var h2 = (halfExtents[2] + margin);
        var lx = (2.0 * h0);
        var ly = (2.0 * h1);
        var lz = (2.0 * h2);
        lx *= lx;
        ly *= ly;
        lz *= lz;
        var buffer = new Float32Array(6);
        b.center = undefined;
        b.radius = Math.sqrt((h0 * h0) + (h1 * h1) + (h2 * h2));
        b.halfExtents = VMath.v3Build(h0, h1, h2, buffer.subarray(0, 3));
        b.inertia = VMath.v3Build((1.0 / 12.0) * (ly + lz), (1.0 / 12.0) * (lx + lz), (1.0 / 12.0) * (lx + ly), buffer.subarray(3, 6));
        b.collisionRadius = margin;
        initShapeProperties(retb, "BOX");
        return retb;
    };
    WebGLPhysicsBoxShape.version = 1;
    return WebGLPhysicsBoxShape;
})();
WebGLPhysicsBoxShape.prototype.type = "BOX";
var WebGLPhysicsCylinderShape = (function () {
    function WebGLPhysicsCylinderShape() {
    }
    WebGLPhysicsCylinderShape.prototype.rayTest = function (ray) {
        var origin = ray.origin;
        var direction = ray.direction;
        var o0 = origin[0];
        var o1 = origin[1];
        var o2 = origin[2];
        var dir0 = direction[0];
        var dir1 = direction[1];
        var dir2 = direction[2];
        var maxFactor = ray.maxFactor;
        var radius = this.cylinderRadius;
        var halfHeight = this.halfHeight;
        var radius2 = radius * radius;
        var a = ((dir0 * dir0) + (dir2 * dir2));
        var b = (2 * ((o0 * dir0) + (o2 * dir2)));
        var c = ((o0 * o0) + (o2 * o2) - radius2);
        var distance;
        var normalScale = 1.0;
        var hit0, hit1, hit2;
        var scale, rec;
        var d = ((b * b) - (4 * a * c));
        if (d >= 0) {
            rec = (1 / (2 * a));
            var rootD = Math.sqrt(d);
            distance = ((-b - rootD) * rec);
            if (distance < 0) {
                distance += (rootD * 2 * rec);
                normalScale = -1.0;
            }
            hit1 = (o1 + (dir1 * distance));
            if (-halfHeight <= hit1 && hit1 <= halfHeight) {
                if (0 <= distance && distance <= maxFactor) {
                    hit0 = (o0 + (dir0 * distance));
                    hit2 = (o2 + (dir2 * distance));
                    scale = (normalScale / radius);
                    return {
                        factor: distance,
                        hitPoint: VMath.v3Build(hit0, hit1, hit2),
                        hitNormal: VMath.v3Build((hit0 * scale), 0.0, (hit2 * scale))
                    };
                }
                else {
                    return null;
                }
            }
        }
        if ((dir1 * dir1) >= WebGLPhysicsConfig.COPLANAR_THRESHOLD) {
            scale = ((dir1 < 0) ? -1.0 : 1.0);
            hit1 = (-scale * halfHeight);
            rec = (1 / dir1);
            distance = ((hit1 - o1) * rec);
            if (distance < 0) {
                hit1 = (scale * halfHeight);
                distance = ((hit1 - o1) * rec);
            }
            if (0 <= distance && distance <= maxFactor) {
                hit0 = (o0 + (dir0 * distance));
                hit2 = (o2 + (dir2 * distance));
                if (((hit0 * hit0) + (hit2 * hit2)) <= radius2) {
                    return {
                        factor: distance,
                        hitPoint: VMath.v3Build(hit0, hit1, hit2),
                        hitNormal: VMath.v3Build(0.0, -scale, 0.0)
                    };
                }
            }
        }
        return null;
    };
    WebGLPhysicsCylinderShape.prototype.localSupportWithoutMargin = function (vec, dst) {
        var v0 = vec[0];
        var v2 = vec[2];
        var vmag2 = ((v0 * v0) + (v2 * v2));
        if (vmag2 === 0) {
            if (vec[1] > 0) {
                dst[0] = this.cylinderRadius;
                dst[1] = this.halfHeight;
                dst[2] = 0;
            }
            else {
                dst[0] = 0;
                dst[1] = -this.halfHeight;
                dst[2] = -this.cylinderRadius;
            }
            return;
        }
        var scale = (this.cylinderRadius / Math.sqrt(vmag2));
        dst[0] = (v0 * scale);
        dst[1] = ((vec[1] > 0 ? 1 : -1) * this.halfHeight);
        dst[2] = (v2 * scale);
    };
    WebGLPhysicsCylinderShape.create = function (params) {
        var retc = new WebGLPhysicsShape();
        var c = new WebGLPhysicsCylinderShape();
        retc._private = c;
        c._public = retc;
        var margin = (params.margin !== undefined) ? params.margin : 0.04;
        var halfExtents = params.halfExtents;
        var h0 = (halfExtents[0] + margin);
        var h1 = (halfExtents[1] + margin);
        var h2 = (halfExtents[2] + margin);
        var radius2 = (h0 * h0);
        var height2 = (4.0 * h1 * h1);
        var t1 = (((1.0 / 12.0) * height2) + ((1.0 / 4.0) * radius2));
        var t2 = ((1.0 / 2.0) * radius2);
        var buffer = new Float32Array(6);
        c.center = undefined;
        c.radius = Math.sqrt((h0 * h0) + (h1 * h1) + (h2 * h2));
        c.halfExtents = VMath.v3Build(h0, h1, h2, buffer.subarray(0, 3));
        c.cylinderRadius = halfExtents[0];
        c.halfHeight = halfExtents[1];
        c.inertia = VMath.v3Build(t1, t2, t1, buffer.subarray(3, 6));
        c.collisionRadius = margin;
        initShapeProperties(retc, "CYLINDER");
        return retc;
    };
    WebGLPhysicsCylinderShape.version = 1;
    return WebGLPhysicsCylinderShape;
})();
WebGLPhysicsCylinderShape.prototype.type = "CYLINDER";
var WebGLPhysicsConeShape = (function () {
    function WebGLPhysicsConeShape() {
    }
    WebGLPhysicsConeShape.prototype.rayTest = function (ray) {
        var origin = ray.origin;
        var direction = ray.direction;
        var o0 = origin[0];
        var o1 = origin[1];
        var o2 = origin[2];
        var dir0 = direction[0];
        var dir1 = direction[1];
        var dir2 = direction[2];
        var maxFactor = ray.maxFactor;
        var radius = this.coneRadius;
        var halfHeight = this.halfHeight;
        var conicK = (radius / (2 * halfHeight));
        conicK *= conicK;
        var d1 = o1 - halfHeight;
        var a = (dir0 * dir0) + (dir2 * dir2) - (conicK * dir1 * dir1);
        var b = 2 * ((o0 * dir0) + (o2 * dir2) - (conicK * d1 * dir1));
        var c = (o0 * o0) + (o2 * o2) - (conicK * d1 * d1);
        var distance;
        var normalScale = 1.0;
        var hit0, hit1, hit2;
        var d = ((b * b) - (4 * a * c));
        if (d >= 0) {
            var rec = (1 / (2 * a));
            var rootD = Math.sqrt(d);
            distance = ((-b - rootD) * rec);
            hit1 = (o1 + (dir1 * distance));
            if (distance < 0 || hit1 < -halfHeight || hit1 > halfHeight) {
                distance += (2 * rootD * rec);
                normalScale = -1.0;
                hit1 = (o1 + (dir1 * distance));
                if (distance < 0 || hit1 < -halfHeight || hit1 > halfHeight) {
                    distance = undefined;
                }
            }
        }
        var t;
        if (dir1 !== 0) {
            t = (-halfHeight - o1) / dir1;
            hit0 = (o0 + (dir0 * t));
            hit2 = (o2 + (dir2 * t));
            if (t < 0 || ((hit0 * hit0) + (hit2 * hit2)) > (radius * radius)) {
                t = undefined;
            }
        }
        if (t === undefined && distance === undefined) {
            return null;
        }
        if (t === undefined || (distance !== undefined && distance < t)) {
            if (distance >= maxFactor) {
                return null;
            }
            hit0 = (o0 + (dir0 * distance));
            hit1 = (o1 + (dir1 * distance));
            hit2 = (o2 + (dir2 * distance));
            var n1 = conicK * (hit1 - halfHeight);
            var scale = normalScale / Math.sqrt((hit0 * hit0) + (n1 * n1) + (hit2 * hit2));
            return {
                hitPoint: VMath.v3Build(hit0, hit1, hit2),
                hitNormal: VMath.v3Build(scale * hit0, scale * n1, scale * hit2),
                factor: distance
            };
        }
        else {
            if (t >= maxFactor) {
                return null;
            }
            hit0 = (o0 + (dir0 * t));
            hit1 = (o1 + (dir1 * t));
            hit2 = (o2 + (dir2 * t));
            return {
                hitPoint: VMath.v3Build(hit0, hit1, hit2),
                hitNormal: VMath.v3Build(0, ((o1 < -halfHeight) ? -1 : 1), 0),
                factor: t
            };
        }
    };
    WebGLPhysicsConeShape.prototype.localSupportWithoutMargin = function (vec, dst) {
        var v0 = vec[0];
        var v1 = vec[1];
        var v2 = vec[2];
        var vxz = Math.sqrt((v0 * v0) + (v2 * v2));
        if (((-this.coneRadius * vxz) + (2 * this.halfHeight * v1)) > 0) {
            dst[0] = dst[2] = 0;
            dst[1] = this.halfHeight;
        }
        else {
            if (vxz === 0) {
                dst[0] = this.coneRadius;
                dst[2] = 0;
            }
            else {
                dst[0] = (v0 * this.coneRadius / vxz);
                dst[2] = (v2 * this.coneRadius / vxz);
            }
            dst[1] = -this.halfHeight;
        }
    };
    WebGLPhysicsConeShape.create = function (params) {
        var retc = new WebGLPhysicsShape();
        var c = new WebGLPhysicsConeShape();
        retc._private = c;
        c._public = retc;
        var margin = (params.margin !== undefined) ? params.margin : 0.04;
        var radius = params.radius;
        var height = params.height;
        var halfHeight = (0.5 * height);
        var h0 = (radius + margin);
        var h1 = (halfHeight + margin);
        var h2 = (radius + margin);
        var lx = (2.0 * h0);
        var ly = (2.0 * h1);
        var lz = (2.0 * h2);
        lx *= lx;
        ly *= ly;
        lz *= lz;
        var massRatio = (1.0 / 12.0);
        var buffer = new Float32Array(6);
        c.halfHeight = halfHeight;
        c.coneRadius = radius;
        c.radius = Math.sqrt((h0 * h0) + (h1 * h1) + (h2 * h2));
        c.halfExtents = VMath.v3Build(h0, h1, h2, buffer.subarray(0, 3));
        c.inertia = VMath.v3Build(massRatio * (ly + lz), massRatio * (lx + lz), massRatio * (lx + ly), buffer.subarray(3, 6));
        c.collisionRadius = margin;
        c.center = undefined;
        initShapeProperties(retc, "CONE");
        return retc;
    };
    WebGLPhysicsConeShape.version = 1;
    return WebGLPhysicsConeShape;
})();
WebGLPhysicsConeShape.prototype.type = "CONE";
var WebGLPhysicsTriangleArray = (function () {
    function WebGLPhysicsTriangleArray() {
    }
    WebGLPhysicsTriangleArray.create = function (params) {
        var rett = new WebGLPhysicsTriangleArray();
        var t = new WebGLPhysicsPrivateTriangleArray();
        rett._private = t;
        t._public = rett;
        var vertices = params.vertices;
        var numVertices = (vertices.length / 3);
        var indices = params.indices;
        var numTriangles = (indices.length / 3);
        var minExtent = params.minExtent;
        var maxExtent = params.maxExtent;
        var v0;
        var v1;
        var v2;
        if (!minExtent || !maxExtent) {
            var min0 = vertices[0];
            var min1 = vertices[1];
            var min2 = vertices[2];
            var max0 = min0;
            var max1 = min1;
            var max2 = min2;
            var maxN = vertices.length;
            for (var n = 3; n < maxN; n += 3) {
                v0 = vertices[n];
                v1 = vertices[n + 1];
                v2 = vertices[n + 2];
                if (min0 > v0) {
                    min0 = v0;
                }
                else if (max0 < v0) {
                    max0 = v0;
                }
                if (min1 > v1) {
                    min1 = v1;
                }
                else if (max1 < v1) {
                    max1 = v1;
                }
                if (min2 > v2) {
                    min2 = v2;
                }
                else if (max2 < v2) {
                    max2 = v2;
                }
            }
            minExtent = [min0, min1, min2];
            maxExtent = [max0, max1, max2];
        }
        var extents = new Float32Array(6);
        extents[0] = minExtent[0];
        extents[1] = minExtent[1];
        extents[2] = minExtent[2];
        extents[3] = maxExtent[0];
        extents[4] = maxExtent[1];
        extents[5] = maxExtent[2];
        t.vertices = (params.dontCopy ? vertices : new Float32Array(vertices));
        t.numVertices = numVertices;
        t.indices = (params.dontCopy ? indices : (numVertices < 65536 ? new Uint16Array(indices) : new Uint32Array(indices)));
        t.numTriangles = numTriangles;
        t.extents = extents;
        Object.defineProperty(rett, "vertices", {
            value: t.vertices,
            enumerable: true
        });
        Object.defineProperty(rett, "indices", {
            value: t.indices,
            enumerable: true
        });
        var triangles = new Float32Array(WebGLPhysicsPrivateTriangleArray.prototype.TRIANGLE_SIZE * numTriangles);
        var spatialMap = null;
        if (numTriangles >= 8) {
            spatialMap = AABBTree.create(true);
            extents = new Float32Array(6);
        }
        var i;
        for (i = 0; i < numTriangles; i = i + 1) {
            var i3 = (i * 3);
            var itri = (i * WebGLPhysicsPrivateTriangleArray.prototype.TRIANGLE_SIZE);
            var i0 = (indices[i3] * 3);
            var i1 = (indices[i3 + 1] * 3);
            var i2 = (indices[i3 + 2] * 3);
            var v00 = vertices[i0];
            var v01 = vertices[i0 + 1];
            var v02 = vertices[i0 + 2];
            var v10 = vertices[i1];
            var v11 = vertices[i1 + 1];
            var v12 = vertices[i1 + 2];
            var v20 = vertices[i2];
            var v21 = vertices[i2 + 1];
            var v22 = vertices[i2 + 2];
            var u0 = (v10 - v00);
            var u1 = (v11 - v01);
            var u2 = (v12 - v02);
            v0 = (v20 - v00);
            v1 = (v21 - v01);
            v2 = (v22 - v02);
            var n0 = ((u1 * v2) - (u2 * v1));
            var n1 = ((u2 * v0) - (u0 * v2));
            var n2 = ((u0 * v1) - (u1 * v0));
            var nn = (1.0 / Math.sqrt((n0 * n0) + (n1 * n1) + (n2 * n2)));
            var distance = (((n0 * v00) + (n1 * v01) + (n2 * v02)) * nn);
            var dotuv = ((u0 * v0) + (u1 * v1) + (u2 * v2));
            var dotuu = ((u0 * u0) + (u1 * u1) + (u2 * u2));
            var dotvv = ((v0 * v0) + (v1 * v1) + (v2 * v2));
            var negLimit = ((dotuv * dotuv) - (dotuu * dotvv));
            triangles[itri] = (n0 * nn);
            triangles[itri + 1] = (n1 * nn);
            triangles[itri + 2] = (n2 * nn);
            triangles[itri + 3] = v00;
            triangles[itri + 4] = v01;
            triangles[itri + 5] = v02;
            triangles[itri + 6] = u0;
            triangles[itri + 7] = u1;
            triangles[itri + 8] = u2;
            triangles[itri + 9] = v0;
            triangles[itri + 10] = v1;
            triangles[itri + 11] = v2;
            triangles[itri + 12] = dotuu;
            triangles[itri + 13] = dotvv;
            triangles[itri + 14] = dotuv;
            triangles[itri + 15] = negLimit;
            triangles[itri + 16] = distance;
            if (spatialMap) {
                extents[0] = Math.min(v00, v10, v20);
                extents[1] = Math.min(v01, v11, v21);
                extents[2] = Math.min(v02, v12, v22);
                extents[3] = Math.max(v00, v10, v20);
                extents[4] = Math.max(v01, v11, v21);
                extents[5] = Math.max(v02, v12, v22);
                var triNode = {
                    index: itri,
                    spatialIndex: undefined
                };
                spatialMap.add(triNode, extents);
            }
        }
        if (spatialMap) {
            spatialMap.finalize();
        }
        t.triangles = triangles;
        t.spatialMap = spatialMap;
        return rett;
    };
    WebGLPhysicsTriangleArray.version = 1;
    return WebGLPhysicsTriangleArray;
})();
var WebGLPhysicsPrivateTriangleArray = (function () {
    function WebGLPhysicsPrivateTriangleArray() {
    }
    WebGLPhysicsPrivateTriangleArray.prototype.rayTest = function (ray) {
        var triangles = this.triangles;
        var spatialMap = this.spatialMap;
        function rayCallback(tree, triangle, ray, unusedAABBDistance, upperBound) {
            var dir = ray.direction;
            var dir0 = dir[0];
            var dir1 = dir[1];
            var dir2 = dir[2];
            var origin = ray.origin;
            var o0 = origin[0];
            var o1 = origin[1];
            var o2 = origin[2];
            var i = triangle.index;
            var n0 = triangles[i];
            var n1 = triangles[i + 1];
            var n2 = triangles[i + 2];
            var dot = ((dir0 * n0) + (dir1 * n1) + (dir2 * n2));
            if ((dot * dot) < WebGLPhysicsConfig.COPLANAR_THRESHOLD) {
                return null;
            }
            var d = triangles[i + 16];
            var v00 = triangles[i + 3];
            var v01 = triangles[i + 4];
            var v02 = triangles[i + 5];
            var distance = ((d - ((o0 * n0) + (o1 * n1) + (o2 * n2))) / dot);
            if (distance < 0 || distance >= upperBound) {
                return null;
            }
            if (dot > 0) {
                n0 = -n0;
                n1 = -n1;
                n2 = -n2;
                dot = -dot;
            }
            var hit0 = (o0 + (dir0 * distance));
            var hit1 = (o1 + (dir1 * distance));
            var hit2 = (o2 + (dir2 * distance));
            var wx = (hit0 - v00);
            var wy = (hit1 - v01);
            var wz = (hit2 - v02);
            var dotuu = triangles[i + 12];
            var dotvv = triangles[i + 13];
            var dotuv = triangles[i + 14];
            var negLimit = triangles[i + 15];
            var u0 = triangles[i + 6];
            var u1 = triangles[i + 7];
            var u2 = triangles[i + 8];
            var v0 = triangles[i + 9];
            var v1 = triangles[i + 10];
            var v2 = triangles[i + 11];
            var dotwu = (wx * u0) + (wy * u1) + (wz * u2);
            var dotwv = (wx * v0) + (wy * v1) + (wz * v2);
            var alpha = ((dotuv * dotwv) - (dotvv * dotwu));
            if (alpha > 0 || alpha < negLimit) {
                return null;
            }
            var beta = ((dotuv * dotwu) - (dotuu * dotwv));
            if (beta > 0 || (alpha + beta) < negLimit) {
                return null;
            }
            return {
                factor: distance,
                hitPoint: VMath.v3Build(hit0, hit1, hit2),
                hitNormal: VMath.v3Build(n0, n1, n2)
            };
        }
        if (spatialMap) {
            return AABBTree.rayTest([spatialMap], ray, rayCallback);
        }
        else {
            var minimumResult = null;
            var upperBound = ray.maxFactor;
            var triNode = {
                index: 0
            };
            var i;
            var numTris = this.numTriangles * WebGLPhysicsPrivateTriangleArray.prototype.TRIANGLE_SIZE;
            for (i = 0; i < numTris; i += WebGLPhysicsPrivateTriangleArray.prototype.TRIANGLE_SIZE) {
                triNode.index = i;
                var result = rayCallback(null, triNode, ray, 0, upperBound);
                if (result) {
                    minimumResult = result;
                    upperBound = minimumResult.factor;
                }
            }
            return minimumResult;
        }
    };
    WebGLPhysicsPrivateTriangleArray.version = 1;
    return WebGLPhysicsPrivateTriangleArray;
})();
WebGLPhysicsPrivateTriangleArray.prototype.TRIANGLE_SIZE = 17;
var WebGLPhysicsConvexHullHelpers = {
    isPlanar: function isPlanarFn(points) {
        var tolerance = WebGLPhysicsConfig.COPLANAR_THRESHOLD;
        var p00 = points[0];
        var p01 = points[1];
        var p02 = points[2];
        var e10 = (points[3] - p00);
        var e11 = (points[4] - p01);
        var e12 = (points[5] - p02);
        var e20 = (points[6] - p00);
        var e21 = (points[7] - p01);
        var e22 = (points[8] - p02);
        var n0 = (e11 * e22) - (e12 * e21);
        var n1 = (e12 * e20) - (e10 * e22);
        var n2 = (e10 * e21) - (e11 * e20);
        var normalScale = 1 / Math.sqrt((n0 * n0) + (n1 * n1) + (n2 * n2));
        n0 *= normalScale;
        n1 *= normalScale;
        n2 *= normalScale;
        var planeDistance = -((p00 * n0) + (p01 * n1) + (p02 * n2));
        var i;
        var maxN = points.length;
        for (i = 0; i < maxN; i += 3) {
            var distance = (points[i] * n0) + (points[i + 1] * n1) + (points[i + 2] * n2) + planeDistance;
            if ((distance * distance) > tolerance) {
                return false;
            }
        }
        return true;
    },
    makePlanarConvexHull: function makePlanarConvexHullFn(points) {
        var DONT_NORMALIZE_THRESHOLD = 1e-6;
        var p00 = points[0];
        var p01 = points[1];
        var p02 = points[2];
        var e10 = (points[3] - p00);
        var e11 = (points[4] - p01);
        var e12 = (points[5] - p02);
        var e20 = (points[6] - p00);
        var e21 = (points[7] - p01);
        var e22 = (points[8] - p02);
        var normal0 = (e11 * e22) - (e12 * e21);
        var normal1 = (e12 * e20) - (e10 * e22);
        var normal2 = (e10 * e21) - (e11 * e20);
        var tangent0, tangent1, tangent2;
        if ((normal0 * normal0) + (normal2 * normal2) < DONT_NORMALIZE_THRESHOLD) {
            tangent0 = 1;
            tangent1 = tangent2 = 0;
        }
        else {
            tangent0 = -normal2;
            tangent1 = 0;
            tangent2 = normal0;
        }
        var bitangent0 = (normal1 * tangent2) - (normal2 * tangent1);
        var bitangent1 = (normal2 * tangent0) - (normal0 * tangent2);
        var bitangent2 = (normal0 * tangent1) - (normal1 * tangent0);
        var numPoints = points.length / 3;
        var projs = new Float32Array(numPoints * 2);
        var p0, p1, p2;
        var i;
        for (i = 0; i < numPoints; i += 1) {
            p0 = points[i * 3];
            p1 = points[(i * 3) + 1];
            p2 = points[(i * 3) + 2];
            projs[i * 2] = (p0 * tangent0) + (p1 * tangent1) + (p2 * tangent2);
            projs[(i * 2) + 1] = (p0 * bitangent0) + (p1 * bitangent1) + (p2 * bitangent2);
        }
        var i0 = 0;
        p00 = projs[0];
        p01 = projs[1];
        for (i = 2; i < (numPoints * 2); i += 2) {
            p0 = projs[i];
            p1 = projs[i + 1];
            if (p0 < p00 || (p0 === p00 && p1 < p01)) {
                i0 = (i / 2);
                p00 = p0;
                p01 = p1;
            }
        }
        var hullVertices = {};
        hullVertices[i0] = 0;
        var outVertexCount = 1;
        var hullTriangles = [];
        var fsti = i0;
        for (;;) {
            var max0, max1, maxDistance;
            var i1 = -1;
            for (i = 0; i < (numPoints * 2); i += 2) {
                if (i === (i0 * 2)) {
                    continue;
                }
                p0 = projs[i];
                p1 = projs[i + 1];
                var plsq = (((p0 - p00) * (p0 - p00)) + ((p1 - p01) * (p1 - p01)));
                if (i1 === -1) {
                    i1 = (i / 2);
                    max0 = p0;
                    max1 = p1;
                    maxDistance = plsq;
                    continue;
                }
                var turn = ((max0 - p00) * (p1 - p01)) - ((max1 - p01) * (p0 - p00));
                if (turn < 0 || (turn === 0 && plsq > maxDistance)) {
                    i1 = (i / 2);
                    max0 = p0;
                    max1 = p1;
                    maxDistance = plsq;
                }
            }
            if (i1 in hullVertices) {
                break;
            }
            hullVertices[i1] = outVertexCount;
            outVertexCount += 1;
            if (i0 !== fsti) {
                hullTriangles.push(fsti);
                hullTriangles.push(i0);
                hullTriangles.push(i1);
            }
            i0 = i1;
            p00 = projs[i1 * 2];
            p01 = projs[(i1 * 2) + 1];
        }
        return this.createArray(points, hullTriangles, hullVertices, outVertexCount);
    },
    makeConvexHull: function makeConvexHullFn(points) {
        // 3D generalisation of Graham Scan to facilitate triangulation of the hull in generation
        // Time complexity O(nh) for n points, and h out-points.
        var i0 = 0;
        var p00 = points[0];
        var p01 = points[1];
        var p02 = points[2];
        var i;
        var p0, p1, p2;
        var numPoints = (points.length / 3);
        for (i = 3; i < (numPoints * 3); i += 3) {
            p0 = points[i];
            p1 = points[i + 1];
            p2 = points[i + 2];
            if (p0 < p00 || (p0 === p00 && (p1 < p01 || (p1 === p01 && p2 < p02)))) {
                i0 = (i / 3);
                p00 = p0;
                p01 = p1;
                p02 = p2;
            }
        }
        var i1 = -1;
        var cos1 = -2;
        var lsq1 = 0;
        var d0, d1;
        for (i = 0; i < (numPoints * 3); i += 3) {
            if (i === (i0 * 3)) {
                continue;
            }
            p0 = points[i];
            p1 = points[i + 1];
            d0 = p0 - p00;
            d1 = p1 - p01;
            var lsq = ((d0 * d0) + (d1 * d1));
            if (lsq === 0) {
                if (i1 === -1) {
                    i1 = (i / 3);
                }
                continue;
            }
            var cos = d1 / Math.sqrt(lsq);
            if (cos > cos1 || (cos === cos1 && lsq > lsq1)) {
                cos1 = cos;
                lsq1 = lsq;
                i1 = (i / 3);
            }
        }
        var closedSet = {};
        var openSet = [i0, i1, i1, i0];
        var hullVertices = {};
        hullVertices[i0] = 0;
        hullVertices[i1] = 1;
        var outVertexCount = 2;
        var hullTriangles = [];
        while (openSet.length > 0) {
            i1 = openSet.pop();
            i0 = openSet.pop();
            if ((i0 + ":" + i1) in closedSet) {
                continue;
            }
            var i2 = -1;
            var maxEdge0, maxEdge1, maxEdge2;
            var maxDistance, maxProjection;
            p00 = points[i0 * 3];
            p01 = points[(i0 * 3) + 1];
            p02 = points[(i0 * 3) + 2];
            var edge0 = (points[i1 * 3] - p00);
            var edge1 = (points[(i1 * 3) + 1] - p01);
            var edge2 = (points[(i1 * 3) + 2] - p02);
            var isq = 1 / ((edge0 * edge0) + (edge1 * edge1) * (edge2 * edge2));
            for (i = 0; i < (numPoints * 3); i += 3) {
                if (i === (i0 * 3) || i === (i1 * 3)) {
                    continue;
                }
                p0 = points[i];
                p1 = points[i + 1];
                p2 = points[i + 2];
                var t = (((p0 - p00) * edge0) +
                    ((p1 - p01) * edge1) +
                    ((p2 - p02) * edge2)) * isq;
                var pEdge0 = (p0 - (p00 + (edge0 * t)));
                var pEdge1 = (p1 - (p01 + (edge1 * t)));
                var pEdge2 = (p2 - (p02 + (edge2 * t)));
                var plsq = ((pEdge0 * pEdge0) + (pEdge1 * pEdge1) + (pEdge2 * pEdge2));
                if (plsq <= WebGLPhysicsConfig.COLLINEAR_THRESHOLD) {
                    continue;
                }
                if (i2 === -1) {
                    i2 = (i / 3);
                    maxEdge0 = pEdge0;
                    maxEdge1 = pEdge1;
                    maxEdge2 = pEdge2;
                    maxDistance = plsq;
                    maxProjection = t;
                    continue;
                }
                var axis0 = ((pEdge1 * maxEdge2) - (pEdge2 * maxEdge1));
                var axis1 = ((pEdge2 * maxEdge0) - (pEdge0 * maxEdge2));
                var axis2 = ((pEdge0 * maxEdge1) - (pEdge1 * maxEdge0));
                var coplanar = (pEdge0 * ((edge1 * maxEdge2) - (edge2 * maxEdge1)) +
                    pEdge1 * ((edge2 * maxEdge0) - (edge0 * maxEdge2)) +
                    pEdge2 * ((edge0 * maxEdge1) - (edge1 * maxEdge0)));
                if ((coplanar * coplanar) < WebGLPhysicsConfig.COPLANAR_THRESHOLD) {
                    if (((pEdge0 * maxEdge0) + (pEdge1 * maxEdge1) + (pEdge2 * maxEdge2)) >= 0) {
                        if (plsq > maxDistance || (plsq === maxDistance && t > maxProjection)) {
                            i2 = (i / 3);
                            maxEdge0 = pEdge0;
                            maxEdge1 = pEdge1;
                            maxEdge2 = pEdge2;
                            maxDistance = plsq;
                            maxProjection = t;
                        }
                    }
                    else {
                        d0 = (p0 - p00);
                        d1 = (p1 - p01);
                        var d2 = (p2 - p02);
                        axis0 = ((d1 * edge2) - (d2 * edge1));
                        axis1 = ((d2 * edge0) - (d0 * edge2));
                        axis2 = ((d0 * edge1) - (d1 * edge0));
                        var internal = true;
                        var j;
                        for (j = 0; j < (numPoints * 3); j += 3) {
                            if (((axis0 * (points[j] - p00)) +
                                (axis1 * (points[j + 1] - p01)) +
                                (axis2 * (points[j + 2] - p02))) < 0) {
                                internal = false;
                                break;
                            }
                        }
                        if (internal) {
                            i2 = (i / 3);
                            maxEdge0 = pEdge0;
                            maxEdge1 = pEdge1;
                            maxEdge2 = pEdge2;
                            maxDistance = plsq;
                            maxProjection = t;
                        }
                    }
                }
                else {
                    var turn = (axis0 * edge0) + (axis1 * edge1) + (axis2 * edge2);
                    if (turn < 0 || (turn <= WebGLPhysicsConfig.COLLINEAR_THRESHOLD && plsq > maxDistance)) {
                        i2 = (i / 3);
                        maxEdge0 = pEdge0;
                        maxEdge1 = pEdge1;
                        maxEdge2 = pEdge2;
                        maxDistance = plsq;
                        maxProjection = t;
                    }
                }
            }
            if (!(i2 in hullVertices)) {
                hullVertices[i2] = outVertexCount;
                outVertexCount += 1;
            }
            if (!((i0 + ":" + i1) in closedSet ||
                (i1 + ":" + i2) in closedSet ||
                (i2 + ":" + i0) in closedSet)) {
                hullTriangles.push(i0);
                hullTriangles.push(i1);
                hullTriangles.push(i2);
                closedSet[i0 + ":" + i1] = true;
                closedSet[i1 + ":" + i2] = true;
                closedSet[i2 + ":" + i0] = true;
                openSet.push(i2);
                openSet.push(i1);
                openSet.push(i0);
                openSet.push(i2);
            }
        }
        return this.createArray(points, hullTriangles, hullVertices, outVertexCount);
    },
    createArray: function createArrayFn(points, indices, mapping, vertexCount) {
        var outPoints = new Float32Array(vertexCount * 3);
        var triangleCount = indices.length;
        var outIndices = (vertexCount < 65536 ? new Uint16Array(triangleCount) : new Uint32Array(triangleCount));
        var numPoints = (points.length / 3);
        var i;
        for (i = 0; i < numPoints; i += 1) {
            if (!(i in mapping)) {
                continue;
            }
            var newIndex = (mapping[i] * 3);
            outPoints[newIndex] = points[i * 3];
            outPoints[newIndex + 1] = points[(i * 3) + 1];
            outPoints[newIndex + 2] = points[(i * 3) + 2];
        }
        for (i = 0; i < triangleCount; i += 1) {
            outIndices[i] = mapping[indices[i]];
        }
        return WebGLPhysicsTriangleArray.create({
            vertices: outPoints,
            indices: outIndices,
            dontCopy: true
        })._private;
    }
};
var WebGLPhysicsTriangleMeshShape = (function () {
    function WebGLPhysicsTriangleMeshShape() {
    }
    WebGLPhysicsTriangleMeshShape.prototype.rayTest = function (ray) {
        return this.triangleArray.rayTest(ray);
    };
    WebGLPhysicsTriangleMeshShape.create = function (params) {
        var rett = new WebGLPhysicsShape();
        var t = new WebGLPhysicsTriangleMeshShape();
        rett._private = t;
        t._public = rett;
        var margin = (params.margin !== undefined) ? params.margin : 0.04;
        var triangleArray = params.triangleArray._private;
        var extents = triangleArray.extents;
        var e0 = extents[0];
        var e1 = extents[1];
        var e2 = extents[2];
        var e3 = extents[3];
        var e4 = extents[4];
        var e5 = extents[5];
        var h0 = ((0.5 * (e3 - e0)) + margin);
        var h1 = ((0.5 * (e4 - e1)) + margin);
        var h2 = ((0.5 * (e5 - e2)) + margin);
        var c0 = (0.5 * (e0 + e3));
        var c1 = (0.5 * (e1 + e4));
        var c2 = (0.5 * (e2 + e5));
        var buffer = new Float32Array(6);
        t.triangleArray = triangleArray;
        t.radius = Math.sqrt((h0 * h0) + (h1 * h1) + (h2 * h2));
        t.halfExtents = VMath.v3Build(h0, h1, h2, buffer.subarray(0, 3));
        if (c0 !== 0 || c1 !== 0 || c2 !== 0) {
            t.center = VMath.v3Build(c0, c1, c2);
        }
        else {
            t.center = undefined;
        }
        t.inertia = VMath.v3Build(0, 0, 0, buffer.subarray(3, 6));
        t.collisionRadius = margin;
        initShapeProperties(rett, "TRIANGLE_MESH");
        Object.defineProperty(rett, "triangleArray", {
            get: function shapeGetTriangleArray() {
                return this._private.triangleArray;
            },
            enumerable: true
        });
        return rett;
    };
    WebGLPhysicsTriangleMeshShape.version = 1;
    return WebGLPhysicsTriangleMeshShape;
})();
WebGLPhysicsTriangleMeshShape.prototype.type = "TRIANGLE_MESH";
var WebGLPhysicsConvexHullShape = (function () {
    function WebGLPhysicsConvexHullShape() {
    }
    WebGLPhysicsConvexHullShape.prototype.rayTest = function (ray) {
        var triangleArray = this.triangleArray;
        if (triangleArray === undefined) {
            return null;
        }
        return triangleArray.rayTest(ray);
    };
    WebGLPhysicsConvexHullShape.prototype.localSupportWithoutMargin = function (vec, dst) {
        var v0 = vec[0];
        var v1 = vec[1];
        var v2 = vec[2];
        var topology = this.supportTopology;
        var points = this.triangleArray.vertices;
        if (this.lastSupport === undefined) {
            this.lastSupport = 0;
        }
        var maxv = this.lastSupport;
        var ind = topology[maxv];
        var max = (points[ind] * v0) + (points[ind + 1] * v1) + (points[ind + 2] * v2);
        for (;;) {
            var next = -1;
            var n;
            var maxN = topology[maxv + 1];
            for (n = 0; n < maxN; n += 1) {
                var v = topology[maxv + 2 + n];
                ind = topology[v];
                var vdot = (points[ind] * v0) + (points[ind + 1] * v1) + (points[ind + 2] * v2);
                if (vdot > max) {
                    max = vdot;
                    next = v;
                }
            }
            if (next !== -1) {
                maxv = next;
                continue;
            }
            else {
                break;
            }
        }
        this.lastSupport = maxv;
        ind = topology[maxv];
        dst[0] = points[ind];
        dst[1] = points[ind + 1];
        dst[2] = points[ind + 2];
    };
    WebGLPhysicsConvexHullShape.create = function (params) {
        var retc = new WebGLPhysicsShape();
        var c = new WebGLPhysicsConvexHullShape();
        retc._private = c;
        c._public = retc;
        var margin = (params.margin !== undefined) ? params.margin : 0.04;
        var points = params.points;
        var minExtent = params.minExtent;
        var maxExtent = params.maxExtent;
        var min0, min1, min2, max0, max1, max2;
        if (!minExtent || !maxExtent) {
            min0 = points[0];
            min1 = points[1];
            min2 = points[2];
            max0 = min0;
            max1 = min1;
            max2 = min2;
            var maxN = points.length;
            var n;
            var v0, v1, v2;
            for (n = 3; n < maxN; n += 3) {
                v0 = points[n];
                v1 = points[n + 1];
                v2 = points[n + 2];
                if (min0 > v0) {
                    min0 = v0;
                }
                else if (max0 < v0) {
                    max0 = v0;
                }
                if (min1 > v1) {
                    min1 = v1;
                }
                else if (max1 < v1) {
                    max1 = v1;
                }
                if (min2 > v2) {
                    min2 = v2;
                }
                else if (max2 < v2) {
                    max2 = v2;
                }
            }
        }
        else {
            min0 = minExtent[0];
            min1 = minExtent[1];
            min2 = minExtent[2];
            max0 = maxExtent[0];
            max1 = maxExtent[1];
            max2 = maxExtent[2];
        }
        var h0 = ((0.5 * (max0 - min0)) + margin);
        var h1 = ((0.5 * (max1 - min1)) + margin);
        var h2 = ((0.5 * (max2 - min2)) + margin);
        var c0 = (0.5 * (min0 + max0));
        var c1 = (0.5 * (min1 + max1));
        var c2 = (0.5 * (min2 + max2));
        var lx = (2.0 * h0);
        var ly = (2.0 * h1);
        var lz = (2.0 * h2);
        lx *= lx;
        ly *= ly;
        lz *= lz;
        var massRatio = (1.0 / 12.0);
        var buffer = new Float32Array(6);
        c.points = new Float32Array(points);
        c.radius = Math.sqrt((h0 * h0) + (h1 * h1) + (h2 * h2));
        c.halfExtents = VMath.v3Build(h0, h1, h2, buffer.subarray(0, 3));
        if (c0 !== 0 || c1 !== 0 || c2 !== 0) {
            c.center = VMath.v3Build(c0, c1, c2);
        }
        else {
            c.center = undefined;
        }
        c.inertia = VMath.v3Build(massRatio * (ly + lz), massRatio * (lx + lz), massRatio * (lx + ly), buffer.subarray(3, 6));
        c.collisionRadius = margin;
        if (points.length < 9) {
            throw "At present time, WebGL PhysicsDevice does not permit a convex hull to contain " +
                "less than 3 vertices";
        }
        else {
            var planar = WebGLPhysicsConvexHullHelpers.isPlanar(points);
            if (planar) {
                c.triangleArray = WebGLPhysicsConvexHullHelpers.makePlanarConvexHull(points);
            }
            else {
                c.triangleArray = WebGLPhysicsConvexHullHelpers.makeConvexHull(points);
            }
            var supportTopology = [];
            points = c.triangleArray.vertices;
            maxN = points.length;
            for (n = 0; n < maxN; n += 3) {
                supportTopology[n / 3] = [];
            }
            var m;
            if (planar) {
                for (n = 0; n < (maxN / 3); n += 1) {
                    m = (n + 1) % (maxN / 3);
                    supportTopology[n].push(m);
                    supportTopology[m].push(n);
                }
            }
            else {
                var triangles = c.triangleArray.indices;
                maxN = triangles.length;
                for (n = 0; n < maxN; n += 3) {
                    var i0 = triangles[n];
                    var i1 = triangles[n + 1];
                    var i2 = triangles[n + 2];
                    supportTopology[i0].push(i1);
                    supportTopology[i1].push(i2);
                    supportTopology[i2].push(i0);
                }
            }
            maxN = points.length;
            if ((planar && maxN >= (3 * 6)) || (!planar && maxN >= (3 * 10))) {
                for (n = 0; n < maxN; n += 3) {
                    var min = Number.MAX_VALUE;
                    v0 = points[n];
                    v1 = points[n + 1];
                    v2 = points[n + 2];
                    var minm;
                    for (m = 0; m < maxN; m += 3) {
                        var dot = (v0 * points[m]) + (v1 * points[m + 1]) + (v2 * points[m + 2]);
                        if (dot < min) {
                            min = dot;
                            minm = m;
                        }
                    }
                    supportTopology[n / 3].push(minm / 3);
                }
            }
            var mapping = [];
            var size = 0;
            for (n = 0; n < (maxN / 3); n += 1) {
                mapping.push(size);
                size += supportTopology[n].length + 2;
            }
            c.supportTopology = (size > 65536) ? new Uint32Array(size) : new Uint16Array(size);
            var index = 0;
            for (n = 0; n < (maxN / 3); n += 1) {
                c.supportTopology[index] = (n * 3);
                index += 1;
                var topology = supportTopology[n];
                c.supportTopology[index] = topology.length;
                index += 1;
                for (m = 0; m < topology.length; m += 1) {
                    c.supportTopology[index] = mapping[topology[m]];
                    index += 1;
                }
            }
        }
        initShapeProperties(retc, "CONVEX_HULL");
        return retc;
    };
    WebGLPhysicsConvexHullShape.version = 1;
    return WebGLPhysicsConvexHullShape;
})();
WebGLPhysicsConvexHullShape.prototype.type = "CONVEX_HULL";
var WebGLPhysicsPrivateBody = (function () {
    function WebGLPhysicsPrivateBody(params, publicObject) {
        this._public = publicObject;
        this.id = WebGLPhysicsPrivateBody.uniqueId;
        WebGLPhysicsPrivateBody.uniqueId += 1;
        this.world = null;
        this.shape = params.shape._private;
        this.friction = (params.friction !== undefined) ? params.friction : 0.5;
        this.restitution = (params.restitution !== undefined) ? params.restitution : 0.0;
        var buffer = new Float32Array(12 + 12 + 6 + 12 + 12 + 12 + 12);
        var bufferIndex = 0;
        var xform = params.transform;
        this.transform = (xform ?
            VMath.m43Copy(xform, buffer.subarray(bufferIndex, (bufferIndex + 12))) :
            VMath.m43BuildIdentity(buffer.subarray(bufferIndex, (bufferIndex + 12))));
        bufferIndex += 12;
        this.arbiters = [];
        this.constraints = [];
        this.velocity = buffer.subarray(bufferIndex, (bufferIndex + 12));
        bufferIndex += 12;
        var vel = params.linearVelocity;
        if (vel) {
            this.velocity[0] = vel[0];
            this.velocity[1] = vel[1];
            this.velocity[2] = vel[2];
        }
        vel = params.angularVelocity;
        if (vel) {
            this.velocity[3] = vel[0];
            this.velocity[4] = vel[1];
            this.velocity[5] = vel[2];
        }
        this.linearDamping = (params.linearDamping !== undefined) ? params.linearDamping : 0.0;
        this.angularDamping = (params.angularDamping !== undefined) ? params.angularDamping : 0.0;
        this.extents = buffer.subarray(bufferIndex, (bufferIndex + 6));
        bufferIndex += 6;
        this.startTransform = VMath.m43BuildIdentity(buffer.subarray(bufferIndex, (bufferIndex + 12)));
        bufferIndex += 12;
        this.endTransform = VMath.m43BuildIdentity(buffer.subarray(bufferIndex, (bufferIndex + 12)));
        bufferIndex += 12;
        this.prevTransform = VMath.m43Copy(this.transform, buffer.subarray(bufferIndex, (bufferIndex + 12)));
        bufferIndex += 12;
        this.newTransform = VMath.m43BuildIdentity(buffer.subarray(bufferIndex, (bufferIndex + 12)));
        bufferIndex += 12;
        this.island = null;
        this.islandRoot = this;
        this.islandRank = 0;
        this.delaySleep = true;
        this.group = 0;
        this.mask = 0;
        this.kinematic = false;
        this.fixedRotation = false;
        this.mass = 0;
        this.inverseMass = 0;
        this.inverseInertiaLocal = null;
        this.inverseInertia = null;
        this.collisionObject = false;
        this.permitSleep = false;
        this.sweepFrozen = false;
        this.active = false;
        this.contactCallbacks = null;
    }
    WebGLPhysicsPrivateBody.prototype.computeDeltaVelocity = function (timeStep, from, to, inputVelocity) {
        var velocity = inputVelocity || this.velocity;
        var active = false;
        velocity[0] = (to[9] - from[9]);
        velocity[1] = (to[10] - from[10]);
        velocity[2] = (to[11] - from[11]);
        if (velocity[0] !== 0 ||
            velocity[1] !== 0 ||
            velocity[2] !== 0) {
            active = true;
        }
        velocity[0] /= timeStep;
        velocity[1] /= timeStep;
        velocity[2] /= timeStep;
        var m0 = (from[0] * to[0]) + (from[3] * to[3]) + (from[6] * to[6]);
        var m1 = (from[0] * to[1]) + (from[3] * to[4]) + (from[6] * to[7]);
        var m2 = (from[0] * to[2]) + (from[3] * to[5]) + (from[6] * to[8]);
        var m3 = (from[1] * to[0]) + (from[4] * to[3]) + (from[7] * to[6]);
        var m4 = (from[1] * to[1]) + (from[4] * to[4]) + (from[7] * to[7]);
        var m5 = (from[1] * to[2]) + (from[4] * to[5]) + (from[7] * to[8]);
        var m6 = (from[2] * to[0]) + (from[5] * to[3]) + (from[8] * to[6]);
        var m7 = (from[2] * to[1]) + (from[5] * to[4]) + (from[8] * to[7]);
        var m8 = (from[2] * to[2]) + (from[5] * to[5]) + (from[8] * to[8]);
        var x, y, z, w, s;
        var trace = m0 + m4 + m8 + 1;
        if (trace > VMath.precision) {
            w = Math.sqrt(trace) / 2;
            x = (m5 - m7) / (4 * w);
            y = (m6 - m2) / (4 * w);
            z = (m1 - m3) / (4 * w);
        }
        else {
            if ((m0 > m4) && (m0 > m8)) {
                s = Math.sqrt(1.0 + m0 - m4 - m8) * 2;
                w = (m5 - m7) / s;
                x = 0.25 * s;
                y = (m3 + m1) / s;
                z = (m6 + m2) / s;
            }
            else if (m4 > m8) {
                s = Math.sqrt(1.0 + m4 - m0 - m8) * 2;
                w = (m6 - m2) / s;
                x = (m3 + m1) / s;
                y = 0.25 * s;
                z = (m7 + m5) / s;
            }
            else {
                s = Math.sqrt(1.0 + m8 - m0 - m4) * 2;
                w = (m1 - m3) / s;
                x = (m6 + m2) / s;
                y = (m7 + m5) / s;
                z = 0.25 * s;
            }
        }
        var angle = Math.acos(w) * 2.0;
        var sin_sqrd = 1.0 - (w * w);
        if (sin_sqrd < VMath.precision || angle === 0) {
            velocity[3] = velocity[4] = velocity[5] = 0;
        }
        else {
            var scale = angle / (timeStep * Math.sqrt(sin_sqrd));
            velocity[3] = x * scale;
            velocity[4] = y * scale;
            velocity[5] = z * scale;
            active = true;
        }
        return active;
    };
    WebGLPhysicsPrivateBody.prototype.calculateSweptExtents = function (extents) {
        var shape = this.shape;
        var radius = shape.radius;
        var startTransform = this.startTransform;
        var x0 = startTransform[9];
        var x1 = startTransform[10];
        var x2 = startTransform[11];
        var transform = this.transform;
        var y0 = transform[9];
        var y1 = transform[10];
        var y2 = transform[11];
        var tmp;
        if (x0 > y0) {
            tmp = x0;
            x0 = y0;
            y0 = tmp;
        }
        if (x1 > y1) {
            tmp = x1;
            x1 = y1;
            y1 = tmp;
        }
        if (x2 > y2) {
            tmp = x2;
            x2 = y2;
            y2 = tmp;
        }
        extents[0] = x0 - radius;
        extents[1] = x1 - radius;
        extents[2] = x2 - radius;
        extents[3] = y0 + radius;
        extents[4] = y1 + radius;
        extents[5] = y2 + radius;
    };
    WebGLPhysicsPrivateBody.prototype.calculateExtents = function (extents) {
        var shape = this.shape;
        var center = shape.center;
        var halfExtents = shape.halfExtents;
        var h0 = halfExtents[0];
        var h1 = halfExtents[1];
        var h2 = halfExtents[2];
        var transform = this.transform;
        var m0 = transform[0];
        var m1 = transform[1];
        var m2 = transform[2];
        var m3 = transform[3];
        var m4 = transform[4];
        var m5 = transform[5];
        var m6 = transform[6];
        var m7 = transform[7];
        var m8 = transform[8];
        var ct0 = transform[9];
        var ct1 = transform[10];
        var ct2 = transform[11];
        if (center) {
            var c0 = center[0];
            var c1 = center[1];
            var c2 = center[2];
            if (c0 !== 0 ||
                c1 !== 0 ||
                c2 !== 0) {
                ct0 += (m0 * c0 + m3 * c1 + m6 * c2);
                ct1 += (m1 * c0 + m4 * c1 + m7 * c2);
                ct2 += (m2 * c0 + m5 * c1 + m8 * c2);
            }
        }
        var ht0 = ((m0 < 0 ? -m0 * h0 : m0 > 0 ? m0 * h0 : 0) +
            (m3 < 0 ? -m3 * h1 : m3 > 0 ? m3 * h1 : 0) +
            (m6 < 0 ? -m6 * h2 : m6 > 0 ? m6 * h2 : 0));
        var ht1 = ((m1 < 0 ? -m1 * h0 : m1 > 0 ? m1 * h0 : 0) +
            (m4 < 0 ? -m4 * h1 : m4 > 0 ? m4 * h1 : 0) +
            (m7 < 0 ? -m7 * h2 : m7 > 0 ? m7 * h2 : 0));
        var ht2 = ((m2 < 0 ? -m2 * h0 : m2 > 0 ? m2 * h0 : 0) +
            (m5 < 0 ? -m5 * h1 : m5 > 0 ? m5 * h1 : 0) +
            (m8 < 0 ? -m8 * h2 : m8 > 0 ? m8 * h2 : 0));
        extents[0] = (ct0 - ht0);
        extents[1] = (ct1 - ht1);
        extents[2] = (ct2 - ht2);
        extents[3] = (ct0 + ht0);
        extents[4] = (ct1 + ht1);
        extents[5] = (ct2 + ht2);
    };
    WebGLPhysicsPrivateBody.prototype.rayTest = function (ray) {
        var transform = this.transform;
        var rayT = {
            origin: WebGLPrivatePhysicsWorld.prototype.m43InverseOrthonormalTransformPoint(transform, ray.origin),
            direction: WebGLPrivatePhysicsWorld.prototype.m43InverseOrthonormalTransformVector(transform, ray.direction),
            maxFactor: ray.maxFactor
        };
        var result = this.shape.rayTest(rayT);
        if (result !== null) {
            result.hitPoint = VMath.m43TransformPoint(transform, result.hitPoint, result.hitPoint);
            result.hitNormal = VMath.m43TransformVector(transform, result.hitNormal, result.hitNormal);
        }
        return result;
    };
    WebGLPhysicsPrivateBody.prototype.integratePositionWithVelocities = function (transform, outTransform, timeStep, offset) {
        var velocity = this.velocity;
        var sqrt = Math.sqrt;
        outTransform[9] = transform[9] + (timeStep * velocity[offset]);
        outTransform[10] = transform[10] + (timeStep * velocity[offset + 1]);
        outTransform[11] = transform[11] + (timeStep * velocity[offset + 2]);
        var w0 = velocity[offset + 3] * timeStep;
        var w1 = velocity[offset + 4] * timeStep;
        var w2 = velocity[offset + 5] * timeStep;
        var A0 = transform[0];
        var A1 = transform[1];
        var A2 = transform[2];
        var A3 = transform[3];
        var A4 = transform[4];
        var A5 = transform[5];
        var A6 = transform[6];
        var A7 = transform[7];
        var A8 = transform[8];
        var B0 = A0 - (w2 * A1) + (w1 * A2);
        var B1 = A1 + (w2 * A0) - (w0 * A2);
        var B2 = A2 - (w1 * A0) + (w0 * A1);
        var B3 = A3 - (w2 * A4) + (w1 * A5);
        var B4 = A4 + (w2 * A3) - (w0 * A5);
        var B5 = A5 - (w1 * A3) + (w0 * A4);
        var B6 = A6 - (w2 * A7) + (w1 * A8);
        var B7 = A7 + (w2 * A6) - (w0 * A8);
        var B8 = A8 - (w1 * A6) + (w0 * A7);
        var scale = 1 / sqrt((B0 * B0) + (B1 * B1) + (B2 * B2));
        B0 *= scale;
        B1 *= scale;
        B2 *= scale;
        scale = -((B0 * B3) + (B1 * B4) + (B2 * B5));
        B3 += B0 * scale;
        B4 += B1 * scale;
        B5 += B2 * scale;
        scale = 1 / sqrt((B3 * B3) + (B4 * B4) + (B5 * B5));
        B3 *= scale;
        B4 *= scale;
        B5 *= scale;
        scale = -((B0 * B6) + (B1 * B7) + (B2 * B8));
        B6 += B0 * scale;
        B7 += B1 * scale;
        B8 += B2 * scale;
        scale = -((B3 * B6) + (B4 * B7) + (B5 * B8));
        B6 += B3 * scale;
        B7 += B4 * scale;
        B8 += B5 * scale;
        scale = 1 / sqrt((B6 * B6) + (B7 * B7) + (B8 * B8));
        B6 *= scale;
        B7 *= scale;
        B8 *= scale;
        outTransform[0] = B0;
        outTransform[1] = B1;
        outTransform[2] = B2;
        outTransform[3] = B3;
        outTransform[4] = B4;
        outTransform[5] = B5;
        outTransform[6] = B6;
        outTransform[7] = B7;
        outTransform[8] = B8;
    };
    WebGLPhysicsPrivateBody.prototype.applyBiasVelocities = function (timeStep) {
        var velocity = this.velocity;
        this.integratePositionWithVelocities(this.transform, this.startTransform, timeStep, 6);
        velocity[6] = velocity[7] = velocity[8] = 0;
        velocity[9] = velocity[10] = velocity[11] = 0;
    };
    WebGLPhysicsPrivateBody.prototype.integratePosition = function (timeStep) {
        this.integratePositionWithVelocities(this.startTransform, this.transform, timeStep, 0);
    };
    WebGLPhysicsPrivateBody.prototype.refreshInertiaTensor = function () {
        var A = this.transform;
        var inertia = this.inverseInertiaLocal;
        var i0 = inertia[0];
        var i1 = inertia[1];
        var i2 = inertia[2];
        var A0 = A[0];
        var A1 = A[1];
        var A2 = A[2];
        var A3 = A[3];
        var A4 = A[4];
        var A5 = A[5];
        var A6 = A[6];
        var A7 = A[7];
        var A8 = A[8];
        var I = this.inverseInertia;
        I[0] = (A0 * A0 * i0) + (A3 * A3 * i1) + (A6 * A6 * i2);
        I[1] = (A0 * A1 * i0) + (A3 * A4 * i1) + (A6 * A7 * i2);
        I[2] = (A0 * A2 * i0) + (A3 * A5 * i1) + (A6 * A8 * i2);
        I[3] = (A1 * A0 * i0) + (A4 * A3 * i1) + (A7 * A6 * i2);
        I[4] = (A1 * A1 * i0) + (A4 * A4 * i1) + (A7 * A7 * i2);
        I[5] = (A1 * A2 * i0) + (A4 * A5 * i1) + (A7 * A8 * i2);
        I[6] = (A2 * A0 * i0) + (A5 * A3 * i1) + (A8 * A6 * i2);
        I[7] = (A2 * A1 * i0) + (A5 * A4 * i1) + (A8 * A7 * i2);
        I[8] = (A2 * A2 * i0) + (A5 * A5 * i1) + (A8 * A8 * i2);
    };
    WebGLPhysicsPrivateBody.prototype.integrateVelocity = function (gravity, timeStep) {
        var velocity = this.velocity;
        var pow = Math.pow;
        var linDrag = pow(1 - this.linearDamping, timeStep);
        velocity[0] = (velocity[0] + (timeStep * gravity[0])) * linDrag;
        velocity[1] = (velocity[1] + (timeStep * gravity[1])) * linDrag;
        velocity[2] = (velocity[2] + (timeStep * gravity[2])) * linDrag;
        var angDrag = pow(1 - this.angularDamping, timeStep);
        var w0 = velocity[3] * angDrag;
        var w1 = velocity[4] * angDrag;
        var w2 = velocity[5] * angDrag;
        var max_angular = WebGLPhysicsConfig.MAX_ANGULAR / timeStep;
        var wlsq = ((w0 * w0) + (w1 * w1) + (w2 * w2));
        if (wlsq > (max_angular * max_angular)) {
            var scale = max_angular / Math.sqrt(wlsq);
            w0 *= scale;
            w1 *= scale;
            w2 *= scale;
        }
        velocity[3] = w0;
        velocity[4] = w1;
        velocity[5] = w2;
    };
    WebGLPhysicsPrivateBody.prototype.isActiveVelocity = function (linear, angular) {
        var r = this.shape.radius;
        var velocity = this.velocity;
        var v0 = velocity[0];
        var v1 = velocity[1];
        var v2 = velocity[2];
        var vmag = ((v0 * v0) + (v1 * v1) + (v2 * v2));
        if (vmag > (linear * r * r)) {
            return true;
        }
        v0 = velocity[3];
        v1 = velocity[4];
        v2 = velocity[5];
        if (((v0 * v0) + (v1 * v1) + (v2 * v2)) > angular) {
            return true;
        }
        return false;
    };
    WebGLPhysicsPrivateBody.prototype.isActive = function () {
        if (!this.permitSleep) {
            return true;
        }
        if (this.isActiveVelocity(WebGLPhysicsConfig.SLEEP_LINEAR_SQ, WebGLPhysicsConfig.SLEEP_ANGULAR_SQ)) {
            this.wakeTimeStamp = this.world.timeStamp;
            return true;
        }
        return ((this.wakeTimeStamp + WebGLPhysicsConfig.SLEEP_DELAY) > this.world.timeStamp);
    };
    WebGLPhysicsPrivateBody.version = 1;
    WebGLPhysicsPrivateBody.uniqueId = 0;
    return WebGLPhysicsPrivateBody;
})();
var WebGLPhysicsCollisionObject = (function () {
    function WebGLPhysicsCollisionObject() {
    }
    WebGLPhysicsCollisionObject.prototype.calculateExtents = function (extents) {
        this._private.calculateExtents(extents);
    };
    WebGLPhysicsCollisionObject.prototype.calculateTransform = function (transform, origin) {
        var privateTransform = this._private.transform;
        if (origin) {
            VMath.m43NegOffset(privateTransform, origin, transform);
        }
        else {
            transform[0] = privateTransform[0];
            transform[1] = privateTransform[1];
            transform[2] = privateTransform[2];
            transform[3] = privateTransform[3];
            transform[4] = privateTransform[4];
            transform[5] = privateTransform[5];
            transform[6] = privateTransform[6];
            transform[7] = privateTransform[7];
            transform[8] = privateTransform[8];
            transform[9] = privateTransform[9];
            transform[10] = privateTransform[10];
            transform[11] = privateTransform[11];
        }
    };
    WebGLPhysicsCollisionObject.prototype.clone = function () {
        return WebGLPhysicsCollisionObject.create(this);
    };
    WebGLPhysicsCollisionObject.create = function (params) {
        var rets = new WebGLPhysicsCollisionObject();
        var s = new WebGLPhysicsPrivateBody(params, rets);
        rets._private = s;
        rets.userData = ("userData" in params) ? params.userData : null;
        Object.defineProperty(rets, "shape", {
            value: params.shape,
            enumerable: true
        });
        var kinematic = (params.kinematic !== undefined) ? params.kinematic : false;
        Object.defineProperty(rets, "transform", {
            get: function collisionObjectGetTransform() {
                return VMath.m43Copy(this._private.transform);
            },
            set: function collisionObjectSetTransform(transform) {
                var pr = this._private;
                if (pr.kinematic || !pr.world) {
                    VMath.m43Copy(transform, pr.transform);
                    if (pr.world) {
                        pr.world.wakeBody(pr);
                    }
                }
            },
            enumerable: true
        });
        var group = (params.group !== undefined) ? params.group : WebGLPhysicsDevice.prototype.FILTER_STATIC;
        Object.defineProperty(rets, "group", {
            value: group,
            enumerable: true
        });
        var mask = (params.mask !== undefined) ? params.mask :
            (WebGLPhysicsDevice.prototype.FILTER_ALL ^ WebGLPhysicsDevice.prototype.FILTER_STATIC);
        Object.defineProperty(rets, "mask", {
            value: mask,
            enumerable: true
        });
        Object.defineProperty(rets, "friction", {
            get: function collisionObjectGetFriction() {
                return this._private.friction;
            },
            set: function collisionObjectSetFriction(friction) {
                var pr = this._private;
                pr.friction = friction;
                var arbiters = pr.arbiters;
                var i;
                var limit = arbiters.length;
                for (i = 0; i < limit; i += 1) {
                    arbiters[i].invalidateParameters();
                }
            },
            enumerable: true
        });
        Object.defineProperty(rets, "restitution", {
            get: function collisionObjectGetFriction() {
                return this._private.restitution;
            },
            set: function collisionObjectSetFriction(restitution) {
                var pr = this._private;
                pr.restitution = restitution;
                var arbiters = pr.arbiters;
                var i;
                var limit = arbiters.length;
                for (i = 0; i < limit; i += 1) {
                    arbiters[i].invalidateParameters();
                }
            },
            enumerable: true
        });
        Object.defineProperty(rets, "kinematic", {
            value: kinematic,
            enumerable: true
        });
        s.group = group;
        s.mask = mask;
        s.kinematic = kinematic;
        s.fixedRotation = !kinematic;
        s.mass = 0;
        s.inverseMass = 0;
        s.inverseInertiaLocal = WebGLPhysicsCollisionObject.sharedInverseInertiaLocal;
        s.inverseInertia = WebGLPhysicsCollisionObject.sharedInverseInertia;
        s.collisionObject = true;
        s.permitSleep = false;
        s.sweepFrozen = true;
        s.active = kinematic;
        if (params.onPreSolveContact ||
            params.onAddedContacts ||
            params.onProcessedContacts ||
            params.onRemovedContacts) {
            s.contactCallbacks = new WebGLPhysicsContactCallbacks(params, mask);
        }
        else {
            s.contactCallbacks = null;
        }
        return rets;
    };
    WebGLPhysicsCollisionObject.version = 1;
    WebGLPhysicsCollisionObject.sharedInverseInertiaLocal = VMath.v3BuildZero();
    WebGLPhysicsCollisionObject.sharedInverseInertia = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    return WebGLPhysicsCollisionObject;
})();
var WebGLPhysicsContactCallbacks = (function () {
    function WebGLPhysicsContactCallbacks(params, mask) {
        this.mask = (params.contactCallbacksMask !== undefined ?
            params.contactCallbacksMask :
            mask);
        this.added = false;
        this.deferred = (params.onAddedContacts ||
            params.onProcessedContacts ||
            params.onRemovedContacts);
        this.onPreSolveContact = params.onPreSolveContact || null;
        this.onAddedContacts = params.onAddedContacts || null;
        this.onProcessedContacts = params.onProcessedContacts || null;
        this.onRemovedContacts = params.onRemovedContacts || null;
        this.trigger = params.trigger || false;
        return this;
    }
    return WebGLPhysicsContactCallbacks;
})();
var WebGLPhysicsRigidBody = (function () {
    function WebGLPhysicsRigidBody() {
        this.calculateExtents = WebGLPhysicsCollisionObject.prototype.calculateExtents;
        this.calculateTransform = WebGLPhysicsCollisionObject.prototype.calculateTransform;
    }
    WebGLPhysicsRigidBody.prototype.clone = function () {
        return WebGLPhysicsRigidBody.create(this);
    };
    WebGLPhysicsRigidBody.create = function (params) {
        var retr = new WebGLPhysicsRigidBody();
        var r = new WebGLPhysicsPrivateBody(params, retr);
        retr._private = r;
        retr.userData = ("userData" in params) ? params.userData : null;
        Object.defineProperty(retr, "shape", {
            value: params.shape,
            enumerable: true
        });
        Object.defineProperty(retr, "linearVelocity", {
            get: function rigidBodyGetVelocity() {
                var vel = this._private.velocity;
                return VMath.v3Build(vel[0], vel[1], vel[2]);
            },
            set: function rigidBodySetVelocity(linearVelocity) {
                var vel = this._private.velocity;
                vel[0] = linearVelocity[0];
                vel[1] = linearVelocity[1];
                vel[2] = linearVelocity[2];
            },
            enumerable: true
        });
        Object.defineProperty(retr, "angularVelocity", {
            get: function rigidBodyGetVelocity() {
                var vel = this._private.velocity;
                return VMath.v3Build(vel[3], vel[4], vel[5]);
            },
            set: function rigidBodySetVelocity(angularVelocity) {
                var vel = this._private.velocity;
                vel[3] = angularVelocity[0];
                vel[4] = angularVelocity[1];
                vel[5] = angularVelocity[2];
            },
            enumerable: true
        });
        Object.defineProperty(retr, "transform", {
            get: function rigidBodyGetTransform() {
                return VMath.m43Copy(this._private.transform);
            },
            set: function rigidBodySetTransform(transform) {
                var pr = this._private;
                VMath.m43Copy(transform, pr.transform);
                var arbiters = pr.arbiters;
                var i;
                var limit = arbiters.length;
                for (i = 0; i < limit; i += 1) {
                    arbiters[i].skipDiscreteCollisions = false;
                }
            },
            enumerable: true
        });
        Object.defineProperty(retr, "active", {
            get: function rigidBodyGetActive() {
                return this._private.active;
            },
            set: function rigidBodySetActive(active) {
                var pr = this._private;
                if (active === pr.active) {
                    if (pr.world && active) {
                        pr.wakeTimeStamp = pr.world.timeStamp;
                    }
                }
                else if (pr.world) {
                    if (active) {
                        pr.world.wakeBody(pr);
                    }
                    else {
                        var list = pr.world.activeBodies;
                        list[list.indexOf(pr)] = list[list.length - 1];
                        list.pop();
                        pr.active = false;
                        var arbiters = pr.arbiters;
                        var n;
                        var maxN = arbiters.length;
                        for (n = 0; n < maxN; n += 1) {
                            var arb = arbiters[n];
                            if (!arb.active) {
                                continue;
                            }
                            arb.active = false;
                            var worldList = pr.world.activeArbiters;
                            worldList[worldList.indexOf(arb)] = worldList[worldList.length - 1];
                            worldList.pop();
                        }
                        pr.world.syncBody(pr);
                    }
                }
                else {
                    pr.active = active;
                }
            },
            enumerable: true
        });
        var group = (params.group !== undefined) ? params.group : WebGLPhysicsDevice.prototype.FILTER_DYNAMIC;
        Object.defineProperty(retr, "group", {
            value: group,
            enumerable: true
        });
        var mask = (params.mask !== undefined) ? params.mask : WebGLPhysicsDevice.prototype.FILTER_ALL;
        Object.defineProperty(retr, "mask", {
            value: mask,
            enumerable: true
        });
        Object.defineProperty(retr, "friction", {
            get: function rigidBodyGetFriction() {
                return this._private.friction;
            },
            set: function rigidBodySetFriction(friction) {
                var pr = this._private;
                pr.friction = friction;
                var arbiters = pr.arbiters;
                var i;
                var limit = arbiters.length;
                for (i = 0; i < limit; i += 1) {
                    arbiters[i].invalidateParameters();
                }
            },
            enumerable: true
        });
        Object.defineProperty(retr, "restitution", {
            get: function rigidBodyGetRestitution() {
                return this._private.restitution;
            },
            set: function rigidBodySetRestitution(restitution) {
                var pr = this._private;
                pr.restitution = restitution;
                var arbiters = pr.arbiters;
                var i;
                var limit = arbiters.length;
                for (i = 0; i < limit; i += 1) {
                    arbiters[i].invalidateParameters();
                }
            },
            enumerable: true
        });
        Object.defineProperty(retr, "linearDamping", {
            get: function rigidBodyGetLinearDamping() {
                return this._private.linearDamping;
            },
            set: function rigidBodySetLinearDamping(linearDamping) {
                this._private.linearDamping = linearDamping;
            },
            enumerable: true
        });
        Object.defineProperty(retr, "angularDamping", {
            get: function rigidBodyGetLinearDamping() {
                return this._private.angularDamping;
            },
            set: function rigidBodySetLinearDamping(angularDamping) {
                this._private.angularDamping = angularDamping;
            },
            enumerable: true
        });
        var kinematic = (params.kinematic !== undefined) ? params.kinematic : false;
        Object.defineProperty(retr, "kinematic", {
            value: kinematic,
            enumerable: true
        });
        var mass = (params.mass !== undefined) ? params.mass : 1.0;
        Object.defineProperty(retr, "mass", {
            value: mass,
            enumerable: true
        });
        var inertia = (params.inertia ? VMath.v3Copy(params.inertia) : VMath.v3ScalarMul(params.shape.inertia, mass));
        Object.defineProperty(retr, "inertia", {
            get: function rigidBodyGetInertia() {
                return VMath.v3Copy(inertia);
            },
            enumerable: true
        });
        r.group = group;
        r.mask = mask;
        r.active = (params.active !== undefined) ? params.active :
            (params.frozen !== undefined) ? (!params.frozen) : true;
        r.kinematic = kinematic;
        r.fixedRotation = kinematic || ((params.fixedRotation !== undefined) ? params.fixedRotation : false);
        r.inverseInertiaLocal = (r.fixedRotation ? VMath.v3BuildZero() :
            VMath.v3Build(1 / inertia[0], 1 / inertia[1], 1 / inertia[2]));
        r.inverseInertia = VMath.m33BuildIdentity();
        r.mass = mass;
        r.inverseMass = (kinematic ? 0 : (1 / r.mass));
        r.collisionObject = false;
        r.permitSleep = (params.permitSleep !== undefined) ? params.permitSleep : (!kinematic);
        r.sweepFrozen = kinematic;
        if (params.onPreSolveContact ||
            params.onAddedContacts ||
            params.onProcessedContacts ||
            params.onRemovedContacts) {
            r.contactCallbacks = new WebGLPhysicsContactCallbacks(params, mask);
        }
        else {
            r.contactCallbacks = null;
        }
        return retr;
    };
    WebGLPhysicsRigidBody.version = 1;
    return WebGLPhysicsRigidBody;
})();
var WebGLPhysicsConstraint = (function () {
    function WebGLPhysicsConstraint() {
    }
    WebGLPhysicsConstraint.prototype.preStep = function (timeStepRatio, timeStep) {
    };
    WebGLPhysicsConstraint.prototype.applyCachedImpulses = function () {
    };
    WebGLPhysicsConstraint.prototype.computeAndApplyImpulses = function () {
    };
    WebGLPhysicsConstraint.create = function (type, params) {
        var s = new WebGLPhysicsConstraint();
        s.world = null;
        s.userData = null;
        webGLPhysicsClone(s, params);
        s.type = type;
        return s;
    };
    WebGLPhysicsConstraint.version = 1;
    return WebGLPhysicsConstraint;
})();
var initConstraintProperties = function initConstraintPropertiesFn(c, params) {
    c.userData = params.userData;
    var pc = c._private;
    pc.world = null;
    pc.bodyA = params.bodyA._private;
    Object.defineProperty(c, "bodyA", {
        value: params.bodyA,
        enumerable: true
    });
    pc.bodyB = params.bodyB ? params.bodyB._private : null;
    Object.defineProperty(c, "bodyB", {
        value: params.bodyB,
        enumerable: true
    });
    pc.active = (params.active !== undefined) ? params.active : true;
    Object.defineProperty(c, "active", {
        get: function constraintGetActive() {
            return this._private.active;
        },
        set: function constraintSetActive(active) {
            var pc = this._private;
            if (active === pc.active) {
                if (pc.world && active) {
                    pc.wakeTimeStamp = pc.world.timeStamp;
                }
            }
            else if (pc.world) {
                if (active) {
                    pc.world.wakeConstraint(pc);
                }
                else {
                    var list = pc.world.activeConstraints;
                    list[list.indexOf(pc)] = list[list.length - 1];
                    list.pop();
                    pc.active = false;
                }
            }
            else {
                pc.active = active;
            }
        },
        enumerable: true
    });
};
var WebGLPhysicsPoint2PointConstraint = (function () {
    function WebGLPhysicsPoint2PointConstraint() {
    }
    WebGLPhysicsPoint2PointConstraint.create = function (params) {
        var c = new WebGLPhysicsPoint2PointConstraint();
        var pc = new WebGLPhysicsPrivatePoint2PointConstraint();
        c._private = pc;
        initConstraintProperties(c, params);
        var data = pc.data;
        data[0] = params.pivotA[0];
        data[1] = params.pivotA[1];
        data[2] = params.pivotA[2];
        Object.defineProperty(c, "pivotA", {
            get: function point2pointGetPivotA() {
                var data = this._private.data;
                return VMath.v3Build(data[0], data[1], data[2]);
            },
            set: function point2pointSetPivotA(pivotA) {
                var data = this._private.data;
                data[0] = pivotA[0];
                data[1] = pivotA[1];
                data[2] = pivotA[2];
            },
            enumerable: true
        });
        if (params.pivotB) {
            data[3] = params.pivotB[0];
            data[4] = params.pivotB[1];
            data[5] = params.pivotB[2];
        }
        else {
            var pivotB = VMath.m43TransformPoint(pc.bodyA.transform, params.pivotA);
            data[3] = pivotB[0];
            data[4] = pivotB[1];
            data[5] = pivotB[2];
        }
        Object.defineProperty(c, "pivotB", {
            get: function point2pointGetPivotB() {
                var data = this._private.data;
                return VMath.v3Build(data[3], data[4], data[5]);
            },
            set: function point2pointSetPivotB(pivotB) {
                var data = this._private.data;
                data[3] = pivotB[0];
                data[4] = pivotB[1];
                data[5] = pivotB[2];
            },
            enumerable: true
        });
        data[30] = (params.force !== undefined) ? params.force : 0.3;
        Object.defineProperty(c, "force", {
            get: function point2pointGetForce() {
                return this._private.data[30];
            },
            set: function point2pointSetForce(force) {
                this._private.data[30] = force;
            },
            enumerable: true
        });
        data[31] = (params.damping !== undefined) ? params.damping : 1.0;
        Object.defineProperty(c, "damping", {
            get: function point2pointGetForce() {
                return this._private.data[31];
            },
            set: function point2pointSetForce(damping) {
                this._private.data[31] = damping;
            },
            enumerable: true
        });
        data[32] = (params.impulseClamp !== undefined) ? params.impulseClamp : 0.0;
        Object.defineProperty(c, "impulseClamp", {
            get: function point2pointGetForce() {
                return this._private.data[32];
            },
            set: function point2pointSetForce(impulseClamp) {
                this._private.data[32] = impulseClamp;
            },
            enumerable: true
        });
        return c;
    };
    WebGLPhysicsPoint2PointConstraint.version = 1;
    return WebGLPhysicsPoint2PointConstraint;
})();
WebGLPhysicsPoint2PointConstraint.prototype.type = "POINT2POINT";
var WebGLPhysicsPrivatePoint2PointConstraint = (function () {
    function WebGLPhysicsPrivatePoint2PointConstraint() {
        this.bodyA = null;
        this.bodyB = null;
        this.data = new Float32Array(46);
        return this;
    }
    WebGLPhysicsPrivatePoint2PointConstraint.prototype.preStep = function (timeStepRatio, timeStep) {
        var bodyA = this.bodyA;
        var bodyB = this.bodyB;
        var data = this.data;
        var a0 = data[0];
        var a1 = data[1];
        var a2 = data[2];
        var b0 = data[3];
        var b1 = data[4];
        var b2 = data[5];
        var A = bodyA.transform;
        var ra0 = data[6] = (A[0] * a0) + (A[3] * a1) + (A[6] * a2);
        var ra1 = data[7] = (A[1] * a0) + (A[4] * a1) + (A[7] * a2);
        var ra2 = data[8] = (A[2] * a0) + (A[5] * a1) + (A[8] * a2);
        var rb0, rb1, rb2, B;
        if (bodyB) {
            B = bodyB.transform;
            rb0 = data[9] = (B[0] * b0) + (B[3] * b1) + (B[6] * b2);
            rb1 = data[10] = (B[1] * b0) + (B[4] * b1) + (B[7] * b2);
            rb2 = data[11] = (B[2] * b0) + (B[5] * b1) + (B[8] * b2);
        }
        var I = bodyA.inverseInertia;
        data[12] = (-ra2 * I[3]) + (ra1 * I[6]);
        data[13] = (-ra2 * I[4]) + (ra1 * I[7]);
        data[14] = (-ra2 * I[5]) + (ra1 * I[8]);
        data[15] = (ra2 * I[0]) + (-ra0 * I[6]);
        data[16] = (ra2 * I[1]) + (-ra0 * I[7]);
        data[17] = (ra2 * I[2]) + (-ra0 * I[8]);
        data[18] = (-ra1 * I[0]) + (ra0 * I[3]);
        data[19] = (-ra1 * I[1]) + (ra0 * I[4]);
        data[20] = (-ra1 * I[2]) + (ra0 * I[5]);
        var mass_sum = bodyA.inverseMass + (bodyB ? bodyB.inverseMass : 0);
        var K0 = mass_sum + (data[13] * -ra2) + (data[14] * ra1);
        var K3 = mass_sum + (data[15] * ra2) + (data[17] * -ra0);
        var K5 = mass_sum + (data[18] * -ra1) + (data[19] * ra0);
        var K1 = (data[12] * ra2) + (data[14] * -ra0);
        var K2 = (data[12] * -ra1) + (data[13] * ra0);
        var K4 = (data[15] * -ra1) + (data[16] * ra0);
        if (bodyB) {
            I = bodyB.inverseInertia;
            data[21] = (-rb2 * I[3]) + (rb1 * I[6]);
            data[22] = (-rb2 * I[4]) + (rb1 * I[7]);
            data[23] = (-rb2 * I[5]) + (rb1 * I[8]);
            data[24] = (rb2 * I[0]) + (-rb0 * I[6]);
            data[25] = (rb2 * I[1]) + (-rb0 * I[7]);
            data[26] = (rb2 * I[2]) + (-rb0 * I[8]);
            data[27] = (-rb1 * I[0]) + (rb0 * I[3]);
            data[28] = (-rb1 * I[1]) + (rb0 * I[4]);
            data[29] = (-rb1 * I[2]) + (rb0 * I[5]);
            K0 += (data[22] * -rb2) + (data[23] * rb1);
            K3 += (data[24] * rb2) + (data[26] * -rb0);
            K5 += (data[27] * -rb1) + (data[28] * rb0);
            K1 += (data[21] * rb2) + (data[23] * -rb0);
            K2 += (data[21] * -rb1) + (data[22] * rb0);
            K4 += (data[24] * -rb1) + (data[25] * rb0);
        }
        var force = data[30];
        var omega = (2 / timeStep * force * data[31]) / (1 - force);
        var gk = force / (omega * omega);
        var ig = 1 / (1 + gk);
        data[33] = 1 - (gk * ig);
        var i0 = ((K3 * K5) - (K4 * K4));
        var i1 = ((K2 * K4) - (K1 * K5));
        var i2 = ((K1 * K4) - (K2 * K3));
        var idet = ig / ((K0 * i0) + (K1 * i1) + (K2 * i2));
        data[34] = (idet * i0);
        data[35] = (idet * i1);
        data[36] = (idet * i2);
        data[37] = (idet * ((K0 * K5) - (K2 * K2)));
        data[38] = (idet * ((K1 * K2) - (K0 * K4)));
        data[39] = (idet * ((K0 * K3) - (K1 * K1)));
        var C0 = ra0 + A[9];
        var C1 = ra1 + A[10];
        var C2 = ra2 + A[11];
        if (bodyB) {
            C0 -= rb0 + B[9];
            C1 -= rb1 + B[10];
            C2 -= rb2 + B[11];
        }
        else {
            C0 -= b0;
            C1 -= b1;
            C2 -= b2;
        }
        var scale = -force / timeStep;
        data[43] = (C0 * scale);
        data[44] = (C1 * scale);
        data[45] = (C2 * scale);
        data[40] *= timeStepRatio;
        data[41] *= timeStepRatio;
        data[42] *= timeStepRatio;
    };
    WebGLPhysicsPrivatePoint2PointConstraint.prototype.applyCachedImpulses = function () {
        var data = this.data;
        var j0 = data[40];
        var j1 = data[41];
        var j2 = data[42];
        var bodyA = this.bodyA;
        var vel = bodyA.velocity;
        var imass = bodyA.inverseMass;
        vel[0] += (j0 * imass);
        vel[1] += (j1 * imass);
        vel[2] += (j2 * imass);
        vel[3] -= ((data[12] * j0) + (data[15] * j1) + (data[18] * j2));
        vel[4] -= ((data[13] * j0) + (data[16] * j1) + (data[19] * j2));
        vel[5] -= ((data[14] * j0) + (data[17] * j1) + (data[20] * j2));
        var bodyB = this.bodyB;
        if (bodyB) {
            vel = bodyB.velocity;
            imass = bodyB.inverseMass;
            vel[0] -= (j0 * imass);
            vel[1] -= (j1 * imass);
            vel[2] -= (j2 * imass);
            vel[3] += ((data[21] * j0) + (data[24] * j1) + (data[27] * j2));
            vel[4] += ((data[22] * j0) + (data[25] * j1) + (data[28] * j2));
            vel[5] += ((data[23] * j0) + (data[26] * j1) + (data[29] * j2));
        }
    };
    WebGLPhysicsPrivatePoint2PointConstraint.prototype.computeAndApplyImpulses = function () {
        var bodyA = this.bodyA;
        var bodyB = this.bodyB;
        var data = this.data;
        var jAcc0 = data[40];
        var jAcc1 = data[41];
        var jAcc2 = data[42];
        var vel1 = bodyA.velocity;
        var l0 = data[43] - (vel1[0] + (vel1[4] * data[8]) - (vel1[5] * data[7]));
        var l1 = data[44] - (vel1[1] + (vel1[5] * data[6]) - (vel1[3] * data[8]));
        var l2 = data[45] - (vel1[2] + (vel1[3] * data[7]) - (vel1[4] * data[6]));
        var vel2;
        if (bodyB) {
            vel2 = bodyB.velocity;
            l0 += (vel2[0] + (vel2[4] * data[11]) - (vel2[5] * data[10]));
            l1 += (vel2[1] + (vel2[5] * data[9]) - (vel2[3] * data[11]));
            l2 += (vel2[2] + (vel2[3] * data[10]) - (vel2[4] * data[9]));
        }
        var gamma = data[33];
        jAcc0 = (jAcc0 * gamma) + (data[34] * l0) + (data[35] * l1) + (data[36] * l2);
        jAcc1 = (jAcc1 * gamma) + (data[35] * l0) + (data[37] * l1) + (data[38] * l2);
        jAcc2 = (jAcc2 * gamma) + (data[36] * l0) + (data[38] * l1) + (data[39] * l2);
        var clamp = data[32];
        if (clamp !== 0) {
            var jlsq = (jAcc0 * jAcc0) + (jAcc1 * jAcc1) + (jAcc2 * jAcc2);
            if (jlsq > clamp * clamp) {
                jlsq = clamp / Math.sqrt(jlsq);
                jAcc0 *= jlsq;
                jAcc1 *= jlsq;
                jAcc2 *= jlsq;
            }
        }
        var j0 = jAcc0 - data[40];
        var j1 = jAcc1 - data[41];
        var j2 = jAcc2 - data[42];
        data[40] = jAcc0;
        data[41] = jAcc1;
        data[42] = jAcc2;
        var imass = bodyA.inverseMass;
        vel1[0] += (j0 * imass);
        vel1[1] += (j1 * imass);
        vel1[2] += (j2 * imass);
        vel1[3] -= ((data[12] * j0) + (data[15] * j1) + (data[18] * j2));
        vel1[4] -= ((data[13] * j0) + (data[16] * j1) + (data[19] * j2));
        vel1[5] -= ((data[14] * j0) + (data[17] * j1) + (data[20] * j2));
        if (bodyB) {
            imass = bodyB.inverseMass;
            vel2[0] -= (j0 * imass);
            vel2[1] -= (j1 * imass);
            vel2[2] -= (j2 * imass);
            vel2[3] += ((data[21] * j0) + (data[24] * j1) + (data[27] * j2));
            vel2[4] += ((data[22] * j0) + (data[25] * j1) + (data[28] * j2));
            vel2[5] += ((data[23] * j0) + (data[26] * j1) + (data[29] * j2));
        }
    };
    return WebGLPhysicsPrivatePoint2PointConstraint;
})();
var WebGLPhysicsCharacter = (function () {
    function WebGLPhysicsCharacter() {
    }
    WebGLPhysicsCharacter.prototype.jump = function () {
        var pc = this._private;
        var rigidBody = pc.rigidBody._private;
        var world = rigidBody.world;
        if (world) {
            rigidBody.velocity[1] = Math.sqrt(-2 * (this.maxJumpHeight - this.stepHeight) * world.gravity[1]);
            rigidBody.transform[10] += this.stepHeight;
            world.wakeBody(rigidBody);
        }
    };
    WebGLPhysicsCharacter.prototype.calculateExtents = function (extents) {
        this._private.rigidBody.calculateExtents(extents);
    };
    WebGLPhysicsCharacter.prototype.calculateTransform = function (transform, origin) {
        this._private.rigidBody.calculateTransform(transform, origin);
    };
    WebGLPhysicsCharacter.create = function (params) {
        var c = new WebGLPhysicsCharacter();
        var pc = new WebGLPhysicsPrivateCharacter();
        c._private = pc;
        c.userData = (params.userData !== undefined) ? params.userData : null;
        Object.defineProperty(c, "crouch", {
            get: function getCharacterCrouchFn() {
                return this._private.crouch;
            },
            set: function setCharacterCrouchFn(crouch) {
                var pc = this._private;
                if (!pc.dead && crouch !== pc.crouch) {
                    var rigidBody = pc.rigidBody._private;
                    var capsule = rigidBody.shape;
                    pc.crouch = crouch;
                    if (crouch) {
                        capsule.halfHeight = ((this.crouchHeight * 0.5) - this.radius);
                        rigidBody.transform[10] -= ((this.height - this.crouchHeight) * 0.5);
                    }
                    else {
                        capsule.halfHeight = ((this.height * 0.5) - this.radius);
                        rigidBody.transform[10] += ((this.height - this.crouchHeight) * 0.5);
                    }
                    if (rigidBody.world) {
                        rigidBody.world.wakeBody(rigidBody);
                    }
                }
            },
            enumerable: true
        });
        Object.defineProperty(c, "dead", {
            get: function getCharacterDeadFn() {
                return this._private.dead;
            },
            set: function setCharacterDead(dead) {
                var pc = this._private;
                if (pc.dead !== dead) {
                    var rigidBody = pc.rigidBody._private;
                    var capsule = rigidBody.shape;
                    pc.dead = dead;
                    if (dead) {
                        capsule.halfHeight = 0;
                        rigidBody.transform[10] -= ((this.height - this.radius) * 0.5);
                    }
                    else {
                        capsule.halfHeight = ((this.height * 0.5) - this.radius);
                        rigidBody.transform[10] += ((this.height - this.radius) * 0.5);
                    }
                    if (rigidBody.world) {
                        rigidBody.world.wakeBody(rigidBody);
                    }
                }
            },
            enumerable: true
        });
        Object.defineProperty(c, "height", {
            value: params.height,
            enumerable: true
        });
        Object.defineProperty(c, "radius", {
            value: params.radius,
            enumerable: true
        });
        Object.defineProperty(c, "stepHeight", {
            value: (params.stepHeight !== undefined) ? params.stepHeight : 0.35,
            enumerable: true
        });
        c.maxJumpHeight = (params.maxJumpHeight !== undefined) ? params.maxJumpHeight : 1;
        Object.defineProperty(c, "crouchHeight", {
            value: (params.crouchHeight !== undefined) ? params.crouchHeight : (0.5 * params.height),
            enumerable: true
        });
        Object.defineProperty(c, "onGround", {
            get: function getCharacterOnGround() {
                var pc = this._private;
                var rigidBody = pc.rigidBody._private;
                if (rigidBody.world) {
                    var pos = rigidBody.transform;
                    var start = pc.start;
                    var end = pc.end;
                    start[9] = pos[9];
                    start[10] = pos[10];
                    start[11] = pos[11];
                    end[9] = pos[9];
                    end[10] = (pos[10] - (this.stepHeight * 0.5));
                    end[11] = pos[11];
                    var result = rigidBody.world.convexSweepTest({
                        shape: rigidBody.shape._public,
                        from: start,
                        to: end,
                        group: WebGLPhysicsDevice.prototype.FILTER_CHARACTER
                    }, pc.onGroundConvexCallback);
                    return (result !== null);
                }
                else {
                    return false;
                }
            },
            enumerable: true
        });
        Object.defineProperty(c, "position", {
            get: function getCharacterPosition() {
                var rigidBody = this._private.rigidBody;
                return VMath.m43Pos(rigidBody._private.transform);
            },
            set: function setCharacterPosition(position) {
                var rigidBody = this._private.rigidBody;
                var transform = rigidBody._private.transform;
                transform[9] = position[0];
                transform[10] = position[1];
                transform[11] = position[2];
                rigidBody.transform = rigidBody._private.transform;
                rigidBody.active = true;
            },
            enumerable: true
        });
        Object.defineProperty(c, "velocity", {
            get: function getCharacterVelocity() {
                var rigidBody = this._private.rigidBody;
                return rigidBody.linearVelocity;
            },
            set: function setCharacterVelocity(velocity) {
                var rigidBody = this._private.rigidBody;
                rigidBody.linearVelocity = velocity;
                rigidBody.active = true;
            },
            enumerable: true
        });
        var group = (params.group !== undefined) ? params.group : WebGLPhysicsDevice.prototype.FILTER_CHARACTER;
        Object.defineProperty(c, "group", {
            value: group,
            enumerable: true
        });
        var mask = (params.mask !== undefined) ? params.mask : WebGLPhysicsDevice.prototype.FILTER_ALL;
        Object.defineProperty(c, "mask", {
            value: mask,
            enumerable: true
        });
        var capsule = WebGLPhysicsCapsuleShape.create({
            radius: c.radius,
            height: (2 * ((c.height * 0.5) - c.radius)),
            margin: 0
        });
        var rigidBody = WebGLPhysicsRigidBody.create({
            shape: capsule,
            mass: params.mass,
            transform: params.transform,
            linearVelocity: params.velocity,
            group: group,
            mask: mask,
            friction: params.friction,
            restitution: params.restitution,
            linearDamping: params.linearDamping,
            angularDamping: params.angularDamping,
            fixedRotation: true
        });
        pc.rigidBody = rigidBody;
        rigidBody._private._public = c;
        return c;
    };
    WebGLPhysicsCharacter.version = 1;
    return WebGLPhysicsCharacter;
})();
var WebGLPhysicsPrivateCharacter = (function () {
    function WebGLPhysicsPrivateCharacter() {
        // Initialise all properties this object will ever hold.
        this.crouch = false;
        this.dead = false;
        this.start = VMath.m43BuildIdentity();
        this.end = VMath.m43BuildIdentity();
        this.rigidBody = null;
        return this;
    }
    WebGLPhysicsPrivateCharacter.prototype.onGroundConvexCallback = function (hitResult) {
        return hitResult.hitNormal[1] >= 0.26;
    };
    WebGLPhysicsPrivateCharacter.version = 1;
    return WebGLPhysicsPrivateCharacter;
})();
var WebGLGJKContactSolver = (function () {
    function WebGLGJKContactSolver() {
    }
    WebGLGJKContactSolver.prototype.removeVertex = function (index) {
        this.numVertices -= 1;
        var simplex = this.simplex;
        var replace = (index * 9);
        var withv = (this.numVertices * 9);
        simplex[replace] = simplex[withv];
        simplex[replace + 1] = simplex[withv + 1];
        simplex[replace + 2] = simplex[withv + 2];
        simplex[replace + 3] = simplex[withv + 3];
        simplex[replace + 4] = simplex[withv + 4];
        simplex[replace + 5] = simplex[withv + 5];
        simplex[replace + 6] = simplex[withv + 6];
        simplex[replace + 7] = simplex[withv + 7];
        simplex[replace + 8] = simplex[withv + 8];
    };
    WebGLGJKContactSolver.prototype.reduceVertices = function (coords) {
        if (this.numVertices >= 4 && coords[3] === 0) {
            this.numVertices -= 1;
        }
        var simplex = this.simplex;
        var withv;
        if (this.numVertices >= 3 && coords[2] === 0) {
            this.numVertices -= 1;
            withv = (this.numVertices * 9);
            simplex[18] = simplex[withv];
            simplex[19] = simplex[withv + 1];
            simplex[20] = simplex[withv + 2];
            simplex[21] = simplex[withv + 3];
            simplex[22] = simplex[withv + 4];
            simplex[23] = simplex[withv + 5];
            simplex[24] = simplex[withv + 6];
            simplex[25] = simplex[withv + 7];
            simplex[26] = simplex[withv + 8];
        }
        if (this.numVertices >= 2 && coords[1] === 0) {
            this.numVertices -= 1;
            withv = (this.numVertices * 9);
            simplex[9] = simplex[withv];
            simplex[10] = simplex[withv + 1];
            simplex[11] = simplex[withv + 2];
            simplex[12] = simplex[withv + 3];
            simplex[13] = simplex[withv + 4];
            simplex[14] = simplex[withv + 5];
            simplex[15] = simplex[withv + 6];
            simplex[16] = simplex[withv + 7];
            simplex[17] = simplex[withv + 8];
        }
        if (this.numVertices >= 1 && coords[0] === 0) {
            this.numVertices -= 1;
            withv = (this.numVertices * 9);
            simplex[0] = simplex[withv];
            simplex[1] = simplex[withv + 1];
            simplex[2] = simplex[withv + 2];
            simplex[3] = simplex[withv + 3];
            simplex[4] = simplex[withv + 4];
            simplex[5] = simplex[withv + 5];
            simplex[6] = simplex[withv + 6];
            simplex[7] = simplex[withv + 7];
            simplex[8] = simplex[withv + 8];
        }
    };
    WebGLGJKContactSolver.prototype.updateClosestPoints = function () {
        var numVertices = this.numVertices;
        if (numVertices === 0) {
            return false;
        }
        var simplex = this.simplex;
        var closest = this.closest;
        var i;
        if (numVertices === 1) {
            closest[0] = simplex[3];
            closest[1] = simplex[4];
            closest[2] = simplex[5];
            closest[3] = simplex[6];
            closest[4] = simplex[7];
            closest[5] = simplex[8];
            return true;
        }
        var a0 = simplex[0];
        var a1 = simplex[1];
        var a2 = simplex[2];
        var b0 = simplex[9];
        var b1 = simplex[10];
        var b2 = simplex[11];
        if (numVertices === 2) {
            var w0 = (a0 - b0);
            var w1 = (a1 - b1);
            var w2 = (a2 - b2);
            var dot = ((a0 * w0) + (a1 * w1) + (a2 * w2));
            if (dot > 0) {
                var wlsq = ((w0 * w0) + (w1 * w1) + (w2 * w2));
                if (dot < wlsq) {
                    dot /= wlsq;
                    var dot1 = (1.0 - dot);
                    closest[0] = ((simplex[3] * dot1) + (simplex[12] * dot));
                    closest[1] = ((simplex[4] * dot1) + (simplex[13] * dot));
                    closest[2] = ((simplex[5] * dot1) + (simplex[14] * dot));
                    closest[3] = ((simplex[6] * dot1) + (simplex[15] * dot));
                    closest[4] = ((simplex[7] * dot1) + (simplex[16] * dot));
                    closest[5] = ((simplex[8] * dot1) + (simplex[17] * dot));
                    return true;
                }
                else {
                    this.removeVertex(0);
                }
            }
            else {
                this.removeVertex(1);
            }
            for (i = 0; i < 6; i += 1) {
                closest[i] = simplex[i + 3];
            }
            return true;
        }
        var coords = this.cachedCoords;
        var alpha, beta, gamma;
        if (numVertices === 3) {
            this.closestPointTriangle(0, 9, 18, coords);
            this.reduceVertices(coords);
            alpha = coords[0];
            beta = coords[1];
            gamma = coords[2];
            closest[0] = ((alpha * simplex[3]) + (beta * simplex[12]) + (gamma * simplex[21]));
            closest[1] = ((alpha * simplex[4]) + (beta * simplex[13]) + (gamma * simplex[22]));
            closest[2] = ((alpha * simplex[5]) + (beta * simplex[14]) + (gamma * simplex[23]));
            closest[3] = ((alpha * simplex[6]) + (beta * simplex[15]) + (gamma * simplex[24]));
            closest[4] = ((alpha * simplex[7]) + (beta * simplex[16]) + (gamma * simplex[25]));
            closest[5] = ((alpha * simplex[8]) + (beta * simplex[17]) + (gamma * simplex[26]));
            return true;
        }
        if (numVertices === 4) {
            var outside = this.closestPointTetrahedron(coords);
            if (outside) {
                this.reduceVertices(coords);
                alpha = coords[0];
                beta = coords[1];
                gamma = coords[2];
                var delta = coords[3];
                closest[0] = ((alpha * simplex[3]) + (beta * simplex[12]) + (gamma * simplex[21]) + (delta * simplex[30]));
                closest[1] = ((alpha * simplex[4]) + (beta * simplex[13]) + (gamma * simplex[22]) + (delta * simplex[31]));
                closest[2] = ((alpha * simplex[5]) + (beta * simplex[14]) + (gamma * simplex[23]) + (delta * simplex[32]));
                closest[3] = ((alpha * simplex[6]) + (beta * simplex[15]) + (gamma * simplex[24]) + (delta * simplex[33]));
                closest[4] = ((alpha * simplex[7]) + (beta * simplex[16]) + (gamma * simplex[25]) + (delta * simplex[34]));
                closest[5] = ((alpha * simplex[8]) + (beta * simplex[17]) + (gamma * simplex[26]) + (delta * simplex[35]));
                return true;
            }
            else {
                return false;
            }
        }
        return false;
    };
    WebGLGJKContactSolver.prototype.closestPointTetrahedron = function (coords) {
        var simplex = this.simplex;
        var a0 = simplex[0];
        var a1 = simplex[1];
        var a2 = simplex[2];
        var b0 = simplex[9];
        var b1 = simplex[10];
        var b2 = simplex[11];
        var c0 = simplex[18];
        var c1 = simplex[19];
        var c2 = simplex[20];
        var d0 = simplex[27];
        var d1 = simplex[28];
        var d2 = simplex[29];
        var ab0 = (b0 - a0);
        var ab1 = (b1 - a1);
        var ab2 = (b2 - a2);
        var ac0 = (c0 - a0);
        var ac1 = (c1 - a1);
        var ac2 = (c2 - a2);
        var ad0 = (d0 - a0);
        var ad1 = (d1 - a1);
        var ad2 = (d2 - a2);
        var bc0 = (c0 - b0);
        var bc1 = (c1 - b1);
        var bc2 = (c2 - b2);
        var bd0 = (d0 - b0);
        var bd1 = (d1 - b1);
        var bd2 = (d2 - b2);
        var n0, n1, n2, signD, signOrigin;
        n0 = ((ab1 * ac2) - (ab2 * ac1));
        n1 = ((ab2 * ac0) - (ab0 * ac2));
        n2 = ((ab0 * ac1) - (ab1 * ac0));
        signD = ((ad0 * n0) + (ad1 * n1) + (ad2 * n2));
        signOrigin = -((a0 * n0) + (a1 * n1) + (a2 * n2));
        var sideABC = ((signOrigin * signD) <= 0);
        n0 = ((ac1 * ad2) - (ac2 * ad1));
        n1 = ((ac2 * ad0) - (ac0 * ad2));
        n2 = ((ac0 * ad1) - (ac1 * ad0));
        signD = ((ab0 * n0) + (ab1 * n1) + (ab2 * n2));
        signOrigin = -((a0 * n0) + (a1 * n1) + (a2 * n2));
        var sideACD = ((signOrigin * signD) <= 0);
        n0 = ((ad1 * ab2) - (ad2 * ab1));
        n1 = ((ad2 * ab0) - (ad0 * ab2));
        n2 = ((ad0 * ab1) - (ad1 * ab0));
        signD = ((ac0 * n0) + (ac1 * n1) + (ac2 * n2));
        signOrigin = -((a0 * n0) + (a1 * n1) + (a2 * n2));
        var sideADB = ((signOrigin * signD) <= 0);
        n0 = ((bd1 * bc2) - (bd2 * bc1));
        n1 = ((bd2 * bc0) - (bd0 * bc2));
        n2 = ((bd0 * bc1) - (bd1 * bc0));
        signD = ((ab0 * n0) + (ab1 * n1) + (ab2 * n2));
        signOrigin = ((b0 * n0) + (b1 * n1) + (b2 * n2));
        var sideBDC = ((signOrigin * signD) <= 0);
        coords[0] = coords[1] = coords[2] = coords[3] = 0.0;
        if (!sideABC && !sideACD && !sideADB && !sideBDC) {
            return false;
        }
        var tempCoords = this.tempCoords;
        var minSqDist = Number.MAX_VALUE;
        var sqDist;
        if (sideABC) {
            sqDist = this.closestPointTriangle(0, 9, 18, tempCoords, true);
            if (sqDist < minSqDist) {
                minSqDist = sqDist;
                coords[0] = tempCoords[0];
                coords[1] = tempCoords[1];
                coords[2] = tempCoords[2];
                coords[3] = 0.0;
            }
        }
        if (sideACD) {
            sqDist = this.closestPointTriangle(0, 18, 27, tempCoords, true);
            if (sqDist < minSqDist) {
                minSqDist = sqDist;
                coords[0] = tempCoords[0];
                coords[1] = 0.0;
                coords[2] = tempCoords[1];
                coords[3] = tempCoords[2];
            }
        }
        if (sideADB) {
            sqDist = this.closestPointTriangle(0, 27, 9, tempCoords, true);
            if (sqDist < minSqDist) {
                minSqDist = sqDist;
                coords[0] = tempCoords[0];
                coords[1] = tempCoords[2];
                coords[2] = 0.0;
                coords[3] = tempCoords[1];
            }
        }
        if (sideBDC) {
            sqDist = this.closestPointTriangle(9, 27, 18, tempCoords, true);
            if (sqDist < minSqDist) {
                minSqDist = sqDist;
                coords[0] = 0.0;
                coords[1] = tempCoords[0];
                coords[2] = tempCoords[2];
                coords[3] = tempCoords[1];
            }
        }
        return true;
    };
    WebGLGJKContactSolver.prototype.closestPointTriangle = function (a, b, c, coords, computeDistance) {
        var simplex = this.simplex;
        var a0 = simplex[a];
        var a1 = simplex[a + 1];
        var a2 = simplex[a + 2];
        var b0 = simplex[b];
        var b1 = simplex[b + 1];
        var b2 = simplex[b + 2];
        var c0 = simplex[c];
        var c1 = simplex[c + 1];
        var c2 = simplex[c + 2];
        var ba0 = (a0 - b0);
        var ba1 = (a1 - b1);
        var ba2 = (a2 - b2);
        var ca0 = (a0 - c0);
        var ca1 = (a1 - c1);
        var ca2 = (a2 - c2);
        var dot1 = ((a0 * ba0) + (a1 * ba1) + (a2 * ba2));
        var dot2 = ((a0 * ca0) + (a1 * ca1) + (a2 * ca2));
        if (dot1 <= 0.0 && dot2 <= 0) {
            coords[0] = 1;
            coords[1] = coords[2] = 0;
            if (computeDistance) {
                return ((a0 * a0) + (a1 * a1) + (a2 * a2));
            }
            else {
                return undefined;
            }
        }
        var dot3 = ((b0 * ba0) + (b1 * ba1) + (b2 * ba2));
        var dot4 = ((b0 * ca0) + (b1 * ca1) + (b2 * ca2));
        if (dot3 >= 0.0 && dot4 <= dot3) {
            coords[1] = 1;
            coords[0] = coords[2] = 0;
            if (computeDistance) {
                return ((b0 * b0) + (b1 * b1) + (b2 * b2));
            }
            else {
                return undefined;
            }
        }
        var v;
        var d0, d1, d2;
        var vc = ((dot1 * dot4) - (dot3 * dot2));
        if (vc <= 0.0 && dot1 >= 0.0 && dot3 <= 0.0) {
            v = (dot1 / (dot1 - dot3));
            coords[0] = (1 - v);
            coords[1] = v;
            coords[2] = 0;
            if (computeDistance) {
                d0 = (a0 - (v * ba0));
                d1 = (a1 - (v * ba1));
                d2 = (a2 - (v * ba2));
                return ((d0 * d0) + (d1 * d1) + (d2 * d2));
            }
            else {
                return undefined;
            }
        }
        var dot5 = ((c0 * ba0) + (c1 * ba1) + (c2 * ba2));
        var dot6 = ((c0 * ca0) + (c1 * ca1) + (c2 * ca2));
        if (dot6 >= 0.0 && dot5 <= dot6) {
            coords[0] = coords[1] = 0;
            coords[2] = 1;
            if (computeDistance) {
                return ((c0 * c0) + (c1 * c1) + (c2 * c2));
            }
            else {
                return undefined;
            }
        }
        var vb = ((dot5 * dot2) - (dot1 * dot6));
        if (vb <= 0.0 && dot2 >= 0.0 && dot6 <= 0.0) {
            v = (dot2 / (dot2 - dot6));
            coords[0] = (1 - v);
            coords[1] = 0;
            coords[2] = v;
            if (computeDistance) {
                d0 = (a0 - (v * ca0));
                d1 = (a1 - (v * ca1));
                d2 = (a2 - (v * ca2));
                return ((d0 * d0) + (d1 * d1) + (d2 * d2));
            }
            else {
                return undefined;
            }
        }
        var va = ((dot3 * dot6) - (dot5 * dot4));
        if (va <= 0.0 && (dot4 - dot3) >= 0.0 && (dot5 - dot6) >= 0.0) {
            v = ((dot4 - dot3) / ((dot4 - dot3) + (dot5 - dot6)));
            coords[0] = 0;
            coords[1] = (1 - v);
            coords[2] = v;
            if (computeDistance) {
                d0 = ((b0 * (1 - v)) + (c0 * v));
                d1 = ((b1 * (1 - v)) + (c1 * v));
                d2 = ((b2 * (1 - v)) + (c2 * v));
                return ((d0 * d0) + (d1 * d1) + (d2 * d2));
            }
            else {
                return undefined;
            }
        }
        var denom = (1 / (va + vb + vc));
        v = (vb * denom);
        var w = (vc * denom);
        coords[0] = (1 - v - w);
        coords[1] = v;
        coords[2] = w;
        if (computeDistance) {
            d0 = (a0 - (ba0 * v) - (ca0 * w));
            d1 = (a1 - (ba1 * v) - (ca1 * w));
            d2 = (a2 - (ba2 * v) - (ca2 * w));
            return ((d0 * d0) + (d1 * d1) + (d2 * d2));
        }
        else {
            return undefined;
        }
    };
    WebGLGJKContactSolver.prototype.evaluate = function (cache, xformA, xformB) {
        var axis = cache.axis;
        var shapeA = cache.shapeA;
        var shapeB = cache.shapeB;
        this.numVertices = 0;
        var lastW0, lastW1, lastW2;
        lastW0 = lastW1 = lastW2 = Number.MAX_VALUE;
        var curIter = 0;
        var maxIter = 100;
        var seperated = false;
        var squaredDistance = Number.MAX_VALUE;
        var A0 = xformA[0];
        var A1 = xformA[1];
        var A2 = xformA[2];
        var A3 = xformA[3];
        var A4 = xformA[4];
        var A5 = xformA[5];
        var A6 = xformA[6];
        var A7 = xformA[7];
        var A8 = xformA[8];
        var A9 = xformA[9];
        var A10 = xformA[10];
        var A11 = xformA[11];
        var B0 = xformB[0];
        var B1 = xformB[1];
        var B2 = xformB[2];
        var B3 = xformB[3];
        var B4 = xformB[4];
        var B5 = xformB[5];
        var B6 = xformB[6];
        var B7 = xformB[7];
        var B8 = xformB[8];
        var B9 = xformB[9];
        var B10 = xformB[10];
        var B11 = xformB[11];
        var axis0 = axis[0];
        var axis1 = axis[1];
        var axis2 = axis[2];
        var axislsq;
        var supportA = cache.closestA;
        var supportB = cache.closestB;
        var closest = this.closest;
        var simplex = this.simplex;
        var equalVertexThreshold = 1e-4;
        for (;;) {
            curIter += 1;
            supportA[0] = -((A0 * axis0) + (A1 * axis1) + (A2 * axis2));
            supportA[1] = -((A3 * axis0) + (A4 * axis1) + (A5 * axis2));
            supportA[2] = -((A6 * axis0) + (A7 * axis1) + (A8 * axis2));
            supportB[0] = ((B0 * axis0) + (B1 * axis1) + (B2 * axis2));
            supportB[1] = ((B3 * axis0) + (B4 * axis1) + (B5 * axis2));
            supportB[2] = ((B6 * axis0) + (B7 * axis1) + (B8 * axis2));
            shapeA.localSupportWithoutMargin(supportA, supportA);
            shapeB.localSupportWithoutMargin(supportB, supportB);
            var d0 = supportA[0];
            var d1 = supportA[1];
            var d2 = supportA[2];
            var sa0 = supportA[0] = ((A0 * d0) + (A3 * d1) + (A6 * d2) + A9);
            var sa1 = supportA[1] = ((A1 * d0) + (A4 * d1) + (A7 * d2) + A10);
            var sa2 = supportA[2] = ((A2 * d0) + (A5 * d1) + (A8 * d2) + A11);
            d0 = supportB[0];
            d1 = supportB[1];
            d2 = supportB[2];
            var sb0 = supportB[0] = ((B0 * d0) + (B3 * d1) + (B6 * d2) + B9);
            var sb1 = supportB[1] = ((B1 * d0) + (B4 * d1) + (B7 * d2) + B10);
            var sb2 = supportB[2] = ((B2 * d0) + (B5 * d1) + (B8 * d2) + B11);
            var w0 = sa0 - sb0;
            var w1 = sa1 - sb1;
            var w2 = sa2 - sb2;
            var inSimplex = false;
            var index = this.numVertices * 9;
            var i;
            for (i = 0; i < index; i += 9) {
                d0 = (w0 - simplex[i]);
                d1 = (w1 - simplex[i + 1]);
                d2 = (w2 - simplex[i + 2]);
                if (((d0 * d0) + (d1 * d1) + (d2 * d2)) < equalVertexThreshold) {
                    inSimplex = true;
                }
            }
            if (!inSimplex) {
                d0 = (w0 - lastW0);
                d1 = (w1 - lastW1);
                d2 = (w2 - lastW2);
                inSimplex = ((d0 * d0) + (d1 * d1) + (d2 * d2)) < equalVertexThreshold;
            }
            if (inSimplex) {
                seperated = true;
                break;
            }
            var delta = (axis0 * w0) + (axis1 * w1) + (axis2 * w2);
            if ((squaredDistance - delta) <= (squaredDistance * WebGLPhysicsConfig.GJK_FRACTIONAL_THRESHOLD)) {
                seperated = true;
                break;
            }
            lastW0 = simplex[index] = w0;
            lastW1 = simplex[index + 1] = w1;
            lastW2 = simplex[index + 2] = w2;
            simplex[index + 3] = sa0;
            simplex[index + 4] = sa1;
            simplex[index + 5] = sa2;
            simplex[index + 6] = sb0;
            simplex[index + 7] = sb1;
            simplex[index + 8] = sb2;
            this.numVertices += 1;
            if (!this.updateClosestPoints()) {
                seperated = false;
                break;
            }
            d0 = (closest[0] - closest[3]);
            d1 = (closest[1] - closest[4]);
            d2 = (closest[2] - closest[5]);
            axislsq = ((d0 * d0) + (d1 * d1) + (d2 * d2));
            if (axislsq <= WebGLPhysicsConfig.GJK_EPA_DISTANCE_THRESHOLD) {
                seperated = true;
                break;
            }
            axis0 = d0;
            axis1 = d1;
            axis2 = d2;
            var previousSqDistance = squaredDistance;
            squaredDistance = axislsq;
            if ((previousSqDistance - squaredDistance) <= (WebGLPhysicsConfig.GJK_FRACTIONAL_THRESHOLD * previousSqDistance)) {
                seperated = true;
                break;
            }
            if (curIter >= maxIter) {
                seperated = true;
                break;
            }
            if (this.numVertices === 4) {
                break;
            }
        }
        axislsq = ((axis0 * axis0) + (axis1 * axis1) + (axis2 * axis2));
        if (axislsq < WebGLPhysicsConfig.DONT_NORMALIZE_THRESHOLD) {
            axis[0] = axis0;
            axis[1] = axis1;
            axis[2] = axis2;
            return undefined;
        }
        var scale = 1 / Math.sqrt(axislsq);
        axis[0] = axis0 * scale;
        axis[1] = axis1 * scale;
        axis[2] = axis2 * scale;
        if (seperated) {
            supportA[0] = closest[0];
            supportA[1] = closest[1];
            supportA[2] = closest[2];
            supportB[0] = closest[3];
            supportB[1] = closest[4];
            supportB[2] = closest[5];
            return Math.sqrt(squaredDistance);
        }
        else {
            return undefined;
        }
    };
    WebGLGJKContactSolver.create = function () {
        var solver = new WebGLGJKContactSolver();
        solver.simplex = new Float32Array(36);
        solver.numVertices = 0;
        solver.closest = new Float32Array(6);
        solver.cachedCoords = new Float32Array(4);
        solver.tempCoords = new Float32Array(4);
        return solver;
    };
    WebGLGJKContactSolver.version = 1;
    return WebGLGJKContactSolver;
})();
var WebGLContactEPA = (function () {
    function WebGLContactEPA() {
    }
    WebGLContactEPA.prototype.bind = function (faceA, edgeA, faceB, edgeB) {
        faceA.edge[edgeA] = edgeB;
        faceA.adjFace[edgeA] = faceB;
        faceB.edge[edgeB] = edgeA;
        faceB.adjFace[edgeB] = faceA;
    };
    WebGLContactEPA.prototype.append = function (list, face) {
        face.leaf0 = null;
        face.leaf1 = list.root;
        if (list.root) {
            list.root.leaf0 = face;
        }
        list.root = face;
        list.count += 1;
    };
    WebGLContactEPA.prototype.remove = function (list, face) {
        var leaf0 = face.leaf0;
        var leaf1 = face.leaf1;
        if (leaf1) {
            leaf1.leaf0 = leaf0;
        }
        if (leaf0) {
            leaf0.leaf1 = leaf1;
        }
        if (face === list.root) {
            list.root = leaf1;
        }
        list.count -= 1;
    };
    WebGLContactEPA.prototype.findBest = function () {
        var minFace = this.hull.root;
        var minDistance = minFace.distance * minFace.distance;
        var f;
        for (f = minFace.leaf1; f !== null; f = f.leaf1) {
            var sqDistance = f.distance * f.distance;
            if (sqDistance < minDistance) {
                minFace = f;
                minDistance = sqDistance;
            }
        }
        return minFace;
    };
    WebGLContactEPA.prototype.getEdgeDistance = function (face, a, b) {
        var vertices = this.vertex_store;
        var a0 = vertices[a];
        var a1 = vertices[a + 1];
        var a2 = vertices[a + 2];
        var b0 = vertices[b];
        var b1 = vertices[b + 1];
        var b2 = vertices[b + 2];
        var ba0 = (b0 - a0);
        var ba1 = (b1 - a1);
        var ba2 = (b2 - a2);
        var fn = face.normal;
        var fn0 = fn[0];
        var fn1 = fn[1];
        var fn2 = fn[2];
        var n0 = ((ba1 * fn2) - (ba2 * fn1));
        var n1 = ((ba2 * fn0) - (ba0 * fn2));
        var n2 = ((ba0 * fn1) - (ba1 * fn0));
        var dot = ((a0 * n0) + (a1 * n1) + (a2 * n2));
        if (dot <= 0) {
            var lengthSqBA = ((ba0 * ba0) + (ba1 * ba1) + (ba2 * ba2));
            var dotA = ((a0 * ba0) + (a1 * ba1) + (a2 * ba2));
            var dotB = ((b0 * ba0) + (b1 * ba2) + (b2 * ba2));
            if (dotA >= 0) {
                return Math.sqrt((a0 * a0) + (a1 * a1) + (a2 * a2));
            }
            else if (dotB <= 0) {
                return Math.sqrt((b0 * b0) + (b1 * b1) + (b2 * b2));
            }
            else {
                var dotAB = ((a0 * b0) + (a1 * b1) + (a2 * b2));
                var dSq = (((a0 * a0) + (a1 * a1) + (a2 * a2)) * ((b0 * b0) + (b1 * b1) + (b2 * b2))) -
                    (dotAB * dotAB);
                return dSq >= 0 ? Math.sqrt(dSq / lengthSqBA) : 0;
            }
        }
        else {
            return undefined;
        }
    };
    WebGLContactEPA.prototype.buildNewFace = function (a, b, c, forced) {
        var face = this.stock.root;
        if (face === null) {
            return null;
        }
        face.pass = 0;
        face.vertex[0] = a;
        face.vertex[1] = b;
        face.vertex[2] = c;
        var vertices = this.vertex_store;
        var a0 = vertices[a];
        var a1 = vertices[a + 1];
        var a2 = vertices[a + 2];
        var b0 = vertices[b];
        var b1 = vertices[b + 1];
        var b2 = vertices[b + 2];
        var c0 = vertices[c];
        var c1 = vertices[c + 1];
        var c2 = vertices[c + 2];
        var ba0 = (b0 - a0);
        var ba1 = (b1 - a1);
        var ba2 = (b2 - a2);
        var ca0 = (c0 - a0);
        var ca1 = (c1 - a1);
        var ca2 = (c2 - a2);
        var fn = face.normal;
        var fn0 = fn[0] = ((ba1 * ca2) - (ba2 * ca1));
        var fn1 = fn[1] = ((ba2 * ca0) - (ba0 * ca2));
        var fn2 = fn[2] = ((ba0 * ca1) - (ba1 * ca0));
        var length = ((fn0 * fn0) + (fn1 * fn1) + (fn2 * fn2));
        if (length > WebGLPhysicsConfig.DONT_NORMALIZE_THRESHOLD) {
            face.distance = this.getEdgeDistance(face, a, b);
            if (face.distance === undefined) {
                face.distance = this.getEdgeDistance(face, b, c);
            }
            if (face.distance === undefined) {
                face.distance = this.getEdgeDistance(face, c, a);
            }
            var scale = 1 / Math.sqrt(length);
            if (face.distance === undefined) {
                face.distance = ((a0 * fn0) + (a1 * fn1) + (a2 * fn2)) * scale;
            }
            if (forced || (face.distance >= -1e-6)) {
                fn[0] *= scale;
                fn[1] *= scale;
                fn[2] *= scale;
                this.remove(this.stock, face);
                this.append(this.hull, face);
                return face;
            }
        }
        return null;
    };
    WebGLContactEPA.prototype.expandFace = function (pass, w, face, edge, horizon) {
        if (face.pass !== pass) {
            var fn = face.normal;
            var fn0 = fn[0];
            var fn1 = fn[1];
            var fn2 = fn[2];
            var vertices = this.vertex_store;
            var w0 = vertices[w];
            var w1 = vertices[w + 1];
            var w2 = vertices[w + 2];
            var edge1 = (edge + 1) % 3;
            if ((((fn0 * w0) + (fn1 * w1) + (fn2 * w2)) - face.distance) < -1e-6) {
                var newFace = this.buildNewFace(face.vertex[edge1], face.vertex[edge], w, false);
                if (newFace) {
                    this.bind(newFace, 0, face, edge);
                    if (horizon.cf) {
                        this.bind(horizon.cf, 1, newFace, 2);
                    }
                    else {
                        horizon.ff = newFace;
                    }
                    horizon.cf = newFace;
                    horizon.numFaces += 1;
                    return true;
                }
            }
            else {
                var edge2 = (edge + 2) % 3;
                face.pass = pass;
                if (this.expandFace(pass, w, face.adjFace[edge1], face.edge[edge1], horizon) &&
                    this.expandFace(pass, w, face.adjFace[edge2], face.edge[edge2], horizon)) {
                    this.remove(this.hull, face);
                    this.append(this.stock, face);
                    return true;
                }
            }
        }
        return false;
    };
    WebGLContactEPA.prototype.evaluate = function (gjkSimplex, cache, xformA, xformB) {
        var shapeA = cache.shapeA;
        var shapeB = cache.shapeB;
        var hull = this.hull;
        var stock = this.stock;
        while (hull.root) {
            var face = hull.root;
            this.remove(hull, face);
            this.append(stock, face);
        }
        var d0 = gjkSimplex[27];
        var d1 = gjkSimplex[28];
        var d2 = gjkSimplex[29];
        var ind0, ind1;
        var a0 = gjkSimplex[0] - d0;
        var a1 = gjkSimplex[1] - d1;
        var a2 = gjkSimplex[2] - d2;
        var b0 = gjkSimplex[9] - d0;
        var b1 = gjkSimplex[10] - d1;
        var b2 = gjkSimplex[11] - d2;
        var c0 = gjkSimplex[18] - d0;
        var c1 = gjkSimplex[19] - d1;
        var c2 = gjkSimplex[20] - d2;
        if (((a0 * ((b1 * c2) - (b2 * c1))) +
            (a1 * ((b2 * c0) - (b0 * c2))) +
            (a2 * ((b0 * c1) - (b1 * c0)))) < 0) {
            ind0 = 9;
            ind1 = 0;
        }
        else {
            ind0 = 0;
            ind1 = 9;
        }
        var vertices = this.vertex_store;
        var i;
        for (i = 0; i < 9; i += 1) {
            vertices[i] = gjkSimplex[ind0 + i];
            vertices[9 + i] = gjkSimplex[ind1 + i];
            vertices[18 + i] = gjkSimplex[18 + i];
            vertices[27 + i] = gjkSimplex[27 + i];
        }
        var t0 = this.buildNewFace(0, 9, 18, true);
        var t1 = this.buildNewFace(9, 0, 27, true);
        var t2 = this.buildNewFace(18, 9, 27, true);
        var t3 = this.buildNewFace(0, 18, 27, true);
        var nextVertex = 36;
        if (hull.count !== 4) {
            VMath.v3Build(gjkSimplex[3], gjkSimplex[4], gjkSimplex[5], cache.closestA);
            VMath.v3Build(gjkSimplex[6], gjkSimplex[7], gjkSimplex[8], cache.closestB);
            return 0;
        }
        var best = this.findBest();
        var pass = 0;
        var iterations = 0;
        this.bind(t0, 0, t1, 0);
        this.bind(t0, 1, t2, 0);
        this.bind(t0, 2, t3, 0);
        this.bind(t1, 1, t3, 2);
        this.bind(t1, 2, t2, 1);
        this.bind(t2, 2, t3, 1);
        var A0 = xformA[0];
        var A1 = xformA[1];
        var A2 = xformA[2];
        var A3 = xformA[3];
        var A4 = xformA[4];
        var A5 = xformA[5];
        var A6 = xformA[6];
        var A7 = xformA[7];
        var A8 = xformA[8];
        var A9 = xformA[9];
        var A10 = xformA[10];
        var A11 = xformA[11];
        var B0 = xformB[0];
        var B1 = xformB[1];
        var B2 = xformB[2];
        var B3 = xformB[3];
        var B4 = xformB[4];
        var B5 = xformB[5];
        var B6 = xformB[6];
        var B7 = xformB[7];
        var B8 = xformB[8];
        var B9 = xformB[9];
        var B10 = xformB[10];
        var B11 = xformB[11];
        var supportA = cache.closestA;
        var supportB = cache.closestB;
        var horizon = this.horizon;
        var bn, n0, n1, n2;
        for (; iterations < 100; iterations += 1) {
            if (nextVertex >= this.MAX_VERTICES * 9) {
                break;
            }
            horizon.cf = horizon.ff = null;
            horizon.numFaces = 0;
            var w = nextVertex;
            nextVertex += 9;
            pass += 1;
            best.pass = pass;
            bn = best.normal;
            n0 = bn[0];
            n1 = bn[1];
            n2 = bn[2];
            supportA[0] = ((A0 * n0) + (A1 * n1) + (A2 * n2));
            supportA[1] = ((A3 * n0) + (A4 * n1) + (A5 * n2));
            supportA[2] = ((A6 * n0) + (A7 * n1) + (A8 * n2));
            supportB[0] = -((B0 * n0) + (B1 * n1) + (B2 * n2));
            supportB[1] = -((B3 * n0) + (B4 * n1) + (B5 * n2));
            supportB[2] = -((B6 * n0) + (B7 * n1) + (B8 * n2));
            shapeA.localSupportWithoutMargin(supportA, supportA);
            shapeB.localSupportWithoutMargin(supportB, supportB);
            d0 = supportA[0];
            d1 = supportA[1];
            d2 = supportA[2];
            a0 = ((A0 * d0) + (A3 * d1) + (A6 * d2) + A9);
            a1 = ((A1 * d0) + (A4 * d1) + (A7 * d2) + A10);
            a2 = ((A2 * d0) + (A5 * d1) + (A8 * d2) + A11);
            d0 = supportB[0];
            d1 = supportB[1];
            d2 = supportB[2];
            b0 = ((B0 * d0) + (B3 * d1) + (B6 * d2) + B9);
            b1 = ((B1 * d0) + (B4 * d1) + (B7 * d2) + B10);
            b2 = ((B2 * d0) + (B5 * d1) + (B8 * d2) + B11);
            var w0, w1, w2;
            vertices[w + 3] = a0;
            vertices[w + 4] = a1;
            vertices[w + 5] = a2;
            vertices[w + 6] = b0;
            vertices[w + 7] = b1;
            vertices[w + 8] = b2;
            vertices[w] = w0 = (a0 - b0);
            vertices[w + 1] = w1 = (a1 - b1);
            vertices[w + 2] = w2 = (a2 - b2);
            var wDist = ((n0 * w0) + (n1 * w1) + (n2 * w2)) - best.distance;
            if (wDist > WebGLPhysicsConfig.GJK_EPA_DISTANCE_THRESHOLD) {
                var j;
                var valid = true;
                for (j = 0; (j < 3 && valid); j += 1) {
                    valid = valid && this.expandFace(pass, w, best.adjFace[j], best.edge[j], horizon);
                }
                if (valid && (horizon.numFaces >= 3)) {
                    this.bind(horizon.cf, 1, horizon.ff, 2);
                    this.remove(hull, best);
                    this.append(stock, best);
                    best = this.findBest();
                }
                else {
                    break;
                }
            }
            else {
                break;
            }
        }
        bn = best.normal;
        n0 = bn[0];
        n1 = bn[1];
        n2 = bn[2];
        var bd = best.distance;
        var p0 = n0 * bd;
        var p1 = n1 * bd;
        var p2 = n2 * bd;
        c0 = best.vertex[0];
        c1 = best.vertex[1];
        c2 = best.vertex[2];
        var x0 = vertices[c0] - p0;
        var x1 = vertices[c0 + 1] - p1;
        var x2 = vertices[c0 + 2] - p2;
        var y0 = vertices[c1] - p0;
        var y1 = vertices[c1 + 1] - p1;
        var y2 = vertices[c1 + 2] - p2;
        var z0 = vertices[c2] - p0;
        var z1 = vertices[c2 + 1] - p1;
        var z2 = vertices[c2 + 2] - p2;
        d0 = ((y1 * z2) - (y2 * z1));
        d1 = ((y2 * z0) - (y0 * z2));
        d2 = ((y0 * z1) - (y1 * z0));
        var alpha = Math.sqrt((d0 * d0) + (d1 * d1) + (d2 * d2));
        d0 = ((z1 * x2) - (z2 * x1));
        d1 = ((z2 * x0) - (z0 * x2));
        d2 = ((z0 * x1) - (z1 * x0));
        var beta = Math.sqrt((d0 * d0) + (d1 * d1) + (d2 * d2));
        d0 = ((x1 * y2) - (x2 * y1));
        d1 = ((x2 * y0) - (x0 * y2));
        d2 = ((x0 * y1) - (x1 * y0));
        var gamma = Math.sqrt((d0 * d0) + (d1 * d1) + (d2 * d2));
        var scale = 1 / (alpha + beta + gamma);
        alpha *= scale;
        beta *= scale;
        gamma *= scale;
        supportA[0] = supportA[1] = supportA[2] = 0;
        supportB[0] = supportB[1] = supportB[2] = 0;
        for (i = 0; i < 3; i += 1) {
            supportA[i] += (alpha * vertices[c0 + 3 + i]) + (beta * vertices[c1 + 3 + i]) + (gamma * vertices[c2 + 3 + i]);
            supportB[i] += (alpha * vertices[c0 + 6 + i]) + (beta * vertices[c1 + 6 + i]) + (gamma * vertices[c2 + 6 + i]);
        }
        var axis = cache.axis;
        axis[0] = -n0;
        axis[1] = -n1;
        axis[2] = -n2;
        return (-best.distance);
    };
    WebGLContactEPA.create = function () {
        var epa = new WebGLContactEPA();
        var i;
        epa.vertex_store = new Float32Array(epa.MAX_VERTICES * 9);
        var face_store = [];
        for (i = 0; i < epa.MAX_FACES; i += 1) {
            face_store[i] = {
                normal: VMath.v3BuildZero(),
                distance: 0,
                vertex: new Int16Array(3),
                adjFace: [null, null, null],
                edge: new Int16Array(3),
                leaf0: null,
                leaf1: null,
                pass: 0
            };
        }
        epa.hull = {
            root: null,
            count: 0
        };
        epa.stock = {
            root: null,
            count: 0
        };
        epa.horizon = {
            cf: null,
            ff: null,
            numFaces: 0
        };
        for (i = 0; i < epa.MAX_FACES; i += 1) {
            epa.append(epa.stock, face_store[epa.MAX_FACES - i - 1]);
        }
        return epa;
    };
    WebGLContactEPA.version = 1;
    return WebGLContactEPA;
})();
WebGLContactEPA.prototype.MAX_VERTICES = 64;
WebGLContactEPA.prototype.MAX_FACES = 128;
var WebGLPhysicsPublicContact = (function () {
    function WebGLPhysicsPublicContact() {
        this._private = null;
        return this;
    }
    WebGLPhysicsPublicContact.create = function () {
        var p = new WebGLPhysicsPublicContact();
        Object.defineProperty(p, "localPointOnA", {
            get: function getLocalPointOnA() {
                var pr = this._private;
                return VMath.v3Build(pr[0], pr[1], pr[2]);
            },
            set: function setLocalPointOnA(point) {
                var pr = this._private;
                pr[0] = point[0];
                pr[1] = point[1];
                pr[2] = point[2];
            },
            enumerable: true
        });
        Object.defineProperty(p, "localPointOnB", {
            get: function getLocalPointOnB() {
                var pr = this._private;
                return VMath.v3Build(pr[3], pr[4], pr[5]);
            },
            set: function setLocalPointOnB(point) {
                var pr = this._private;
                pr[3] = point[0];
                pr[4] = point[1];
                pr[5] = point[2];
            },
            enumerable: true
        });
        Object.defineProperty(p, "worldNormalOnB", {
            get: function getWorldNormalOnB() {
                var pr = this._private;
                return VMath.v3Build(pr[12], pr[13], pr[14]);
            },
            set: function setWorldNormalOnB(normal) {
                var pr = this._private;
                pr[12] = normal[0];
                pr[13] = normal[1];
                pr[14] = normal[2];
            },
            enumerable: true
        });
        Object.defineProperty(p, "added", {
            get: function getAdded() {
                var pr = this._private;
                return (0.0 < pr[51]);
            },
            enumerable: true
        });
        Object.defineProperty(p, "distance", {
            get: function getDistance() {
                var pr = this._private;
                return pr[21];
            },
            enumerable: true
        });
        return p;
    };
    return WebGLPhysicsPublicContact;
})();
var WebGLPhysicsContact = {
    contactPool: [],
    contactPoolSize: 0,
    contactPoolAllocationSize: 128,
    publicContacts: [WebGLPhysicsPublicContact.create(),
        WebGLPhysicsPublicContact.create(),
        WebGLPhysicsPublicContact.create()],
    callbackContacts: [],
    allocate: function webglPhyssicsContactAllocateFn() {
        var contactPool = this.contactPool;
        if (this.contactPoolSize === 0) {
            var allocationSize = this.contactPoolAllocationSize;
            var buffer = new Float32Array(52 * allocationSize);
            var bufferIndex = buffer.length;
            var n;
            for (n = 0; n < allocationSize; n += 1) {
                bufferIndex -= 52;
                contactPool[n] = buffer.subarray(bufferIndex, (bufferIndex + 52));
            }
            this.contactPoolSize = allocationSize;
        }
        this.contactPoolSize -= 1;
        var contact = contactPool[this.contactPoolSize];
        contact[51] = 1.0;
        return contact;
    },
    deallocate: function webglPhyssicsContactDeallocateFn(contact) {
        this.contactPool[this.contactPoolSize] = contact;
        this.contactPoolSize += 1;
        contact[40] = 0;
    }
};
var WebGLPhysicsArbiter = (function () {
    function WebGLPhysicsArbiter() {
        // Initialise all properties of arbiters
        // which will ever be used.
        this.objectA = null;
        this.objectB = null;
        this.shapeA = null;
        this.shapeB = null;
        this.friction = 0;
        this.restitution = 0;
        this.contacts = [];
        this.activeContacts = [];
        this.active = true;
        this.skipDiscreteCollisions = false;
        this.contactFlags = 0;
        this.trigger = false;
        return this;
    }
    WebGLPhysicsArbiter.prototype.insertContact = function (worldA, worldB, normal, distance, concave) {
        var cn0 = normal[0];
        var cn1 = normal[1];
        var cn2 = normal[2];
        var clsq = ((cn0 * cn0) + (cn1 * cn1) + (cn2 * cn2));
        if (clsq < WebGLPhysicsConfig.DONT_NORMALIZE_THRESHOLD) {
            return;
        }
        var scale = 1 / Math.sqrt(clsq);
        cn0 *= scale;
        cn1 *= scale;
        cn2 *= scale;
        var objectA = this.objectA;
        var objectB = this.objectB;
        var xformA = objectA.transform;
        var xformB = objectB.transform;
        var r0 = worldA[0] - xformA[9];
        var r1 = worldA[1] - xformA[10];
        var r2 = worldA[2] - xformA[11];
        var ca0 = (xformA[0] * r0) + (xformA[1] * r1) + (xformA[2] * r2);
        var ca1 = (xformA[3] * r0) + (xformA[4] * r1) + (xformA[5] * r2);
        var ca2 = (xformA[6] * r0) + (xformA[7] * r1) + (xformA[8] * r2);
        var jAccN = 0;
        var i = 0;
        var min = Number.MAX_VALUE;
        var contacts = this.contacts;
        var d0, d1, d2;
        while (i < contacts.length) {
            var datad = contacts[i];
            if ((!concave) && ((cn0 * datad[12]) + (cn1 * datad[13]) + (cn2 * datad[14])) < 0.9) {
                contacts[i] = contacts[contacts.length - 1];
                contacts.pop();
                WebGLPhysicsContact.deallocate(datad);
                this.contactFlags |= 4;
                continue;
            }
            d0 = (ca0 - datad[0]);
            d1 = (ca1 - datad[1]);
            d2 = (ca2 - datad[2]);
            var sep = (d0 * d0) + (d1 * d1) + (d2 * d2);
            if (sep < WebGLPhysicsConfig.CONTACT_EQUAL_SQ_SEPERATION) {
                jAccN = datad[40];
                contacts[i] = contacts[contacts.length - 1];
                contacts.pop();
                WebGLPhysicsContact.deallocate(datad);
                this.contactFlags |= 4;
                min = sep;
                continue;
            }
            if (sep < WebGLPhysicsConfig.CONTACT_INHERIT_SQ_SEPERATION && sep < min) {
                jAccN = datad[40];
                min = sep;
            }
            i += 1;
        }
        var data = WebGLPhysicsContact.allocate();
        data[0] = ca0;
        data[1] = ca1;
        data[2] = ca2;
        data[6] = r0;
        data[7] = r1;
        data[8] = r2;
        data[9] = r0 = worldB[0] - xformB[9];
        data[10] = r1 = worldB[1] - xformB[10];
        data[11] = r2 = worldB[2] - xformB[11];
        data[3] = (xformB[0] * r0) + (xformB[1] * r1) + (xformB[2] * r2);
        data[4] = (xformB[3] * r0) + (xformB[4] * r1) + (xformB[5] * r2);
        data[5] = (xformB[6] * r0) + (xformB[7] * r1) + (xformB[8] * r2);
        data[21] = distance;
        data[12] = cn0;
        data[13] = cn1;
        data[14] = cn2;
        var ct0, ct2;
        clsq = ((cn0 * cn0) + (cn2 * cn2));
        if (clsq < WebGLPhysicsConfig.DONT_NORMALIZE_THRESHOLD) {
            data[15] = ct0 = 1.0;
            data[16] = 0.0;
            data[17] = ct2 = 0.0;
        }
        else {
            scale = 1 / Math.sqrt(clsq);
            data[15] = ct0 = (-cn2 * scale);
            data[16] = 0.0;
            data[17] = ct2 = (cn0 * scale);
        }
        data[18] = ((cn1 * ct2));
        data[19] = ((cn2 * ct0) - (cn0 * ct2));
        data[20] = (-(cn1 * ct0));
        data[40] = jAccN;
        var contactCallbacks, publicContact;
        contactCallbacks = objectA.contactCallbacks;
        if (null !== contactCallbacks && 0 !== (contactCallbacks.mask & objectB.group)) {
            if (contactCallbacks.onPreSolveContact) {
                publicContact = WebGLPhysicsContact.publicContacts[0];
                publicContact._private = data;
                contactCallbacks.onPreSolveContact(objectA._public, objectB._public, publicContact);
            }
            if (!contactCallbacks.added && contactCallbacks.deferred) {
                contactCallbacks.added = true;
                objectA.world.contactCallbackObjects.push(objectA);
            }
            if (contactCallbacks.trigger) {
                this.trigger = true;
                objectA.sweepFrozen = false;
                objectB.sweepFrozen = false;
            }
        }
        contactCallbacks = objectB.contactCallbacks;
        if (null !== contactCallbacks && 0 !== (contactCallbacks.mask & objectA.group)) {
            if (contactCallbacks.onPreSolveContact) {
                publicContact = WebGLPhysicsContact.publicContacts[0];
                publicContact._private = data;
                contactCallbacks.onPreSolveContact(objectA._public, objectB._public, publicContact);
            }
            if (!contactCallbacks.added && contactCallbacks.deferred) {
                contactCallbacks.added = true;
                objectB.world.contactCallbackObjects.push(objectB);
            }
            if (contactCallbacks.trigger) {
                this.trigger = true;
                objectA.sweepFrozen = false;
                objectB.sweepFrozen = false;
            }
        }
        this.contactFlags |= 1;
        contacts.push(data);
        if (contacts.length === 4) {
            var minDistance = contacts[0][21];
            var minimum = 0;
            for (i = 1; i < 4; i += 1) {
                data = contacts[i];
                if (data[21] < minDistance) {
                    minDistance = data[21];
                    minimum = i;
                }
            }
            var discard;
            var maxArea = -Number.MAX_VALUE;
            var con0 = contacts[0];
            var con1 = contacts[1];
            var con2 = contacts[2];
            var con3 = contacts[3];
            var a0 = con0[6] + con0[9];
            var a1 = con0[7] + con0[10];
            var a2 = con0[8] + con0[11];
            var b0 = con1[6] + con1[9];
            var b1 = con1[7] + con1[10];
            var b2 = con1[8] + con1[11];
            var c0 = con2[6] + con2[9];
            var c1 = con2[7] + con2[10];
            var c2 = con2[8] + con2[11];
            d0 = con3[6] + con3[9];
            d1 = con3[7] + con3[10];
            d2 = con3[8] + con3[11];
            var ab0 = (b0 - a0);
            var ab1 = (b1 - a1);
            var ab2 = (b2 - a2);
            var ac0 = (c0 - a0);
            var ac1 = (c1 - a1);
            var ac2 = (c2 - a2);
            var ad0 = (d0 - a0);
            var ad1 = (d1 - a1);
            var ad2 = (d2 - a2);
            var n0, n1, n2;
            var area;
            if (minimum !== 1) {
                n0 = ((ac1 * ad2) - (ac2 * ad1));
                n1 = ((ac2 * ad0) - (ac0 * ad2));
                n2 = ((ac0 * ad1) - (ac1 * ad0));
                area = (n0 * n0) + (n1 * n1) + (n2 * n2);
                if (area > maxArea) {
                    maxArea = area;
                    discard = 1;
                }
            }
            if (minimum !== 2) {
                n0 = ((ab1 * ad2) - (ab2 * ad1));
                n1 = ((ab2 * ad0) - (ab0 * ad2));
                n2 = ((ab0 * ad1) - (ab1 * ad0));
                area = (n0 * n0) + (n1 * n1) + (n2 * n2);
                if (area > maxArea) {
                    maxArea = area;
                    discard = 2;
                }
            }
            if (minimum !== 3) {
                n0 = ((ab1 * ac2) - (ab2 * ac1));
                n1 = ((ab2 * ac0) - (ab0 * ac2));
                n2 = ((ab0 * ac1) - (ab1 * ac0));
                area = (n0 * n0) + (n1 * n1) + (n2 * n2);
                if (area > maxArea) {
                    maxArea = area;
                    discard = 3;
                }
            }
            if (minimum !== 0) {
                var bc0 = (c0 - b0);
                var bc1 = (c1 - b1);
                var bc2 = (c2 - b2);
                var bd0 = (d0 - b0);
                var bd1 = (d1 - b1);
                var bd2 = (d2 - b2);
                n0 = ((bc1 * bd2) - (bc2 * bd1));
                n1 = ((bc2 * bd0) - (bc0 * bd2));
                n2 = ((bc0 * bd1) - (bc1 * bd0));
                area = (n0 * n0) + (n1 * n1) + (n2 * n2);
                if (area > maxArea) {
                    maxArea = area;
                    discard = 0;
                }
            }
            data = contacts[discard];
            contacts[discard] = contacts[3];
            contacts.pop();
            WebGLPhysicsContact.deallocate(data);
            this.contactFlags |= 4;
        }
    };
    WebGLPhysicsArbiter.prototype.refreshContacts = function () {
        var contacts = this.contacts;
        var objectA = this.objectA;
        var objectB = this.objectB;
        var xformA = objectA.transform;
        var xformB = objectB.transform;
        var A0 = xformA[0];
        var A1 = xformA[1];
        var A2 = xformA[2];
        var A3 = xformA[3];
        var A4 = xformA[4];
        var A5 = xformA[5];
        var A6 = xformA[6];
        var A7 = xformA[7];
        var A8 = xformA[8];
        var A9 = xformA[9];
        var A10 = xformA[10];
        var A11 = xformA[11];
        var B0 = xformB[0];
        var B1 = xformB[1];
        var B2 = xformB[2];
        var B3 = xformB[3];
        var B4 = xformB[4];
        var B5 = xformB[5];
        var B6 = xformB[6];
        var B7 = xformB[7];
        var B8 = xformB[8];
        var B9 = xformB[9];
        var B10 = xformB[10];
        var B11 = xformB[11];
        var data;
        var i = 0;
        while (i < contacts.length) {
            data = contacts[i];
            var v0 = data[0];
            var v1 = data[1];
            var v2 = data[2];
            var ra0 = data[6] = ((A0 * v0) + (A3 * v1) + (A6 * v2));
            var ra1 = data[7] = ((A1 * v0) + (A4 * v1) + (A7 * v2));
            var ra2 = data[8] = ((A2 * v0) + (A5 * v1) + (A8 * v2));
            v0 = data[3];
            v1 = data[4];
            v2 = data[5];
            var rb0 = data[9] = ((B0 * v0) + (B3 * v1) + (B6 * v2));
            var rb1 = data[10] = ((B1 * v0) + (B4 * v1) + (B7 * v2));
            var rb2 = data[11] = ((B2 * v0) + (B5 * v1) + (B8 * v2));
            v0 = (ra0 + A9) - (rb0 + B9);
            v1 = (ra1 + A10) - (rb1 + B10);
            v2 = (ra2 + A11) - (rb2 + B11);
            var n0 = data[12];
            var n1 = data[13];
            var n2 = data[14];
            var sep = data[21] = ((n0 * v0) + (n1 * v1) + (n2 * v2));
            if (sep > WebGLPhysicsConfig.CONTACT_MAX_Y_SEPERATION) {
                contacts[i] = contacts[contacts.length - 1];
                contacts.pop();
                WebGLPhysicsContact.deallocate(data);
                this.contactFlags |= 4;
                continue;
            }
            v0 -= (n0 * sep);
            v1 -= (n1 * sep);
            v2 -= (n2 * sep);
            if (((v0 * v0) + (v1 * v1) + (v2 * v2)) > WebGLPhysicsConfig.CONTACT_MAX_SQ_XZ_SEPERATION) {
                contacts[i] = contacts[contacts.length - 1];
                contacts.pop();
                WebGLPhysicsContact.deallocate(data);
                this.contactFlags |= 4;
                continue;
            }
            i += 1;
        }
        this.contactFlags |= 2;
        return (contacts.length === 0);
    };
    WebGLPhysicsArbiter.prototype.preStep = function (timeStepRatio, timeStep) {
        if (this.trigger) {
            this.activeContacts.length = 0;
            return;
        }
        var objectA = this.objectA;
        var objectB = this.objectB;
        var mass_sum = objectA.inverseMass + objectB.inverseMass;
        var velA = objectA.velocity;
        var velB = objectB.velocity;
        var I = objectA.inverseInertia;
        var A0 = I[0];
        var A1 = I[1];
        var A2 = I[2];
        var A3 = I[3];
        var A4 = I[4];
        var A5 = I[5];
        var A6 = I[6];
        var A7 = I[7];
        var A8 = I[8];
        I = objectB.inverseInertia;
        var B0 = I[0];
        var B1 = I[1];
        var B2 = I[2];
        var B3 = I[3];
        var B4 = I[4];
        var B5 = I[5];
        var B6 = I[6];
        var B7 = I[7];
        var B8 = I[8];
        var activeContacts = this.activeContacts;
        activeContacts.length = 0;
        var baum = (objectA.collisionObject || objectB.collisionObject) ?
            WebGLPhysicsConfig.CONTACT_STATIC_BAUMGRAUTE :
            WebGLPhysicsConfig.CONTACT_BAUMGRAUTE;
        var contacts = this.contacts;
        var i;
        var limit = contacts.length;
        for (i = 0; i < limit; i += 1) {
            var data = contacts[i];
            if (data[21] > 0) {
                continue;
            }
            activeContacts[activeContacts.length] = data;
            data[41] = data[42] = 0;
            var ca0, ca1, ca2;
            var cb0, cb1, cb2;
            var n0 = data[12];
            var n1 = data[13];
            var n2 = data[14];
            var ra0 = data[6];
            var ra1 = data[7];
            var ra2 = data[8];
            var rb0 = data[9];
            var rb1 = data[10];
            var rb2 = data[11];
            var k0, k1, k2;
            var kN = mass_sum;
            ca0 = ((ra1 * n2) - (ra2 * n1));
            ca1 = ((ra2 * n0) - (ra0 * n2));
            ca2 = ((ra0 * n1) - (ra1 * n0));
            data[22] = k0 = ((A0 * ca0) + (A3 * ca1) + (A6 * ca2));
            data[23] = k1 = ((A1 * ca0) + (A4 * ca1) + (A7 * ca2));
            data[24] = k2 = ((A2 * ca0) + (A5 * ca1) + (A8 * ca2));
            kN += ((ca0 * k0) + (ca1 * k1) + (ca2 * k2));
            cb0 = ((rb1 * n2) - (rb2 * n1));
            cb1 = ((rb2 * n0) - (rb0 * n2));
            cb2 = ((rb0 * n1) - (rb1 * n0));
            data[25] = k0 = -((B0 * cb0) + (B3 * cb1) + (B6 * cb2));
            data[26] = k1 = -((B1 * cb0) + (B4 * cb1) + (B7 * cb2));
            data[27] = k2 = -((B2 * cb0) + (B5 * cb1) + (B8 * cb2));
            kN -= ((cb0 * k0) + (cb1 * k1) + (cb2 * k2));
            data[45] = 1 / kN;
            data[43] = baum * Math.min(0, data[21] + WebGLPhysicsConfig.CONTACT_SLOP) / timeStep;
            data[44] = 0;
            var vel0 = (velA[0] - velB[0]);
            var vel1 = (velA[1] - velB[1]);
            var vel2 = (velA[2] - velB[2]);
            vel0 += ((velA[4] * ra2) - (velA[5] * ra1));
            vel1 += ((velA[5] * ra0) - (velA[3] * ra2));
            vel2 += ((velA[3] * ra1) - (velA[4] * ra0));
            vel0 -= ((velB[4] * rb2) - (velB[5] * rb1));
            vel1 -= ((velB[5] * rb0) - (velB[3] * rb2));
            vel2 -= ((velB[3] * rb1) - (velB[4] * rb0));
            var bounce = ((vel0 * n0) + (vel1 * n1) + (vel2 * n2)) * this.restitution;
            if (bounce * bounce < 1e-2) {
                bounce = 0;
            }
            data[50] = bounce;
            var kU = mass_sum;
            n0 = data[15];
            n1 = data[16];
            n2 = data[17];
            ca0 = ((ra1 * n2) - (ra2 * n1));
            ca1 = ((ra2 * n0) - (ra0 * n2));
            ca2 = ((ra0 * n1) - (ra1 * n0));
            data[28] = k0 = ((A0 * ca0) + (A3 * ca1) + (A6 * ca2));
            data[29] = k1 = ((A1 * ca0) + (A4 * ca1) + (A7 * ca2));
            data[30] = k2 = ((A2 * ca0) + (A5 * ca1) + (A8 * ca2));
            kU += ((ca0 * k0) + (ca1 * k1) + (ca2 * k2));
            cb0 = ((rb1 * n2) - (rb2 * n1));
            cb1 = ((rb2 * n0) - (rb0 * n2));
            cb2 = ((rb0 * n1) - (rb1 * n0));
            data[31] = k0 = -((B0 * cb0) + (B3 * cb1) + (B6 * cb2));
            data[32] = k1 = -((B1 * cb0) + (B4 * cb1) + (B7 * cb2));
            data[33] = k2 = -((B2 * cb0) + (B5 * cb1) + (B8 * cb2));
            kU -= ((cb0 * k0) + (cb1 * k1) + (cb2 * k2));
            var kV = mass_sum;
            n0 = data[18];
            n1 = data[19];
            n2 = data[20];
            ca0 = ((ra1 * n2) - (ra2 * n1));
            ca1 = ((ra2 * n0) - (ra0 * n2));
            ca2 = ((ra0 * n1) - (ra1 * n0));
            data[34] = k0 = ((A0 * ca0) + (A3 * ca1) + (A6 * ca2));
            data[35] = k1 = ((A1 * ca0) + (A4 * ca1) + (A7 * ca2));
            data[36] = k2 = ((A2 * ca0) + (A5 * ca1) + (A8 * ca2));
            kV += ((ca0 * k0) + (ca1 * k1) + (ca2 * k2));
            cb0 = ((rb1 * n2) - (rb2 * n1));
            cb1 = ((rb2 * n0) - (rb0 * n2));
            cb2 = ((rb0 * n1) - (rb1 * n0));
            data[37] = k0 = -((B0 * cb0) + (B3 * cb1) + (B6 * cb2));
            data[38] = k1 = -((B1 * cb0) + (B4 * cb1) + (B7 * cb2));
            data[39] = k2 = -((B2 * cb0) + (B5 * cb1) + (B8 * cb2));
            kV -= ((cb0 * k0) + (cb1 * k1) + (cb2 * k2));
            var kUV = 0.0;
            kUV += ((ca0 * data[28]) + (ca1 * data[29]) + (ca2 * data[30]));
            kUV -= ((cb0 * data[31]) + (cb1 * data[32]) + (cb2 * data[33]));
            var idet = 1 / (kU * kV - kUV * kUV);
            data[46] = kV * idet;
            data[47] = -kUV * idet;
            data[48] = kU * idet;
            data[40] *= timeStepRatio;
        }
    };
    WebGLPhysicsArbiter.prototype.applyCachedImpulses = function () {
        if (this.trigger) {
            return;
        }
        var objectA = this.objectA;
        var objectB = this.objectB;
        var velA = objectA.velocity;
        var velB = objectB.velocity;
        var imA = objectA.inverseMass;
        var imB = objectB.inverseMass;
        var contacts = this.activeContacts;
        var i;
        for (i = 0; i < contacts.length; i += 1) {
            var data = contacts[i];
            var jn = data[40];
            var n0 = (data[12] * jn);
            var n1 = (data[13] * jn);
            var n2 = (data[14] * jn);
            velA[0] += (n0 * imA);
            velA[1] += (n1 * imA);
            velA[2] += (n2 * imA);
            velB[0] -= (n0 * imB);
            velB[1] -= (n1 * imB);
            velB[2] -= (n2 * imB);
            velA[3] += (data[22] * jn);
            velA[4] += (data[23] * jn);
            velA[5] += (data[24] * jn);
            velB[3] += (data[25] * jn);
            velB[4] += (data[26] * jn);
            velB[5] += (data[27] * jn);
        }
    };
    WebGLPhysicsArbiter.prototype.computeAndApplyBiasImpulses = function () {
        if (this.trigger) {
            return;
        }
        var objectA = this.objectA;
        var objectB = this.objectB;
        var vec = objectA.velocity;
        var va0 = vec[6];
        var va1 = vec[7];
        var va2 = vec[8];
        var wa0 = vec[9];
        var wa1 = vec[10];
        var wa2 = vec[11];
        vec = objectB.velocity;
        var vb0 = vec[6];
        var vb1 = vec[7];
        var vb2 = vec[8];
        var wb0 = vec[9];
        var wb1 = vec[10];
        var wb2 = vec[11];
        var imA = objectA.inverseMass;
        var imB = objectB.inverseMass;
        var contacts = this.activeContacts;
        var limit = contacts.length;
        var data;
        var i;
        for (i = 0; i < limit; i += 1) {
            data = contacts[i];
            var n0 = data[12];
            var n1 = data[13];
            var n2 = data[14];
            var ra0 = data[6];
            var ra1 = data[7];
            var ra2 = data[8];
            var rb0 = data[9];
            var rb1 = data[10];
            var rb2 = data[11];
            var j1 = data[45] * (n0 * ((vb0 + ((wb1 * rb2) - (wb2 * rb1))) - (va0 + ((wa1 * ra2) - (wa2 * ra1)))) +
                n1 * ((vb1 + ((wb2 * rb0) - (wb0 * rb2))) - (va1 + ((wa2 * ra0) - (wa0 * ra2)))) +
                n2 * ((vb2 + ((wb0 * rb1) - (wb1 * rb0))) - (va2 + ((wa0 * ra1) - (wa1 * ra0)))) -
                data[43]);
            var jOld1 = data[44];
            var cjAcc1 = jOld1 + j1;
            if (cjAcc1 < 0) {
                cjAcc1 = 0.0;
            }
            j1 = cjAcc1 - jOld1;
            data[44] = cjAcc1;
            n0 *= j1;
            n1 *= j1;
            n2 *= j1;
            va0 += (n0 * imA);
            va1 += (n1 * imA);
            va2 += (n2 * imA);
            vb0 -= (n0 * imB);
            vb1 -= (n1 * imB);
            vb2 -= (n2 * imB);
            wa0 += (data[22] * j1);
            wa1 += (data[23] * j1);
            wa2 += (data[24] * j1);
            wb0 += (data[25] * j1);
            wb1 += (data[26] * j1);
            wb2 += (data[27] * j1);
        }
        vec = objectA.velocity;
        vec[6] = va0;
        vec[7] = va1;
        vec[8] = va2;
        vec[9] = wa0;
        vec[10] = wa1;
        vec[11] = wa2;
        vec = objectB.velocity;
        vec[6] = vb0;
        vec[7] = vb1;
        vec[8] = vb2;
        vec[9] = wb0;
        vec[10] = wb1;
        vec[11] = wb2;
    };
    WebGLPhysicsArbiter.prototype.computeAndApplyImpulses = function () {
        if (this.trigger) {
            return;
        }
        var objectA = this.objectA;
        var objectB = this.objectB;
        var vec = objectA.velocity;
        var va0 = vec[0];
        var va1 = vec[1];
        var va2 = vec[2];
        var wa0 = vec[3];
        var wa1 = vec[4];
        var wa2 = vec[5];
        vec = objectB.velocity;
        var vb0 = vec[0];
        var vb1 = vec[1];
        var vb2 = vec[2];
        var wb0 = vec[3];
        var wb1 = vec[4];
        var wb2 = vec[5];
        var imA = objectA.inverseMass;
        var imB = objectB.inverseMass;
        var friction = this.friction;
        var contacts = this.activeContacts;
        var limit = contacts.length;
        var data;
        var i;
        for (i = 0; i < limit; i += 1) {
            data = contacts[i];
            var n0 = data[12];
            var n1 = data[13];
            var n2 = data[14];
            var u0 = data[15];
            var u1 = data[16];
            var u2 = data[17];
            var v0 = data[18];
            var v1 = data[19];
            var v2 = data[20];
            var ra0 = data[6];
            var ra1 = data[7];
            var ra2 = data[8];
            var rb0 = data[9];
            var rb1 = data[10];
            var rb2 = data[11];
            var j1 = data[45] * (n0 * ((vb0 + ((wb1 * rb2) - (wb2 * rb1))) - (va0 + ((wa1 * ra2) - (wa2 * ra1)))) +
                n1 * ((vb1 + ((wb2 * rb0) - (wb0 * rb2))) - (va1 + ((wa2 * ra0) - (wa0 * ra2)))) +
                n2 * ((vb2 + ((wb0 * rb1) - (wb1 * rb0))) - (va2 + ((wa0 * ra1) - (wa1 * ra0)))) -
                data[50]);
            var jOld1 = data[40];
            var cjAcc1 = jOld1 + j1;
            if (cjAcc1 < 0) {
                cjAcc1 = 0.0;
                j1 = -jOld1;
            }
            data[40] = cjAcc1;
            n0 *= j1;
            n1 *= j1;
            n2 *= j1;
            va0 += (n0 * imA);
            va1 += (n1 * imA);
            va2 += (n2 * imA);
            vb0 -= (n0 * imB);
            vb1 -= (n1 * imB);
            vb2 -= (n2 * imB);
            wa0 += (data[22] * j1);
            wa1 += (data[23] * j1);
            wa2 += (data[24] * j1);
            wb0 += (data[25] * j1);
            wb1 += (data[26] * j1);
            wb2 += (data[27] * j1);
            n0 = (vb0 - va0) + ((wb1 * rb2) - (wb2 * rb1)) - ((wa1 * ra2) - (wa2 * ra1));
            n1 = (vb1 - va1) + ((wb2 * rb0) - (wb0 * rb2)) - ((wa2 * ra0) - (wa0 * ra2));
            n2 = (vb2 - va2) + ((wb0 * rb1) - (wb1 * rb0)) - ((wa0 * ra1) - (wa1 * ra0));
            var lambdau = ((u0 * n0) + (u1 * n1) + (u2 * n2));
            var lambdav = ((v0 * n0) + (v1 * n1) + (v2 * n2));
            j1 = lambdau * data[46] + lambdav * data[47];
            var j2 = lambdau * data[47] + lambdav * data[48];
            jOld1 = data[41];
            var jOld2 = data[42];
            cjAcc1 = jOld1 + j1;
            var cjAcc2 = jOld2 + j2;
            var jMax = friction * data[40];
            var fsq = (cjAcc1 * cjAcc1) + (cjAcc2 * cjAcc2);
            if (fsq > (jMax * jMax)) {
                fsq = jMax / Math.sqrt(fsq);
                cjAcc1 *= fsq;
                cjAcc2 *= fsq;
                j1 = cjAcc1 - jOld1;
                j2 = cjAcc2 - jOld2;
            }
            data[41] = cjAcc1;
            data[42] = cjAcc2;
            n0 = (u0 * j1) + (v0 * j2);
            n1 = (u1 * j1) + (v1 * j2);
            n2 = (u2 * j1) + (v2 * j2);
            va0 += (n0 * imA);
            va1 += (n1 * imA);
            va2 += (n2 * imA);
            vb0 -= (n0 * imB);
            vb1 -= (n1 * imB);
            vb2 -= (n2 * imB);
            wa0 += (data[28] * j1) + (data[34] * j2);
            wa1 += (data[29] * j1) + (data[35] * j2);
            wa2 += (data[30] * j1) + (data[36] * j2);
            wb0 += (data[31] * j1) + (data[37] * j2);
            wb1 += (data[32] * j1) + (data[38] * j2);
            wb2 += (data[33] * j1) + (data[39] * j2);
        }
        vec = objectA.velocity;
        vec[0] = va0;
        vec[1] = va1;
        vec[2] = va2;
        vec[3] = wa0;
        vec[4] = wa1;
        vec[5] = wa2;
        vec = objectB.velocity;
        vec[0] = vb0;
        vec[1] = vb1;
        vec[2] = vb2;
        vec[3] = wb0;
        vec[4] = wb1;
        vec[5] = wb2;
    };
    WebGLPhysicsArbiter.prototype.invalidateParameters = function () {
        this.restitution = (this.objectA.restitution * this.objectB.restitution);
        this.friction = (this.objectA.friction * this.objectB.friction);
    };
    WebGLPhysicsArbiter.allocate = function (shapeA, shapeB, objectA, objectB) {
        var arbiter;
        if (this.arbiterPoolSize === 0) {
            arbiter = new WebGLPhysicsArbiter();
        }
        else {
            arbiter = this.arbiterPool[this.arbiterPoolSize - 1];
            this.arbiterPoolSize -= 1;
        }
        arbiter.active = true;
        arbiter.shapeA = shapeA;
        arbiter.shapeB = shapeB;
        arbiter.objectA = objectA;
        arbiter.objectB = objectB;
        arbiter.invalidateParameters();
        return arbiter;
    };
    WebGLPhysicsArbiter.deallocate = function (arbiter) {
        arbiter.shapeA = null;
        arbiter.shapeB = null;
        arbiter.objectA = null;
        arbiter.objectB = null;
        arbiter.skipDiscreteCollisions = false;
        arbiter.activeContacts.length = 0;
        arbiter.contactFlags = 0;
        arbiter.trigger = false;
        this.arbiterPool[this.arbiterPoolSize] = arbiter;
        this.arbiterPoolSize += 1;
    };
    WebGLPhysicsArbiter.version = 1;
    WebGLPhysicsArbiter.arbiterPool = [];
    WebGLPhysicsArbiter.arbiterPoolSize = 0;
    return WebGLPhysicsArbiter;
})();
var WebGLPhysicsIsland = (function () {
    function WebGLPhysicsIsland() {
        // Initialise all properties of islands
        // which will ever be used.
        this.bodies = [];
        this.constraints = [];
        this.wakeTimeStamp = 0;
        this.active = false;
        return this;
    }
    WebGLPhysicsIsland.allocate = function () {
        var island;
        if (this.islandPoolSize === 0) {
            island = new WebGLPhysicsIsland();
        }
        else {
            island = this.islandPool[this.islandPoolSize - 1];
            this.islandPoolSize -= 1;
        }
        return island;
    };
    WebGLPhysicsIsland.deallocate = function (island) {
        this.islandPool[this.islandPoolSize] = island;
        this.islandPoolSize += 1;
        island.wakeTimeStamp = 0;
    };
    WebGLPhysicsIsland.version = 1;
    WebGLPhysicsIsland.islandPool = [];
    WebGLPhysicsIsland.islandPoolSize = 0;
    return WebGLPhysicsIsland;
})();
var WebGLPhysicsTriangleShape = (function () {
    function WebGLPhysicsTriangleShape() {
        // Initialise all properties of Triangle shape
        // which will ever be used.
        this.index = 0;
        this.collisionRadius = 0;
        this.triangleArray = null;
        return this;
    }
    WebGLPhysicsTriangleShape.prototype.localSupportWithoutMargin = function (vec, dst) {
        var vec0 = vec[0];
        var vec1 = vec[1];
        var vec2 = vec[2];
        var triangles = this.triangleArray.triangles;
        var triangle = this.index;
        var v00 = triangles[triangle + 3];
        var v01 = triangles[triangle + 4];
        var v02 = triangles[triangle + 5];
        var u0 = triangles[triangle + 6];
        var u1 = triangles[triangle + 7];
        var u2 = triangles[triangle + 8];
        var v0 = triangles[triangle + 9];
        var v1 = triangles[triangle + 10];
        var v2 = triangles[triangle + 11];
        var dotu = ((vec0 * u0) + (vec1 * u1) + (vec2 * u2));
        var dotv = ((vec0 * v0) + (vec1 * v1) + (vec2 * v2));
        if (dotu <= 0 && dotv <= 0) {
            dst[0] = v00;
            dst[1] = v01;
            dst[2] = v02;
        }
        else if (dotu >= dotv) {
            dst[0] = (v00 + u0);
            dst[1] = (v01 + u1);
            dst[2] = (v02 + u2);
        }
        else {
            dst[0] = (v00 + v0);
            dst[1] = (v01 + v1);
            dst[2] = (v02 + v2);
        }
    };
    WebGLPhysicsTriangleShape.allocate = function () {
        var triangle;
        if (this.trianglePoolSize === 0) {
            triangle = new WebGLPhysicsTriangleShape();
        }
        else {
            triangle = this.trianglePool[this.trianglePoolSize - 1];
            this.trianglePoolSize -= 1;
        }
        return triangle;
    };
    WebGLPhysicsTriangleShape.deallocate = function (triangle) {
        this.trianglePool[this.trianglePoolSize] = triangle;
        this.trianglePoolSize += 1;
        triangle.triangleArray = null;
    };
    WebGLPhysicsTriangleShape.version = 1;
    WebGLPhysicsTriangleShape.trianglePool = [];
    WebGLPhysicsTriangleShape.trianglePoolSize = 0;
    return WebGLPhysicsTriangleShape;
})();
WebGLPhysicsTriangleShape.prototype.type = "TRIANGLE_MESH_TRIANGLE";
var WebGLPhysicsTOIEvent = (function () {
    function WebGLPhysicsTOIEvent() {
        // Initialise all properties of TOI Event
        // which will ever be used.
        //
        // This object is made to dual as a cache in contactPairTest.
        this.objectA = null;
        this.objectB = null;
        this.shapeA = null;
        this.shapeB = null;
        this.closestA = VMath.v3BuildZero();
        this.closestB = VMath.v3BuildZero();
        this.axis = VMath.v3BuildZero();
        this.distance = 0.0;
        this.toi = 0.0;
        this.frozenA = false;
        this.frozenB = false;
        this.concave = false;
        return this;
    }
    WebGLPhysicsTOIEvent.allocate = function () {
        var toi;
        if (this.eventPoolSize === 0) {
            toi = new WebGLPhysicsTOIEvent();
        }
        else {
            toi = this.eventPool[this.eventPoolSize - 1];
            this.eventPoolSize -= 1;
        }
        return toi;
    };
    WebGLPhysicsTOIEvent.deallocate = function (toi) {
        this.eventPool[this.eventPoolSize] = toi;
        this.eventPoolSize += 1;
        if (toi.concave) {
            WebGLPhysicsTriangleShape.deallocate(toi.shapeB);
            toi.concave = false;
        }
        toi.objectA = null;
        toi.objectB = null;
        toi.shapeA = null;
        toi.shapeB = null;
    };
    WebGLPhysicsTOIEvent.version = 1;
    WebGLPhysicsTOIEvent.eventPool = [];
    WebGLPhysicsTOIEvent.eventPoolSize = 0;
    return WebGLPhysicsTOIEvent;
})();
var WebGLPhysicsWorld = (function () {
    function WebGLPhysicsWorld() {
    }
    WebGLPhysicsWorld.prototype.update = function () {
        this._private.update();
    };
    WebGLPhysicsWorld.prototype.rayTest = function (ray) {
        return this._private.rayTest(ray);
    };
    WebGLPhysicsWorld.prototype.convexSweepTest = function (params) {
        return this._private.convexSweepTest(params);
    };
    WebGLPhysicsWorld.prototype.addCollisionObject = function (collisionObject) {
        return this._private.addBody(collisionObject._private);
    };
    WebGLPhysicsWorld.prototype.removeCollisionObject = function (collisionObject) {
        return this._private.removeBody(collisionObject._private);
    };
    WebGLPhysicsWorld.prototype.addRigidBody = function (rigidBody) {
        return this._private.addBody(rigidBody._private);
    };
    WebGLPhysicsWorld.prototype.removeRigidBody = function (rigidBody) {
        return this._private.removeBody(rigidBody._private);
    };
    WebGLPhysicsWorld.prototype.addConstraint = function (constraint) {
        return this._private.addConstraint(constraint._private);
    };
    WebGLPhysicsWorld.prototype.removeConstraint = function (constraint) {
        return this._private.removeConstraint(constraint._private);
    };
    WebGLPhysicsWorld.prototype.addCharacter = function (character) {
        return this._private.addBody(character._private.rigidBody._private);
    };
    WebGLPhysicsWorld.prototype.removeCharacter = function (character) {
        return this._private.removeBody(character._private.rigidBody._private);
    };
    WebGLPhysicsWorld.prototype.wakeBody = function (body) {
        this._private.wakeBody(body);
    };
    WebGLPhysicsWorld.prototype.flush = function () {
        this._private.flush();
    };
    WebGLPhysicsWorld.create = function (params) {
        var rets = new WebGLPhysicsWorld();
        var s = new WebGLPrivatePhysicsWorld();
        rets._private = s;
        s._public = rets;
        s.gravity = (params.gravity !== undefined) ? VMath.v3Copy(params.gravity) : VMath.v3Build(0, -10, 0);
        s.maxSubSteps = (params.maxSubSteps !== undefined) ? params.maxSubSteps : 10;
        s.fixedTimeStep = (params.fixedTimeStep !== undefined) ? params.fixedTimeStep : (1 / 60);
        s.variableMinStep = (params.minimumTimeStep !== undefined) ? params.minimumTimeStep : (1 / 70);
        s.variableMaxStep = (params.maximumTimeStep !== undefined) ? params.maximumTimeStep : (1 / 50);
        s.variableStep = (params.variableTimeSteps !== undefined) ? params.variableTimeSteps : false;
        s.maxGiveUpTimeStep = (params.maxGiveUpTimeStep !== undefined) ? params.maxGiveUpTimeStep : 1 / 20;
        Object.defineProperty(rets, "maxSubSteps", {
            value: s.maxSubSteps,
            enumerable: true
        });
        Object.defineProperty(rets, "maxGiveUpTimeStep", {
            value: s.maxGiveUpTimeStep,
            enumerable: true
        });
        if (!s.variableStep) {
            Object.defineProperty(rets, "fixedTimeStep", {
                value: s.fixedTimeStep,
                enumerable: true
            });
        }
        else {
            Object.defineProperty(rets, "minimumTimeStep", {
                value: s.variableMinStep,
                enumerable: true
            });
            Object.defineProperty(rets, "maximumTimeStep", {
                value: s.variableMaxStep,
                enumerable: true
            });
        }
        Object.defineProperty(rets, "gravity", {
            get: function physicsWorldGetGravity() {
                return VMath.v3Copy(this._private.gravity);
            },
            enumerable: true
        });
        s.staticSpatialMap = AABBTree.create(true);
        s.dynamicSpatialMap = AABBTree.create();
        s.sleepingSpatialMap = AABBTree.create();
        s.collisionObjects = [];
        s.rigidBodies = [];
        s.constraints = [];
        s.kinematicBodies = [];
        s.activeArbiters = [];
        s.activeBodies = [];
        s.activeKinematics = [];
        s.activeConstraints = [];
        s.persistantObjectsList = [];
        s.persistantObjectsList2 = [];
        s.persistantTrianglesList = [];
        s.persistantTOIEventList = [];
        s.timeStamp = 0;
        s.performanceData = {
            discrete: 0,
            sleepComputation: 0,
            prestepContacts: 0,
            prestepConstraints: 0,
            integrateVelocities: 0,
            warmstartContacts: 0,
            warmstartConstraints: 0,
            physicsIterations: 0,
            integratePositions: 0,
            continuous: 0
        };
        Object.defineProperty(rets, "performanceData", {
            value: s.performanceData,
            enumerable: true
        });
        s.syncExtents = new Float32Array(6);
        s.contactCallbackObjects = [];
        s.contactCallbackRemovedArbiters = [];
        return rets;
    };
    WebGLPhysicsWorld.version = 1;
    return WebGLPhysicsWorld;
})();
var WebGLPrivatePhysicsWorld = (function () {
    function WebGLPrivatePhysicsWorld() {
    }
    WebGLPrivatePhysicsWorld.prototype.m43InverseOrthonormalTransformVector = function (m, v, dst) {
        if (dst === undefined) {
            dst = new Float32Array(3);
        }
        var v0 = v[0];
        var v1 = v[1];
        var v2 = v[2];
        dst[0] = (m[0] * v0 + m[1] * v1 + m[2] * v2);
        dst[1] = (m[3] * v0 + m[4] * v1 + m[5] * v2);
        dst[2] = (m[6] * v0 + m[7] * v1 + m[8] * v2);
        return dst;
    };
    WebGLPrivatePhysicsWorld.prototype.m43InverseOrthonormalTransformPoint = function (m, v, dst) {
        if (dst === undefined) {
            dst = new Float32Array(3);
        }
        var v0 = v[0] - m[9];
        var v1 = v[1] - m[10];
        var v2 = v[2] - m[11];
        dst[0] = (m[0] * v0 + m[1] * v1 + m[2] * v2);
        dst[1] = (m[3] * v0 + m[4] * v1 + m[5] * v2);
        dst[2] = (m[6] * v0 + m[7] * v1 + m[8] * v2);
        return dst;
    };
    WebGLPrivatePhysicsWorld.prototype.trianglePlaneDiscard = function (shape, xform, triangleArray, index, txform) {
        if (this.planeAxis === undefined) {
            this.planeAxis = VMath.v3BuildZero();
            this.planeSA = VMath.v3BuildZero();
            this.planeSB = VMath.v3BuildZero();
        }
        var axis = this.planeAxis;
        var supportA = this.planeSA;
        var supportB = this.planeSB;
        var triangles = triangleArray.triangles;
        var n0 = triangles[index];
        var n1 = triangles[index + 1];
        var n2 = triangles[index + 2];
        var nd = triangles[index + 16];
        var A0 = txform[0];
        var A1 = txform[1];
        var A2 = txform[2];
        var A3 = txform[3];
        var A4 = txform[4];
        var A5 = txform[5];
        var A6 = txform[6];
        var A7 = txform[7];
        var A8 = txform[8];
        var A9 = txform[9];
        var A10 = txform[10];
        var A11 = txform[11];
        var w0 = (n0 * A0) + (n1 * A3) + (n2 * A6);
        var w1 = (n0 * A1) + (n1 * A4) + (n2 * A7);
        var w2 = (n0 * A2) + (n1 * A5) + (n2 * A8);
        A0 = xform[0];
        A1 = xform[1];
        A2 = xform[2];
        A3 = xform[3];
        A4 = xform[4];
        A5 = xform[5];
        A6 = xform[6];
        A7 = xform[7];
        A8 = xform[8];
        A9 -= xform[9];
        A10 -= xform[10];
        A11 -= xform[11];
        n0 = (A0 * w0) + (A1 * w1) + (A2 * w2);
        n1 = (A3 * w0) + (A4 * w1) + (A5 * w2);
        n2 = (A6 * w0) + (A7 * w1) + (A8 * w2);
        nd += (w0 * A9) + (w1 * A10) + (w2 * A11);
        axis[0] = n0;
        axis[1] = n1;
        axis[2] = n2;
        shape.localSupportWithoutMargin(axis, supportA);
        axis[0] = -n0;
        axis[1] = -n1;
        axis[2] = -n2;
        shape.localSupportWithoutMargin(axis, supportB);
        var dot1 = (supportA[0] * n0) + (supportA[1] * n1) + (supportA[2] * n2) - nd;
        var dot2 = (supportB[0] * n0) + (supportB[1] * n1) + (supportB[2] * n2) - nd;
        if ((dot1 * dot2) <= 0) {
            return false;
        }
        var seperation;
        if ((dot1 * dot1) < (dot2 * dot2)) {
            seperation = dot1;
        }
        else {
            seperation = dot2;
        }
        if ((seperation < 0) !== ((dot1 * dot2) < 0)) {
            seperation = -seperation;
        }
        return (seperation - shape.collisionRadius) > 0;
    };
    WebGLPrivatePhysicsWorld.prototype.filtered = function (objectA, objectB) {
        if (objectA === objectB) {
            return true;
        }
        if ((objectA.collisionObject || objectA.kinematic) && (objectB.collisionObject || objectB.kinematic)) {
            return true;
        }
        if ((objectA.mask & objectB.group) === 0 ||
            (objectB.mask & objectA.group) === 0) {
            return true;
        }
        return false;
    };
    WebGLPrivatePhysicsWorld.prototype.narrowPhase = function (shapeA, shapeB, objectA, objectB) {
        if (this.narrowTriangle === undefined) {
            this.narrowTriangle = WebGLPhysicsTriangleShape.allocate();
            this.narrowCache = {
                axis: VMath.v3Build(1, 0, 0),
                shapeA: null,
                shapeB: null,
                closestA: VMath.v3BuildZero(),
                closestB: VMath.v3BuildZero()
            };
            this.narrowCache2 = {
                axis: this.narrowCache.axis,
                shapeA: null,
                shapeB: null,
                closestA: this.narrowCache.closestA,
                closestB: this.narrowCache.closestB
            };
            this.narrowFakeBody = {
                transform: VMath.m43BuildIdentity(),
                shape: null
            };
            this.narrowTransform = VMath.m43BuildIdentity();
            this.narrowExtents = new Float32Array(6);
        }
        var arb = null;
        var arbitersA = objectA.arbiters;
        var arbitersB = objectB.arbiters;
        var arbiters = (arbitersA.length <= arbitersB.length) ? arbitersA : arbitersB;
        var i = 0;
        var numArbiters = arbiters.length;
        for (i = 0; i < numArbiters; i += 1) {
            var carb = arbiters[i];
            if (carb.shapeA === shapeA && carb.shapeB === shapeB &&
                carb.objectA === objectA && carb.objectB === objectB) {
                arb = carb;
                break;
            }
        }
        if (arb !== null && arb.skipDiscreteCollisions) {
            arb.skipDiscreteCollisions = false;
            return;
        }
        var fresh = (arb === null);
        if (fresh) {
            arb = WebGLPhysicsArbiter.allocate(shapeA, shapeB, objectA, objectB);
        }
        var cache = this.narrowCache;
        cache.shapeA = shapeA;
        cache.shapeB = shapeB;
        if (arb.contacts.length !== 0) {
            var data = arb.contacts[0];
            cache.axis[0] = data[12];
            cache.axis[1] = data[13];
            cache.axis[2] = data[14];
        }
        var contact;
        var collided = false;
        if (shapeA.type === "TRIANGLE_MESH" || shapeB.type === "TRIANGLE_MESH") {
            var meshShape, otherShape;
            var meshXForm, otherXForm;
            var triangle = this.narrowTriangle;
            var cache2 = this.narrowCache2;
            if (shapeA.type === "TRIANGLE_MESH") {
                meshShape = shapeA;
                meshXForm = objectA.transform;
                otherShape = shapeB;
                otherXForm = objectB.transform;
                cache2.shapeA = triangle;
                cache2.shapeB = cache.shapeB;
            }
            else {
                meshShape = shapeB;
                meshXForm = objectB.transform;
                otherShape = shapeA;
                otherXForm = objectA.transform;
                cache2.shapeA = cache.shapeA;
                cache2.shapeB = triangle;
            }
            var triangleArray = meshShape.triangleArray;
            triangle.triangleArray = triangleArray;
            triangle.collisionRadius = meshShape.collisionRadius;
            var numTriangles;
            if (triangleArray.spatialMap) {
                var transform = this.narrowTransform;
                var fakeBody = this.narrowFakeBody;
                var extents = this.narrowExtents;
                VMath.m43InverseOrthonormal(meshXForm, transform);
                VMath.m43Mul(otherXForm, transform, fakeBody.transform);
                fakeBody.shape = otherShape;
                WebGLPhysicsPrivateBody.prototype.calculateExtents.call(fakeBody, extents);
                var triangles = this.persistantTrianglesList;
                numTriangles = triangleArray.spatialMap.getOverlappingNodes(extents, triangles, 0);
                for (i = 0; i < numTriangles; i += 1) {
                    var index = triangles[i].index;
                    triangle.index = index;
                    triangles[i] = undefined;
                    if (!this.trianglePlaneDiscard(otherShape, otherXForm, triangleArray, index, meshXForm)) {
                        contact = this.contactPairTest(cache2, objectA.transform, objectB.transform);
                        if (contact < 0) {
                            arb.insertContact(cache2.closestA, cache2.closestB, cache2.axis, contact, true);
                            collided = true;
                        }
                    }
                }
            }
            else {
                numTriangles = triangleArray.numTriangles;
                for (i = 0; i < numTriangles; i += 1) {
                    triangle.index = (i * WebGLPhysicsPrivateTriangleArray.prototype.TRIANGLE_SIZE);
                    if (!this.trianglePlaneDiscard(otherShape, otherXForm, triangleArray, triangle.index, meshXForm)) {
                        contact = this.contactPairTest(cache2, objectA.transform, objectB.transform);
                        if (contact < 0) {
                            arb.insertContact(cache2.closestA, cache2.closestB, cache2.axis, contact, true);
                            collided = true;
                        }
                    }
                }
            }
        }
        else {
            contact = this.contactPairTest(cache, objectA.transform, objectB.transform);
            if (contact < 0) {
                arb.insertContact(cache.closestA, cache.closestB, cache.axis, contact, false);
                collided = true;
            }
        }
        if (collided) {
            if (fresh) {
                this.activeArbiters.push(arb);
                arb.active = true;
                objectA.arbiters.push(arb);
                objectB.arbiters.push(arb);
            }
            if (objectA.permitSleep && !objectA.active) {
                this.wakeBody(objectA);
            }
            if (objectB.permitSleep && !objectB.active) {
                this.wakeBody(objectB);
            }
            if (!arb.active) {
                arb.active = true;
                this.activeArbiters.push(arb);
            }
        }
        else if (fresh) {
            WebGLPhysicsArbiter.deallocate(arb);
        }
    };
    WebGLPrivatePhysicsWorld.prototype.computeSleeping = function (timeStep) {
        function _unify(x, y) {
            var xr = _find(x);
            var yr = _find(y);
            if (xr !== yr) {
                if (xr.islandRank < yr.islandRank) {
                    xr.islandRoot = yr;
                }
                else if (xr.islandRank > yr.islandRank) {
                    yr.islandRoot = xr;
                }
                else {
                    yr.islandRoot = xr;
                    xr.islandRank += 1;
                }
            }
        }
        function _find(x) {
            if (x === x.islandRoot) {
                return x;
            }
            var root = x;
            var stack = null;
            var next;
            while (root !== root.islandRoot) {
                next = root.islandRoot;
                root.islandRoot = stack;
                stack = root;
                root = next;
            }
            while (stack !== null) {
                next = stack.islandRoot;
                stack.islandRoot = root;
                stack = next;
            }
            return root;
        }
        var objectA, objectB;
        var arbiters = this.activeArbiters;
        var bodies = this.activeBodies;
        var constraints = this.activeConstraints;
        var n;
        var maxN = arbiters.length;
        for (n = 0; n < maxN; n += 1) {
            var arb = arbiters[n];
            objectA = arb.objectA;
            objectB = arb.objectB;
            if (objectA.permitSleep && objectB.permitSleep) {
                _unify(objectA, objectB);
            }
        }
        maxN = constraints.length;
        var con;
        for (n = 0; n < maxN; n += 1) {
            con = constraints[n];
            objectA = con.bodyA;
            objectB = con.bodyB;
            if (objectA && objectA.permitSleep) {
                _unify(objectA, con);
            }
            if (objectB && objectB.permitSleep) {
                _unify(objectB, con);
            }
        }
        var islands = [];
        var island, body, root;
        while (bodies.length > 0) {
            body = bodies.pop();
            root = _find(body);
            island = root.island;
            if (!island) {
                island = root.island = WebGLPhysicsIsland.allocate();
                islands.push(island);
                island.active = false;
            }
            body.island = island;
            island.bodies.push(body);
            island.active = island.active || body.isActive(timeStep);
            if (body.wakeTimeStamp > island.wakeTimeStamp) {
                island.wakeTimeStamp = body.wakeTimeStamp;
            }
        }
        while (constraints.length > 0) {
            con = constraints.pop();
            root = _find(con);
            island = root.island;
            if (!island) {
                island = root.island = WebGLPhysicsIsland.allocate();
                islands.push(island);
                island.active = true;
            }
            con.island = island;
            island.constraints.push(con);
            if (con.wakeTimeStamp > island.wakeTimeStamp) {
                island.wakeTimeStamp = con.wakeTimeStamp;
            }
        }
        while (islands.length > 0) {
            island = islands.pop();
            if (island.active) {
                while (island.bodies.length > 0) {
                    body = island.bodies.pop();
                    body.wakeTimeStamp = island.wakeTimeStamp;
                    bodies.push(body);
                    body.islandRoot = body;
                    body.islandRank = 0;
                    body.island = null;
                }
                while (island.constraints.length > 0) {
                    con = island.constraints.pop();
                    con.wakeTimeStamp = island.wakeTimeStamp;
                    constraints.push(con);
                    con.islandRoot = con;
                    con.islandRank = 0;
                    con.island = null;
                }
                WebGLPhysicsIsland.deallocate(island);
            }
            else {
                maxN = island.bodies.length;
                for (n = 0; n < maxN; n += 1) {
                    body = island.bodies[n];
                    body.velocity[0] = body.velocity[1] = body.velocity[2] = 0;
                    body.velocity[3] = body.velocity[4] = body.velocity[5] = 0;
                    body.active = false;
                    this.syncBody(body);
                    body.islandRoot = body;
                    body.islandRank = 0;
                }
                maxN = island.constraints.length;
                for (n = 0; n < maxN; n += 1) {
                    con = island.constraints[n];
                    con.active = false;
                    con.islandRoot = con;
                    con.islandRank = 0;
                }
            }
        }
    };
    WebGLPrivatePhysicsWorld.prototype.wakeIsland = function (island) {
        while (island.bodies.length > 0) {
            var body = island.bodies.pop();
            body.wakeTimeStamp = this.timeStamp + (this.midStep ? 0 : 1);
            this.activeBodies.push(body);
            var n;
            var arbiters = body.arbiters;
            var maxN = arbiters.length;
            for (n = 0; n < maxN; n += 1) {
                var arb = arbiters[n];
                if (!arb.active) {
                    arb.active = true;
                    this.activeArbiters.push(arb);
                }
            }
            body.active = true;
            body.island = null;
            this.syncBody(body);
        }
        while (island.constraints.length > 0) {
            var constraint = island.constraints.pop();
            constraint.wakeTimeStamp = this.timeStamp + (this.midStep ? 0 : 1);
            this.activeConstraints.push(constraint);
            constraint.active = true;
            constraint.island = null;
        }
        WebGLPhysicsIsland.deallocate(island);
    };
    WebGLPrivatePhysicsWorld.prototype.wakeRelated = function (body) {
        var constraints = body.constraints;
        var n;
        var maxN = constraints.length;
        for (n = 0; n < maxN; n += 1) {
            this.wakeConstraint(constraints[n]);
        }
        var arbiters = body.arbiters;
        maxN = arbiters.length;
        for (n = 0; n < maxN; n += 1) {
            var arb = arbiters[n];
            if (!arb.active) {
                arb.active = true;
                this.activeArbiters.push(arb);
            }
            if (arb.objectA.permitSleep && !arb.objectA.active) {
                this.wakeBody(arb.objectA);
            }
            if (arb.objectB.permitSleep && !arb.objectB.active) {
                this.wakeBody(arb.objectB);
            }
        }
    };
    WebGLPrivatePhysicsWorld.prototype.wakeBody = function (body) {
        if (body.collisionObject && !body.kinematic) {
            this.wakeRelated(body);
            this.syncBody(body);
        }
        else if (body.kinematic) {
            body.delaySleep = true;
            if (!body.active) {
                body.active = true;
                this.activeKinematics.push(body);
                this.wakeRelated(body);
                this.syncBody(body);
            }
        }
        else {
            body.wakeTimeStamp = this.timeStamp + (this.midStep ? 0 : 1);
            if (!body.active) {
                if (!body.island) {
                    body.active = true;
                    this.activeBodies.push(body);
                    this.wakeRelated(body);
                    this.syncBody(body);
                }
                else {
                    this.wakeIsland(body.island);
                }
                this.syncBody(body);
            }
        }
    };
    WebGLPrivatePhysicsWorld.prototype.syncBody = function (body) {
        var extents = this.syncExtents;
        body.calculateExtents(extents);
        if (body.collisionObject && !body.kinematic) {
            this.staticSpatialMap.update(body, extents);
        }
        else {
            if (body.active) {
                if (!body.previouslyActive) {
                    this.sleepingSpatialMap.remove(body);
                    this.dynamicSpatialMap.add(body, extents);
                }
                else {
                    this.dynamicSpatialMap.update(body, extents);
                }
            }
            else {
                if (body.previouslyActive) {
                    this.dynamicSpatialMap.remove(body);
                    this.sleepingSpatialMap.add(body, extents);
                }
                else {
                    this.sleepingSpatialMap.update(body, extents);
                }
            }
            body.previouslyActive = body.active;
        }
    };
    WebGLPrivatePhysicsWorld.prototype.wakeConstraint = function (constraint) {
        constraint.wakeTimeStamp = this.timeStamp + (this.midStep ? 0 : 1);
        if (!constraint.active) {
            if (!constraint.island) {
                constraint.active = true;
                this.activeConstraints.push(constraint);
                if (constraint.bodyA) {
                    this.wakeBody(constraint.bodyA);
                }
                if (constraint.bodyB) {
                    this.wakeBody(constraint.bodyB);
                }
            }
            else {
                this.wakeIsland(constraint.island);
            }
        }
    };
    WebGLPrivatePhysicsWorld.prototype.dynamicSweep = function (toi, timeStep, lowerBound, negRadius) {
        var objectA = toi.objectA;
        var objectB = toi.objectB;
        var axis = toi.axis;
        var vel1 = objectA.velocity;
        var axis0 = -vel1[0];
        var axis1 = -vel1[1];
        var axis2 = -vel1[2];
        var vel2 = objectB.velocity;
        axis0 += vel2[0];
        axis1 += vel2[1];
        axis2 += vel2[2];
        if (((axis0 * axis0) + (axis1 * axis1) + (axis2 * axis2)) < WebGLPhysicsConfig.DONT_NORMALIZE_THRESHOLD) {
            toi.toi = undefined;
            return;
        }
        axis[0] = axis0;
        axis[1] = axis1;
        axis[2] = axis2;
        var delta0 = -axis0;
        var delta1 = -axis1;
        var delta2 = -axis2;
        var angBias = 0;
        var radiusA, radiusB;
        if (!objectA.fixedRotation) {
            radiusA = objectA.shape.radius;
            angBias += radiusA * Math.sqrt((vel1[3] * vel1[3]) + (vel1[4] * vel1[4]) + (vel1[5] * vel1[5]));
        }
        if (!objectB.fixedRotation) {
            radiusB = objectB.shape.radius;
            angBias += radiusB * Math.sqrt((vel2[3] * vel2[3]) + (vel2[4] * vel2[4]) + (vel2[5] * vel2[5]));
        }
        if (angBias < (WebGLPhysicsConfig.CONTINUOUS_ANGULAR_BULLET / timeStep)) {
            var radius = (radiusA < radiusB) ? radiusA : radiusB;
            radius *= WebGLPhysicsConfig.CONTINUOUS_LINEAR_BULLET / timeStep;
            if (((delta0 * delta0) + (delta1 * delta1) + (delta2 * delta2)) < (radius * radius)) {
                toi.toi = undefined;
                return;
            }
        }
        var curIter = 0;
        var maxIter = 100;
        var curTOI = lowerBound;
        for (;;) {
            objectA.integratePosition(curTOI * timeStep);
            objectB.integratePosition(curTOI * timeStep);
            var nextContact = this.contactPairTest(toi, objectA.transform, objectB.transform);
            var seperation = nextContact;
            if (nextContact !== undefined) {
                seperation += negRadius;
            }
            if (seperation === undefined || seperation < WebGLPhysicsConfig.GJK_EPA_DISTANCE_THRESHOLD) {
                if (!this.seperatingTOI(toi)) {
                    toi.distance = nextContact;
                }
                else {
                    curTOI = undefined;
                }
                break;
            }
            var dot = (axis[0] * delta0) + (axis[1] * delta1) + (axis[2] * delta2);
            var denom = (angBias - dot) * timeStep;
            if (denom <= 0) {
                curTOI = undefined;
                break;
            }
            curTOI += seperation / denom;
            if (curTOI >= 1) {
                curTOI = undefined;
                break;
            }
            curIter += 1;
            if (curIter > maxIter) {
                curTOI = undefined;
                break;
            }
        }
        toi.toi = curTOI;
    };
    WebGLPrivatePhysicsWorld.prototype.seperatingTOI = function (toi) {
        var objectA = toi.objectA;
        var objectB = toi.objectB;
        var supportA = toi.closestA;
        var supportB = toi.closestB;
        var velA = objectA.velocity;
        var velB = objectB.velocity;
        var vrel0 = velA[0] - velB[0];
        var vrel1 = velA[1] - velB[1];
        var vrel2 = velA[2] - velB[2];
        if (!objectA.fixedRotation) {
            var relA0 = supportA[0] - objectA.transform[9];
            var relA1 = supportA[1] - objectA.transform[10];
            var relA2 = supportA[2] - objectA.transform[11];
            vrel0 += (velA[4] * relA2) - (velA[5] * relA1);
            vrel1 += (velA[5] * relA0) - (velA[3] * relA2);
            vrel2 += (velA[3] * relA1) - (velA[4] * relA0);
        }
        if (!objectB.fixedRotation) {
            var relB0 = supportB[0] - objectB.transform[9];
            var relB1 = supportB[1] - objectB.transform[10];
            var relB2 = supportB[2] - objectB.transform[11];
            vrel0 -= (velB[4] * relB2) - (velB[5] * relB1);
            vrel1 -= (velB[5] * relB0) - (velB[3] * relB2);
            vrel2 -= (velB[3] * relB1) - (velB[4] * relB0);
        }
        var axis = toi.axis;
        var dot = (vrel0 * axis[0]) + (vrel1 * axis[1]) + (vrel2 * axis[2]);
        return dot >= 0;
    };
    WebGLPrivatePhysicsWorld.prototype.staticSweep = function (toi, timeStep, lowerBound, negRadius) {
        var objectA = toi.objectA;
        var objectB = toi.objectB;
        var axis = toi.axis;
        var vel = objectA.velocity;
        var axis0 = -vel[0];
        var axis1 = -vel[1];
        var axis2 = -vel[2];
        if (((axis0 * axis0) + (axis1 * axis1) + (axis2 * axis2)) < WebGLPhysicsConfig.DONT_NORMALIZE_THRESHOLD) {
            toi.toi = undefined;
            return;
        }
        axis[0] = axis0;
        axis[1] = axis1;
        axis[2] = axis2;
        var delta0 = -axis0;
        var delta1 = -axis1;
        var delta2 = -axis2;
        var angBias = 0;
        if (!objectA.fixedRotationtype) {
            angBias += objectA.shape.radius * Math.sqrt((vel[3] * vel[3]) + (vel[4] * vel[4]) + (vel[5] * vel[5]));
        }
        var curIter = 0;
        var maxIter = 100;
        var curTOI = lowerBound;
        for (;;) {
            objectA.integratePosition(curTOI * timeStep);
            var nextContact = this.contactPairTest(toi, objectA.transform, objectB.transform);
            var seperation = nextContact;
            if (nextContact !== undefined) {
                seperation += negRadius;
            }
            if (seperation === undefined || seperation < WebGLPhysicsConfig.GJK_EPA_DISTANCE_THRESHOLD) {
                if (!this.seperatingTOI(toi)) {
                    toi.distance = nextContact;
                }
                else {
                    curTOI = undefined;
                }
                break;
            }
            var dot = (axis[0] * delta0) + (axis[1] * delta1) + (axis[2] * delta2);
            var denom = (angBias - dot) * timeStep;
            if (denom <= 0) {
                curTOI = undefined;
                break;
            }
            curTOI += seperation / denom;
            if (curTOI >= 1) {
                curTOI = undefined;
                break;
            }
            curIter += 1;
            if (curIter > maxIter) {
                curTOI = undefined;
                break;
            }
        }
        toi.toi = curTOI;
    };
    WebGLPrivatePhysicsWorld.prototype.performStaticTOIBase = function (slop, timeStep, events, numEvents, objectA, objectB) {
        var triangles = this.persistantTrianglesList;
        if (this.continuousFakeBody === undefined) {
            this.continuousFakeBody = {
                shape: null,
                transform: VMath.m43BuildIdentity(),
                startTransform: VMath.m43BuildIdentity()
            };
            this.continuousInvTransform = VMath.m43BuildIdentity();
            this.continuousExtents = new Float32Array(6);
        }
        var fakeBody = this.continuousFakeBody;
        var invTransform = this.continuousInvTransform;
        var extents = this.continuousExtents;
        var toi;
        if (objectB.shape.type === "TRIANGLE_MESH") {
            var triangleArray = objectB.shape.triangleArray;
            var numTriangles, k;
            if (triangleArray.spatialMap) {
                fakeBody.shape = objectA.shape;
                VMath.m43InverseOrthonormal(objectB.transform, invTransform);
                VMath.m43Mul(objectA.startTransform, invTransform, fakeBody.startTransform);
                VMath.m43Mul(objectA.endTransform, invTransform, fakeBody.transform);
                WebGLPhysicsPrivateBody.prototype.calculateSweptExtents.call(fakeBody, extents);
                numTriangles = triangleArray.spatialMap.getOverlappingNodes(extents, triangles, 0);
                for (k = 0; k < numTriangles; k += 1) {
                    toi = WebGLPhysicsTOIEvent.allocate();
                    toi.objectA = objectA;
                    toi.objectB = objectB;
                    toi.shapeA = objectA.shape;
                    toi.shapeB = WebGLPhysicsTriangleShape.allocate();
                    toi.shapeB.index = triangles[k].index;
                    triangles[k] = undefined;
                    toi.shapeB.triangleArray = objectB.shape.triangleArray;
                    toi.shapeB.collisionRadius = objectB.shape.collisionRadius;
                    toi.concave = true;
                    this.staticSweep(toi, timeStep, 0, slop);
                    if (toi.toi === undefined) {
                        WebGLPhysicsTOIEvent.deallocate(toi);
                        continue;
                    }
                    toi.frozenA = false;
                    toi.frozenB = true;
                    events[numEvents] = toi;
                    numEvents += 1;
                }
            }
            else {
                numTriangles = triangleArray.numTriangles;
                for (k = 0; k < numTriangles; k += 1) {
                    toi = WebGLPhysicsTOIEvent.allocate();
                    toi.objectA = objectA;
                    toi.objectB = objectB;
                    toi.shapeA = objectA.shape;
                    toi.shapeB = WebGLPhysicsTriangleShape.allocate();
                    toi.shapeB.index = k * WebGLPhysicsPrivateTriangleArray.prototype.TRIANGLE_SIZE;
                    toi.shapeB.triangleArray = objectB.shape.triangleArray;
                    toi.shapeB.collisionRadius = objectB.shape.collisionRadius;
                    toi.concave = true;
                    this.staticSweep(toi, timeStep, 0, slop);
                    if (toi.toi === undefined) {
                        WebGLPhysicsTOIEvent.deallocate(toi);
                        continue;
                    }
                    toi.frozenA = false;
                    toi.frozenB = true;
                    events[numEvents] = toi;
                    numEvents += 1;
                }
            }
        }
        else {
            toi = WebGLPhysicsTOIEvent.allocate();
            toi.objectA = objectA;
            toi.objectB = objectB;
            toi.shapeA = objectA.shape;
            toi.shapeB = objectB.shape;
            this.staticSweep(toi, timeStep, 0, slop);
            if (toi.toi === undefined) {
                WebGLPhysicsTOIEvent.deallocate(toi);
                return numEvents;
            }
            toi.frozenA = false;
            toi.frozenB = true;
            events[numEvents] = toi;
            numEvents += 1;
        }
        return numEvents;
    };
    WebGLPrivatePhysicsWorld.prototype.update = function () {
        var dynamicMap = this.dynamicSpatialMap;
        var staticMap = this.staticSpatialMap;
        var sleepingMap = this.sleepingSpatialMap;
        var rigidBodies = this.activeBodies;
        var kinematics = this.activeKinematics;
        var constraints = this.activeConstraints;
        var arbiters = this.activeArbiters;
        var gravity = this.gravity;
        var performance = this.performanceData;
        performance.discrete = 0;
        performance.sleepComputation = 0;
        performance.prestepContacts = 0;
        performance.prestepConstraints = 0;
        performance.integrateVelocities = 0;
        performance.warmstartContacts = 0;
        performance.warmstartConstraints = 0;
        performance.physicsIterations = 0;
        performance.integratePositions = 0;
        performance.continuous = 0;
        var prevTime = this.prevTimeStamp;
        if (prevTime === undefined) {
            this.prevTimeStamp = TurbulenzEngine.getTime() * 0.001;
            return;
        }
        var curTime = TurbulenzEngine.getTime() * 0.001;
        var timeDelta = (curTime - prevTime);
        var numSteps, timeStep;
        if (this.variableStep) {
            var minTimeStep = this.variableMinStep;
            var maxTimeStep = this.variableMaxStep;
            numSteps = Math.ceil(timeDelta / maxTimeStep);
            timeStep = (timeDelta / numSteps);
            if (timeStep < minTimeStep) {
                timeStep = minTimeStep;
                numSteps = Math.floor(timeDelta / timeStep);
            }
            if (numSteps > this.maxSubSteps && this.maxGiveUpTimeStep !== 0) {
                numSteps = Math.ceil(timeDelta / this.maxGiveUpTimeStep);
                timeStep = (timeDelta / numSteps);
            }
        }
        else {
            timeStep = this.fixedTimeStep;
            numSteps = Math.floor(timeDelta / timeStep);
            if (numSteps > this.maxSubSteps && this.maxGiveUpTimeStep !== 0) {
                numSteps = Math.ceil(timeDelta / this.maxGiveUpTimeStep);
                timeStep = (timeDelta / numSteps);
            }
        }
        if (numSteps <= 0) {
            return;
        }
        this.prevTimeStamp += (timeStep * numSteps);
        if (numSteps > this.maxSubSteps) {
            numSteps = this.maxSubSteps;
        }
        this.midStep = true;
        var limit, i;
        var body;
        limit = kinematics.length;
        for (i = 0; i < limit;) {
            body = kinematics[i];
            if (!body.computeDeltaVelocity(timeStep * numSteps, body.prevTransform, body.transform) &&
                !body.delaySleep) {
                body.active = false;
                limit -= 1;
                kinematics[i] = kinematics[limit];
                kinematics.pop();
                this.syncBody(body);
            }
            else {
                VMath.m43Copy(body.transform, body.newTransform);
                VMath.m43Copy(body.prevTransform, body.transform);
                i += 1;
            }
            body.delaySleep = false;
        }
        var substep;
        for (substep = 0; substep < numSteps; substep += 1) {
            var j, extents;
            this.timeStamp += 1;
            var preTime;
            if (this.prevTimeStep === undefined) {
                this.prevTimeStep = timeStep;
            }
            var timeStepRatio = timeStep / this.prevTimeStep;
            this.prevTimeStep = timeStep;
            limit = rigidBodies.length;
            for (i = 0; i < limit; i += 1) {
                body = rigidBodies[i];
                extents = body.extents;
                body.calculateExtents(extents);
                dynamicMap.update(body, extents);
                body.refreshInertiaTensor();
            }
            limit = kinematics.length;
            for (i = 0; i < limit; i += 1) {
                body = kinematics[i];
                extents = body.extents;
                body.calculateExtents(extents);
                dynamicMap.update(body, extents);
            }
            preTime = TurbulenzEngine.getTime() * 0.001;
            staticMap.finalize();
            dynamicMap.finalize();
            sleepingMap.finalize();
            var objects = this.persistantObjectsList;
            var numDynDyn = dynamicMap.getOverlappingPairs(objects, 0);
            var storageIndex = numDynDyn;
            var numPairs;
            limit = rigidBodies.length;
            for (i = 0; i < limit; i += 1) {
                body = rigidBodies[i];
                numPairs = staticMap.getOverlappingNodes(body.extents, objects, storageIndex + 1);
                numPairs += sleepingMap.getOverlappingNodes(body.extents, objects, storageIndex + 1 + numPairs);
                if (numPairs !== 0) {
                    objects[storageIndex] = body;
                    storageIndex += 1 + numPairs;
                    objects[storageIndex] = body;
                    storageIndex += 1;
                }
            }
            limit = kinematics.length;
            for (i = 0; i < limit; i += 1) {
                body = kinematics[i];
                numPairs = sleepingMap.getOverlappingNodes(body.extents, objects, storageIndex + 1);
                if (numPairs !== 0) {
                    objects[storageIndex] = body;
                    storageIndex += 1 + numPairs;
                    objects[storageIndex] = body;
                    storageIndex += 1;
                }
            }
            var objectA, objectB;
            for (i = 0; i < numDynDyn; i += 2) {
                objectA = objects[i];
                objectB = objects[i + 1];
                objects[i] = undefined;
                objects[i + 1] = undefined;
                if (!this.filtered(objectA, objectB)) {
                    if (objectA.id < objectB.id) {
                        this.narrowPhase(objectA.shape, objectB.shape, objectA, objectB);
                    }
                    else {
                        this.narrowPhase(objectB.shape, objectA.shape, objectB, objectA);
                    }
                }
            }
            for (i = numDynDyn; i < storageIndex;) {
                objectA = objects[i];
                objects[i] = undefined;
                i += 1;
                for (;;) {
                    objectB = objects[i];
                    objects[i] = undefined;
                    i += 1;
                    if (objectA === objectB) {
                        break;
                    }
                    if (!this.filtered(objectA, objectB)) {
                        if (objectA.id < objectB.id) {
                            this.narrowPhase(objectA.shape, objectB.shape, objectA, objectB);
                        }
                        else {
                            this.narrowPhase(objectB.shape, objectA.shape, objectB, objectA);
                        }
                    }
                }
            }
            performance.discrete += (TurbulenzEngine.getTime() * 0.001 - preTime);
            preTime = TurbulenzEngine.getTime() * 0.001;
            this.computeSleeping(timeStep);
            performance.sleepComputation += (TurbulenzEngine.getTime() * 0.001 - preTime);
            preTime = TurbulenzEngine.getTime() * 0.001;
            i = 0;
            var arb;
            while (i < arbiters.length) {
                arb = arbiters[i];
                if (!arb.objectA.active && !arb.objectB.active) {
                    arb.active = false;
                    arbiters[i] = arbiters[arbiters.length - 1];
                    arbiters.pop();
                    continue;
                }
                if (arb.refreshContacts()) {
                    arbiters[i] = arbiters[arbiters.length - 1];
                    arbiters.pop();
                    objectA = arb.objectA;
                    objectB = arb.objectB;
                    var bodyArbiters = objectA.arbiters;
                    bodyArbiters[bodyArbiters.indexOf(arb)] = bodyArbiters[bodyArbiters.length - 1];
                    bodyArbiters.pop();
                    bodyArbiters = objectB.arbiters;
                    bodyArbiters[bodyArbiters.indexOf(arb)] = bodyArbiters[bodyArbiters.length - 1];
                    bodyArbiters.pop();
                    if ((objectA.contactCallbacks && objectA.contactCallbacks.onRemovedContacts) ||
                        (objectB.contactCallbacks && objectB.contactCallbacks.onRemovedContacts)) {
                        this.contactCallbackRemovedArbiters.push(arb);
                    }
                    else {
                        WebGLPhysicsArbiter.deallocate(arb);
                    }
                    continue;
                }
                arb.preStep(timeStepRatio, timeStep);
                i += 1;
            }
            performance.prestepContacts += (TurbulenzEngine.getTime() * 0.001 - preTime);
            preTime = TurbulenzEngine.getTime() * 0.001;
            limit = constraints.length;
            for (i = 0; i < limit; i += 1) {
                constraints[i].preStep(timeStepRatio, timeStep);
            }
            performance.prestepConstraints += (TurbulenzEngine.getTime() * 0.001 - preTime);
            preTime = TurbulenzEngine.getTime() * 0.001;
            limit = rigidBodies.length;
            for (i = 0; i < limit; i += 1) {
                body = rigidBodies[i];
                body.integrateVelocity(gravity, timeStep);
            }
            performance.integrateVelocities += (TurbulenzEngine.getTime() * 0.001 - preTime);
            preTime = TurbulenzEngine.getTime() * 0.001;
            limit = arbiters.length;
            for (i = 0; i < limit; i += 1) {
                arbiters[i].applyCachedImpulses();
            }
            performance.warmstartContacts += (TurbulenzEngine.getTime() * 0.001 - preTime);
            preTime = TurbulenzEngine.getTime() * 0.001;
            limit = constraints.length;
            for (i = 0; i < limit; i += 1) {
                constraints[i].applyCachedImpulses();
            }
            performance.warmstartConstraints += (TurbulenzEngine.getTime() * 0.001 - preTime);
            preTime = TurbulenzEngine.getTime() * 0.001;
            var numIterations = 10;
            for (i = 0; i < numIterations; i += 1) {
                limit = arbiters.length;
                for (j = 0; j < limit; j += 1) {
                    arbiters[j].computeAndApplyImpulses();
                }
                limit = constraints.length;
                for (j = 0; j < limit; j += 1) {
                    constraints[j].computeAndApplyImpulses();
                }
            }
            numIterations = 3;
            limit = arbiters.length;
            for (i = 0; i < numIterations; i += 1) {
                for (j = 0; j < limit; j += 1) {
                    arbiters[j].computeAndApplyBiasImpulses();
                }
            }
            performance.physicsIterations += (TurbulenzEngine.getTime() * 0.001 - preTime);
            var unfrozen = this.persistantObjectsList2;
            var numUnfrozen = 0;
            preTime = TurbulenzEngine.getTime() * 0.001;
            limit = rigidBodies.length;
            var radius;
            var timeStepSq = timeStep * timeStep;
            var xform0, xform1;
            for (i = 0; i < limit; i += 1) {
                body = rigidBodies[i];
                body.applyBiasVelocities(timeStep);
                body.integratePosition(timeStep);
                if (!body.isActiveVelocity(WebGLPhysicsConfig.CONTINUOUS_LINEAR_SQ / timeStep, WebGLPhysicsConfig.CONTINUOUS_ANGULAR_SQ / timeStep)) {
                    body.sweepFrozen = true;
                    body.bullet = false;
                    continue;
                }
                xform0 = body.transform;
                xform1 = body.endTransform;
                xform1[0] = xform0[0];
                xform1[1] = xform0[1];
                xform1[2] = xform0[2];
                xform1[3] = xform0[3];
                xform1[4] = xform0[4];
                xform1[5] = xform0[5];
                xform1[6] = xform0[6];
                xform1[7] = xform0[7];
                xform1[8] = xform0[8];
                xform1[9] = xform0[9];
                xform1[10] = xform0[10];
                xform1[11] = xform0[11];
                radius = body.shape.radius * WebGLPhysicsConfig.CONTINUOUS_LINEAR_BULLET;
                var vel = body.velocity;
                var vlsq = ((vel[0] * vel[0]) + (vel[1] * vel[1]) + (vel[2] * vel[2])) * timeStepSq;
                var wlsq = ((vel[3] * vel[3]) + (vel[4] * vel[4]) + (vel[5] * vel[5])) * timeStepSq;
                body.bullet = vlsq > (radius * radius) ||
                    wlsq > WebGLPhysicsConfig.CONTINUOUS_ANGULAR_BULLET;
                extents = body.extents;
                body.calculateSweptExtents(extents);
                dynamicMap.update(body, extents);
                body.sweepFrozen = false;
                unfrozen[numUnfrozen] = body;
                numUnfrozen += 1;
            }
            limit = kinematics.length;
            for (i = 0; i < limit; i += 1) {
                body = kinematics[i];
                VMath.m43Copy(body.transform, body.startTransform);
                body.integratePosition(timeStep);
                extents = body.extents;
                body.calculateSweptExtents(extents);
                dynamicMap.update(body, extents);
            }
            performance.integratePositions += (TurbulenzEngine.getTime() * 0.001 - preTime);
            preTime = TurbulenzEngine.getTime() * 0.001;
            staticMap.finalize();
            dynamicMap.finalize();
            sleepingMap.finalize();
            var slop = WebGLPhysicsConfig.CONTINUOUS_SLOP + WebGLPhysicsConfig.CONTACT_SLOP;
            var events = this.persistantTOIEventList;
            var numEvents = 0;
            var toi;
            numDynDyn = dynamicMap.getOverlappingPairs(objects, 0);
            for (i = 0; i < numDynDyn; i += 2) {
                objectA = objects[i];
                objectB = objects[i + 1];
                objects[i] = undefined;
                objects[i + 1] = undefined;
                if (!((objectA.bullet || objectA.kinematic) || (objectB.bullet || objectB.kinematic)) ||
                    (objectA.sweepFrozen && objectB.sweepFrozen) ||
                    this.filtered(objectA, objectB)) {
                    continue;
                }
                if (objectA.kinematic || objectB.kinematic) {
                    if (objectA.kinematic) {
                        numEvents = this.performStaticTOIBase(slop, timeStep, events, numEvents, objectB, objectA);
                    }
                    else {
                        numEvents = this.performStaticTOIBase(slop, timeStep, events, numEvents, objectA, objectB);
                    }
                }
                else {
                    toi = WebGLPhysicsTOIEvent.allocate();
                    toi.objectA = objectA;
                    toi.objectB = objectB;
                    toi.shapeA = objectA.shape;
                    toi.shapeB = objectB.shape;
                    this.dynamicSweep(toi, timeStep, 0, slop);
                    toi.frozenA = objectA.sweepFrozen;
                    toi.frozenB = objectB.sweepFrozen;
                    events[numEvents] = toi;
                    numEvents += 1;
                }
            }
            for (i = 0; i < numUnfrozen; i += 1) {
                objectA = unfrozen[i];
                numPairs = staticMap.getOverlappingNodes(objectA.extents, objects, 0);
                numPairs += sleepingMap.getOverlappingNodes(objectA.extents, objects, numPairs);
                for (j = 0; j < numPairs; j += 1) {
                    objectB = objects[j];
                    objects[j] = undefined;
                    if (this.filtered(objectA, objectB)) {
                        continue;
                    }
                    numEvents = this.performStaticTOIBase(slop, timeStep, events, numEvents, objectA, objectB);
                }
            }
            var curTimeAlpha = 0;
            while (curTimeAlpha < 1 && numEvents > 0) {
                var minTOI = null;
                var minIndex;
                for (i = 0; i < numEvents;) {
                    toi = events[i];
                    objectA = toi.objectA;
                    objectB = toi.objectB;
                    if (objectA.sweepFrozen && objectB.sweepFrozen) {
                        numEvents -= 1;
                        if (i !== numEvents) {
                            events[i] = events[numEvents];
                            events[numEvents] = undefined;
                        }
                        WebGLPhysicsTOIEvent.deallocate(toi);
                        continue;
                    }
                    if ((toi.frozenA !== objectA.sweepFrozen) ||
                        (toi.frozenB !== objectB.sweepFrozen)) {
                        toi.frozenA = objectA.sweepFrozen;
                        toi.frozenB = objectB.sweepFrozen;
                        if (toi.frozenA) {
                            toi.objectA = objectB;
                            toi.objectB = objectA;
                            toi.shapeA = objectB.shape;
                            toi.shapeB = objectA.shape;
                            toi.frozenA = false;
                            toi.frozenB = true;
                        }
                        this.staticSweep(toi, timeStep, curTimeAlpha, slop);
                        if (toi.toi === undefined) {
                            numEvents -= 1;
                            if (i !== numEvents) {
                                events[i] = events[numEvents];
                                events[numEvents] = undefined;
                            }
                            WebGLPhysicsTOIEvent.deallocate(toi);
                            continue;
                        }
                    }
                    if (toi.toi !== undefined && (minTOI === null || (toi.toi < minTOI.toi))) {
                        minTOI = toi;
                        minIndex = i;
                    }
                    i += 1;
                }
                if (minTOI === null) {
                    break;
                }
                numEvents -= 1;
                if (minIndex !== numEvents) {
                    events[minIndex] = events[numEvents];
                    events[numEvents] = undefined;
                }
                curTimeAlpha = minTOI.toi;
                objectA = minTOI.objectA;
                objectB = minTOI.objectB;
                if (!objectA.collisionObject) {
                    if (!objectA.sweepFrozen) {
                        objectA.integratePosition(timeStep * curTimeAlpha);
                        objectA.sweepFrozen = true;
                    }
                    if (objectA.permitSleep && !objectA.active) {
                        this.wakeBody(objectA);
                    }
                }
                if (!objectB.collisionObject) {
                    if (!objectB.sweepFrozen) {
                        objectB.integratePosition(timeStep * curTimeAlpha);
                        objectB.sweepFrozen = true;
                    }
                    if (objectB.permitSleep && !objectB.active) {
                        this.wakeBody(objectB);
                    }
                }
                if (objectA.id > objectB.id) {
                    var tmp = objectA;
                    objectA = objectB;
                    objectB = tmp;
                    var tmpv = minTOI.closestA;
                    minTOI.closestA = minTOI.closestB;
                    minTOI.closestB = tmpv;
                    tmpv = minTOI.axis;
                    tmpv[0] = -tmpv[0];
                    tmpv[1] = -tmpv[1];
                    tmpv[2] = -tmpv[2];
                }
                var shapeA = objectA.shape;
                var shapeB = objectB.shape;
                arb = null;
                var arbitersA = objectA.arbiters;
                var arbitersB = objectB.arbiters;
                var arbs = (arbitersA.length <= arbitersB.length) ? arbitersA : arbitersB;
                var numArbiters = arbs.length;
                for (i = 0; i < numArbiters; i += 1) {
                    var carb = arbs[i];
                    if (carb.shapeA === shapeA && carb.shapeB === shapeB &&
                        carb.objectA === objectA && carb.objectB === objectB) {
                        arb = carb;
                        break;
                    }
                }
                var fresh = (arb === null);
                if (fresh) {
                    arb = WebGLPhysicsArbiter.allocate(shapeA, shapeB, objectA, objectB);
                }
                arb.insertContact(minTOI.closestA, minTOI.closestB, minTOI.axis, minTOI.distance, minTOI.concave);
                if (fresh) {
                    arbiters.push(arb);
                    arb.active = true;
                    objectA.arbiters.push(arb);
                    objectB.arbiters.push(arb);
                }
                if (!((objectA.kinematic && objectA.active) || (objectB.kinematic && objectB.active))) {
                    arb.skipDiscreteCollisions = true;
                }
                WebGLPhysicsTOIEvent.deallocate(minTOI);
            }
            while (numEvents > 0) {
                numEvents -= 1;
                WebGLPhysicsTOIEvent.deallocate(events[numEvents]);
                events[numEvents] = undefined;
            }
            while (numUnfrozen > 0) {
                numUnfrozen -= 1;
                objectA = unfrozen[numUnfrozen];
                unfrozen[numUnfrozen] = undefined;
                if (!objectA.sweepFrozen) {
                    objectA.integratePosition(timeStep);
                }
            }
            performance.continuous += (TurbulenzEngine.getTime() * 0.001 - preTime);
        }
        limit = kinematics.length;
        for (i = 0; i < limit; i += 1) {
            body = kinematics[i];
            VMath.m43Copy(body.newTransform, body.transform);
            VMath.m43Copy(body.newTransform, body.prevTransform);
        }
        this.updateContactCallbacks();
        this.midStep = false;
    };
    WebGLPrivatePhysicsWorld.prototype.rayTest = function (ray) {
        var group = ray.group;
        var mask = ray.mask;
        if (group === undefined) {
            group = WebGLPhysicsDevice.prototype.FILTER_DYNAMIC;
        }
        if (mask === undefined) {
            mask = WebGLPhysicsDevice.prototype.FILTER_ALL;
        }
        var exclude = ray.exclude;
        var pRay = {
            origin: ray.from,
            direction: VMath.v3Sub(ray.to, ray.from),
            maxFactor: 1.0
        };
        this.staticSpatialMap.finalize();
        this.dynamicSpatialMap.finalize();
        this.sleepingSpatialMap.finalize();
        function rayCallback(tree, obj, pRay, unusedAABBDistance, upperBound) {
            var actual_obj = obj._public;
            if (actual_obj === exclude ||
                (obj.mask & group) === 0 || (obj.group & mask) === 0) {
                return null;
            }
            pRay.maxFactor = upperBound;
            var resultObj = obj.rayTest(pRay);
            if (resultObj !== null) {
                if (obj.collisionObject) {
                    resultObj.collisionObject = actual_obj;
                    resultObj.body = null;
                }
                else {
                    resultObj.collisionObject = null;
                    resultObj.body = actual_obj;
                }
            }
            return resultObj;
        }
        var ret = AABBTree.rayTest([this.staticSpatialMap, this.dynamicSpatialMap, this.sleepingSpatialMap], pRay, rayCallback);
        if (ret !== null) {
            delete ret.factor;
        }
        return ret;
    };
    WebGLPrivatePhysicsWorld.prototype.contactPairTest = function (cache, xformA, xformB) {
        var axis = cache.axis;
        var shapeA = cache.shapeA;
        var shapeB = cache.shapeB;
        var supportA = cache.closestA;
        var supportB = cache.closestB;
        if (this.contactGJK === undefined) {
            this.contactGJK = WebGLGJKContactSolver.create();
            this.contactEPA = WebGLContactEPA.create();
        }
        if (shapeA.type === "PLANE" || shapeB.type === "PLANE") {
            var planeShape, otherShape;
            var planeXForm, otherXForm;
            if (shapeA.type === "PLANE") {
                planeShape = shapeA;
                planeXForm = xformA;
                otherShape = shapeB;
                otherXForm = xformB;
            }
            else {
                planeShape = shapeB;
                planeXForm = xformB;
                otherShape = shapeA;
                otherXForm = xformA;
            }
            var A0 = planeXForm[0];
            var A1 = planeXForm[1];
            var A2 = planeXForm[2];
            var A3 = planeXForm[3];
            var A4 = planeXForm[4];
            var A5 = planeXForm[5];
            var A6 = planeXForm[6];
            var A7 = planeXForm[7];
            var A8 = planeXForm[8];
            var A9 = planeXForm[9];
            var A10 = planeXForm[10];
            var A11 = planeXForm[11];
            var n = planeShape.normal;
            var n0 = n[0];
            var n1 = n[1];
            var n2 = n[2];
            var nd = planeShape.distance;
            var w0 = (n0 * A0) + (n1 * A3) + (n2 * A6);
            var w1 = (n0 * A1) + (n1 * A4) + (n2 * A7);
            var w2 = (n0 * A2) + (n1 * A5) + (n2 * A8);
            A0 = otherXForm[0];
            A1 = otherXForm[1];
            A2 = otherXForm[2];
            A3 = otherXForm[3];
            A4 = otherXForm[4];
            A5 = otherXForm[5];
            A6 = otherXForm[6];
            A7 = otherXForm[7];
            A8 = otherXForm[8];
            var B9 = otherXForm[9];
            var B10 = otherXForm[10];
            var B11 = otherXForm[11];
            n0 = (A0 * w0) + (A1 * w1) + (A2 * w2);
            n1 = (A3 * w0) + (A4 * w1) + (A5 * w2);
            n2 = (A6 * w0) + (A7 * w1) + (A8 * w2);
            nd += (w0 * (A9 - B9)) + (w1 * (A10 - B10)) + (w2 * (A11 - B11));
            axis[0] = n0;
            axis[1] = n1;
            axis[2] = n2;
            otherShape.localSupportWithoutMargin(axis, supportA);
            axis[0] = -n0;
            axis[1] = -n1;
            axis[2] = -n2;
            otherShape.localSupportWithoutMargin(axis, supportB);
            var dot1 = (supportA[0] * n0) + (supportA[1] * n1) + (supportA[2] * n2) - nd;
            var dot2 = (supportB[0] * n0) + (supportB[1] * n1) + (supportB[2] * n2) - nd;
            var seperation, c0, c1, c2;
            if ((dot1 * dot1) < (dot2 * dot2)) {
                c0 = supportA[0];
                c1 = supportA[1];
                c2 = supportA[2];
                seperation = dot1;
            }
            else {
                c0 = supportB[0];
                c1 = supportB[1];
                c2 = supportB[2];
                seperation = dot2;
            }
            if ((seperation < 0) !== ((dot1 * dot2) < 0)) {
                seperation = -seperation;
                w0 = -w0;
                w1 = -w1;
                w2 = -w2;
            }
            var rad = otherShape.collisionRadius;
            var prad = planeShape.collisionRadius;
            var a0 = (A0 * c0) + (A3 * c1) + (A6 * c2) + B9;
            var a1 = (A1 * c0) + (A4 * c1) + (A7 * c2) + B10;
            var a2 = (A2 * c0) + (A5 * c1) + (A8 * c2) + B11;
            var rsep = prad - seperation;
            var p0 = a0 + (w0 * rsep);
            var p1 = a1 + (w1 * rsep);
            var p2 = a2 + (w2 * rsep);
            a0 -= (w0 * rad);
            a1 -= (w1 * rad);
            a2 -= (w2 * rad);
            seperation -= rad + prad;
            if (shapeA.type === "PLANE") {
                axis[0] = -w0;
                axis[1] = -w1;
                axis[2] = -w2;
                supportA[0] = p0;
                supportA[1] = p1;
                supportA[2] = p2;
                supportB[0] = a0;
                supportB[1] = a1;
                supportB[2] = a2;
            }
            else {
                axis[0] = w0;
                axis[1] = w1;
                axis[2] = w2;
                supportA[0] = a0;
                supportA[1] = a1;
                supportA[2] = a2;
                supportB[0] = p0;
                supportB[1] = p1;
                supportB[2] = p2;
            }
            return seperation;
        }
        else {
            var gjk = this.contactGJK;
            var distance = gjk.evaluate(cache, xformA, xformB);
            if (distance === undefined) {
                distance = this.contactEPA.evaluate(gjk.simplex, cache, xformA, xformB);
            }
            if (distance !== undefined) {
                var axis0 = axis[0];
                var axis1 = axis[1];
                var axis2 = axis[2];
                var radiusA = shapeA.collisionRadius;
                var radiusB = shapeB.collisionRadius;
                supportA[0] -= axis0 * radiusA;
                supportA[1] -= axis1 * radiusA;
                supportA[2] -= axis2 * radiusA;
                supportB[0] += axis0 * radiusB;
                supportB[1] += axis1 * radiusB;
                supportB[2] += axis2 * radiusB;
                return (distance - radiusA - radiusB);
            }
            else {
                return undefined;
            }
        }
    };
    WebGLPrivatePhysicsWorld.prototype.convexSweepTest = function (params, callback) {
        if (this.sweepCache === undefined) {
            this.sweepCache = {
                axis: VMath.v3BuildZero(),
                shapeA: null,
                shapeB: null,
                closestA: VMath.v3BuildZero(),
                closestB: VMath.v3BuildZero()
            };
            this.sweepTriangle = WebGLPhysicsTriangleShape.allocate();
            this.sweepDelta = VMath.v3BuildZero();
            this.sweepFromExtents = new Float32Array(6);
            this.sweepToExtents = new Float32Array(6);
            this.sweepExtents = new Float32Array(6);
            this.sweepFakeBody = {
                shape: null,
                transform: null
            };
            this.sweepTransform = VMath.m43BuildIdentity();
            this.sweepTransform2 = VMath.m43BuildIdentity();
        }
        var cache = this.sweepCache;
        var triangle = this.sweepTriangle;
        var delta = this.sweepDelta;
        var fromExtents = this.sweepFromExtents;
        var toExtents = this.sweepToExtents;
        var extents = this.sweepExtents;
        var fakeBody = this.sweepFakeBody;
        var transform = this.sweepTransform;
        var transform2 = this.sweepTransform2;
        var that = this;
        function staticSweep(shapeA, cpos, delta, shapeB, transform, upperBound) {
            var delta0 = delta[0];
            var delta1 = delta[1];
            var delta2 = delta[2];
            var axis = cache.axis;
            var supportA = cache.closestA;
            var supportB = cache.closestB;
            axis[0] = -delta0;
            axis[1] = -delta1;
            axis[2] = -delta2;
            cache.shapeA = shapeA;
            cache.shapeB = shapeB;
            var distance = 0;
            var curIter = 0;
            var maxIter = 100;
            var contactDistance;
            var previousDistance = Number.MAX_VALUE;
            var intersected = false;
            for (;;) {
                var nextContact = that.contactPairTest(cache, cpos, transform);
                if (nextContact === undefined || nextContact < WebGLPhysicsConfig.GJK_EPA_DISTANCE_THRESHOLD) {
                    if (contactDistance !== undefined || nextContact !== undefined) {
                        if (contactDistance === undefined) {
                            contactDistance = nextContact;
                        }
                        intersected = true;
                    }
                    break;
                }
                if ((nextContact - previousDistance) >= 1) {
                    break;
                }
                previousDistance = nextContact;
                var d0 = supportB[0] - supportA[0];
                var d1 = supportB[1] - supportA[1];
                var d2 = supportB[2] - supportA[2];
                var dot = (delta0 * d0) + (delta1 * d1) + (delta2 * d2);
                if (dot <= WebGLPhysicsConfig.COPLANAR_THRESHOLD) {
                    break;
                }
                var gap = (nextContact * nextContact) / dot;
                distance += gap;
                if (distance >= upperBound) {
                    contactDistance = undefined;
                    break;
                }
                contactDistance = nextContact;
                cpos[9] += (delta0 * gap);
                cpos[10] += (delta1 * gap);
                cpos[11] += (delta2 * gap);
                if (contactDistance <= WebGLPhysicsConfig.GJK_EPA_DISTANCE_THRESHOLD) {
                    intersected = true;
                    break;
                }
                curIter += 1;
                if (curIter > maxIter) {
                    break;
                }
            }
            if (contactDistance === undefined || !intersected) {
                return null;
            }
            else {
                return {
                    hitPoint: VMath.v3Copy(supportB),
                    hitNormal: VMath.v3Copy(axis),
                    distance: distance
                };
            }
        }
        var shape = params.shape._private;
        var from = params.from;
        var to = params.to;
        var d0 = (to[9] - from[9]);
        var d1 = (to[10] - from[10]);
        var d2 = (to[11] - from[11]);
        var upperBound = Math.sqrt((d0 * d0) + (d1 * d1) + (d2 * d2));
        var scale = 1 / upperBound;
        delta[0] = d0 * scale;
        delta[1] = d1 * scale;
        delta[2] = d2 * scale;
        var group = (params.group === undefined) ? WebGLPhysicsDevice.prototype.FILTER_DYNAMIC : params.group;
        var mask = (params.mask === undefined) ? WebGLPhysicsDevice.prototype.FILTER_ALL : params.mask;
        var exclude = params.exclude;
        fakeBody.shape = shape;
        fakeBody.transform = from;
        WebGLPhysicsPrivateBody.prototype.calculateExtents.call(fakeBody, fromExtents);
        fakeBody.transform = to;
        WebGLPhysicsPrivateBody.prototype.calculateExtents.call(fakeBody, toExtents);
        extents[0] = (fromExtents[0] < toExtents[0] ? fromExtents[0] : toExtents[0]);
        extents[1] = (fromExtents[1] < toExtents[1] ? fromExtents[1] : toExtents[1]);
        extents[2] = (fromExtents[2] < toExtents[2] ? fromExtents[2] : toExtents[2]);
        extents[3] = (fromExtents[3] > toExtents[3] ? fromExtents[3] : toExtents[3]);
        extents[4] = (fromExtents[4] > toExtents[4] ? fromExtents[4] : toExtents[4]);
        extents[5] = (fromExtents[5] > toExtents[5] ? fromExtents[5] : toExtents[5]);
        this.staticSpatialMap.finalize();
        this.dynamicSpatialMap.finalize();
        this.sleepingSpatialMap.finalize();
        var objects = this.persistantObjectsList;
        var triangles = this.persistantTrianglesList;
        var staticCount = this.staticSpatialMap.getOverlappingNodes(extents, objects, 0);
        staticCount += this.dynamicSpatialMap.getOverlappingNodes(extents, objects, staticCount);
        var limit = staticCount + this.sleepingSpatialMap.getOverlappingNodes(extents, objects, staticCount);
        var minResult = null;
        var i, j;
        for (i = 0; i < limit; i += 1) {
            var object = objects[i];
            objects[i] = undefined;
            var actual_object = object._public;
            if (actual_object === exclude || object.shape === shape ||
                (object.mask & group) === 0 || (object.group & mask) === 0) {
                continue;
            }
            var result;
            var collisionShape = object.shape;
            if (collisionShape.type === "TRIANGLE_MESH") {
                var triangleArray = collisionShape.triangleArray;
                triangle.triangleArray = triangleArray;
                triangle.collisionRadius = collisionShape.collisionRadius;
                var numTriangles;
                if (triangleArray.spatialMap) {
                    VMath.m43InverseOrthonormal(object.transform, transform2);
                    VMath.m43Mul(from, transform2, transform);
                    fakeBody.transform = transform;
                    WebGLPhysicsPrivateBody.prototype.calculateExtents.call(fakeBody, fromExtents);
                    VMath.m43Mul(to, transform2, transform);
                    WebGLPhysicsPrivateBody.prototype.calculateExtents.call(fakeBody, toExtents);
                    extents[0] = (fromExtents[0] < toExtents[0] ? fromExtents[0] : toExtents[0]);
                    extents[1] = (fromExtents[1] < toExtents[1] ? fromExtents[1] : toExtents[1]);
                    extents[2] = (fromExtents[2] < toExtents[2] ? fromExtents[2] : toExtents[2]);
                    extents[3] = (fromExtents[3] > toExtents[3] ? fromExtents[3] : toExtents[3]);
                    extents[4] = (fromExtents[4] > toExtents[4] ? fromExtents[4] : toExtents[4]);
                    extents[5] = (fromExtents[5] > toExtents[5] ? fromExtents[5] : toExtents[5]);
                    numTriangles = triangleArray.spatialMap.getOverlappingNodes(extents, triangles, 0);
                    for (j = 0; j < numTriangles; j += 1) {
                        triangle.index = triangles[j].index;
                        triangles[j] = undefined;
                        VMath.m43Copy(from, transform2);
                        result = staticSweep(shape, transform2, delta, triangle, object.transform, upperBound);
                        if (result) {
                            result.collisionObject = actual_object;
                            result.body = null;
                            if (!callback || callback(result)) {
                                minResult = result;
                                upperBound = result.distance;
                            }
                        }
                    }
                }
                else {
                    numTriangles = triangleArray.numTriangles;
                    for (j = 0; j < numTriangles; j += 1) {
                        triangle.index = (j * WebGLPhysicsPrivateTriangleArray.prototype.TRIANGLE_SIZE);
                        VMath.m43Copy(from, transform2);
                        result = staticSweep(shape, transform2, delta, triangle, object.transform, upperBound);
                        if (result) {
                            result.collisionObject = actual_object;
                            result.body = null;
                            if (!callback || callback(result)) {
                                minResult = result;
                                upperBound = result.distance;
                            }
                        }
                    }
                }
            }
            else {
                VMath.m43Copy(from, transform2);
                result = staticSweep(shape, transform2, delta, collisionShape, object.transform, upperBound);
                if (result) {
                    if (object.collisionObject) {
                        result.collisionObject = actual_object;
                        result.body = null;
                    }
                    else {
                        result.collisionObject = null;
                        result.body = actual_object;
                    }
                    if (!callback || callback(result)) {
                        minResult = result;
                        upperBound = result.distance;
                    }
                }
            }
            if (upperBound < 1e-4) {
                for (j = i; j < limit; j += 1) {
                    objects[j] = undefined;
                }
                break;
            }
        }
        if (minResult) {
            delete minResult.distance;
        }
        return minResult;
    };
    WebGLPrivatePhysicsWorld.prototype.addBody = function (body) {
        if (body.world) {
            return false;
        }
        body.world = this;
        if (body.collisionObject && !body.kinematic) {
            this.collisionObjects.push(body);
            this.syncBody(body);
            return true;
        }
        if (body.kinematic) {
            this.kinematicBodies.push(body);
        }
        else {
            this.rigidBodies.push(body);
        }
        var addSleeping = !body.active;
        body.previouslyActive = true;
        body.active = false;
        body.islandRoot = body;
        body.islandRank = 0;
        if (!addSleeping) {
            this.wakeBody(body);
        }
        else {
            this.syncBody(body);
        }
        return true;
    };
    WebGLPrivatePhysicsWorld.prototype.removeBody = function (body) {
        if (body.world !== this) {
            return false;
        }
        var list, activeList;
        if (body.collisionObject && !body.kinematic) {
            list = this.collisionObjects;
        }
        else if (body.kinematic) {
            list = this.kinematicBodies;
            activeList = this.activeKinematics;
        }
        else {
            list = this.rigidBodies;
            activeList = this.activeBodies;
        }
        body.world = null;
        list[list.indexOf(body)] = list[list.length - 1];
        list.pop();
        if (activeList && body.active) {
            activeList[activeList.indexOf(body)] = activeList[activeList.length - 1];
            activeList.pop();
            this.dynamicSpatialMap.remove(body);
        }
        else if (body.collisionObject && !body.kinematic) {
            this.staticSpatialMap.remove(body);
        }
        else {
            this.sleepingSpatialMap.remove(body);
        }
        this.removeArbitersFromObject(body);
        this.removeFromContactCallbacks(body);
        var island = body.island;
        if (island) {
            var bodies = island.bodies;
            var bodyIndex = bodies.indexOf(body);
            if (bodyIndex !== -1) {
                bodies[bodyIndex] = bodies[bodies.length - 1];
                bodies.pop();
            }
            body.island = null;
        }
        return true;
    };
    WebGLPrivatePhysicsWorld.prototype.addConstraint = function (constraint) {
        if (constraint.world) {
            return false;
        }
        constraint.world = this;
        this.constraints.push(constraint);
        if (constraint.bodyA) {
            constraint.bodyA.constraints.push(constraint);
        }
        if (constraint.bodyB) {
            constraint.bodyB.constraints.push(constraint);
        }
        var addSleeping = !constraint.active;
        constraint.active = false;
        constraint.islandRoot = constraint;
        constraint.islandRank = 0;
        if (!addSleeping) {
            this.wakeConstraint(constraint);
        }
        return true;
    };
    WebGLPrivatePhysicsWorld.prototype.removeConstraint = function (constraint) {
        if (constraint.world !== this) {
            return false;
        }
        constraint.world = null;
        var list = this.constraints;
        list[list.indexOf(constraint)] = list[list.length - 1];
        list.pop();
        if (constraint.bodyA) {
            list = constraint.bodyA.constraints;
            list[list.indexOf(constraint)] = list[list.length - 1];
            list.pop();
        }
        if (constraint.bodyB) {
            list = constraint.bodyA.constraints;
            list[list.indexOf(constraint)] = list[list.length - 1];
            list.pop();
        }
        if (constraint.active) {
            list = this.activeConstraints;
            list[list.indexOf(constraint)] = list[list.length - 1];
            list.pop();
        }
        var island = constraint.island;
        if (island) {
            var constraints = island.constraints;
            var constraintIndex = constraints.indexOf(constraint);
            if (constraintIndex !== -1) {
                constraints[constraintIndex] = constraints[constraints.length - 1];
                constraints.pop();
            }
            constraint.island = null;
        }
        return true;
    };
    WebGLPrivatePhysicsWorld.prototype.flush = function () {
        // Use public remove# methods to ensure necessary side effects
        // Occur and avoid code duplication.
        while (this.rigidBodies.length > 0) {
            this.removeBody(this.rigidBodies[0]);
        }
        while (this.collisionObjects.length > 0) {
            this.removeBody(this.collisionObjects[0]);
        }
        while (this.kinematicBodies.length > 0) {
            this.removeBody(this.kinematicBodies[0]);
        }
        while (this.constraints.length > 0) {
            this.removeConstraint(this.constraints[0]);
        }
        this.timeStamp = 0;
    };
    WebGLPrivatePhysicsWorld.prototype.removeArbitersFromObject = function (object) {
        var arbiters = object.arbiters;
        var worldArbiters = this.activeArbiters;
        while (arbiters.length > 0) {
            var arb = arbiters.pop();
            var bodyArbiters = (arb.objectA === object) ? arb.objectB.arbiters : arb.objectA.arbiters;
            bodyArbiters[bodyArbiters.indexOf(arb)] = bodyArbiters[bodyArbiters.length - 1];
            bodyArbiters.pop();
            if (arb.active) {
                worldArbiters[worldArbiters.indexOf(arb)] = worldArbiters[worldArbiters.length - 1];
                worldArbiters.pop();
            }
            while (arb.contacts.length > 0) {
                var contact = arb.contacts.pop();
                WebGLPhysicsContact.deallocate(contact);
            }
            WebGLPhysicsArbiter.deallocate(arb);
        }
    };
    WebGLPrivatePhysicsWorld.prototype.removeFromContactCallbacks = function (object) {
        var contactCallbackObjects = this.contactCallbackObjects;
        var numObjects = contactCallbackObjects.length;
        var n;
        for (n = 0; n < numObjects; n += 1) {
            if (contactCallbackObjects[n] === object) {
                numObjects -= 1;
                if (n < numObjects) {
                    contactCallbackObjects[n] = contactCallbackObjects[numObjects];
                }
                contactCallbackObjects.length = numObjects;
                break;
            }
        }
        object.addedToContactCallbacks = false;
    };
    WebGLPrivatePhysicsWorld.prototype.updateContactCallbacks = function () {
        var contactCallbackObjects = this.contactCallbackObjects;
        var numObjects = contactCallbackObjects.length;
        var publicContacts = WebGLPhysicsContact.publicContacts;
        var callbackContacts = WebGLPhysicsContact.callbackContacts;
        var arbiter, objectA, objectB, contactCallbacksA, contactCallbacksB;
        var n = 0;
        while (n < numObjects) {
            var object = contactCallbackObjects[n];
            var arbiters = object.arbiters;
            var numArbiters = arbiters.length;
            if (0 === numArbiters) {
                object.contactCallbacks.added = false;
                numObjects -= 1;
                if (n < numObjects) {
                    contactCallbackObjects[n] = contactCallbackObjects[numObjects];
                }
                contactCallbackObjects.length = numObjects;
            }
            else {
                var i, j;
                for (i = 0; i < numArbiters; i += 1) {
                    arbiter = arbiters[i];
                    if (0 !== arbiter.contactFlags) {
                        var contacts = arbiter.contacts;
                        var numContacts = contacts.length;
                        while (publicContacts.length < numContacts) {
                            publicContacts[publicContacts.length] = WebGLPhysicsPublicContact.create();
                        }
                        callbackContacts.length = numContacts;
                        for (j = 0; j < numContacts; j += 1) {
                            var publicContact = publicContacts[j];
                            publicContact._private = contacts[j];
                            callbackContacts[j] = publicContact;
                        }
                        objectA = arbiter.objectA;
                        objectB = arbiter.objectB;
                        contactCallbacksA = objectA.contactCallbacks;
                        contactCallbacksB = objectB.contactCallbacks;
                        if (arbiter.contactFlags & 1) {
                            if (null !== contactCallbacksA && contactCallbacksA.onAddedContacts) {
                                contactCallbacksA.onAddedContacts(objectA._public, objectB._public, callbackContacts);
                            }
                            if (null !== contactCallbacksB && contactCallbacksB.onAddedContacts) {
                                contactCallbacksB.onAddedContacts(objectA._public, objectB._public, callbackContacts);
                            }
                        }
                        if (arbiter.contactFlags & 2) {
                            if (null !== contactCallbacksA && contactCallbacksA.onProcessedContacts) {
                                contactCallbacksA.onProcessedContacts(objectA._public, objectB._public, callbackContacts);
                            }
                            if (null !== contactCallbacksB && contactCallbacksB.onProcessedContacts) {
                                contactCallbacksB.onProcessedContacts(objectA._public, objectB._public, callbackContacts);
                            }
                        }
                        if (arbiter.contactFlags & 4) {
                            if (null !== contactCallbacksA && contactCallbacksA.onRemovedContacts) {
                                contactCallbacksA.onRemovedContacts(objectA._public, objectB._public, callbackContacts);
                            }
                            if (null !== contactCallbacksB && contactCallbacksB.onRemovedContacts) {
                                contactCallbacksB.onRemovedContacts(objectA._public, objectB._public, callbackContacts);
                            }
                        }
                        arbiter.contactFlags = 0;
                        for (j = 0; j < numContacts; j += 1) {
                            contacts[j][51] = 0;
                        }
                    }
                }
                n += 1;
            }
        }
        var contactCallbackRemovedArbiters = this.contactCallbackRemovedArbiters;
        numObjects = contactCallbackRemovedArbiters.length;
        callbackContacts.length = 0;
        for (n = 0; n < numObjects; n += 1) {
            arbiter = contactCallbackRemovedArbiters[n];
            objectA = arbiter.objectA;
            objectB = arbiter.objectB;
            contactCallbacksA = objectA.contactCallbacks;
            contactCallbacksB = objectB.contactCallbacks;
            if (null !== contactCallbacksA && contactCallbacksA.onRemovedContacts) {
                contactCallbacksA.onRemovedContacts(objectA._public, objectB._public, callbackContacts);
            }
            if (null !== contactCallbacksB && contactCallbacksB.onRemovedContacts) {
                contactCallbacksB.onRemovedContacts(objectA._public, objectB._public, callbackContacts);
            }
            WebGLPhysicsArbiter.deallocate(arbiter);
        }
        contactCallbackRemovedArbiters.length = 0;
    };
    WebGLPrivatePhysicsWorld.version = 1;
    return WebGLPrivatePhysicsWorld;
})();
var WebGLPhysicsDevice = (function () {
    function WebGLPhysicsDevice() {
        this.vendor = "Turbulenz";
        this.genObjectId = 0;
    }
    WebGLPhysicsDevice.create = function () {
        return new WebGLPhysicsDevice();
    };
    WebGLPhysicsDevice.prototype.createDynamicsWorld = function (params) {
        return WebGLPhysicsWorld.create(params);
    };
    WebGLPhysicsDevice.prototype.createPlaneShape = function (params) {
        return WebGLPhysicsPlaneShape.create(params);
    };
    WebGLPhysicsDevice.prototype.createBoxShape = function (params) {
        return WebGLPhysicsBoxShape.create(params);
    };
    WebGLPhysicsDevice.prototype.createSphereShape = function (params) {
        return WebGLPhysicsSphereShape.create(params);
    };
    WebGLPhysicsDevice.prototype.createCapsuleShape = function (params) {
        return WebGLPhysicsCapsuleShape.create(params);
    };
    WebGLPhysicsDevice.prototype.createCylinderShape = function (params) {
        return WebGLPhysicsCylinderShape.create(params);
    };
    WebGLPhysicsDevice.prototype.createConeShape = function (params) {
        return WebGLPhysicsConeShape.create(params);
    };
    WebGLPhysicsDevice.prototype.createTriangleMeshShape = function (params) {
        return WebGLPhysicsTriangleMeshShape.create(params);
    };
    WebGLPhysicsDevice.prototype.createConvexHullShape = function (params) {
        return WebGLPhysicsConvexHullShape.create(params);
    };
    WebGLPhysicsDevice.prototype.createTriangleArray = function (params) {
        return WebGLPhysicsTriangleArray.create(params);
    };
    WebGLPhysicsDevice.prototype.createCollisionObject = function (params) {
        return WebGLPhysicsCollisionObject.create(params);
    };
    WebGLPhysicsDevice.prototype.createRigidBody = function (params) {
        return WebGLPhysicsRigidBody.create(params);
    };
    WebGLPhysicsDevice.prototype.createPoint2PointConstraint = function (params) {
        return WebGLPhysicsPoint2PointConstraint.create(params);
    };
    WebGLPhysicsDevice.prototype.createHingeConstraint = function (params) {
        return (WebGLPhysicsConstraint.create("HINGE", params));
    };
    WebGLPhysicsDevice.prototype.createConeTwistConstraint = function (params) {
        return (WebGLPhysicsConstraint.create("CONETWIST", params));
    };
    WebGLPhysicsDevice.prototype.create6DOFConstraint = function (params) {
        return (WebGLPhysicsConstraint.create("D6", params));
    };
    WebGLPhysicsDevice.prototype.createSliderConstraint = function (params) {
        return (WebGLPhysicsConstraint.create("SLIDER", params));
    };
    WebGLPhysicsDevice.prototype.createCharacter = function (params) {
        return WebGLPhysicsCharacter.create(params);
    };
    WebGLPhysicsDevice.version = 1;
    return WebGLPhysicsDevice;
})();
WebGLPhysicsDevice.prototype.FILTER_DYNAMIC = 1;
WebGLPhysicsDevice.prototype.FILTER_STATIC = 2;
WebGLPhysicsDevice.prototype.FILTER_KINEMATIC = 4;
WebGLPhysicsDevice.prototype.FILTER_DEBRIS = 8;
WebGLPhysicsDevice.prototype.FILTER_TRIGGER = 16;
WebGLPhysicsDevice.prototype.FILTER_CHARACTER = 32;
WebGLPhysicsDevice.prototype.FILTER_PROJECTILE = 64;
WebGLPhysicsDevice.prototype.FILTER_USER_MIN = 128;
WebGLPhysicsDevice.prototype.FILTER_USER_MAX = 0x8000;
WebGLPhysicsDevice.prototype.FILTER_ALL = 0xffff;
