//Fails (Fancy Automated Internet Lecture System)
//Copyright (C) 2015-2017  Marten Richter
//
//This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var fs=require('fs');

var syncallback = null;

module.exports.init=function(sc)
{
  syncallback=sc;
};

module.exports.FailsUser = function (username,name,email, permgroup) {
    this.username=username;

    this.name=name;
    this.email=email;
    this.permgroup=permgroup;
};

module.exports.FailsUser.prototype.constructor =  module.exports.FailsUser;

module.exports.FailsUsers = function(filename)
{
  this.filename = filename;
  if (!fs.existsSync(filename)) {
    console.log("user db file %s does not exist! Using empty users!",filename);
    this.users = [];
  } else {
    this.users = JSON.parse(fs.readFileSync(this.filename,'utf8'));
  }
};

module.exports.FailsUsers.prototype.constructor = module.exports.FailsUsers;

module.exports.FailsUsers.prototype.saveDB=function(){
  var writeout=JSON.stringify(this.users,null,2);
  var options= {encoding: 'utf8',flag:'w',mode: 0755};

  fs.writeFile(this.filename,writeout,options,function(err){
    if (err) throw err;
    console.log("Saving user db succeeded!");
  });
};

module.exports.FailsUsers.prototype.addupdateUser = function(user)
{
  console.log("add/update user: %s name: %s email: %s perm: %s to db",
                user.username,user.name,user.email,user.permgroup);
  var users= this.users;
  var userslength = users.length;
  for (var i=0; i<userslength; i++) {
    if (users[i].username==user.username) {
      console.log("overwriting existing userdata");
      users[i]=user;
      this.saveDB();
      return true;
    }
  }
  console.log("add new user");
  users.push(user);
  this.saveDB();
  return true;
};

module.exports.FailsUsers.prototype.removeUser= function(username)
{
  console.log("remove user: %s ",username);
  var users= this.users;
  var userslength = users.length;
  for (var i=0; i<userslength; i++) {
    if (users[i].username==username) {
      console.log("remove user successful");
      users.splice(i,1);
      this.saveDB();
      return true;
    }
  }
  //console.log("unknown user %s",username);
  this.saveDB();
  return true;
};

module.exports.FailsUsers.prototype.getUserList=function()
{
  var ret_users=[];
  var users= this.users;
  var userslength = users.length;
  for (var i=0; i<userslength; i++) {
    ret_users.push(users[i].username);
  }
  return ret_users;
};

module.exports.FailsUsers.prototype.getUserNamesList=function()
{
  var ret_users=[];
  var users= this.users;
  var userslength = users.length;
  for (var i=0; i<userslength; i++) {
    ret_users.push(users[i].name);
  }
  return ret_users;
};

module.exports.FailsUsers.prototype.getUser= function(username)
{
  var users= this.users;
  var userslength = users.length;
  for (var i=0; i<userslength; i++) {
    if (users[i].username==username) {
      return users[i];
    }
  }
  //console.log("getuser: unknown user %s",username);
  return null;
};

module.exports.FailsUsers.prototype.checkExtUserObj= function(userobj)
{

  if ( (typeof userobj.name !== 'string' && !(userobj.name instanceof String))) return null;
  if (  (!userobj.email || (typeof userobj.name !== 'string' && (! userobj.name instanceof String)))) {
    userobj.email="";
  }
  if (!userobj.groups) return null;
  if (userobj.groups.length<=0) return null;
  userobj.gpermgroup=null;
  for (var i=0; i<userobj.groups.length; i++) {
    var curgroup=userobj.groups[i];
    if (typeof curgroup.group !== 'string' && (! curgroup.group instanceof String))
    {
        return null;
    }
    switch (curgroup.permgroup) {
    case "instructor": {
      if (!userobj.gpermgroup) userobj.gpermgroup="instructor";
    } break;
    case "maintenance": {
      if (!userobj.gpermgroup
        || userobj.gpermgroup=="instructor") userobj.gpermgroup="maintenance";
    };
    case "admin":
    {
      if (!userobj.gpermgroup
        || userobj.gpermgroup=="instructor"
        || userobj.gpermgroup=="maintenance") userobj.gpermgroup="admin";
    } break;
    default: return null
    }
  }
  return userobj;
};


module.exports.FailsUsers.prototype.getGroupAuthInfo=function(level,groupsinfo)
{
  var authinfo={ authgroups: []};

  if (!groupsinfo) {
    return null;
  } else {
    for (var i=0; i<groupsinfo.length; i++) {
      var curgroup=groupsinfo[i];
      if (this.checkPermLevel(level,curgroup.permgroup)) {
        authinfo.authgroups.push(curgroup.group);
      }
    }
    return authinfo; //nothing found

  }
}

module.exports.FailsUsers.prototype.checkPermLevel=function(reqlevel,permgroup)
{
  switch (reqlevel) {
  case "admin": {
    if (permgroup=="admin") return true;
    else return false;
  }
  case "maintenance":
  switch (permgroup) {
  case "admin":
  case "maintenance": return true;
  default: return false;
  }
  case "instructor":
  switch (permgroup) {
  case "admin":
  case "maintenance":
  case "instructor":return true;
  default: return false;
  }

  }
}

module.exports.FailsUsers.prototype.permitted= function(username,level)
{
  var users= this.users;
  var userslength = users.length;
  for (var i=0; i<userslength; i++) {
    var curuser=users[i];
    if (curuser.username==username) {
      switch (curuser.permgroup) {
      case "admin": {
          if (level=="admin") {
            return true;
          }
      }
      case "maintenance": {
        if (level=="maintenance") {
          return true;
        }
      }
      case "instructor": {
        if (level=="instructor") {
          return true;
        }
      }
      default: {
        return false;
      }
      };
    }
  }
  //console.log("permitted: unknown user %s",username);
  return false;
};
