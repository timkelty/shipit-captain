var _ = require('lodash');
var Shipit = require('shipit-cli');
var inquirer = require('bluebird-inquirer');
var chalk = require('chalk');
var util = require('util');
var yargs = require('yargs');

function captain(shipitConfig, options, cb) {
  var argv = yargs.option('target', {
    alias: 't',
  }).argv;
  var targetEnv = argv['target'] || false;
  var availableEnvs = _.without(Object.keys(shipitConfig), 'default');
  var shipit;

  console.log(yargs.argv);

  // Optional args
  cb = _.isFunction(cb) ? cb : function() {};
  if (_.isFunction(options)) {
    options = {};
    cb = options;
  }

  options = _.defaults(options || {}, {
    init: function(shipit) {
      return shipit.initConfig(shipitConfig);
    }
  });

  var confirmPrompt = function confirmPrompt(targetEnv, shipit) {
    var msg = [
      chalk.bold('- Environment: %s'),
      chalk.bold('- Branch: %s'),
      chalk.bold('- Path: %s'),
    ];

    console.log(util.format(
      '\n' + msg.join('\n') + '\n',
      chalk.blue(targetEnv),
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

        return reject('Shipit aborted');
      });
    });
  };

  var envPrompt = function envPrompt(targetEnv, availableEnvs) {
    if (availableEnvs.length > 1) {
      return inquirer.prompt([{
        type: 'list',
        name: 'targetEnv',
        default: targetEnv,
        message: 'Target environment:',
        choices: availableEnvs
      }])
    }

    return Promise.resolve({targetEnv: availableEnvs[0]});
  };

  return envPrompt(targetEnv, availableEnvs)
  .then(function(answers) {
    targetEnv = answers.targetEnv;
    shipit = new Shipit({environment: targetEnv});

    if (_.isFunction(options.init)) {
      options.init(shipit);
    }

    return confirmPrompt(targetEnv, shipit);
  }).then(function(shipit) {
    shipit.initialize();
    shipit.start('deploy', function() {
      cb();
      return Promise.resolve(shipit);
    });
  }).catch(function(e) {
    console.log(chalk.red('Shipit process aborted.'));
  });
}

module.exports = captain;
