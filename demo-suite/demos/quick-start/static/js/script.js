/**
 * @fileoverview Quick Start JavaScript.
 *
 * Initializes instances, updates UI display to show running time and number
 * of running instances. Stops running instances.
 */

$(document).ready(function() {
  var quickStart = new QuickStart();
  quickStart.initialize();
});

/**
 * Quick Start class.
 * @constructor
 */
var QuickStart = function() { };

// Recovery mode flag, initialized to false.
var IP_ADDR = null;
var MASTER = 'quick-start-0';
var Recovering = false;
var Web_sock = null;
var Repeating_tests = null;
var Req_count = 0;
var Data = [];

/**
 * Initialize the UI and check if there are instances already up.
 */
QuickStart.prototype.initialize = function() {
  var gce = new Gce('/' + DEMO_NAME + '/instance',
      '/' + DEMO_NAME + '/instance',
      '/' + DEMO_NAME + '/cleanup');

  gce.getInstanceStates(function(data) {
    if (data['instances']['quick-start-0']) {
      IP_ADDR = data['instances']['quick-start-0']['ipaddr'];
    }
    
    var numInstances = parseInt($('#num-instances').val(), 10);
    var startedInstances = parseInt($('#started-instances').val(), 10);
    var currentInstances = data['stateCount']['TOTAL'];
    if (currentInstances != 0) {
      // Instance are already running so we're in recovery mode. Calculate 
      // current elapsed time and set timer element accordingly.
      var startTime = parseInt($('#start-time').val(), 10);
      var currentTime = Math.round(new Date().getTime() / 1000)
      var elapsedTime = currentTime - startTime;
      Timer.prototype.setOffset(elapsedTime);

      // In order to draw grid, maintain counter and timer, and start 
      // status polling, we simulate start click with number of instances 
      // last started, but we set Recovering flag to true to inhibit 
      // sending of start request to GCE.
      $('#num-instances').val(startedInstances);
      Recovering = true;
      $('#start').click();
      Recovering = false;
      $('#num-instances').val(numInstances);

      // In recovery mode, resets are ok but don't let user resend start,
      // because duplicate starts can cause confusion and perf problems.
      $('#start').addClass('disabled');
      $('#reset').removeClass('disabled');
      $('.perf').addClass('disabled');
    }
  });

  this.counter_ = new Counter(document.getElementById('counter'), 'numRunning');
  this.timer_ = new Timer(document.getElementById('timer'));
  this.initializeButtons_(gce);
};

/**
 * Initialize UI controls.
 * @param {Object} gce Instance of Gce class.
 * @private
 */
QuickStart.prototype.initializeButtons_ = function(gce) {
  $('.btn').button();

  var that = this;
  $('#start').click(function() {
    // Get the number of instances entered by the user.
    var numInstances = parseInt($('#num-instances').val(), 10);
    if (numInstances > 1000) {
      alert('Max instances is 1000, starting 1000 instead.');
      numInstances = 1000;
    } else if (numInstances < 0) {
      alert('At least one instance needs to be started, starting 1 instead.');
      numInstances = 1;
    } else if (numInstances === 0) {
      return;
    }

    // Request started, disable start button and perf toggles to avoid 
    // user confusion.
    $('#start').addClass('disabled');
    $('.perf').addClass('disabled');

    var instanceNames = [];
    for (var i = 0; i < numInstances; i++) {
      instanceNames.push(DEMO_NAME + '-' + i);
    }

    // Initialize the squares, set the Gce options, and start the instances.
    var squares = new Squares(
        document.getElementById('instances'), instanceNames, {
          drawOnStart: true
        });
    that.counter_.targetState = 'RUNNING';
    gce.setOptions({
      squares: squares,
      counter: that.counter_,
      timer: that.timer_
    });
    gce.startInstances(numInstances, {
      data: {'num_instances': numInstances},
      callback: function() {
        $('#reset').removeClass('disabled');
        $('.perf').removeClass('disabled');
      }
    });
  });

  // Initialize reset button click event to stop instances.
  $('#reset').click(function() {
    that.counter_.targetState = 'TOTAL';
    $('#num-instances').val(0);
    gce.stopInstances(function() {
      $('#start').removeClass('disabled');
      $('#reset').addClass('disabled');
      $('.perf').addClass('disabled');
    });
  });
};

QuickStart.perfState = {
  'disk': false,
  'net': false
};

QuickStart.perfToggle = function (type) {
  var id = '#perf-graph';
  if (this.perfState[type]) {
    clearInterval(Repeating_tests);
    del_bar_chart();
    $(id).hide();
    this.perfState[type] = false;
    Web_sock.close();
    Req_count = 0;
  } else { 
    $(id).show();
    var num_hosts = parseInt($('#num-instances').val(), 10) - 1;
    gen_bar_chart();
    this.perfState[type] = true;
    if (('WebSocket' in window) && IP_ADDR) {
      Web_sock = new WebSocket('ws://' + IP_ADDR + '/');
      Web_sock.onmessage = function(event) {
        var res = JSON.parse(event.data);
        if (res.host > Data.length) {
          for (var i = Data.length; i < (res.host-1); i++) {
            var h = parseInt(i+1, 10);
            Data[i] = { host: h, value: 0 };
          }
        } 
        Data[res.host-1] = { host: res.host, value: parseFloat(res.value, 10) };
        if (Req_count > 2) {
          redraw_bars(Data);
        }
      }
      Web_sock.onopen = function() {
        var req = {};
        var refresh_interval = 3000;
        req.type = type;
        if (type === 'disk') {
          req.mode = 'read';
          req.size = '100m';
          req.blocksize = '1m';
          req.direct = '1';
          req.iodepth = '1';
          refresh_interval = 3000;
        } else if (type === 'net') {
          req.num_hosts = parseInt($('#num-instances').val(), 10) - 1;
          req.format = 'm';
          req.time = '9';
          refresh_interval = 10000;
        }
        var req_str = JSON.stringify(req);
        Web_sock.send(req_str);
        Repeating_tests = setInterval(function() {
          Req_count++;
          Web_sock.send(req_str);
        }, refresh_interval);
      }
    }
  }
}

