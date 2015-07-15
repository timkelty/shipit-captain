var _ = require('lodash');
var Shipit = require('shipit-cli');
var inquirer = require('bluebird-inquirer');
var chalk = require('chalk');
var util = require('util');
var yargs = require('yargs');

module.exports = Captain;

var Captain = function Captain(shipitConfig, options) {

  if (!shipitConfig) {
    throw new Error(chalk.red('Shipit config not found.'));
  }

  this.shipitConfig = shipitConfig;
  this.options = this.normalizeOptions(options);

  return this;
};

Captain.prototype.run = function(cb) {
  var startShipit = function() {
    return this.startShipit(cb);
  }

  return this.envPrompt()
  .then(this.initShipitConfig)
  .then(this.taskPrompt)
  .then(this.confirmPrompt)
  .then(startShipit.bind(this))
  .catch(function(e) {
    console.log(chalk.red(e));
  });
}

Captain.prototype.normalizeOptions = function(options) {
  var argv = yargs.options({
    'e': {
      alias: 'env'
    },
    'r': {
      alias: 'run'
    }
  }).argv;

  var run = argv.run ?
    argvRun.split(',').map(Function.prototype.call, String.prototype.trim) :
    false;

  options = _.defaults(options || {}, {
    targetEnv: argv.env || false,
    availableEnvs: _.without(Object.keys(this.shipitConfig), 'default'),
    run: run || [],
    logItems: function(options, shipit) {
      return {
        'Environment': options.targetEnv,
        'Branch': shipit.config.branch,
        'Path': shipit.config.deployTo,
      };
    },
    init: function(shipit) {
      require('shipit-deploy')(shipit);
    },
  });
  options.run = Array.isArray(options.run) ? options.run : [options.run];
  options.init = _.isFunction(options.init) ? options.init : _.noop;
  options.logItems = _.isFunction(options.logItems) ? options.logItems : _.noop;

  return options;
}

Captain.prototype.initShipit = function() {
  this.shipit = new Shipit({environment: this.options.targetEnv});

  if (!this.shipit.config) {
    this.shipit.initConfig(this.shipitConfig);
  }
}

Captain.prototype.taskPrompt = function() {
  if (!this.options.run.length) {
    return inquirer.prompt([{
      type: 'list',
      name: 'run',
      default: 'deploy',
      message: 'Run task:',
      choices: _.pluck(this.shipit.tasks, 'name')
    }]).then(function(answers) {
      this.options.run = [answers.run];

      return Promise.resolve([this.options.run]);
    });
  }

  return Promise.resolve(this.options.run);
}

Captain.prototype.confirmPrompt = function() {
  var logItems, msg, taskStr;
  if (this.options.logItems) {
    logItems = options.logItems(options, shipit);
    msg = Object.keys(logItems).map(function(key) {
      return chalk.bold(util.format('- %s: %s', key, chalk.blue(logItems[key])));
    });
    console.log('\n' + msg.join('\n') + '\n');
  }

  taskStr = chalk.cyan(this.options.run.join(chalk.white(', ')));

  return inquirer.prompt([{
    type: 'confirm',
    name: 'taskConfirm',
    default: true,
    message: util.format('Run tasks [%s]', taskStr),
  }]).then(function(answers) {

    return new Promise(function(resolve, reject) {
      if (answers.taskConfirm) {
        return resolve(this.shipit);
      }

      return reject('Shipit process aborted.');
    });
  });
}

Captain.prototype.startShipit = function(cb) {
  this.shipit.initialize();
  return this.shipit.start(this.options.run, function() {
    cb();

    return Promise.resolve(this.shipit);
  });
}
