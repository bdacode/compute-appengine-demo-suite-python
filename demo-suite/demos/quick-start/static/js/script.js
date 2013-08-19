/**
 * @fileoverview Quick Start JavaScript.
 *
 * Initializes instances, updates UI display to show running time and number
 * of running instances. Stops running instances.
 */

var Data = [
  { letter: 'A', frequency:	.08167 },
  { letter: 'B', frequency:	.01492 },
  { letter: 'C', frequency:	.02780 },
  { letter: 'D', frequency:	.04253 },
  { letter: 'E', frequency:	.12702 },
  { letter: 'F', frequency:	.02288 },
  { letter: 'G', frequency:	.02022 },
  { letter: 'H', frequency:	.06094 },
  { letter: 'I', frequency:	.06973 },
  { letter: 'J', frequency:	.00153 },
  { letter: 'K', frequency:	.00747 },
  { letter: 'L', frequency:	.04025 },
  { letter: 'M', frequency:	.02517 },
  { letter: 'N', frequency:	.06749 },
  { letter: 'O', frequency:	.07507 },
  { letter: 'P', frequency:	.01929 },
  { letter: 'Q', frequency:	.00098 },
  { letter: 'R', frequency:	.05987 },
  { letter: 'S', frequency:	.06333 },
  { letter: 'T', frequency:	.09056 },
  { letter: 'U', frequency:	.02758 },
  { letter: 'V', frequency:	.01037 },
  { letter: 'W', frequency:	.02465 },
  { letter: 'X', frequency:	.00150 },
  { letter: 'Y', frequency:	.01971 },
  { letter: 'Z', frequency:	.00074 }
];

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
var web_sock = null;

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
  var id = '#perf-' + type;
  if (this.perfState[type]) {
    del_bar_chart(Data);
    $(id).hide();
    this.perfState[type] = false;
    web_sock.close();
  } else { 
    $(id).show();
    gen_bar_chart(Data);
    this.perfState[type] = true;
    if (('WebSocket' in window) && IP_ADDR) {
      web_sock = new WebSocket('ws://' + IP_ADDR + '/');
      web_sock.onmessage = function(event) {
        var res = JSON.parse(event.data);
        if (res.type === 'disk') {
          Data[res.host] = res.result.throughput;
          del_bar_chart(Data);
          gen_bar_chart(Data);
        } else if (type === 'net') {
        }
        //alert(res); 
      }
      web_sock.onopen = function() {
        var req = {};
        req.type = type;
        if (type === 'disk') {
          req.mode = 'r';
          req.size = '4K';
        } else if (type === 'net') {
          req.num_hosts = parseInt($('#num-instances').val(), 10) - 1;
        }
        web_sock.send(JSON.stringify(req));
      }
    }
  }
}

