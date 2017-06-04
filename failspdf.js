//Fails (Fancy Automated Internet Lecture System)
//Copyright (C) 2015-2017  Marten Richter
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


var failsdata = require('./failsUI/www/js/failsdata.js');
var fs=require('fs');
var PDFDocument=require('pdfkit');
var tinycolor=require('tinycolor2');
var MemoryStream = require('memorystream');
var config= require('./config')();
var moment = require('moment');

if (config.locale) {
  console.log("setting locale in moment failspdf",config.locale);
  moment.locale(config.locale);
}


var syncallback = null;

module.exports.init=function(sc)
{
  syncallback=sc;
};

module.exports.Sink = function(filename,lectdetail,pictures,dir,bw) {
    failsdata.Sink.call(this);

    this.doc = new PDFDocument({size: "A4"});
    //this.fsstream = fs.createWriteStream(filename);
    this.filename=filename;
    this.fsstream = new MemoryStream(null, { readable : false });
    this.pictures = pictures;
    this.dir=dir;

    this.doc.pipe(this.fsstream);

    this.doc.info.Title = lectdetail.title;
    this.doc.info.Subject = lectdetail.coursetitle;
    this.doc.info.Author = lectdetail.instructor;
    this.doc.info.CreationDate = lectdetail.date;

    this.footertext = lectdetail.coursetitle+", "+
                  lectdetail.instructor+", "+
                  lectdetail.title+", ";
    if (lectdetail.lectureinstructor) {
      this.footertext+= lectdetail.lectureinstructor+", ";
    }
    this.footertext+= moment(lectdetail.date).format("L");

    /* var lectdetail= {
      title: lecture.title,
      coursetitle: course.title,
      website: course.website,
      instructor: lectureuser.name,
      lectureinstructor
      date: lecture.date
    };*/

    this.bw = bw;
    this.firstpage = true;
      this.pagenumber=1;
    this.setupGeometry();

};


module.exports.Sink.prototype=Object.create(failsdata.Sink.prototype);
module.exports.Sink.prototype.constructor = module.exports.Sink;

module.exports.Sink.prototype.setupGeometry = function()
{
  var doc=this.doc;


  this.margins = doc.page.margins;
  this.textHeight = 20;

  // now setup page properties
  this.pagewidth=doc.page.width;
  this.pageheight=doc.page.height;
  this.geoscale=(this.pagewidth
    -this.margins.left-this.margins.right); //subtract margins
  this.scrollheight=(this.pageheight
    -this.margins.top-this.margins.bottom-this.textHeight)/this.geoscale;

};

module.exports.Sink.prototype.startPage = function(ystart,yend)
{
  var doc=this.doc;
  if (this.firstpage) {
    this.firstpage=false;
  } else {
    doc.addPage();
  }
  this.setupGeometry();
  this.yoffset=ystart;
  doc.save();

  doc.fontSize(8);
  doc.text(this.footertext+", "+this.pagenumber.toString(),
      this.margins.left,
      this.pageheight-this.margins.bottom-this.textHeight,
            {width:this.geoscale, height: this.textHeight, align:'center'});

  this.pagenumber++;



  doc.translate(this.margins.left,this.margins.top); //margins
  doc.scale(this.geoscale);
  doc.translate(0,-ystart);


  doc.rect(0,ystart,1.0,yend-ystart);
  doc.clip();

  //may be use yend for clipping, don't know

  this.drawpath = [];

};

module.exports.Sink.prototype.endPage = function(ystart,yend)
{
  this.doc.restore();
};

module.exports.Sink.prototype.finalize = function(callback)
{

  var myself=this;
  this.fsstream.on('finish',function() {
    console.log("mem fsstreamend",new Date());
    fs.writeFile(myself.filename,myself.fsstream.toBuffer(),callback);
  });

  this.doc.end();
  console.log('finalize called');

};

module.exports.Sink.prototype.addPicture =function(time,objnum,curclient,x,y,iwidth,iheight,uuid) {
  var pict=  this.pictures[uuid];
  if (pict) {
    var filename=null;
    if (pict.mimetype=='image/png') {
      filename= this.dir +'/'+uuid+'.png'
    } else   if (pict.mimetype=='image/jpeg') {
      filename= this.dir +'/'+uuid+'.jpg'
    }
    if (filename) this.doc.image(filename , x,y,{width: iwidth, height: iheight});
  }

    //resubmitpath
}

