(function() {
    'use strict';

    angular.module('angular-columnify', [])
        .directive('ngColumnify', ['$log', '$timeout', '$window',
            function($log, $timeout, $window) {
                return {
                    restrict: 'A',
                    transclude: true,
                    template: '<div class="item" ng-transclude></div>',
                    compile: function compile(tElement, tAttrs, transclude) {
                        return function link(scope, iElement, iAttrs, controller, transcludeFn) {
                            var expression = iAttrs.ngColumnify;
                            var match = expression.match(/^\s*(.+)\s+in\s+(.*?)\s*$/);
                            var valueIdentifier, listIdentifier;

                            if (!match) {
                                $log.error('Expected ngColumnify in form of "_item_ in _array_" but got "' + expression + '".');
                            }

                            valueIdentifier = match[1];
                            listIdentifier = match[2];

                            var resetItems = function(items) {
                                angular.forEach(items, function(item) {

                                    // re-trigger autoplay
                                    var videos = item.element[0].querySelectorAll('video[autoplay]');
                                    angular.forEach(videos, function(video) {
                                        video.play();
                                    });

                                });
                            }

                            var defaults = {
                                $element: iElement,
                                $columns: [],
                                columns: 'auto',
                                onAppend: function(items) {},
                                resetItemsOnAppend: true,
                                resetItems: resetItems
                            };

                            var options = angular.extend(defaults, scope.$eval(iAttrs.ngColumnifyOptions));

                            var _prop = function(propName) {
                                if (typeof(options[propName]) === 'string') {
                                    if (typeof(scope[options[propName]]) === 'function') {
                                        return scope[options[propName]](options);
                                    } else {
                                        $log.error('ngColumnify: ' + propName + ' is not a function');
                                        return null;
                                    }
                                } else if (typeof(options[propName]) === 'function') {
                                    return options[propName](options);
                                } else if (typeof(options[propName]) === 'number') {
                                    return options[propName];
                                } else if (typeof(options[propName]) === 'object') {
                                    $log.error('ngColumnify: ' + propName + ' is not valid');
                                }
                            };

                            var templateItem = iElement.children();

                            iElement.children().remove();

                            angular.element(iElement[0].previousElementSibling).after(angular.element('<!-- ngColumnify -->'));

                            var _linker = function(item) {
                                transcludeFn(item.scope, function(clone) {
                                    var itemClone = templateItem.clone();
                                    itemClone.children().replaceWith(clone);
                                    item.element = itemClone;
                                });
                            };

                            var items;

                            var _createItems = function(list) {
                                var _items = [];

                                for (var i = _items.length; i < list.length; i++) {
                                    var item = {};
                                    item.scope = scope.$new();
                                    item.scope.$index = i;
                                    _items.push(item);

                                    _linker(item);
                                }

                                for (i = 0; i < _items.length; i++) {
                                    _items[i].scope[valueIdentifier] = list[i];

                                    if (!_items[i].scope.$$phase) {
                                        _items[i].scope.$apply();
                                    }
                                }

                                return _items;
                            };

                            var _shortestCol = function() {
                                var shortest = 0,
                                    height = options.$columns[0].height;

                                for (var i = 1; i < options.$columns.length; i++) {
                                    if (options.$columns[i].height < height) {
                                        shortest = i;
                                        height = options.$columns[i].height;
                                    }
                                }

                                return options.$columns[shortest];
                            };

                            var _setupColumns = function(cols) {
                                iElement.attr('data-columns', cols);

                                angular.element(iElement[0].querySelectorAll('.column')).remove();

                                options.$columns = [];
                                for (var i = 0; i < Math.max(1, cols); i++) {
                                    var col = angular.element('<div class="column"/>');
                                    iElement.prepend(col);
                                    options.$columns.unshift({
                                        $el: col,
                                        items: [],
                                        height: 0
                                    });
                                }
                            };

                            var _appendItems = function(_items) {
                                angular.forEach(_items, function(item, i) {
                                    var col = _shortestCol();

                                    if (item.height === undefined) { // this is the first time an item has been appended so we can't get height anyway
                                        item.height = 0;

                                    } else if (item.height === 0) { // height was not read last time (or it was really `0`), lets check again
                                        item.height = item.element[0].clientHeight;
                                    }

                                    item.col = col;

                                    col.height += item.height;
                                });

                                angular.forEach(_items, function(item, i) {
                                    item.col.$el.append(item.element[0]);
                                });

                                options.onAppend(_items);

                                if (options.resetItemsOnAppend) {
                                    options.resetItems(_items);
                                }
                            };

                            var _resize = function() {
                                scope.columns = _prop('columns');

                                if (!scope.$$phase) {
                                    scope.$apply();
                                }
                            };

                            scope.auto = function(options) {
                                return Math.round(options.$element[0].clientWidth / options.$columns[0].$el[0].clientWidth);
                            };

                            var watchItems, watchCols, hasInit = false;

                            _setupColumns(1); // setup columns initially for `auto` to work

                            $timeout(function(){
                                scope.columns = _prop('columns');

                                watchItems = scope.$watch(listIdentifier, function(n, o) {
                                    items = _createItems(n);

                                    _setupColumns(scope.columns);

                                    _appendItems(items); // append items initially to be able to read `clientHeight`

                                    $timeout(function() {
                                        _appendItems(items);

                                        hasInit = true;
                                    });
                                });

                                watchCols = scope.$watch('columns', function(n, o) {
                                    if (hasInit) {
                                        _setupColumns(scope.columns);

                                        _appendItems(items);
                                    }
                                });
                            });

                            var throttleOnAnimationFrame = function(func) {
                                var timeout;
                                return function() {
                                    var context = this,
                                        args = arguments;
                                    $window.cancelAnimationFrame(timeout);
                                    timeout = $window.requestAnimationFrame(function() {
                                        func.apply(context, args);
                                        timeout = null;
                                    });
                                };
                            };

                            var _throttledResize = throttleOnAnimationFrame(_resize);

                            angular.element($window).on('resize', _throttledResize);

                            scope.$on('$destroy', function() {
                                angular.element($window).off('resize', _resize);
                                watchItems();
                                watchCols();
                            });

                        };
                    }
                };
            }
        ]);

})();
