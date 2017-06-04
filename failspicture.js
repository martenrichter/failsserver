//Fails (Fancy Automated Internet Lecture System)
//Copyright (C) 2016-2017  Marten Richter
//
// This program is free software: you can redistribute it and/or modify
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
var config= require('./config')();
var sharp= require('sharp');

var syncallback = null;

module.exports.init=function(sc)
{
  syncallback=sc;
};


module.exports.GenerateThumbnails=function(file,extension,dir,mimetype)
{
  // Generate Thumbnails
  sharp(file+extension)
  .resize(300,300)
  .max()
  .withoutEnlargement()
  .toFile(file+"_thumb"+extension);
  // generate Texture for drawing
  sharp(file+extension)
  .resize(2048,2048)
  .max()
  .withoutEnlargement()
  .toFile(file+"_drawing"+extension);


};
