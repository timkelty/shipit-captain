var _ = require('lodash');
var Shipit = require('shipit-cli');
var inquirer = require('bluebird-inquirer');
var chalk = require('chalk');
var util = require('util');
var yargs = require('yargs');

function captain(shipitConfig, options, cb) {
  var shipit;
  var argv = yargs.options({
    'e': {
      alias: 'env'
    },
    't': {
      alias: 'tasks'
    }
  }).argv;

  // Optional args
  cb = _.isFunction(cb) ? cb : function() {};
  if (_.isFunction(options)) {
    options = {};
    cb = options;
  }

  // Normalize tasks from argv
  var argvTasks = argv['tasks'] || 'deploy';
  argvTasks = argvTasks.split(',').map(Function.prototype.call, String.prototype.trim);

  options = _.defaults(options || {}, {
    targetEnv: argv['env'] || false,
    availableEnvs: _.without(Object.keys(shipitConfig), 'default'),
    tasks: argvTasks,
    init: function(shipit) {
      // automatically call initconfig?
      return shipit.initConfig(shipitConfig);
    }
  });

  var confirmPrompt = function confirmPrompt(options, shipit) {
    var msg = [
      chalk.bold('- Tasks: %s'),
      chalk.bold('- Environment: %s'),
      chalk.bold('- Branch: %s'),
      chalk.bold('- Path: %s'),
    ];

    console.log(util.format(
      '\n' + msg.join('\n') + '\n',
      chalk.blue(options.tasks.join(', ')),
      chalk.blue(options.targetEnv),
      chalk.blue(shipit.config.branch),
      chalk.blue(shipit.config.deployTo)
    ));

    return inquirer.prompt([{
      type: 'confirm',
      name: 'taskConfirm',
      default: true,
      message: 'Proceed with task?',
    }]).then(function(answers) {

      return new Promise(function(resolve, reject) {
        if (answers.taskConfirm) {
          return resolve(shipit);
        }

        return reject('Shipit process aborted.');
      });
    });
  };

  var envPrompt = function envPrompt(options) {
    if (!options.targetEnv && options.availableEnvs.length > 1) {
      return inquirer.prompt([{
        type: 'list',
        name: 'targetEnv',
        default: options.targetEnv,
        message: 'Target environment:',
        choices: options.availableEnvs
      }])
    }

    return Promise.resolve({targetEnv: options.targetEnv || options.availableEnvs[0]});
  };

  return envPrompt(options)
  .then(function(answers) {
    options.targetEnv = answers.targetEnv;
    shipit = new Shipit({environment: options.targetEnv});

    if (_.isFunction(options.init)) {
      options.init(shipit);
    }

    return confirmPrompt(options, shipit);
  }).then(function(shipit) {
    shipit.initialize();
    shipit.start(options.tasks, function() {
      cb();
      return Promise.resolve(shipit);
    });
  }).catch(function(e) {
    console.log(chalk.red(e));
  });
}

module.exports = captain;
