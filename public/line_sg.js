define(function (require) {
  
  // we need to load the css ourselves
  require('plugins/line_sg/line_sg.less');

  // we also need to load the controller and used by the template
  require('plugins/line_sg/line_sg_controller');

  // register the provider with the visTypes registry
  require('ui/registry/vis_types').register(MetricVisProvider);

  function MetricVisProvider(Private) {
    var TemplateVisType = Private(require('ui/template_vis_type/template_vis_type'));
    var Schemas = Private(require('ui/vis/schemas'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'line-sg',
      title: 'Line-sg',
      description: 'This plugin allows the creation of a view with several types of graphics on Kibana Version 4.x and 5.x',
      icon: 'fa-diamond',
      template: require('plugins/line_sg/line_sg.html'),
      params: {
        defaults: {
          configLine: {},
	  configLine_threshold_data: '',
	  configLine_threshold_value1: 80,
	  configLine_threshold_color1: "#ffaa00",
	  configLine_threshold_value2: 90,
	  configLine_threshold_color2: "#ff0000",
          configLinegrouped: "none",
	  configLine_xrotate: 0,
	  configLine_autoscale: false
        },
        editor: require('plugins/line_sg/line_sg_params.html')
      },
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Y-Axis',
          min: 1,
          aggFilter: '!std_dev',
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          title: 'X-Axis',
          min: 0
          //aggFilter: ['terms','date_histogram','filters']
        }
      ])
    });
  }

  // export the provider so that the visType can be required with Private()
  return MetricVisProvider;
});
