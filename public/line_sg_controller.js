define(function (require) {

  var _ = require('lodash');
  var d3 = require('d3');
  var c3 = require('./bower_components/c3');
  var moment = require('./bower_components/moment/moment');
  var module = require('ui/modules').get('kibana/line_sg', ['kibana']);

  module.controller('KbnLineVisController', function ($scope, $element, $window, Private) {

    var tabifyAggResponse = Private(require('ui/agg_response/tabify/tabify'));

    // Initialization of plugin settings
    $scope.$root.editorLine = {}; 
    $scope.$root.editorLine.axisy = ["y","y2"];
    $scope.$root.editorLine.group = ["none","grouped"];
    $scope.$root.editorLine.typeOptions = ["line","bar","spline","step","area","area-step","area-spline"];
    $scope.$root.editorLine.typeformat = ["none","time","percents","seconds","octets","euros"];
    $scope.$root.editorLine.gridpos = ["start","middle","end"];
    $scope.$root.editorLine.gridcolor = {"black":"gridblack","grey":"gridgrey","blue":"gridblue","green":"gridgreen","red":"gridred","yellow":"gridyellow"};

    // Choice of the data format
    var fty = [];
    fty[0] = { format: function (d) { return d; }};
    fty[1] = { format: function (d) { return moment(d*1000).format("HH:mm"); }};
    fty[2] = { format: function (d) { var formatValue = d3.format(".3s"); return formatValue(d) + "%"; }};
    fty[3] = { format: function (d) { var formatValue = d3.format(".3s"); return formatValue(d) + "s"; }};
    fty[4] = { format: function (d) { var formatValue = d3.format(".3s"); return formatValue(d) + "o"; }};
    fty[5] = { format: function (d) { var formatValue = d3.format(",.0f"); return formatValue(d) + "€"; }};

    // function for autoscale max/min range if enabled
    autoscale = function(value, type, axis, relation, active, subchart) {
	if (active) {
    		if ( typeof relation != "undefined") {
    			for (var key in relation) {
    				if(relation[key] == axis) {
    	    				switch(type) {
    	    				    case "min":
    							if ( min[subchart][key] < value ) {
    								value = "";
    							}
    	    				        break;
    	    				    case "max":
    							if ( max[subchart][key] > value ) {
    								value = "";						
    							}
    	    				        break;
    	    				}
    				}
    			}
    		} else {
    	    		switch(type) {
    	    		    case "min":
    					for (var key in min[subchart]) {
    						if ( min[subchart][key] < value ) {
    							value = "";
    						}
    					}
    	    		        break;
    	    		    case "max":
    					for (var key in max[subchart]) {
    						if ( max[subchart][key] > value ) {
    							value = "";						
    						}
    					}
    	    		        break;
    			}
    		}
	}
    	return value;
    }

    // Initialization of variables
    var metrics = $scope.metrics = [];
    var label = {};
    var typex = "timeseries";
    var group = [];
    var idchart = "";
    var hold ="";
    var wold= "";
    var min = [];
    var max = [];
    var subcharts = 1;
    var filters = false;
    moment.locale('fr');

    // Generation graphics C3.js
    $scope.chart = [];
    $scope.showGraph = function() {

	// find element of class chartc3 and clear
	idchart = $element.children().find(".chartc3");
	idchart.empty();
	
	for (var subchart in metrics) {
	
		console.log("----chart generator----");
	
		// create uniq id for subchart
		var RandomId = "my_chart_" + (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	
		// add subchart	
		$(idchart).append('<div id="'+ RandomId +'"></div>');
	
		// get element for subchart
		var e = $element.children().find("#" + RandomId);
	
		// init for config c3
	        var config = {};
	        config.bindto = e[0];
	        config.legend = {};
	        config.data = {};
	        config.data.x = 'data0'; 
	        config.data.columns = metrics[subchart];
	
		// check if data must be hide
		if(typeof $scope.vis.params.configLine.datahide != "undefined") {
			var obj = $scope.vis.params.configLine.datahide;
			config.data.hide = config.legend.hide = Object.keys(obj).filter(function(key) {
				return obj[key];
			});
		}
	
		config.data.names = $scope.vis.params.configLine.names;
	        config.data.types = $scope.vis.params.configLine.type;
		config.data.groups = ( $scope.vis.params.configLinegrouped != "none" ) ? [group] : "";
	        config.data.colors = $scope.vis.params.configLine.colors;
		config.data.color = ( $scope.vis.params.configLine.threshold_enable ) ? function (color, d) {
			if ( d.id && d.id === $scope.vis.params.configLine_threshold_data ) {
				if (d.value >= $scope.vis.params.configLine_threshold_value1 && d.value < $scope.vis.params.configLine_threshold_value2) {
					color = $scope.vis.params.configLine_threshold_color1;
				} else if (d.value >= $scope.vis.params.configLine_threshold_value2) {
					color = $scope.vis.params.configLine_threshold_color2;
				} 
			}
			return color;
		} : {};
	
	        config.data.axes = $scope.vis.params.configLine.axisy;
	
	        config.axis = {};
		
		// set rotation of axis X
	        config.axis.rotated = $scope.vis.params.configLine.rotated;
		if ( typex == "timeseries" ) {
		        config.axis.x = {type: 'timeseries', tick: { rotate: $scope.vis.params.configLine_xrotate, format: ( typeof $scope.vis.params.configLine.formatx != "undefined" ) ? $scope.vis.params.configLine.formatx : "%d-%m-%Y" }};
	        } else {
	        	config.axis.x = {type: 'category', tick: { rotate: $scope.vis.params.configLine_xrotate }};
		}

		// if subcharts show x label
		config.axis.x.label = ( subchart == "default") ? "" : { text: "filter by " + subchart, position: 'outer-center' };

		// set params axis Y
	        config.axis.y = {tick: ( typeof $scope.vis.params.configLine.formaty != "undefined" ) ? fty[$scope.vis.params.configLine.formaty] : "{}" };
	        config.axis.y.min = ( typeof $scope.vis.params.configLine.rangeminy != "undefined" ) ? autoscale(parseInt($scope.vis.params.configLine.rangeminy), "min", "y", $scope.vis.params.configLine.axisy, $scope.vis.params.configLine_autoscale, subchart) : "";
	        config.axis.y.max = ( typeof $scope.vis.params.configLine.rangemaxy != "undefined" ) ? autoscale(parseInt($scope.vis.params.configLine.rangemaxy), "max", "y", $scope.vis.params.configLine.axisy, $scope.vis.params.configLine_autoscale, subchart) : "";

		// set params axis Y2
	        config.axis.y2 = {show: $scope.vis.params.configLine.enableY2, tick: ( typeof $scope.vis.params.configLine.formaty2 != "undefined" ) ? fty[$scope.vis.params.configLine.formaty2] : "{}" };
	        config.axis.y2.min = ( typeof $scope.vis.params.configLine.rangeminy2 != "undefined" ) ? autoscale(parseInt($scope.vis.params.configLine.rangeminy2), "min", "y2", $scope.vis.params.configLine.axisy, $scope.vis.params.configLine_autoscale, subchart) : "";
	        config.axis.y2.max = ( typeof $scope.vis.params.configLine.rangemaxy2 != "undefined" ) ? autoscale(parseInt($scope.vis.params.configLine.rangemaxy2), "max", "y2", $scope.vis.params.configLine.axisy, $scope.vis.params.configLine_autoscale, subchart) : "";

		// set Y Grid Lines
		config.grid = {};
		config.grid.y = ( typeof $scope.vis.params.configLine.gridyval != "undefined" ) ? {lines: [{value: $scope.vis.params.configLine.gridyval, text: $scope.vis.params.configLine.gridytxt, position: $scope.vis.params.configLine.gridypos, class: $scope.vis.params.configLine.gridycolor}]} : {};

		// generate c3 chart
	        $scope.chart[subchart] = c3.generate(config);

		// resize element chart
		var elem = $(idchart[0]).closest('div.visualize-chart');
		if (subcharts < 2) {
	        	var h = elem.height();
		} else {
	        	var h = (elem.height() / subcharts);
		}
	        var w = elem.width();
	        $scope.chart[subchart].resize({height: h - 50, width: w - 50});
	}
    }

    $scope.processTableGroups = function (tableGroups) {
      tableGroups.tables.forEach(function (table) {
    	label = {};
	cols = [];
	id_filters = 1;
	metrics = [];
	filters = false;
	
	// get informations columns
        var columns = table.columns;
        columns.forEach(function (column, i) {
		cols[i] = column.title;
                var obj = column.aggConfig._opts;
                if ( typeof obj != "undefined" ) {
                        if ( obj.type == "filters") { 
				id_filters = i; 
				filters = true;
				subcharts = columns.length - (id_filters + 1);
			}
                }
        });

	// get label and check if filters
	if (filters) {

		if (subcharts < 2) { 
			// init for get metrics
			metrics["default"] = [];
    			min["default"] = {};
    			max["default"] = {};

			var v = [];
	        	var i = 0;
			v["data0"] = [];
			v["data0"].push("data0");
			var data = table.rows;

			for (var key in data) {
                	        if( v[data[key][id_filters]] === undefined ) {
                	                v[data[key][id_filters]]=[];
					v[data[key][id_filters]].push(data[key][id_filters]);
                	                label[data[key][id_filters]] = data[key][id_filters];
                	        }
				
				v[data[key][id_filters]].push(data[key][id_filters + 1]);
				v["data0"].push(data[key][0]);
        		};

			v["data0"] = _.uniq(v["data0"]);

			for (var key in v) {
				metrics["default"].push(v[key]);	
				if ( key != "data0" ){
					// max & min identification 		
					max["default"][key] = _.max(v[key]);
					min["default"][key] = _.min(v[key]);
					group[i] = key;
					i++;
				}
			}
		} else {
			var v = [];
	        	var i = 0;
			var data = table.rows;

			for (var key in data) {
                	        if( v[data[key][id_filters]] === undefined ) {
                	                v[data[key][id_filters]]=[];
					metrics[data[key][id_filters]] = [];
    					min[data[key][id_filters]] = {};
    					max[data[key][id_filters]] = {};
                	        }

				if( v[data[key][id_filters]]["data0"] === undefined ) {				
					v[data[key][id_filters]]["data0"]=[];
					v[data[key][id_filters]]["data0"].push("data0");
				}

				v[data[key][id_filters]]["data0"].push(data[key][0]);

				cols.forEach(function (column, i) {
					if (i > id_filters) {	
						if( v[data[key][id_filters]][column] === undefined ) {
							v[data[key][id_filters]][column]=[];		
							v[data[key][id_filters]][column].push(column);
							max[data[key][id_filters]][column]=[]; 	
							min[data[key][id_filters]][column]=[]; 	
						}
						v[data[key][id_filters]][column].push(data[key][id_filters + i - 1]);
                	                	label[column] = column;
					}
				});

        		};

			for (var key in v) {
				for (var k in v[key]) {
					var i = 0;
					metrics[key].push(v[key][k]);
					if ( k != "data0" ){
						// max & min identification 		
						max[key][k] = _.max(v[key][k]);
						min[key][k] = _.min(v[key][k]);
						group[i] = k;
						i++;
					}
				}
			}
		}
	
	} else {
		metrics["default"] = [];
	        cols.forEach(function (column, i) {
	        	var tmp = [];
			var data = table.rows;
			if (i > 0){
				group[i] = column;
				label[column] = column;
				tmp.push(column);
			} else {
				tmp.push('data0');
			}
	
			for (var key in data) {
	        	  	tmp.push(data[key][i]);
				if ( typeof data[key][i] === 'string') {
					typex = "category";
				}
			};
			
			if (i > 0){
				// max & min identification 		
				max[column] = _.max(tmp);
				min[column] = _.min(tmp);
			}
	
			metrics["default"].push(tmp);
		});
	}
      });

      $scope.$root.editorLine.label = label;
    };

    // Get query results ElasticSearch
    $scope.$watch('esResponse', function (resp) {
      if (resp) {
        console.log(resp);
        metrics.length = 0;
        $scope.processTableGroups(tabifyAggResponse($scope.vis, resp));
        $scope.showGraph();
      }
    });

    // Automatic resizing of graphics
    $scope.$watch(
         function () {
           var elem = $(idchart[0]).closest('div.visualize-chart');
           if (subcharts < 2) {
                   var h = elem.height();
           } else {
                   var h = (elem.height() / subcharts);
           }
           var w = elem.width();
           if (idchart.length > 0 && h > 0 && w > 0) {
        	   if (hold != h || wold != w) {
			for (var subchart in metrics) {
                    		$scope.chart[subchart].resize({height: h - 50, width: w - 50});
			}
                   	hold = elem.height();
                  	wold = elem.width();
        	   }
           }      
         }, 
         true
    );

  })
});
