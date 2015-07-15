var _ = require('lodash');
var Shipit = require('shipit-cli');
var inquirer = require('bluebird-inquirer');
var chalk = require('chalk');
var util = require('util');
var yargs = require('yargs');

var captain = function captain(shipitConfig, options, cb) {
  var shipit;
  var argv = yargs.options({
    'e': {
      alias: 'env'
    },
    'r': {
      alias: 'run'
    }
  }).argv;

  // Optional args
  cb = _.isFunction(cb) ? cb : function() {};

  if (_.isFunction(options)) {
    cb = options;
    options = {};
  }

  // Normalize tasks from argv
  var argvRun = argv.run;
  argvRun = argvRun ?
    argvRun.split(',').map(Function.prototype.call, String.prototype.trim) :
    false;

  options = _.defaults(options || {}, {
    targetEnv: argv.env || false,
    availableEnvs: _.without(Object.keys(shipitConfig), 'default'),
    run: argvRun || [],
    logItems: function(options, shipit) {
      return {
        'Environment': options.targetEnv,
        'Branch': shipit.config.branch,
        'Path': shipit.config.deployTo,
      };
    },
    init: function(shipit) {
      require('shipit-deploy')(shipit);
    }
  });

  options.run = Array.isArray(options.run) ? options.run : [options.run];

  var taskPrompt = function tasksPrompt() {
    if (!options.run.length) {
      return inquirer.prompt([{
        type: 'list',
        name: 'run',
        default: 'deploy',
        message: 'Run task:',
        choices: _.pluck(shipit.tasks, 'name')
      }]).then(function(answers) {
        options.run = [answers.run];

        return Promise.resolve([options.run]);
      });
    }

    return Promise.resolve(options.run);
  };

  var confirmPrompt = function confirmPrompt() {
    if (options.logItems) {
      var logItems = options.logItems(options, shipit);
      var msg = Object.keys(logItems).map(function(key) {
        return chalk.bold(util.format('- %s: %s', key, chalk.blue(logItems[key])));
      });

      console.log('\n' + msg.join('\n') + '\n');
    }

    var taskStr = chalk.cyan(options.run.join(chalk.white(', ')));

    return inquirer.prompt([{
      type: 'confirm',
      name: 'taskConfirm',
      default: true,
      message: util.format('Run tasks [%s]', taskStr),
    }]).then(function(answers) {

      return new Promise(function(resolve, reject) {
        if (answers.taskConfirm) {
          return resolve(shipit);
        }

        return reject('Shipit process aborted.');
      });
    });
  };

  var envPrompt = function envPrompt() {
    if (!options.targetEnv && options.availableEnvs.length > 1) {
      return inquirer.prompt([{
        type: 'list',
        name: 'targetEnv',
        default: options.targetEnv,
        message: 'Target environment:',
        choices: options.availableEnvs
      }].then(function(answers) {
        options.targetEnv = answers.targetEnv;

        return options.targetEnv;
      }));
    }

    options.targetEnv = options.targetEnv || options.availableEnvs[0];

    return Promise.resolve(options.targetEnv);
  };

  var initShipit = function initShipit() {
    shipit = new Shipit({environment: options.targetEnv});

    if (_.isFunction(options.init)) {
      options.init(shipit);

      if (!shipit.config) {
        shipit.initConfig(shipitConfig);
      }
    }
  };

  var startShipit = function startShipit() {
    shipit.initialize();
    return shipit.start(options.run, function() {
      cb();

      return Promise.resolve(shipit);
    });
  };

  return envPrompt()
  .then(initShipit)
  .then(taskPrompt)
  .then(confirmPrompt)
  .then(startShipit)
  .catch(function(e) {
    console.log(chalk.red(e));
  });
}

module.exports = captain;
