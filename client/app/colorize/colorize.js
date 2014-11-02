'use strict';

angular.module('colorayzApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('colorize', {
        url: '/colorize',
        templateUrl: 'app/colorize/colorize.html',
        controller: 'ColorizeCtrl'
      });
  });
