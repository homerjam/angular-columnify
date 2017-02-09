(function () {
  'use strict';

  /**
  * Name: angular-columnify
  * Description: Angular directive that creates balanced columns
  * Author: jameshomer85@gmail.com
  * Licence: MIT
  * Usage: http://github.com/homerjam/angular-columnify
  */

  angular.module('hj.columnify', [])

    .directive('hjColumnify', ['$log', '$timeout', '$window',
      function ($log, $timeout, $window) {
        return {
          restrict: 'AE',
          transclude: true,
          template: '<div class="columnify__item {{::itemClass}}" ng-transclude></div>',
          link: function link ($scope, $element, $attrs, controller, transcludeFn) {
            var match = $attrs.hjColumnify.match(/^\s*(.+)\s+in\s+(.*?)\s*$/);

            if (!match) {
              throw Error('Expected hjColumnify attr in form of "_item_ in _array_" but got "' + $attrs.hjColumnify + '".');
            }

            var valueIdentifier = match[1];
            var listIdentifier = match[2];

            var columns = [];
            var items = [];

            var resetItems = function (items) {
              angular.forEach(items, function (item) {
                // re-trigger autoplay
                var videos = item.element[0].querySelectorAll('video[autoplay]');
                angular.forEach(videos, function (video) {
                  video.play();
                });
              });
            };

            var defaults = {
              $element: $element,
              columns: 'auto',
              onAppend: function () {},
              resetItemsOnAppend: true,
              resetItems: resetItems,
              itemClass: 'item',
              columnClass: 'column',
            };

            var options = angular.extend(defaults, $scope.$eval($attrs.hjColumnifyOptions));

            $scope.itemClass = options.itemClass;

            $element.css('position', 'relative');
            $element.css('overflow', 'auto');
            $element.css('width', '100%');

            var autoSizer;

            $scope.auto = function (options) {
              if (!autoSizer) {
                var autoSizerWrapper = angular.element('<div style="position: absolute; width: 100%; visibility: hidden"></div>');
                $element.append(autoSizerWrapper);
                autoSizer = angular.element('<div class="columnify__auto-sizer ' + options.columnClass + '"></div>');
                autoSizerWrapper.append(autoSizer);
              }

              var _numColumns = Math.round(options.$element[0].clientWidth / autoSizer[0].clientWidth);

              if (isNaN(_numColumns)) {
                throw Error('Failed to calculate numColumns. Possibly caused by hidden parent element.');
              }

              return _numColumns;
            };

            var getOption = function (propName) {
              if (typeof (options[propName]) === 'string') {
                if (typeof ($scope[options[propName]]) === 'function') {
                  return $scope[options[propName]](options);
                } else {
                  $log.error('hjColumnify: ' + propName + ' is not a function');
                  return null;
                }
              } else if (typeof (options[propName]) === 'function') {
                return options[propName](options);
              } else if (typeof (options[propName]) === 'number') {
                return options[propName];
              } else if (typeof (options[propName]) === 'object') {
                $log.error('hjColumnify: ' + propName + ' is not valid');
              }
            };

            var templateItem = $element.children();
            $element.children().remove();

            angular.element($element[0].previousElementSibling).after(angular.element('<!-- hjColumnify -->'));

            var linker = function (item) {
              transcludeFn(item.$scope, function (clone) {
                var itemClone = templateItem.clone();
                itemClone.children().replaceWith(clone);
                item.element = itemClone;
              });
            };

            var numColumns;

            var createItems = function (list) {
              var items = [];

              for (var i = items.length; i < list.length; i++) {
                var item = {};
                item.$scope = $scope.$new();
                item.$scope.$index = i;
                items.push(item);
                linker(item);
              }

              for (i = 0; i < items.length; i++) {
                items[i].$scope[valueIdentifier] = list[i];
              }

              return items;
            };

            var shortestColumn = function (item) {
              var tollerance = 3;

              var columnHeights = columns.map(function (column, i) {
                return {
                  index: i,
                  height: column.height,
                };
              });

              columnHeights = columnHeights.sort(function (a, b) {
                var dif = Math.abs(a.height - b.height);

                if (a.height === b.height || dif < tollerance) {
                  return 0;
                } else if (a.height < b.height) {
                  return -1;
                } else {
                  return 1;
                }
              });

              return columns[columnHeights[0].index];
            };

            var setupColumns = function (numColumns) {
              $element.attr('data-columns', numColumns);

              angular.element($element[0].querySelectorAll('.columnify__column')).remove();

              columns = [];

              for (var i = 0; i < Math.max(1, numColumns); i++) {
                var column = angular.element('<div class="columnify__column ' + options.columnClass + '"/>').attr('data-column', i);

                $element.append(column);

                columns.push({
                  element: column,
                  items: [],
                  height: 0,
                });
              }
            };

            var appendItems = function (items) {
              angular.forEach(columns, function (column) {
                column.items = [];
              });

              angular.forEach(items, function (item) {
                if (item.height === undefined) { // this is the first time an item has been appended so we can't get height anyway
                  item.height = 0;
                } else if (item.height === 0) { // height was not read last time (or it was really `0`), lets check again
                  item.height = item.element[0].clientHeight;
                }

                var column = shortestColumn(item);

                item.column = column;

                column.items.push(item);
                column.height += item.height;
              });

              angular.forEach(items, function (item) {
                item.column.element.append(item.element[0]);
              });

              options.onAppend(items);

              if (options.resetItemsOnAppend) {
                options.resetItems(items);
              }
            };

            var resize = function () {
              numColumns = getOption('columns');

              if (!$scope.$$phase) {
                $scope.$apply();
              }
            };

            var watchItems;
            var watchColumns;
            var hasInit = false;

            var init = function () {
              numColumns = getOption('columns');

              setupColumns(numColumns);

              watchItems = $scope.$watch(listIdentifier, function (newItems, oldItems) {
                var reset = false;

                newItems.forEach(function (item, i) {
                  if ((!oldItems[i] || !angular.equals(oldItems[i], item)) && i < oldItems.length - 1) {
                    reset = true;
                  }
                });

                if (newItems.length === 0 || newItems.length < oldItems.length) {
                  reset = true;
                }

                if (!reset) {
                  newItems = newItems.slice(hasInit ? oldItems.length : 0, newItems.length);
                }

                newItems = createItems(newItems);

                if (reset) {
                  setupColumns(numColumns);
                  items = newItems;

                } else {
                  items = items.concat(newItems);
                }

                appendItems(newItems); // append items initially to be able to read `clientHeight`

                $timeout(function () {
                  appendItems(newItems);

                  hasInit = true;

                  $scope.$emit('hjColumnify:init');
                });
              });

              watchColumns = $scope.$watch(function () {
                return numColumns;
              }, function () {
                if (hasInit) {
                  setupColumns(numColumns);
                  appendItems(items);
                }
              });
            };

            var throttle = function (func) {
              var timeout;
              return function () {
                var context = this;
                var args = arguments;

                if ($window.requestAnimationFrame) {
                  $window.cancelAnimationFrame(timeout);
                  timeout = $window.requestAnimationFrame(function () {
                    func.apply(context, args);
                    timeout = null;
                  });

                } else {
                  $timeout.cancel(timeout);
                  timeout = $timeout(function () {
                    func.apply(context, args);
                    timeout = null;
                  }, 1000 / 16);
                }
              };
            };

            var throttledResize = throttle(resize);

            angular.element($window).on('resize', throttledResize);

            $scope.$on('$destroy', function () {
              angular.element($window).off('resize', throttledResize);

              watchItems();
              watchColumns();
            });

            $timeout(function () {
              init();

              $timeout(resize, 16);
            });
          },
        };
      },
    ]);

})();
