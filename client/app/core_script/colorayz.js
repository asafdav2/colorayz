/*jslint bitwise: true */
/* global importScripts,postMessage */
/*jshint unused:false */
'use strict';
/**
 * Created by asaf on 10/19/14.
 */

if (typeof importScripts !== 'undefined') {
    importScripts('../../bower_components/lodash/dist/lodash.min.js');
}

var MAX_DISTANCE = 65535;
var MAX_BLEND_COLORS = 3;
var R = -9;
var EPSILON = 0.000001;

var mathUtils = {

    clip1: function (d) {
        return this.clip(d, 0.0, 1.0);
    },

    clip: function (d, low, high) {
        if (d < low) {
            return low;
        }
        if (d > high) {
            return high;
        }
        return d;
    },

    clipScaleRound: function (v) {
        return Math.round(mathUtils.clip1(v) * 255.0);
    },

    isClose: function (a, b) {
        return Math.abs(a - b) < EPSILON;
    }
};

function Coordinates(x, y) {
    this.x = x;
    this.y = y;

    this.toString = function () {
        return '(' + x + ',' + y + ')';
    };
}

var colorConversion = {

    getLuminance: function () {
        var r, g, b;
        if (arguments.length === 3) {
            r = arguments[0];
            g = arguments[1];
            b = arguments[2];
        } else {
            var rgb = arguments[0];
            r = (rgb >> 16) & 0xff;
            g = (rgb >> 8) & 0xff;
            b = (rgb) & 0xff;
        }
        return mathUtils.clip1((r * 0.299 + g * 0.587 + b * 0.144) / 255.0);
    },

    toRgb: function (y, cb, cr) {
        var r = mathUtils.clipScaleRound(y + 0.956295 * cb + 0.621024 * cr);
        var g = mathUtils.clipScaleRound(y - 0.272122 * cb - 0.647380 * cr);
        var b = mathUtils.clipScaleRound(y - 1.106989 * cb + 1.704614 * cr);
        return [r, g, b];
    },

    pack: function (r, g, b) {
        return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
    }
};

function Chrominance() {
    if (arguments.length === 2) {
        this.cb = arguments[0];
        this.cr = arguments[1];
    } else if (arguments.length === 1) {
        var rgb = arguments[0];
        var r = (rgb >> 16) & 0xff;
        var g = (rgb >> 8) & 0xff;
        var b = (rgb      ) & 0xff;

        this.cb = mathUtils.clip((r * 0.595716 + (g * -0.274453) + (b * -0.321263)) / 255.0, -0.5957, 0.5957);
        this.cr = mathUtils.clip((r * 0.211456 + (g * -0.522591) + (b * 0.311135)) / 255.0, -0.5226, 0.5226);
    }
}

var CHROMINANCE_ZERO = new Chrominance(0.0, 0.0);

function Pixel() {

    this.cb = [0.0, 0.0, 0.0];
    this.cr = [0.0, 0.0, 0.0];
    this.d = [MAX_DISTANCE, MAX_DISTANCE, MAX_DISTANCE];

    if (arguments.length === 5) {
        this.x = arguments[0];
        this.y = arguments[1];
        this.cb[0] = arguments[2];
        this.cr[0] = arguments[3];
        this.d[0] = arguments[4];
    } else if (arguments.length === 4) {
        this.x = arguments[0];
        this.y = arguments[1];
        this.cb[0] = arguments[2];
        this.cr[0] = arguments[3];
        this.d[0] = 0;
    } else if (arguments.length === 2) {
        if (typeof(arguments[0]) === 'number') {
            this.x = arguments[0];
            this.y = arguments[1];
            this.cb[0] = 0.0;
            this.cr[0] = 0.0;
            this.d[0] = MAX_DISTANCE;
        } else {
            this.x = arguments[0].x;
            this.y = arguments[0].y;
            this.cb[0] = arguments[1].cb;
            this.cr[0] = arguments[1].cr;
            this.d[0] = 0;
        }
    }

    this.getChroma = function () {
        var cb = 0.0;
        var cr = 0.0;
        var W = 0.0;
        for (var i = 0; i !== MAX_BLEND_COLORS; ++i) {
            if (this.d[i] < MAX_DISTANCE) {
                var w = this.d[i] > 0 ? Math.pow(this.d[i], R) : 1.0;
                W += w;
                cb += this.cb[i] * w;
                cr += this.cr[i] * w;
            }
        }
        return W > 0 ? new Chrominance(cb / W, cr / W) : CHROMINANCE_ZERO;
    };

    this.getCoordinates = function () {
        return new Coordinates(this.x, this.y);
    };
}

function isChromaClose(p, i, q, j) {
    return mathUtils.isClose(p.cb[i], q.cb[j]) && mathUtils.isClose(p.cr[i], q.cr[j]);
}

