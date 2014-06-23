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

                            var defaults = {
                                $element: iElement,
                                $columns: [],
                                columns: 'auto',
                                onAppend: function(items) {}
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

                            var items = [];

                            var _createItems = function(list) {
                                for (var i = items.length; i < list.length; i++) {
                                    var item = {};
                                    item.scope = scope.$new();
                                    items.push(item);

                                    _linker(item);
                                }

                                for (i = 0; i < items.length; i++) {
                                    items[i].scope[valueIdentifier] = list[i];

                                    if (!items[i].scope.$$phase) {
                                        items[i].scope.$apply();
                                    }
                                }
                            };

                            var _shortestCol = function() {
                                var shortest = 0;
                                for (var i in options.$columns) {
                                    if (i > 0) {
                                        if (options.$columns[i].height <= options.$columns[i - 1].height && options.$columns[i - 1].height > 0) {
                                            shortest = i;
                                        }
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
                                        height: 0
                                    });
                                }
                            };

                            var _appendItems = function(_items) {
                                angular.forEach(_items, function(item, i) {
                                    var col = _shortestCol();

                                    col.$el.append(item.element);

                                    col.height += item.element[0].clientHeight;
                                });

                                options.onAppend(_items);
                            };

                            var _flow = function(_items) {
                                var tmp = angular.element('<div class="temp" style="visibility: hidden;" />');

                                iElement.append(tmp);

                                angular.forEach(_items, function(item, i) {
                                    tmp.append(item.element);
                                });

                                $timeout(function() {
                                    _appendItems(_items);

                                    tmp.remove();
                                });
                            };

                            var _reflow = function() {
                                _setupColumns(scope.columns);

                                _appendItems(items);
                            };

                            var _resize = function() {
                                scope.columns = _prop('columns');

                                if (!scope.$$phase) {
                                    scope.$apply();
                                }
                            };

                            var init = true,
                                watchItems, watchCols;

                            _setupColumns(1);

                            scope.auto = function(options) {
                                return Math.round(options.$element[0].clientWidth / options.$columns[0].$el[0].clientWidth);
                            };

                            $timeout(function() {

                                scope.columns = _prop('columns');

                                watchItems = scope.$watch(listIdentifier, function(n, o) {
                                    _createItems(n);

                                    var newItems = [];

                                    for (var i = 0; i < n.length - (init ? 0 : o.length); i++) {
                                        newItems.push(items[(init ? 0 : o.length) + i]);
                                    }

                                    _flow(newItems);

                                    init = false;
                                });

                                watchCols = scope.$watch('columns', function(n, o) {
                                    _reflow();
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
