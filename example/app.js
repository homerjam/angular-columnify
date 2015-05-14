angular.module('ExampleCtrl', []).controller('ExampleCtrl', ['$scope',
    function($scope) {

    	$scope.createItems = function() {
	        $scope.items = [];

	        for (var i = 0; i < 100; i++) {

	            $scope.items[i] = {
	                ratio: Math.max(0.4, Math.random() * 2),
	                color: '#' + ('000000' + Math.floor(Math.random()*16777215).toString(16)).slice(-6)
	            };

	        }
	    };

	    $scope.createItems();

    }
]);

angular.module('ExampleApp', ['hj.columnify', 'ExampleCtrl']).config(function() {});