function blend(p, q, d, modifiedPixels, pixels) {
    var modified = false;
    for (var i = 0; i !== MAX_BLEND_COLORS; i++) {
        if (p.d[i] < MAX_DISTANCE) {
            var j = 0;
            while (j < MAX_BLEND_COLORS && (p.d[i] + d >= q.d[j])) {
                if (isChromaClose(p, i, q, j)) {
                    j = MAX_BLEND_COLORS;
                    break;
                }
                j++;
            }
            if (j < MAX_BLEND_COLORS) {
                if (!isChromaClose(p, i, q, j)) {
                    for (var k = MAX_BLEND_COLORS - 1; k !== j; k--) {
                        if (!isChromaClose(p, j, q, k - 1)) {
                            q.cb[k] = q.cb[k - 1];
                            q.cr[k] = q.cr[k - 1];
                            q.d[k] = q.d[k - 1];
                        }
                    }
                    q.cb[j] = p.cb[i];
                    q.cr[j] = p.cr[i];
                    q.d[j] = p.d[i] + d;
                    modified = true;
                }
            } else {
                break;
            }
        }
    }

    if (modified) {
        var coord = q.getCoordinates();
        modifiedPixels[coord] = coord;
        pixels[q.x][q.y] = q;
    }
}

var algorithm = {
    propagate: function (activeSet, pixels, n, m, Y, updateCallback) {
        var addToActiveSet = {};
        var ITERATIONS_TILL_UPDATE = 50000;
        var iterationsTillUpdate = ITERATIONS_TILL_UPDATE;
        while (!_.isEmpty(activeSet)) {
            for (var coord in activeSet) {
                if (activeSet.hasOwnProperty(coord)) {
                    var c = activeSet[coord];
                    var p = pixels[c.x][c.y];
                    for (var y = Math.max(0, p.y - 1); y !== Math.min(n, p.y + 2); y++) {
                        for (var x = Math.max(0, p.x - 1); x !== Math.min(m, p.x + 2); x++) {
                            if (y !== p.y || x !== p.x) {
                                var q = pixels[x][y];
                                var qy = Y[x][y];
                                var py = Y[p.x][p.y];
                                var d = Math.abs(py - qy);
                                blend(p, q, d, addToActiveSet, pixels);
                                if (--iterationsTillUpdate == 0) {
                                    iterationsTillUpdate = ITERATIONS_TILL_UPDATE;
                                    updateCallback(pixels, n, m, Y);
                                }
                            }
                        }
                    }
                    delete activeSet[coord];
                }
            }
            if (!_.isEmpty(addToActiveSet)) {
                _.extend(activeSet, addToActiveSet);
                addToActiveSet = {};
            }
        }
        return pixels;
    }
};

var createArray = function (length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) {
            arr[length - 1 - i] = createArray.apply(this, args);
        }
    }

    return arr;
};

var asColoredMap = function (colored) {
    var result = {};
    for (var i = 0; i !== colored.length; i = i + 3) {
        var x = colored[i];
        var y = colored[i + 1];
        var rgb = colored[i + 2];
        result[new Coordinates(x, y)] = rgb;
    }
    return result;
};

var writeToLinearArray = function (pixels, n, m, Y) {
    var data = new Uint32Array(n * m * 4);
    for (var y = 0; y !== n; y++) {
        var ym = y * m;
        for (var x = 0; x !== m; x++) {
            var id = (ym + x) * 4;
            var chroma = pixels[x][y].getChroma();
            var rgb = colorConversion.toRgb(Y[x][y], chroma.cb, chroma.cr);
            data[id  ] = rgb[0];
            data[id + 1] = rgb[1];
            data[id + 2] = rgb[2];
            data[id + 3] = pixels[x][y].alpha;
        }
    }
    return data;
};

function run(bw, colored, n, m, updateCallback) {
    var Y = createArray(m, n);
    var pixels = createArray(m, n);
    var activeSet = {};
    colored = asColoredMap(colored);
    for (var y = 0; y !== n; y++) {
        var ym = y * m;
        for (var x = 0; x !== m; x++) {
            var id = (ym + x) * 4;
            Y[x][y] = colorConversion.getLuminance(bw[id], bw[id + 1], bw[id + 2]);
            var coord = new Coordinates(x, y);
            if (coord in colored) {
                pixels[x][y] = new Pixel(coord, new Chrominance(colored[coord]));
                pixels[x][y].alpha = bw[id+3];
                activeSet[coord] = coord;
            } else {
                pixels[x][y] = new Pixel(x, y);
                pixels[x][y].alpha = bw[id+3];
            }
        }
    }

    return writeToLinearArray(algorithm.propagate(activeSet, pixels, n, m, Y, updateCallback), n, m, Y);
}

var onmessage = function (e) {
    var result = run(e.data.bw, e.data.colored, e.data.n, e.data.m, function(pixels, n, m, Y) {
        var data = writeToLinearArray(pixels, n, m, Y);
        postMessage(data.buffer,  [data.buffer]);
        //postMessage(writeToLinearArray(pixels,  n,  m,  Y));
    });
    postMessage(result); // TODO: should return this as transferable as well
};





