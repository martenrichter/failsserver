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


// this worker runs in the background
var failspdf=require('./failspdf.js');
var config= require('./config')();
var failspicture=require('./failspicture.js');

var syncdata = function(dir,files)
{
  console.log("syncdata",dir,files);
  var arr=files;
  arr.unshift(dir);
  var pr=require('child_process').spawn(config.syncscript,arr);
  pr.stdout.on('data', function(data) {
    console.log('syncdata stdout:'+data);
  });
  pr.stderr.on('data', function(data) {
    console.log('syncdata stderr:'+data);
  });
}

process.on('config',function(config,callback) {
  console.log("Fails worker got config");
  callback();
});

process.on('message', function(msg,callback) {
  console.log('Failsworker task:', msg.task);
  switch (msg.task) {
  case 'GeneratePDF': {
    failspdf.CreatePDFs(msg.dir,msg.files,msg.lectdetail,msg.pictures,
    function() {
      syncdata(msg.dir,['lect_bw.pdf','lect_col.pdf']);
    });
    // todo make file sync
    //process.send({data:blub});
  } break;
  case 'syncfile': {
    syncdata(msg.dir,msg.files);
  } break;
  case 'GenerateThumbnails': {
    failspicture.GenerateThumbnails(msg.file, msg.extension, msg.dir,msg.mimetype);
  } break;
  };
});

process.on('terminate',function() {
  console.log('Failsworker was terminated!')
});

console.log("Failworker started!");
