/**
 * Description:
 *  List ec2 instances info
 *  Show detail about an instance if specified an instance id
 *  Filter ec2 instances info if specified an instance name
 *
 * Commands:
 *  hubot ec2 ls - Displays Instances
 *
 * Notes:
 *  --instance_id=***     : [optional] The id of an instance. If omit it, returns info about all instances.
 *  --instance_filter=*** : [optional] The name to be used for filtering return values by an instance name.
 */
var moment = require('moment');
var util = require('util');
var tsv = require('tsv');

var getArgParams;

getArgParams = function(arg) {
  var ins_filter, ins_filter_capture, ins_id, ins_id_capture;
  ins_id_capture = /--instance_id=(.*?)( |$)/.exec(arg);
  ins_id = ins_id_capture ? ins_id_capture[1] : '';
  ins_filter_capture = /--instance_filter=(.*?)( |$)/.exec(arg);
  ins_filter = ins_filter_capture ? ins_filter_capture[1] : '';
  return {
    ins_id: ins_id,
    ins_filter: ins_filter
  };
};

getEC2Instances = function(robot, instance_id, instance_filter, callback) {
  var results = {
    messages: [],
    instances: []
  };
  var aws, ec2;
  aws = require('./aws.js').aws();
  ec2 = new aws.EC2({
    apiVersion: '2016-09-15'
  });
  ec2.describeInstances((instance_id ? {
//      return ec2.describeInstances((instance_id ? {
    InstanceIds: [instance_id]
  } : null), function(err, res) {
    var data, i, ins, j, len, len1, message, messages, name, ref, ref1, tag;
    if (err) {
      results.messages.push("DescribeInstancesError: " + err);
//          return msg.send("DescribeInstancesError: " + err);
    } else {
      if (instance_id) {
        robot.logger.debug("Using instance id : " + instance_id);
        results.messages.push(util.inspect(res, false, null));
        //msg.send(util.inspect(res, false, null));
        //return ec2.describeInstanceAttribute({
        return ec2.describeInstanceAttribute({
          InstanceId: instance_id,
          Attribute: 'userData'
        }, function(err, res) {
          if (err) {
//                return msg.send("DescribeInstanceAttributeError: " + err);
            results.messages.push("DescribeInstanceAttributeError: " + err);
          } else if (res.UserData.Value) {
//                return msg.send(new Buffer(res.UserData.Value, 'base64').toString('ascii'));
            results.messages.push(new Buffer(res.UserData.Value, 'base64').toString('ascii'));
          }

          return results;
        });
      } else {
        robot.logger.debug("No instance id...");
        robot.logger.debug("Using filter : " + instance_filter);
        messages = [];
        ref = res.Reservations;
        for (i = 0, len = ref.length; i < len; i++) {
          data = ref[i];
          ins = data.Instances[0];
          name = '[NoName]';
          ref1 = ins.Tags;
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            tag = ref1[j];
            if (tag.Key === 'Name') {
              name = tag.Value;
            }
          }
//          if (instance_filter && name.indexOf(instance_filter) === -1) {
          if (instance_filter && !new RegExp(instance_filter).test(name)) {
            continue;
          }
          messages.push({
            time: moment(ins.LaunchTime).format('YYYY-MM-DD HH:mm:ssZ'),
            state: ins.State.Name,
            id: ins.InstanceId,
            image: ins.ImageId,
            az: ins.Placement.AvailabilityZone,
            subnet: ins.SubnetId,
            type: ins.InstanceType,
            ip: ins.PublicIpAddress,
            dns: ins.PublicDnsName,
            name: name || '[NoName]'
          });
          results.instances.push({
            time: moment(ins.LaunchTime).format('YYYY-MM-DD HH:mm:ssZ'),
            state: ins.State.Name,
            id: ins.InstanceId,
            image: ins.ImageId,
            az: ins.Placement.AvailabilityZone,
            subnet: ins.SubnetId,
            type: ins.InstanceType,
            ip: ins.PublicIpAddress,
            dns: ins.PublicDnsName,
            name: name || '[NoName]'
          });
        }
        messages.sort(function(a, b) {
          return moment(a.time) - moment(b.time);
        });
        message = tsv.stringify(messages) || '[None]';
        results.messages.push(message);
//            return msg.send(message);
        robot.logger.debug(JSON.stringify(results));
//        robot.logger.debug("OK");
      }
    }
    callback(results);
  });
}

module.exports = function(robot) {
  var cmd_char = process.env.HUBOT_COMMAND_CHAR || "\!";
  // Match everything that start or not with botname followed by command char
  var regx = new RegExp("^@?(?:" + robot.name + "\\s+)?" + cmd_char + "ec2 ls ?(.*)$", 'i');
  robot.hear(regx, {
    id: 'hubot-aws-ec2.ec2_ls'
  }, function(msg) {
    var arg_params, ins_filter, ins_id, msg_txt;
    arg_params = getArgParams(msg.match[1]);
    ins_id = arg_params.ins_id;
    ins_filter = arg_params.ins_filter;
    msg_txt = "Fetching " + (ins_id || 'all (instance_id is not provided)');
    if (ins_filter) {
      msg_txt += " containing '" + ins_filter + "' in name";
    }
    msg_txt += "...";
    msg.send(msg_txt);

    getEC2Instances(robot, ins_id, ins_filter, function(results) {
  //    robot.logger.debug(JSON.stringify(results));
      for (var i = 0; i < results.messages.length; i++) {
        msg.send(results.messages[i]);
      }
    });
  });
};
