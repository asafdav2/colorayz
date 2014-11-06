'use strict';

describe('Service: cursorService', function () {

  // load the service's module
  beforeEach(module('colorayzApp'));

  // instantiate service
  var cursorService;
  beforeEach(inject(function (_cursorService_) {
    cursorService = _cursorService_;
  }));

  it('should do something', function () {
    expect(!!cursorService).toBe(true);
  });

});