module.exports.Sink.prototype.startPath = function(time,objnum,curclient,x,y,type,color,w) {
  if (this.drawpath.length>0) {
    this.finishPath();
  }

  this.color=color;
  this.drawtype=type;
  this.drawwidth=w;

  this.drawpath = [];
  this.drawpath.push({x:x,y:y});


};

module.exports.Sink.prototype.addToPath = function(time,curclient,x,y) {
  this.drawpath.push({x:x,y:y});
};

module.exports.Sink.prototype.finishPath = function(time,curclient) {
  var doc=this.doc;
  var template="#000000"
  doc.lineCap('round');
  doc.lineWidth(this.drawwidth); //does the translation matrix also scale the widths?

  var strcolor=this.color.toString(16);
  var mycolor=new tinycolor(template.substring(0,7-strcolor.length)+strcolor);


  var alpha=1;
  if (this.drawtype==0) {
    if (mycolor.toHexString()=="#ffffff")
      mycolor=new tinycolor("black");
    if (mycolor.isLight()) mycolor.darken(20);
  }else if (this.drawtype==1) {
    alpha=0.7; // was 0.3
  }else if (this.drawtype==2) {
    mycolor=new tinycolor("white");
    alpha=1;
  }
  //doc.strokeOpacity(alpha);




  var array=this.drawpath;
  var length=array.length;

  if (this.drawtype==0 && !this.bw) {
    var workcolor=new tinycolor(mycolor.toString());
    doc.strokeColor(workcolor.darken(20).toHexString(),alpha);
    doc.moveTo(array[0].x,array[0].y)
    for(var i=1;i<length;i++)
    {
      var cur=array[i];
      doc.lineTo(cur.x,cur.y);
    }
    doc.stroke();
    doc.lineWidth(this.drawwidth*0.5);



  }
  if (this.bw && this.drawtype!=2)
  {
    if (this.drawtype==0) {
      mycolor=tinycolor("black");
    } else if (this.drawtype==1) {
      mycolor=mycolor.greyscale();
    }
  }
  doc.strokeColor(mycolor.toHexString(),alpha);

  doc.moveTo(array[0].x,array[0].y)
  for(var i=1;i<length;i++)
  {
    var cur=array[i];
    doc.lineTo(cur.x,cur.y);
  }
  doc.stroke();

  this.drawpath = [];


};

module.exports.Sink.prototype.scrollBoard = function(time,x,y) {
     // do ... nothing....
};


module.exports.CreatePDFs=function(dir,files,lectdetail,pictures,callback)
{
  //ok we start, first we create a container and fill it
  var collection=new failsdata.Collection(failsdata.MemContainer,{});

  var length=files.length;

  for (var i=0;i<length;i++) {
      var data=fs.readFileSync(dir+"/"+files[i]+".board");
      var ab = new ArrayBuffer(data.length);
      var view = new Uint8Array(ab);
      for (var j=0;j<data.length;j++) {
        view[j]=data[j];
      }
      collection.replaceStoredData(i,ab);
  }
  var drawarea=new failsdata.DrawArea2();
  collection.redrawTo(drawarea); // we determine possible positions for page breaks

  //now we create, the pdfs
  var bwpdf=new module.exports.Sink(dir+"/lect_bw.pdf",lectdetail,pictures,dir,true);
  var colpdf=new module.exports.Sink(dir+"/lect_col.pdf",lectdetail,pictures,dir,false);
  var dispatch= new failsdata.Dispatcher();
  dispatch.addSink(bwpdf);
  dispatch.addSink(colpdf);

  var pageheight=bwpdf.scrollheight;
  var pagepos=0.;
  while (pagepos <=drawarea.glomax) {
    var pagebreak=drawarea.findPagebreak(pagepos+0.75*pageheight,pagepos+pageheight);
    console.log("Add PDF page",pagepos,pagebreak,pageheight);
    bwpdf.startPage(pagepos,pagebreak);
    colpdf.startPage(pagepos,pagebreak);

    collection.redrawTo(dispatch,Math.floor(pagepos),Math.ceil(pagebreak));
    bwpdf.endPage();
    colpdf.endPage();
    pagepos=pagebreak;

  }
  bwpdf.finalize(function() {
    console.log("bw pdf ready");
    colpdf.finalize(function() {
      console.log("col pdf ready");
      callback();
    });

  });


};
