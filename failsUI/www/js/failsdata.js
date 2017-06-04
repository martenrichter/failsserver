/**
* @author Marten Richter
*/
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

(function(failsdata) {

    var now;

    // adds support for high performance timers + fallbacks taken from http://gent.ilcore.com/2012/06/better-timer-for-javascript.html
    if (typeof window !== 'undefined') {
      window.performance = window.performance || {};
     console.log("performance now");

      performance.now = (function() {
          return performance.now       ||
              performance.mozNow    ||
              performance.msNow     ||
              performance.oNow      ||
              performance.webkitNow ||
              function() { return new Date().getTime(); };
            })();
        now =function() {
            return performance.now();
        };

    } else {
      // we are running under node
      now = require("performance-now");
    }

    failsdata.Sink = function() {


    };

    failsdata.Sink.prototype.constructor = failsdata.Sink;



    failsdata.Sink.prototype.startPath =function(time,objnum,curclient,x,y,type,color,width) {
       //do nothing in base class
    };

    failsdata.Sink.prototype.addToPath = function(time,curclient,x,y) {
       //do nothing in base class
    };

    failsdata.Sink.prototype.finishPath = function(time,curclient) {
        //do nothing in base class
    };

    failsdata.Sink.prototype.scrollBoard = function(time,x,y) {
       // do nothing in base class
    };

    failsdata.Sink.prototype.addPicture =function(time,objnum,curclient,x,y,width,height,uuid) {
       //do nothing in base class
    };

    //this object determines the area covered with drawings
    //it is used for finding the best position for a pagebreak in a pdf
    failsdata.DrawArea = function() {
        failsdata.Sink.call(this);
        this.newmin=0;
        this.newmax=0;
        this.curw=0;
        this.glomin=0;
        this.glomax=0;
        this.intervals=[];
    };



    failsdata.DrawArea.prototype=Object.create(failsdata.Sink.prototype);
    failsdata.DrawArea.prototype.constructor = failsdata.DrawArea;

    failsdata.DrawArea.prototype.startPath = function(time,objnum,curclient,x,y,type,color,w) {
        this.newmin=this.newmax=y;
        this.newmin-=w;
        this.newmax+=w;
        this.curw=w;


    };

    failsdata.DrawArea.prototype.addToPath = function(time,curclient,x,y) {
      this.newmin=Math.min(y-this.curw,this.newmin);
      this.newmax=Math.max(y+this.curw,this.newmax);

    };

    failsdata.DrawArea.prototype.finishPath = function(time,curclient) {
       this.commitInterval(this.newmin,this.newmax);
    };

    failsdata.DrawArea.prototype.scrollBoard = function(time,x,y) {
      // do ... nothing....

    };

    failsdata.DrawArea.prototype.addPicture =function(time,objnum,curclient,x,y,width,height,uuid) {
        this.commitInterval(y,y+height);
    };

    failsdata.DrawArea.prototype.commitInterval = function(min,max)
    {
        var arr=this.intervals;
        var length=arr.length;
        var imin=0;
        //var imininside=false;
        var imax=0;
        //var imaxinside=false;
        this.glomin=Math.min(this.glomin,min);
        this.glomax=Math.max(this.glomax,max);

        var fmin=min;
        var fmax=max;

        for (imin=0;imin<length;imin++)
        {
            var cur=arr[imin];
            if (cur.max>min && min>cur.min) {
                //imininside=true;
                fmin=cur.min;
                //console.log("cI min1",min,cur.min,cur.max,imin);
                break;
            } else if (cur.min>min) {
                //console.log("cI min2",min,cur.min,cur.max,imin);
                //imininside=false;
                fmin=min;
                break;
            }
        }


        for (imax=imin;imax<length;imax++) {
            var cur=arr[imax];
            if (cur.max>max && max>cur.min) {
                //console.log("cI max1",max,cur.min,cur.max,imax);
                //imaxinside=true;
                fmax=cur.max;
                imax++;
                break;
            } else if (cur.min>max) {
                //console.log("cI max2",max,cur.min,cur.max,imax);
                //imininside=false;
                fmax=max;
                break;
            }
        }


        //console.log("cI length",imin,imax-imin,fmin,fmax,length);
        arr.splice(imin,imax-imin,{min:fmin,max:fmax});
    };

    failsdata.DrawArea.prototype.findPagebreak = function(pagemin,pagemax)
    {
        var arr=this.intervals;
        var length=arr.length;

        var freeinterval=[];

        // first find pagemax in interval array
        var index=0;
        var startmax=pagemax;
        var found=false;
        for (index=0;index<length;index++) {
            var cur=arr[index];
            if (cur.min<pagemax && pagemax<cur.max) {
                startmax=cur.min;
                found=true;
                break;
            } else if (pagemax<cur.min){
                startmax=cur.min;
                found=true;
                break;
            }
        }
        if (startmax<pagemin) return pagemax; //no suitable whitespace!
        var lastquality=-1;
        var selpagebreak=pagemax;
        for (;index>=0 && found;index--) {
            var ncur=arr[index];
            if (startmax<ncur.max) continue; //stupid!

            var pagebreak=Math.max(startmax-0.04,(ncur.max+startmax)*0.5);
            //console.log("pb",startmax,ncur.max);


            var quality= 0.1*0.1/((pagemax-pagebreak)*(pagemax-pagebreak)+0.005)
                        +Math.min((startmax-ncur.max)*(startmax-ncur.max),0.04*0.04)/(0.04*0.04);
            //console.log("qs",pagebreak,quality,lastquality);
            if (quality>lastquality) {
                selpagebreak=pagebreak;
                lastquality=quality;
            }
            startmax=ncur.min;
            if (ncur.max<pagemin) break;
        }

        return selpagebreak;
    };


    //this object determines the area covered with drawings, New Implementation
    //it is used for finding the best position for a pagebreak in a pdf
    failsdata.DrawArea2 = function() {
        failsdata.Sink.call(this);
        this.numslicesheight=1.41*3/297; // the slice height to be roughly 3 mm
        this.slices=[];


        this.newx=0;
        this.newy=0;
        this.curw=0;
        this.intervals=[];
        this.glomin=0;
        this.glomax=0;
    };



    failsdata.DrawArea2.prototype=Object.create(failsdata.Sink.prototype);
    failsdata.DrawArea2.prototype.constructor = failsdata.DrawArea;

    failsdata.DrawArea2.prototype.startPath = function(time,objnum,curclient,x,y,type,color,w) {
        this.newy=y;
        this.newx=x;
        this.curw=w;

        this.glomax=Math.max(this.glomax,y+this.curw);


    };

    failsdata.DrawArea2.prototype.addToPath = function(time,curclient,x,y) {
        // now we add it to the corresponding slice, we assume short segments
        var weight=Math.sqrt((this.newx-x)*(this.newx-x)+(this.newy-y)*(this.newy-y))*this.curw;

        var slicepos=Math.round((this.newy+y)*0.5/this.numslicesheight);

        if (typeof this.slices[slicepos] === "undefined") this.slices[slicepos]=weight;
        else this.slices[slicepos]+=weight;

        this.newy=y;
        this.newx=x;
        this.glomax=Math.max(this.glomax,y+this.curw);

    };

    failsdata.DrawArea2.prototype.finishPath = function(time,curclient) {
       //nothing to do
    };

    failsdata.DrawArea2.prototype.scrollBoard = function(time,x,y) {
      // do ... nothing....

    };

    failsdata.DrawArea2.prototype.addPicture =function(time,objnum,curclient,x,y,width,height,uuid) {
         var sliceposstart=Math.round(y/this.numslicesheight);
         var sliceposend=Math.round((y+height)/this.numslicesheight);
         var sliceweight=this.numsliceheight*width*0.2; // adjust the factor
         this.glomax=Math.max(this.glomax,y+height);

        for (var slicepos=sliceposstart;slicepos<sliceposend; slicepos++) {
             if (typeof this.slices[slicepos] === "undefined") this.slices[slicepos]=sliceweight;
            else this.slices[slicepos]+=sliceweight;
        }
    }



    failsdata.DrawArea2.prototype.findPagebreak = function(pagemin,pagemax)
    {
        var lastquality=1000;
        var selpagebreak=pagemax;

        var maxslicepos=Math.round(pagemax/this.numslicesheight);
        var minslicepos=Math.round(pagemin/this.numslicesheight);
        //console.log("findPageBreak",maxslicepos,minslicepos);

        for (index=maxslicepos;index>=minslicepos; index--) {
          var pagebreak=(index+0.5)*this.numslicesheight;

          var density=0.00001*0;


          if (typeof this.slices[index] !== "undefined") {
            density+=this.slices[index];
          }
            //console.log("Test slice",density,index,pagebreak,this.slices[index]);


          var quality=density*(1.+4.*(pagemax-pagebreak)*(pagemax-pagebreak));
          //console.log("qua,lqual",quality,lastquality);

          if (quality<lastquality) {
            selpagebreak=pagebreak;
            lastquality=quality;
          }
        }
        return selpagebreak;

    };




    failsdata.Container = function() {
        failsdata.Sink.call(this);
        this.maxobjectnumber=0;
        this.cursubobj=0;
        this.lasttime=0;
    };

    failsdata.Container.prototype=Object.create(failsdata.Sink.prototype);
    failsdata.Container.prototype.constructor = failsdata.Container;

    failsdata.Container.prototype.startPath = function(time,objnum,curclient,x,y,type,color,w) {
       var tempbuffer=new ArrayBuffer(32);
       var dataview=new DataView(tempbuffer);

        // long header 16 Bytes
        switch (type) {
        default:
        case 0:{
       dataview.setUint8(0, 0); // major command type, normal line path is 0
        } break;
        case 1: { // marker
        dataview.setUint8(0, 3); // major command type, marker line path is 3
        } break;
        case 2: { //eraser
        dataview.setUint8(0, 4); // major command type, marker eraser path is 4
        } break;
        };

       dataview.setUint16(1, 32); // length  1..2
       dataview.setUint8(3, curclient); // reserved 3;
       dataview.setUint32(4, objnum); // 4.. 7
       dataview.setFloat64(8,time); //8..15
       this.lasttime=time; // store time for simple header
        // aux data

       dataview.setFloat32(16,x); // 16-19
       dataview.setFloat32(20,y); //20-23
       dataview.setFloat32(24,w); //24-27
       // console.log("FDC sP 0 w:",w);
       dataview.setUint32(28,color); //28-31
       this.cursubobj=1;
       this.curobjnum=objnum;

       this.pushArrayToStorage(tempbuffer);

    };

    failsdata.Container.prototype.addToPath = function(time,curclient,x,y) {
       var tempbuffer=new ArrayBuffer(16);
       var dataview=new DataView(tempbuffer);

       // short header 8 Bytes
       dataview.setUint8(0, 1); // major command type, add to line path is 1
       dataview.setUint16(1, 16); // length  1..2
       dataview.setUint8(3, curclient); // reserved 3;
       dataview.setFloat32(4,time-this.lasttime); //4..7

       this.lasttime=time; // store time for simple header
       this.cursubobj++;

       dataview.setFloat32(8,x); // 8-11
       dataview.setFloat32(12,y); // 12-15

       this.pushArrayToStorage(tempbuffer);

    };

    failsdata.Container.prototype.finishPath = function(time,curclient) {
       var tempbuffer=new ArrayBuffer(8);
       var dataview=new DataView(tempbuffer);

       // short header 8 Bytes
       dataview.setUint8(0, 2); // major command type, close line path is 2
       dataview.setUint16(1, 8); // length  1..2
       dataview.setUint8(3, curclient); // reserved 3;
       dataview.setFloat32(4,time-this.lasttime); //4..7

       this.lasttime=time; // store time for simple header

        this.pushArrayToStorage(tempbuffer);

       this.cursubobj=0;
    };

    failsdata.Container.prototype.scrollBoard = function(time,x,y) {
       var tempbuffer=new ArrayBuffer(32); //actually it is a waste, but may be we need it later
       var dataview=new DataView(tempbuffer);

       dataview.setUint8(0, 5); // major command type, scroll board

       dataview.setUint16(1, 32); // length  1..2
       dataview.setUint8(3, 0); // reserved for future use 3
       dataview.setFloat64(4,time); //4..11
       dataview.setFloat32(12,x); // 12-15 //absolute position
       dataview.setFloat32(16,y); // 16-19

       this.pushArrayToStorage(tempbuffer);

    };

   failsdata.Container.prototype.addPicture =function(time,objnum,curclient,x,y,width,height,uuid) {
       var tempbuffer=new ArrayBuffer(48);
       var dataview=new DataView(tempbuffer);
//console.log("addPicture in failsdata Container");
       dataview.setUint8(0, 6); // major command type, addpicture

       dataview.setUint16(1, 48); // length  1..2
       dataview.setUint8(3, 0); // reserved for future use 3
       dataview.setUint32(4, objnum); // 4.. 7
       dataview.setFloat64(8,time); //8..15
       dataview.setFloat32(16,x); // 16-19 //absolute position
       dataview.setFloat32(20,y); // 20-23
       dataview.setFloat32(24,width); // 24-27 //width and height
       dataview.setFloat32(28,height); // 28-31

       //convert uuid to bytes
       var parts=uuid.split("-");
       var dest=32;
       for (var i = 0; i < parts.length; i++) {
           if (dest>48) break;
           for (var j = 0; j < parts[i].length; j+=2) {
               if (dest>48) break;
               dataview.setUint8(dest,parseInt(parts[i].substr(j, 2), 16));
               dest++;
           }
        }
        if (dest!=48) {console.log("uuid is broken",uuid,dest)}



       this.pushArrayToStorage(tempbuffer);
   };





    failsdata.MemContainer = function(num,dummy) {
        failsdata.Container.call(this);
        this.storage = new ArrayBuffer(6400);
        this.storageAllocSize = 6400;
        this.storageSize = 0;
        this.number=num;

    };

    failsdata.MemContainer.prototype=Object.create(failsdata.Container.prototype);
    failsdata.MemContainer.prototype.constructor = failsdata.MemContainer;

    failsdata.MemContainer.prototype.pushArrayToStorage = function (array) {
        while (array.byteLength +this.storageSize > this.storageAllocSize) {
            // realloc data
            this.storageAllocSize*=2;
            var reallocstorage = new ArrayBuffer(this.storageAllocSize);
            new Uint8Array(reallocstorage).set( new Uint8Array(this.storage));
            this.storage=reallocstorage;
        }
        new Uint8Array(this.storage).set(new Uint8Array(array),this.storageSize);
        //console.log("pATS",this.storageSize,array.byteLength,this);
        this.storageSize += array.byteLength;
    };

    failsdata.MemContainer.prototype.replaceStoredData = function(data)
    {
        if (data.byteLength > this.storageAllocSize) {
            this.storageAllocSize = data.byteLength + 6400;
            this.storage=new ArrayBuffer(this.storageAllocSize);
        }
        this.storageSize = data.byteLength;
        new Uint8Array(this.storage).set(new Uint8Array(data)); // copy data
    };

    failsdata.MemContainer.prototype.getElementTime=function(position,lasttime) {
        if (position+8>this.storageSize) return 0.; //should never happen
        var dataview=new DataView(this.storage);
        var command=dataview.getUint8(position);
        var time=lasttime;
        switch (command) {
        case 3:
        case 4:
        case 0: {
                if (position+16>this.storageSize) return 0.; //should never happen
                time=dataview.getFloat64(position+8);
        } break;
        case 1:
        case 2: {
            if (position+8>this.storageSize) return 0.; //should never happen
            time+=dataview.getFloat32(position+4);
        } break;
        case 5: {
                if (position+20>this.storageSize) return 0.; //should never happen
                time=dataview.getFloat64(position+4);
        } break;
        case 6: {
                if (position+48>this.storageSize) return 0.; //should never happen
                time=dataview.getFloat64(position+8);
        } break;
        }
        return time;
    };

    failsdata.MemContainer.prototype.getElementObjnum=function(position,lastobjnum) {
        if (position+8>this.storageSize) return 0.; //should never happen
        var dataview=new DataView(this.storage);
        var command=dataview.getUint8(position);
        var objnum=lastobjnum;
        switch (command) {
        case 3:
        case 4:
        case 0: {
                if (position+16>this.storageSize) return 0.; //should never happen
                objnum=dataview.getUint32(position+4);
        } break;
        case 1:
        case 2: {
            if (position+8>this.storageSize) return 0.; //should never happen
            objnum++;

        } break;
        case 5: {
                if (position+20>this.storageSize) return 0.; //should never happen

        } break;
        case 6: {
                if (position+48>this.storageSize) return 0.; //should never happen
                time=dataview.getFloat64(position+4);
        } break;
        }
        return objnum;
    };

    failsdata.MemContainer.prototype.redrawElementTo=function(datasink,pos,lasttime)
    {
        //First Check size
        var dataview=new DataView(this.storage);
        if (2+pos>this.storageSize) {
            //console.log("pos+2test",pos,this.storageSize);
            return -1; // this was the last element
        }
        var command=dataview.getUint8(pos);
        var length=dataview.getUint16(pos+1);
        if (length+pos>this.storageSize) {
            //console.log("pos+lengthtest",pos,length,this.storageSize,command);
            return -1; // this was the last element
        }
        //console.log("rdE",length,pos,command,this.storageSize);

        switch (command) {
        case 3:
        case 4:
        case 0: { //now replay the data
            if (length<32) {
               // console.log("damaged data1",length,pos);
                return -1; //damaged data
            }
            var type=0;
            if (command==3) type=1;
            else if (command==4) type=2;
            //console.log("rdE 0 w:",dataview.getFloat32(pos+24));
            datasink.startPath(dataview.getFloat64(pos+8),
                               dataview.getUint32(pos+4),
                               dataview.getUint8(pos+3),
                               dataview.getFloat32(pos+16),
                               dataview.getFloat32(pos+20),
                               type,
                               dataview.getUint32(pos+28),
                               dataview.getFloat32(pos+24));
        } break;
        case 1: {
            if (length<16) {
                //console.log("damaged data2");
                return -1; //damaged data
            }
            datasink.addToPath(lasttime
                               +dataview.getFloat32(pos+4),
                               dataview.getUint8(pos+3),
                               dataview.getFloat32(pos+8),
                               dataview.getFloat32(pos+12));
        } break;
        case 2: {
            if (length<8) {
                //console.log("damaged data3");
                return -1; //damaged data
            }
            datasink.finishPath(lasttime
                               +dataview.getFloat32(pos+4),
                                dataview.getUint8(pos+3));
        } break;
        case 6: {
          //  console.log("addPicture in failsdata redraw");
            if (length<48) {
                //console.log("damaged data2");
                return -1; //damaged data
            }
            var nuuids="";
            var partsnext = [4, 6, 8, 10, 16];
            var partpos=0;
            for (var i=0;i<16;i++) {
                if (i==partsnext[partpos]) {
                    nuuids+="-";
                    partpos++;
                }
                var number=dataview.getUint8(pos+32+i);
                var str=number.toString(16);
                if (str.length==1) str="0"+str;
                nuuids+=str;
            }
            datasink.addPicture(dataview.getFloat64(pos+8),
                               dataview.getUint32(pos+4),
                               dataview.getUint8(pos+3),
                               dataview.getFloat32(pos+16),
                               dataview.getFloat32(pos+20),
                                dataview.getFloat32(pos+24),
                               dataview.getFloat32(pos+28),
                                nuuids);

        } break;


        };



        return pos+length;
    };


     failsdata.MemContainer.prototype.reparseCommand=function(pos,commandstate)
     {
        //First Check size
        var dataview=new DataView(this.storage);
        if (2+pos>this.storageSize) {
            //console.log("pos+2test",pos,this.storageSize);
            return -1; // this was the last element
        }
        var command=dataview.getUint8(pos);
        var length=dataview.getUint16(pos+1);
        if (length+pos>this.storageSize) {
            //console.log("pos+lengthtest",pos,length,this.storageSize,command);
            return -1; // this was the last element
        }
        //console.log("rdE",length,pos,command,this.storageSize);

        switch (command) {

        case 5: { //now replay the data
            if (length<12) {
               // console.log("damaged data1",length,pos);
                return -1; //damaged data
            }

            commandstate.time=dataview.getFloat64(pos+4);
            commandstate.scrollx=dataview.getFloat32(pos+12);
            commandstate.scrolly=dataview.getFloat32(pos+16);
        } break;

        };



        return pos+length;
    };

    failsdata.MemContainer.prototype.getCurCommandState = function()
    {
        var contpos=0;
        var commandstate= {};
        var dataavail=true;
        while (contpos>=0) {
            contpos=this.reparseCommand(contpos,commandstate);
            //console.log("contpos",contpos);
        }
        return commandstate;
    };


    failsdata.CallbackContainer = function(num,config) {
        failsdata.Container.call(this);
        this.writeData=config.writeData;
        this.obj=config.obj;
        this.number=num;

    };

    failsdata.CallbackContainer.prototype=Object.create(failsdata.Container.prototype);
    failsdata.CallbackContainer.prototype.constructor = failsdata.CallbackContainer;

    failsdata.CallbackContainer.prototype.pushArrayToStorage = function (array) {
        this.writeData(this.obj,this.number,array,true);

    };

   failsdata.CallbackContainer.prototype.replaceStoredData = function(data)
    {
        this.writeData(this.obj,this.number,data,false);
    };


    failsdata.Collection = function(containertype,containerconfig) {
        failsdata.Sink.call(this);
        this.lasttime=0;

        this.lastcontainer=0;
        this.containers= [];


        this.containertype=containertype;
        this.containerconfig=containerconfig;
        this.commandcontainer = this.containertype("command",containerconfig);

    };

    failsdata.Collection.prototype=Object.create(failsdata.Sink.prototype);
    failsdata.Collection.prototype.constructor =  failsdata.Collection;



    failsdata.Collection.prototype.startPath = function(time,objnum,curclient,x,y,type,color,w) {

        var storagenum=Math.floor(y); // in Normalized coordinates we have rectangular areas
        if (! (storagenum in this.containers)) {
            // TODO for the network case sync with server
            this.containers[storagenum]=this.containertype(storagenum,this.containerconfig);
        }
        this.lastcontainer=storagenum;

        this.containers[storagenum].startPath(time,objnum,curclient,x,y,type,color,w);

    };

    failsdata.Collection.prototype.addToPath = function(time,curclient,x,y) {
       var storagenum=this.lastcontainer; // in Normalized coordinates we have rectangular areas
        if (! (storagenum in this.containers)) {
            // TODO for the network case sync with server
            this.containers[storagenum]=this.containertype(storagenum,this.containerconfig);
        }


        this.containers[storagenum].addToPath(time,curclient,x,y);

    };

    failsdata.Collection.prototype.finishPath = function(time,curclient) {
       var storagenum=this.lastcontainer; // in Normalized coordinates we have rectangular areas
        if (! (storagenum in this.containers)) {
            // TODO for the network case sync with server
            this.containers[storagenum]=this.containertype(storagenum,this.containerconfig);
        }

        this.containers[storagenum].finishPath(time,curclient);
    };

    failsdata.Collection.prototype.addPicture =function(time,objnum,curclient,x,y,width,height,uuid) {
        var storagenum=Math.floor(y); // in Normalized coordinates we have rectangular areas
        if (! (storagenum in this.containers)) {
            // TODO for the network case sync with server
            this.containers[storagenum]=this.containertype(storagenum,this.containerconfig);
        }
        //console.log("addPicture in failsdata collection",storagenum);


        this.containers[storagenum].addPicture(time,objnum,curclient,x,y,width,height,uuid);
    };

    failsdata.Collection.prototype.scrollBoard = function(time,x,y) {

        this.commandcontainer.scrollBoard(time,x,y);

    };

    failsdata.Collection.prototype.suggestRedraw = function(minareadrawn,maxareadrawn,curpostop,curposbottom)
    {//console.log("sugredraw",minareadrawn,maxareadrawn,curpostop,curposbottom);

        var minareadrawni=Math.floor(minareadrawn);
        var maxareadrawni=Math.floor(maxareadrawn);
        var curpostopi=Math.floor(curpostop);
        var curposbottomi=Math.floor(curposbottom);
    // console.log("sugredrawi",minareadrawni,maxareadrawni,curpostopi,curposbottomi);

        if ((curpostopi-minareadrawni)>3){console.log("sg1"); return true;} //make the drawn area smaller
  //   console.log("sugredrawt1");
        if ((maxareadrawni-curposbottomi)>3){console.log("sg2"); return true;} //make the drawn area smaller
    //    console.log("sugredrawt2");
        if ((curpostopi-minareadrawni)==0 && curpostopi>0){console.log("sg3"); return true;}
      //  console.log("sugredrawt3");
        //First step determine covered area
        var storedmin=0.;
        var storedmax=0.;
        this.containers.forEach(function(obj,num) {
            storedmin=Math.min(storedmin,num);
            storedmax=Math.max(storedmax,num);
        });
    //    console.log("sugredrawt4",storedmin,storedmax);
        if ((maxareadrawni-curposbottomi)==0 && curposbottomi < storedmax){console.log("sg4"); return true;}
    //    console.log("sugredrawt5");
        return false;
    };
    var redrawcount=0;

    failsdata.Collection.prototype.redrawTo = function(datasink,mindraw,maxdraw)
    {
        var contit=[];
        var contpos=[];
        var conttime=[];
        var contobjnum=[];



        var istart=0;
        var iend=this.containers.length;

        if (mindraw) istart=Math.floor(mindraw);
        if (maxdraw) iend=Math.ceil(maxdraw);
        if (istart<0) istart=0;

         console.log("Redraw from to",istart,iend,redrawcount); redrawcount++;
        console.log("Dataavail from to",0,this.containers.length);
       // istart=0;
        //iend=this.containers.length;

        for (i=istart;i!=iend;i++) {
            if (this.containers[i] === undefined) continue;
            contit.push(this.containers[i]);
            contpos.push(0);
            conttime.push(this.containers[i].getElementTime(0,0));
            contobjnum.push(this.containers[i].getElementObjnum(0,0));
        }
        var dataavail=true;
        var ltime=0;
        var lobjnum=-1;
        while (contit.length) {
            dataavail=false;
            var targettime=0;
            var targetobjnum=-1;
            var target=-1;
            for (i=0;i<contit.length;i++) {
                //console.log("av",contobjnum[i],conttime[i]);
                if (i==0 || (targettime > conttime[i] )) {
                    targettime=conttime[i];
                    targetobjnum=contobjnum[i];
                    target=i;
                }
            }

            if (target==-1) break; //nothing found weird
            contpos[target]=contit[target].redrawElementTo(datasink,contpos[target],conttime[target]);
           // console.log("targettime",targettime,targetobjnum);
            this.lasttime=ltime=targettime;
            lobjnum=targetobjnum;
            if (contpos[target]<0) { //remove from array
                contpos.splice(target,1);
                contit.splice(target,1);
                conttime.splice(target,1);
                contobjnum.splice(target,1);
            } else {
                conttime[target]=contit[target].getElementTime(contpos[target],conttime[target]);
                contobjnum[target]=contit[target].getElementObjnum(contpos[target],contobjnum[target]);
            }
        }
    };



    failsdata.Collection.prototype.clearContainers=function()
    {
        this.containers = [];
        this.lasttime=0;

        this.lastcontainer=0;
        this.commandcontainer = new this.containertype("command",this.containerconfig);
        console.log("clear Containers");
    };

    failsdata.Collection.prototype.replaceStoredData=function(i,data)
    {


        if (! (i in this.containers)) {
            this.containers[i]=new this.containertype(i,this.containerconfig);
        }
        this.containers[i].replaceStoredData(data);



    };




    failsdata.Dispatcher = function() {
        failsdata.Sink.call(this);
        this.datasinklist = [];
        this.curobjectnumber=0;
        this.curclientnum=0;

        this.blocked = false;

        this.scrollx=this.scrolly=0;

        this.starttime=now();
    };

    failsdata.Dispatcher.prototype=Object.create(failsdata.Sink.prototype);
    failsdata.Dispatcher.prototype.constructor =  failsdata.Dispatcher;

    failsdata.Dispatcher.prototype.getNewObjectNumber= function()
    {
        var retnumber= this.curobjectnumber;
        this.curobjectnumber++;
        return retnumber;
    };

    failsdata.Dispatcher.prototype.getTime= function()
    {
        return now()-this.starttime;
    };

    failsdata.Dispatcher.prototype.addSink = function(sink) {
      this.datasinklist.push(sink);
    };

    failsdata.Dispatcher.prototype.startPath = function(time,objnum,curclient,x,y,type,color,w) {
        //console.log("FDD sP",this);
       if (this.blocked) return;
       var i;
       var object=objnum;
       if (!object) object=this.getNewObjectNumber();
       else this.curobjectnumber=object;
       //console.log("FDD startPath",time,objnum,curclient,x,y,w,color);

       var timeset=time;
       if (!timeset) timeset = now()-this.starttime;

       var client=curclient;
       if (!client) client=this.curclientnum;
        //console.log("FDD startPath2",timeset,object,client,x,y,w,color);

       for (i=0;i<this.datasinklist.length;i++) {
           this.datasinklist[i].startPath(timeset,object,client,x,y,type,color,w);
       }

    };

    failsdata.Dispatcher.prototype.addToPath = function(time,curclient,x,y) {
        //console.log("FDD aTP",this);
       if (this.blocked) return;
       var client=curclient;
       if (!curclient) client=this.curclientnum;
       var timeset=time;
       if (!timeset) timeset = now()-this.starttime;


       var i;
       for (i=0;i<this.datasinklist.length;i++) {
           this.datasinklist[i].addToPath(timeset,client,x,y);
       }

    };

    failsdata.Dispatcher.prototype.finishPath = function(time,curclient) {
         //console.log("FDD fP",this);
      if (this.blocked) return;
      var client=curclient;
      if (!curclient) client=this.curclientnum;
      var timeset=time;
      if (!timeset) timeset = now()-this.starttime;

       var i;
       for (i=0;i<this.datasinklist.length;i++) {
           this.datasinklist[i].finishPath(timeset,client);
       }
    };

    failsdata.Dispatcher.prototype.scrollBoard = function(time,x,y) {
      this.setTimeandScrollPos(time,x,y);
      var timeset=time;
      if (!timeset) timeset = now()-this.starttime;
      var i;
      for (i=0;i<this.datasinklist.length;i++) {
           this.datasinklist[i].scrollBoard(timeset,x,y);
       }

    };

    failsdata.Dispatcher.prototype.addPicture =function(time,objnum,curclient,x,y,width,height,uuid) {
        //console.log("addPicture in failsdata dispatcher before blocked");
       if (this.blocked) return;
       var i;
       var object=objnum;
       if (!object) object=this.getNewObjectNumber();
       else this.curobjectnumber=object;
       //console.log("FDD startPath",time,objnum,curclient,x,y,w,color);

       var timeset=time;
       if (!timeset) timeset = now()-this.starttime;

       var client=curclient;
       if (!client) client=this.curclientnum;
        //console.log("addPicture in failsdata dispatcher");

       for (i=0;i<this.datasinklist.length;i++) {
           this.datasinklist[i].addPicture(timeset,object,client,x,y,width,height,uuid);
       }
    };

    failsdata.Dispatcher.prototype.setTimeandScrollPos=function(time,scrollx,scrolly)
    {
        if (time) {
            // time= now()-starttime
           // console.log("timeadjusted now",now(),time);
            this.starttime=now()-time; // adjusttime
            //console.log("timeadjusted",this.starttime,time);
        }
        if (scrollx) this.scrollx=scrollx;
        if (scrolly) this.scrolly=scrolly;
    };


     failsdata.NetworkSink = function(send) {
        failsdata.Sink.call(this);
        this.sendfunc=send;
    };

    failsdata.NetworkSink.prototype=Object.create(failsdata.Sink.prototype);
    failsdata.NetworkSink.prototype.constructor =  failsdata.NetworkSink;



    failsdata.NetworkSink.prototype.startPath = function(time,objnum,curclient,x,y,type,color,w) {
        var outobj=new Object();
        outobj.task="startPath";
        outobj.time=time;
        outobj.objnum=objnum;
        outobj.curclient=curclient;
        outobj.x=x;
        outobj.y=y;
        outobj.type=type;
        outobj.color=color;
        outobj.w=w;
        this.sendfunc(outobj);
    };

    failsdata.NetworkSink.prototype.addToPath = function(time,curclient,x,y) {
        var outobj=new Object();
        outobj.task="addToPath";
        outobj.time=time;
        outobj.curclient=curclient;
        outobj.x=x;
        outobj.y=y;
        this.sendfunc(outobj);

    };

    failsdata.NetworkSink.prototype.finishPath = function(time,curclient) {
       var outobj=new Object();
        outobj.task="finishPath";
        outobj.time=time;
        outobj.curclient=curclient;
        this.sendfunc(outobj);
    };

    failsdata.NetworkSink.prototype.addPicture =function(time,objnum,curclient,x,y,width,height,uuid) {
        var outobj=new Object();
        outobj.task="addPicture";
        outobj.time=time;
        outobj.objnum=objnum;
        outobj.curclient=curclient;
        outobj.x=x;
        outobj.y=y;
        outobj.width=width;
        outobj.height=height;
        outobj.uuid=uuid;
        this.sendfunc(outobj);
    };

    failsdata.NetworkSink.prototype.scrollBoard = function(time,x,y) {
       var outobj=new Object();
        outobj.task="scrollBoard";
        outobj.time=time;
        outobj.x=x;
        outobj.y=y;
        this.sendfunc(outobj);
    };


    failsdata.NetworkSource = function(sink) {
        this.sink=sink;
    };


    failsdata.NetworkSource.prototype.constructor =  failsdata.NetworkSource;

    failsdata.NetworkSource.prototype.receiveData = function(data) {
        var sink=this.sink;
        switch(data.task) {
        case "startPath": {
           // console.log("FDNS sP",data);
            sink.startPath(
                    data.time,
                    data.objnum,
                    data.curclient,
                    data.x,
                    data.y,
                    data.type,
                    data.color,
                    data.w);
        }break;
        case "addToPath": {
            //console.log("FDNS aTp",data);
            sink.addToPath(
                data.time,
                data.curclient,
                data.x,
                data.y);
        }break;
        case "finishPath": {
             //console.log("FDNS fP",data);
            sink.finishPath(data.time,data.curclient);
        } break;
        case "scrollBoard": {
            sink.scrollBoard(data.time,data.x,data.y);
        } break;
        case "addPicture": {
            //console.log("addPicture in failsdata receive Data Networksource");
            sink.addPicture(data.time,
                    data.objnum,
                    data.curclient,
                    data.x,
                    data.y,
                    data.width,
                    data.height,
                    data.uuid);
        } break;
        };
    };











}(typeof exports === 'undefined'? this['failsdata']={}: exports));
