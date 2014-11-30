/*jslint bitwise: true */
/* global confirm */
'use strict';

angular.module('colorayzApp')
  .controller('ColorizeCtrl', ['$scope', 'usSpinnerService', 'canvasService', 'historyService', 'cursorService', function ($scope, usSpinnerService, canvasService, historyService, cursorService) {

        var stage;
        var drawingCanvas;
        var oldMidPt;
        var oldPt;

        $scope.samples = ['rose', 'peppers', 'garfield'];

        $scope.brushWidthOptions = {
            min: 1,
            max: 10,
            step: 1,
            tooltip: 'always'
        };

        $scope.$watch('brushWidth', function() {
            updateCursor();
        });

        $scope.srcCanvas = $('#srcCanvas')[0];
        $scope.dstCanvas = $('#dstCanvas')[0];
        $scope.backCanvas = $('#backCanvas')[0];

        $scope.tool = 'pencil';
        $scope.brushColor = '#CC0A0A';
        $scope.brushWidth = 3;

        updateCursor();
        init();

        function getCtx(canvas) {
            return canvas.getContext('2d');
        }

        function srcCanvasCtx() {
            return getCtx($scope.srcCanvas);
        }

        function getPixelsData(canvas) {
            return getCtx(canvas).getImageData(0, 0, canvas.width, canvas.height);
        }

        function updateCursor() {
            $scope.srcCanvas.style.cursor = cursorService.makeCursor($scope.tool, $scope.brushColor, $scope.brushWidth);
        }

        function init() {
          stage = new createjs.Stage($scope.srcCanvas);
          stage.autoClear = false;
          stage.enableDOMEvents(true);

          createjs.Touch.enable(stage);
          createjs.Ticker.setFPS(60);

          drawingCanvas = new createjs.Shape();

          stage.addEventListener("stagemousedown", handleMouseDown);
          stage.addEventListener("stagemouseup", handleMouseUp);

          stage.addChild(drawingCanvas);
          stage.update();

          document.onkeydown = KeyPress;
        }

        function KeyPress(e) {
            var evtobj = window.event? event : e;
            if (evtobj.keyCode == 90 && evtobj.ctrlKey) $scope.undo();
            if (evtobj.keyCode == 89 && evtobj.ctrlKey) $scope.redo();
        }

        function handleMouseDown(event) {
            if (event.nativeEvent.button === 0 || event.nativeEvent.type === 'touchstart') {
                oldPt = new createjs.Point(stage.mouseX, stage.mouseY);
                oldMidPt = oldPt;
                if ($scope.tool === 'color_picker') {
                    var rgba = canvasService.getRgbaAt($scope.srcCanvas, stage.mouseX, stage.mouseY)
                    if (rgba[3] > 0) {
                        $scope.brushColor = rgbToHex(rgba);
                        $scope.$apply();
                        return;
                    }
                }
                historyService.saveState($scope.srcCanvas);
                stage.addEventListener("stagemousemove", handleMouseMove);
            }
        }

        function handleMouseMove(event) {
            var midPt = new createjs.Point(oldPt.x + stage.mouseX >> 1, oldPt.y + stage.mouseY >> 1);

            drawingCanvas.graphics.clear().setStrokeStyle($scope.brushWidth, 'round', 'round').beginStroke($scope.brushColor).moveTo(midPt.x, midPt.y).curveTo(oldPt.x, oldPt.y, oldMidPt.x, oldMidPt.y);

            oldPt.x = stage.mouseX;
            oldPt.y = stage.mouseY;

            oldMidPt.x = midPt.x;
            oldMidPt.y = midPt.y;

            stage.update();
        }

        function handleMouseUp(event) {
            stage.removeEventListener("stagemousemove" , handleMouseMove);
        }

        function rgbToHex(rgb) {
            var componentToHex = function(c) {
                var hex = c.toString(16);
                return hex.length == 1 ? "0" + hex : hex;
            };

            return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
        }

        function setSize(canvas, height, width) {
            canvas.height = height;
            canvas.width = width;
        }

        $scope.load = function (image) {

            $scope.reset();
            var imgObj = new Image();
            imgObj.src = image;

            imgObj.onload = function () {

                $("#noImageWarn").hide();

                $scope.height = this.height;
                $scope.width = this.width;
                setSize($scope.backCanvas, this.height, this.width);
                setSize($scope.srcCanvas, this.height, this.width);
                getCtx($scope.backCanvas).drawImage(imgObj, 0, 0);

                var bgRect = $scope.backCanvas.getBoundingClientRect();
                var rowRect = $("#srcCanvasRow")[0].getBoundingClientRect();
                var left = (rowRect.width - bgRect.width) / 2;
                left = left + 'px';
                $scope.srcCanvas.style['margin-left'] = left;
                $scope.backCanvas.style['margin-left'] = left;
                $scope.dstCanvas.style['margin-left'] = left;
                $('#spinner')[0].style.left = (bgRect.width / -2) + 'px';
                $('#spinner')[0].style.top = (bgRect.height / -2) + 'px';

                canvasService.toGrayScale($scope.backCanvas);
                $scope.bwData = getPixelsData($scope.backCanvas).data;
            };
        };

        $scope.fileChanged = function (element) {

            var reader = new FileReader();
            reader.onload = function () {
                $scope.load(event.target.result);
            };
            reader.readAsDataURL(element.files[0]);
        };

        $scope.colorize = function () {
            var colored = canvasService.getNonTransparentPixels($scope.srcCanvas);
            var w = new Worker('./app/core_script/colorayz.js');
            w.postMessage({'bw': $scope.bwData, 'colored': colored, 'n': $scope.height, 'm': $scope.width});
            $scope.startSpin();
            w.onmessage = function (e) {
                setSize($scope.dstCanvas, $scope.height, $scope.width);
                var dstData = getPixelsData($scope.dstCanvas);
                var data = new Uint32Array(e.data);
                for (var i = 0; i !== data.length; i++) {
                    dstData.data[i] = data[i];
                }
                getCtx($scope.dstCanvas).putImageData(dstData, 0, 0);
                $scope.stopSpin();
            };
            w.onerror = function (e) {
                console.error(e);
                $scope.stopSpin();
            };
        };

        $scope.colorChange = function (color) {
            $scope.brushColor = color.toHexString();
            updateCursor();
            $scope.$apply();
        };

        $scope.selectTool = function (tool) {
            if (tool === $scope.tool) {
                return;
            }
            $scope.tool = tool;
            var ctx = srcCanvasCtx();
            switch (tool) {
                case 'pencil':
                    ctx.globalCompositeOperation = $scope.prevGlobalCompositeOperation;
                    ctx.strokeStyle = $scope.brushColor;
                    break;
                case 'eraser':
                    $scope.prevGlobalCompositeOperation = ctx.globalCompositeOperation;
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.strokeStyle = 'rgba(0,0,0,1.0)';
                    break;
            }
            updateCursor();
        };

        $scope.clear = function () {
            if (confirm('Are you sure you want to clear all markings?')) {
                srcCanvasCtx().clearRect(0, 0, $scope.width, $scope.height);
            }
        };

        $scope.reset = function () {
            srcCanvasCtx().clearRect(0, 0, $scope.width, $scope.height);
            $scope.dstCanvas.getContext('2d').clearRect(0, 0, $scope.width, $scope.height);
            setSize($scope.dstCanvas, 0, 0);
        };

        angular.element('#colorPicker').spectrum({
            showInput: true,
            showInitial: true,
            preferredFormat: 'rgb',
            showPalette: true,
            palette: [ ],
            showSelectionPalette: true,
            change: $scope.colorChange,
            containerClassName: 'spectrumContainer'
        });

        $scope.undo = function() {
            historyService.undo($scope.srcCanvas,  srcCanvasCtx());
        };

        $scope.redo = function() {
            historyService.redo($scope.srcCanvas,  srcCanvasCtx());
        };

        $scope.startSpin = function () {
            usSpinnerService.spin('colorization-spinner');
        };

        $scope.stopSpin = function () {
            usSpinnerService.stop('colorization-spinner');
        };
  }]);
