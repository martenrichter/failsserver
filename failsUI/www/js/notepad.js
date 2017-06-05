//Fails (Fancy Automated Internet Lecture System)
//Copyright (C) 2015-2017  Marten Richter
//
//This program is free software; you can redistribute it and/or modify
//it under the terms of the GNU General Public License version 2 as
//published by the Free Software Foundation.
//
//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//GNU General Public License for more details.
//
//You should have received a copy of the GNU General Public License
//along with this program; if not, write to the Free Software
//Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

(function()
{

    NoteScreenBase = function(append, endbuttoncallback, netsend, isnotepad,pictbuttoncallback, isalsoscreen)
    {
       this.stage=  new PIXI.Container();
        this.endbuttoncallback = endbuttoncallback;
        this.pictbuttoncallback = pictbuttoncallback;

        this.width = append.innerWidth();
        this.height = append.innerHeight();
        var dispres = window.devicePixelRatio || 1;
        console.log("Create new NoteScreenBase",this.width,this.height);

        var renderOptions = {antialiasing:true,
                             transparent:false,
                             autoResize:true,
                             resolution:dispres
        };

        PIXI.GC_MODES.DEFAULT = PIXI.GC_MODES.AUTO;

        this.renderer = PIXI.autoDetectRenderer(this.width, this.height,this.renderOptions, false/*no WebGl Renderer*/);
        if(this.renderer instanceof PIXI.CanvasRenderer) {    //canvas renderer
            console.log("We got a Canvas Renderer!");
          //  alert("This Browser provides only a canvas renderer! Expect mediocre performance!")
            this.canvas=true;
        } else {
            console.log("We got a Webgl Renderer!");
            this.canvas=false;
        }

        this.parent = append;
	this.backcolornormal = 0x505050;
	this.backcolorwhite = 0xefefef;

        this.renderer.backgroundColor=this.backcolornormal;//0x66FF99;

    /*    this.bgtrick= new PIXI.Sprite(PIXI.Texture.fromImage("images/bg.png"));
        this.bgtrick.scale.x = this.width;
        this.bgtrick.scale.y = this.height;
        this.bgtrick.tint = this.backcolornormal;
        this.stage.addChild(this.bgtrick); */



         // add the renderer view element to the DOM
        console.log("this is parent",append);


        this.running = true;




        if (isnotepad) {
            this.blackboard = new BlackboardNotepad(this.stage,this.width,this.height,this.renderer.backgroundColor, this);
            this.toolbox = new ToolBox(this.stage,this.blackboard,dispres);
            this.confirmbox = new ConfirmBox(this.stage,this.blackboard);
            this.isscreen = false;
            this.isalsoscreen = isalsoscreen;
            this.casttoscreens = false;
            this.scrolloffset = 0;

            //keyboard handling
            var mythis=this;
            document.addEventListener('keydown', function (key){mythis.onKeyDown(key)});

        } else {
            this.blackboard = new Blackboard(this.stage,this.width,this.height,this.renderer.backgroundColor, this);
            this.isscreen = true;
            this.scrolloffset =0;
        }
        this.netsend = netsend;
	this.backgroundbw=true;


        append.append(this.renderer.view);
        var myself=this;

        this.resizeeventlistener=function(event){
            console.log("resize event!"+event+append.innerWidth()+" "+append.innerHeight());
            myself.width=append.innerWidth();
            myself.height=append.innerHeight();
            myself.renderer.resize(myself.width,myself.height);
           // myself.bgtrick.scale.x = append.width;
        //    myself.bgtrick.scale.y = append.height;
        //    myself.bgtrick.tint = 0x000000;
            console.log("resize"/*,myself.bgtrick*/);


            if (myself.blackboard) {
                myself.blackboard.resize(myself.width,myself.height);
                myself.updateSizes();

            }
        };

        window.addEventListener('resize',this.resizeeventlistener );



    };


    NoteScreenBase.prototype.constructor = NoteScreenBase;

    NoteScreenBase.prototype.animate = function(timestamp)
    {
        this.blackboard.updateGraphics(timestamp);
        if (this.toolbox) this.toolbox.updateGraphics(timestamp);
        if (this.confirmbox) this.confirmbox.updateGraphics(timestamp);

        // render the stage
        this.renderer.render(this.stage);


        return this.running;
    };

    NoteScreenBase.prototype.updateSizes = function ()
    {
        var data= {
            scrollheight: this.blackboard.scrollheight,
            isscreen: this.isscreen,
	    backgroundbw: this.backgroundbw
        };

        if (!this.isscreen) {
            data.isalsoscreen=this.isalsoscreen;
            data.casttoscreens=this.casttoscreens;
        }
        if (this.backgroundbw) this.setBackgroundColor(this.backcolornormal);
	      else this.setBackgroundColor(this.backcolorwhite);

        this.netSend("updatesizes",data);

    };

    NoteScreenBase.prototype.setScrollOffset=function(scrolloffset)
    {
        this.scrolloffset=scrolloffset;
        this.blackboard.setScrollOffset(scrolloffset);
        if (this.backgroundbw) this.setBackgroundColor(this.backcolornormal);
	else this.setBackgroundColor(this.backcolorwhite);
    };

    NoteScreenBase.prototype.setBackgroundColor=function(bgcolor)
    {
        this.renderer.backgroundColor = bgcolor;//0x66FF99;
     //   this.bgtrick.tint = bgcolor;
	this.blackboard.backcolor = bgcolor;
    }


    NoteScreenBase.prototype.shutdownNotepad = function ()
    {
        console.log("shutdown notepad");
        this.blackboard.shutdown();
        this.running=false;
     //  this.stage.destroy();
        window.removeEventListener('resize',this.resizeeventlistener );
        this.resizeeventlistener=null;
        //this.renderer.view.remove();
        this.renderer.destroy(true);

    };

    NoteScreenBase.prototype.setHasControl = function(hascntrl) {
        this.blackboard.setblocked(!hascntrl);
    };

     NoteScreenBase.prototype.reactivateToolBox = function() {
        this.blackboard.reactivateToolBox();
    };


    NoteScreenBase.prototype.endButtonPressed=function(){
        this.endbuttoncallback();
    };

    NoteScreenBase.prototype.pictButtonPressed=function(){
        this.pictbuttoncallback();
    };

    NoteScreenBase.prototype.receiveData = function(data) {
        this.blackboard.receiveData(data);
    };

    NoteScreenBase.prototype.receivePictInfo= function(data) {
        this.blackboard.receivePictInfo(data);
    };

    NoteScreenBase.prototype.replaceData = function(data) {
        this.blackboard.replaceData(data);
    };

    NoteScreenBase.prototype.netSend= function(command,data) {
      this.netsend(command,data);
    };

    NoteScreenBase.prototype.reportFoG=function(x,y) {
        this.netsend("FoG",{x:x,y:y});
    };

    NoteScreenBase.prototype.receiveFoG=function(data) {
        this.blackboard.receiveFoG(data);
    };

    NoteScreenBase.prototype.enterAddPictureMode=function(uuid,url) {
        this.blackboard.enterAddPictureMode(uuid,url);
    };

    NoteScreenBase.prototype.onKeyDown=function(key) {
        switch (key.keyCode) {
            case 0x28: { // arrowdown
                this.blackboard.scrollboardKeys(0,0.05);
            } break;
            case 0x26: { // arrowUp
                this.blackboard.scrollboardKeys(0,-0.05);
            } break;
            case 0x44: { // "d"
              this.blackboard.toggleDebugView();
           }break;

        };

    };

})();
