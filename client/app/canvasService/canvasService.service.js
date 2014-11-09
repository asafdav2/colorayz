'use strict';

angular.module('colorayzApp')
    .service('canvasService', function () {

        this.getCanvasContext = function(canvas) {
            return canvas.getContext('2d');
        };

        this.getPixelsData = function(canvas) {
            return this.getCanvasContext(canvas).getImageData(0, 0, canvas.width, canvas.height);
        };

        this.getRgbaAt = function (canvas, x, y) {
            var data = this.getPixelsData(canvas).data;
            var id = 4 * (y * canvas.width + x);
            var r = data[id];
            var g = data[id + 1];
            var b = data[id + 2];
            var a = data[id + 3];
            return [r, g, b, a];
        };

        this.toGrayScale = function (canvas) {
            var width = canvas.width;
            var height = canvas.height;
            var ctx = canvas.getContext('2d');

            var imgPixels = ctx.getImageData(0, 0, width, height);
            var data = imgPixels.data;
            var i = 0;

            for (var y = 0; y < height; y++) {
                for (var x = 0; x < width; x++) {
                    var avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    data[i] = avg;
                    data[i + 1] = avg;
                    data[i + 2] = avg;
                    i = i + 4;
                }
            }

            ctx.putImageData(imgPixels, 0, 0, 0, 0, width, height);
        };

        this.getNonTransparentPixels = function (canvas) {
            var data = this.getPixelsData(canvas).data;
            var height = canvas.height;
            var width = canvas.width;
            var pixels = [];
            var i = 0;
            for (var y = 0; y !== height; ++y) {
                for (var x = 0; x !== width; ++x) {
                    var alpha = data[i + 3];
                    if (alpha > 0) {
                        pixels.push(x, y, ((data[i] & 0xff) << 16) | ((data[i + 1] & 0xff) << 8) | (data[i + 2] & 0xff));
                    }
                    i = i + 4;
                }
            }
            return pixels;
        }
    });
