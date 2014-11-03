/*jslint bitwise: true */
/* global confirm */
'use strict';

angular.module('colorayzApp')
  .controller('ColorizeCtrl', ['$scope', 'usSpinnerService', function ($scope, usSpinnerService) {

        $scope.samples = ['rose', 'baby', 'bird'];

        $scope.startSpin = function () {
            usSpinnerService.spin('colorization-spinner');
        };

        $scope.stopSpin = function () {
            usSpinnerService.stop('colorization-spinner');
        };

        function relMouseCoords(event) {
            var totalOffsetX = 0;
            var totalOffsetY = 0;
            var currentElement = event.target;

            do {
                totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
                totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
                currentElement = currentElement.offsetParent;
            }
            while (currentElement);

            return {
                x: event.pageX - totalOffsetX,
                y: event.pageY - totalOffsetY
            };
        }

        HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

        $scope.brushWidthOptions = {
            min: 1,
            max: 10,
            step: 1,
            tooltip: 'always'
        };

        $scope.srcCanvas = $('#srcCanvas')[0];
        $scope.dstCanvas = $('#dstCanvas')[0];
        $scope.backCanvas = $('#backCanvas')[0];

        $scope.brushColor = '#CC0A0A';
        $scope.brushWidth = 3;

        function getCanvasContext(canvas) {
            return canvas.getContext('2d');
        }

        function getPixelsData(canvas) {
            return getCanvasContext(canvas).getImageData(0, 0, canvas.width, canvas.height);
        }

        var el = $scope.srcCanvas;
        var ctx = el.getContext('2d');

        var isDrawing = false,
            prevX = 0,
            currX = 0,
            prevY = 0,
            currY = 0;

        function draw() {
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(currX, currY);

            ctx.strokeStyle = $scope.brushColor;
            ctx.lineWidth = $scope.brushWidth;
            ctx.stroke();
            ctx.closePath();
        }

        function updateLocation(e) {
            var coords = $scope.srcCanvas.relMouseCoords(e);
            prevX = currX;
            prevY = currY;
            currX = coords.x;
            currY = coords.y;
        }

        function findxy(res) {
            switch (res) {
                case 'down':
                    return function (e) {
                        isDrawing = true;
                        updateLocation(e);
                        ctx.beginPath();
                        ctx.fillStyle = $scope.brushColor;
                        ctx.lineJoin = ctx.lineCap = 'round';
                        ctx.lineWidth = $scope.brushWidth;
                        ctx.fillRect(currX, currY, 2, 2);
                        ctx.closePath();
                    };
                case 'up':
                case 'out':
                    return function () {
                        isDrawing = false;
                    };
                case 'move':
                    return function (e) {
                        if (isDrawing) {
                            updateLocation(e);
                            draw();
                        }
                    };
            }
        }

        el.addEventListener('mousemove', findxy('move'), false);
        el.addEventListener('mousedown', findxy('down'), false);
        el.addEventListener('mouseup', findxy('up'), false);
        el.addEventListener('mouseout', findxy('out'), false);

        $scope.load = function (image) {

            $scope.reset();
            var imgObj = new Image();
            imgObj.src = image;

            imgObj.onload = function () {

                $scope.height = this.height;
                $scope.width = this.width;
                setSize($scope.backCanvas, this.height, this.width);
                setSize($scope.srcCanvas, this.height, this.width);

//                    var bgRect = $scope.backCanvas.getBoundingClientRect();
//                    var rowRect = $("#srcCanvasRow")[0].getBoundingClientRect();
//                    var left = bgRect.left + (rowRect.width - bgRect.width) / 2;
//                    left = left + 'px';
//                    $scope.srcCanvas.style.left = left;
//                    $scope.backCanvas.style.left = left;

                $scope.backCanvas.getContext('2d').drawImage(imgObj, 0, 0);
                var imgPixels = $scope.backCanvas.getContext('2d').getImageData(0, 0, $scope.width, $scope.height);

                for(var y = 0; y < imgPixels.height; y++){
                    for(var x = 0; x < imgPixels.width; x++){
                        var i = (y * 4) * imgPixels.width + x * 4;
                        var avg = (imgPixels.data[i] + imgPixels.data[i + 1] + imgPixels.data[i + 2]) / 3;
                        imgPixels.data[i] = avg;
                        imgPixels.data[i + 1] = avg;
                        imgPixels.data[i + 2] = avg;
                    }
                }

                $scope.backCanvas.getContext('2d').putImageData(imgPixels, 0, 0, 0, 0, imgPixels.width, imgPixels.height);
                $scope.bwData = getPixelsData($scope.backCanvas).data; // TODO
            };
        };

        $scope.fileChanged = function (element) {

            var reader = new FileReader();
            reader.onload = function () {
                $scope.load(event.target.result);
            };
            reader.readAsDataURL(element.files[0]);
        };

        function setSize(canvas, height, width) {
            canvas.height = height;
            canvas.width = width;
        }

        $scope.colorize = function () {
            var colored = getMarkedPixels();
            var w = new Worker('./app/core_script/colorayz.js');
            w.postMessage({'bw': $scope.bwData, 'colored': colored, 'n': $scope.height, 'm': $scope.width});
            $scope.startSpin();
            w.onmessage = function (e) {
                setSize($scope.dstCanvas, $scope.height, $scope.width);
                var dstData = getPixelsData($scope.dstCanvas);
                for (var i = 0; i !== e.data.length; i++) {
                    dstData.data[i] = e.data[i];
                }
                getCanvasContext($scope.dstCanvas).putImageData(dstData, 0, 0);
                $scope.stopSpin();
            };
            w.onerror = function (e) {
                console.error(e);
            };
        };

        $scope.colorChange = function (color) {
            $scope.brushColor = color.toHexString();
            $scope.$apply();
        };

        $scope.choosePencil = function () {
            ctx.globalCompositeOperation = $scope.prevGlobalCompositeOperation;
            ctx.strokeStyle = $scope.brushColor;
        };

        $scope.chooseEraser = function () {
            $scope.prevGlobalCompositeOperation = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1.0)';
        };

        $scope.choosePicker = function () {
            $scope.tool = 'picker';
        };

        $scope.clear = function () {
            if (confirm('Are you sure you want to clear all markings?')) {
                $scope.srcCanvas.getContext('2d').clearRect(0, 0, $scope.width, $scope.height);
            }
        };

        $scope.reset = function () {
            //$scope.backCanvas.getContext('2d').clearRect(0, 0, $scope.width, $scope.height);
            $scope.backCanvas.width = $scope.backCanvas.width;
            $scope.srcCanvas.getContext('2d').clearRect(0, 0, $scope.width, $scope.height);
            $scope.dstCanvas.getContext('2d').clearRect(0, 0, $scope.width, $scope.height);
        };

        function getMarkedPixels() {
            var data = getPixelsData($scope.srcCanvas).data;
            var height = $scope.height;
            var width = $scope.width;
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

        angular.element('#colorPicker').spectrum({
            showInput: true,
            preferredFormat: 'rgb',
            change: $scope.colorChange
        });

  }]);
