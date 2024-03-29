var wiringPi = require('./addon.node');
module.exports = function(eventEmitter){
	init(eventEmitter);
	// WIFI模式切换开关初始化
	var switchStatus = null;
	// Wifi/AP功能切换引脚
	var wifi_ap_switch_pin = 4;
	// 引脚上拉读取数据
	wiringPi.pullUpDnControl(wifi_ap_switch_pin, wiringPi.constValues.pullResistor.PUD_UP);
	// 输入模式
	wiringPi.pinMode(wifi_ap_switch_pin, wiringPi.constValues.pinMode.INPUT);
	setInterval(function(){
		var value = wiringPi.digitalRead(wifi_ap_switch_pin);
		if (switchStatus != value) {
			switchStatus = value;
			console.log('开关状态:', !!value);
			eventEmitter.emit('WIFI_MODE_CHANGE', switchStatus)
		}
	}, 2000);
};

function init(eventEmitter) {
	////////////////////////////// wifi模式开关切换 Start /////////////////////////////////
	var WIFI_SWITCH_LOCKED = false;
	var latestMode = require('fs').readFileSync('/sys/module/bcmdhd/parameters/op_mode', {encoding: "utf-8"})[0] != "0";
	eventEmitter.on('WIFI_MODE_CHANGE', function(value) {
		if (latestMode == value) {
			return;
		}
		latestMode = value;
		if (!WIFI_SWITCH_LOCKED) {
			WIFI_SWITCH_LOCKED = true;
			(function SwitchWifiMode(){
				var util  = require('util'),
			    spawn = require('child_process').spawn,
			    ls    = spawn('sudo', ['turn-wifi-into-apmode', latestMode ? "yes" : "no"]); // the second arg is the command 

				ls.stdout.on('data', function (data) {    // register one or more handlers
				  console.log('stdout: ' + data);
				});

				ls.stderr.on('data', function (data) {
				  console.log('stderr: ' + data);
				});

				ls.on('exit', function (code) {
				  console.log('child process exited with code ' + code);
				  // 模式切换完成，检查是否与当前最新的模式一致，不一致则继续切换

				  function TransferModeInFile(opModeInFile) {
				  	return opModeInFile != "0";
				  }
				  // 模式切换完成，检查是否与当前最新的模式一致，不一致则继续切换
				  if (TransferModeInFile(require('fs').readFileSync('/sys/module/bcmdhd/parameters/op_mode', {encoding: "utf-8"})[0]) != latestMode){
				  		SwitchWifiMode();
				  }
				  else {
				  	// 释放锁
				  	WIFI_SWITCH_LOCKED = false;
				  }
				});
			})();
		}
	});
}