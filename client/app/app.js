'use strict';

angular.module('colorayzApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ui.router',
  'ui.bootstrap',
  'angularSpectrumColorpicker',
  'ui.bootstrap-slider',
  'angularSpinner',
  'angularLocalStorage'
])
  .config(function ($stateProvider, $urlRouterProvider, $locationProvider) {
    $urlRouterProvider
      .otherwise('/');

    $locationProvider.html5Mode(true);
  });
