'use strict';

angular.module('colorayzApp')
  .service('cursorService', function () {

        var cursorSize = 16;
        var cursorHalfSize = cursorSize / 2;

        this.makeCursor = function(tool, color, width) {

            if (tool === 'color_picker') {
                return 'url(assets/images/eyedropper_16.png) 0 18, auto';
            }

            var cursor = document.createElement('canvas'),
                ctx = cursor.getContext('2d');

            cursor.width = cursorSize;
            cursor.height = cursorSize;

            ctx.strokeStyle = color;

            ctx.lineWidth = Math.min(4, width);
            ctx.lineCap = 'round';

            var radius = width / 2;

            ctx.beginPath();
            ctx.arc(cursorHalfSize, cursorHalfSize, radius, 0, 2 * Math.PI, false);
            if (tool === 'pencil') {
                ctx.fillStyle = color;
                ctx.fill();
            } else if (tool === 'eraser') {
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'black';
            }

            ctx.stroke();

            return 'url(' + cursor.toDataURL() + ') ' + cursorHalfSize + ' ' + cursorHalfSize + ', auto';
        }
  });
