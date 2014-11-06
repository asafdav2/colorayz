'use strict';

angular.module('colorayzApp')
    .service('historyService', function () {
        this.redo_list = [];
        this.undo_list = [];

        this.saveState = function (canvas, list, keep_redo) {
            keep_redo = keep_redo || false;
            if (!keep_redo) {
                this.redo_list = [];
            }

            (list || this.undo_list).push(canvas.toDataURL());
        };

        this.undo = function (canvas, ctx) {
            this.restoreState(canvas, ctx, this.undo_list, this.redo_list);
        };

        this.redo = function (canvas, ctx) {
            this.restoreState(canvas, ctx, this.redo_list, this.undo_list);
        };

        this.restoreState = function (canvas, ctx, pop, push) {
            if (pop.length) {
                this.saveState(canvas, push, true);
                var restore_state = pop.pop();
                var img = new Image();
                img.src = restore_state;

                img.onload = function () {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                }
            }
        }
    });
