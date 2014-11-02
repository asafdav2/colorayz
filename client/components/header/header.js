/*jshint bitwise: false*/
'use strict';

/**
 * @ngdoc function
 * @name webappApp.controller:HeaderCtrl
 * @description
 * # HeaderCtrl
 * Controller of the navbar
 */
angular.module('colorayzApp')
    .controller('HeaderCtrl', ['$scope', '$location', function ($scope, $location) {
        $scope.isActive = function (viewLocation) {
            return viewLocation === $location.path();
        };
    }]
);
