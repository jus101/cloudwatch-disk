var util = require('util');
var aws = require('aws-sdk');
var EventEmitter = require('events').EventEmitter;

var DEFAULT_HB_INTERVAL = 5 * 60 * 1000;

var Heartbeater = function(aws_config, config) {
  EventEmitter.call(this);
  this.config = config;
  this.cloudWatch = new aws.CloudWatch(aws_config);
}

util.inherits(Heartbeater, EventEmitter);

Heartbeater.prototype.start = function() {
  if(this.hbTimer) return;
  this.pulse();
}

Heartbeater.prototype.pulse = function() {
  console.log('pulse');
  this.hbTimer = setTimeout(this.send.bind(this), this.config.interval || DEFAULT_HB_INTERVAL);
}

Heartbeater.prototype.send = function() {
  var date = new Date();
  var params = {
    Namespace: this.config.namespace || 'Heartbeat',
    MetricData: [
      {
        MetricName: this.config.metricName || 'Heartbeat',
        Timestamp: date,
        Unit: 'None',
        Value: 1,
        Dimensions: [{
          Name: 'Hostname',
          Value: this.config.hostName || process.env.HOSTNAME
        },
        {
          Name: 'ProcessTitle',
          Value: this.config.processTitle || process.title
        }]
      },
      {
        MetricName: 'Uptime',
        Timestamp: date,
        Unit: 'Seconds',
        Value: process.uptime(),
        Dimensions: [{
          Name: 'Hostname',
          Value: this.config.hostName || process.env.HOSTNAME
        },
        {
          Name: 'ProcessTitle',
          Value: this.config.processTitle || process.title
        }]
      }
    ]
  };

  console.log('put metric data', params);

  this.cloudWatch.putMetricData(params, function(err, data){
    if(err) {
      console.error('error', err);
      this.emit('error', err);
    } else {
      console.log('heartbeat', err);
      this.emit('heartbeat', data);
    }
    this.pulse();
  }.bind(this));
}

module.exports.Heartbeater = Heartbeater;
module.exports.createHeartbeater = function(aws_config, config) {
  var h = new Heartbeater(aws_config, config);
  h.start();
  return h;
}
