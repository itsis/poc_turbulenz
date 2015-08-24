/*{{ javascript("./tslib/texturemanager.js") }}*/
/*{{ javascript("./jslib-modular/tzdraw2d.js") }}*/
/*{{ javascript("./jslib-modular/services.js") }}*/
/*{{ javascript("./jslib/observer.js") }}*/
/*{{ javascript("./jslib/requesthandler.js") }}*/
/*{{ javascript("./jslib/utilities.js") }}*/

TurbulenzEngine.onload = function onloadFn()
{
  //==============================================================
  // Parameters
  //==============================================================
  var scaleMoode = 'scale';
  var blendMode = 'alpha';
  var sortMode = 'deferred';

  var textureMainCharacter;
  //==============================================================
  // Turbulenz Initialisation
  //==============================================================
  var graphicsDevice = TurbulenzEngine.createGraphicsDevice({});
  var mathDevice = TurbulenzEngine.createMathDevice({});
  var requestHandler = RequestHandler.create({});

  var textureManager = TextureManager.create(graphicsDevice, requestHandler, null, null);
  var gameSession = TurbulenzServices.createGameSession(requestHandler, sessionCreated);

  //==============================================================
  // Draw2D Initialisation
  //==============================================================
  var draw2D = Draw2D.create({
    graphicsDevice: graphicsDevice
  });

  // Viewport for Draw2D
  var gameWidth = 800;
  var gameHeight = 600;

  var viewport = mathDevice.v4Build(0, 0, gameWidth, gameHeight);
  draw2D.configure({
      scaleMode : 'scale',
      viewportRectangle: viewport
  });

  //==============================================================
  // Sprite drawing
  //==============================================================
  var r = 0.0, g = 0.0, b = 0.0, a = 1.0;
  var bgColor = [r, g, b, a];
  var texturesNames = null;
  var loadedResources = 0;
  var mappingTableArray;

  // Mapping table
  function sessionCreated(gameSession){
      TurbulenzServices.createMappingTable(
        requestHandler,
        gameSession,
        mappingTableReceived
      );
  };


  function mappingTableReceived(mappingTable){
      alert('mTR');
      TurbulenzEngine.request("./mapping_table.json", function mappingLoad(jsonData){
              var mappingTableArray = JSON.parse(jsonData);
              mappingTableArray = mappingTableArray['urnmapping'];
          }
      );

      // TextureManager
      function textureParams(src){
          return {
            src : mappingTable.getURL(src),
            mipmaps : true,
            onload : function (texture){
                if (texture){
                    textureManager.add(src, texture);
                    loadedResources += 1;
                }
            }
          };
      };

      for (let cptTextureName = 0; cptTextureName < mappingTableArray.length; cptTextureName += 1){
          graphicsDevice.createTexture(textureParams(mappingTableArray[cptTextureName]));
      }

      textureMainCharacter = textureManager.get('./assets/characters/main_character.png');


  };
  var sprites = Array();
  sprites["main_character.png"] = Draw2DSprite.create({
      width: 80,
      height: 80,
      x: 400,
      y: 600,
      color: [1.0, 1.0, 1.0, 1.0],
  });
  var sprite = sprites['main_character.png'];
  sprite.setTexture(textureMainCharacter);

  var fond = Draw2DSprite.create({
      width: 3000,
      height: 2000,
      x: 0,
      y: 0,
      color: [1.0, 1.0, 1.0, 1.0],
  });

  var textureFond = graphicsDevice.createTexture({
      src: "./assets/scenery/fond2.png",
      mipmaps: true,
      onload: function (texture)
      {
          if (texture)
          {
              fond.setTexture(texture);
              fond.setTextureRectangle([0, 0, 2048, 1024]);
          }
      }
  });


  var Decor=[];
  var table = Draw2DSprite.create({
      width: 150,
      height: 100,
      x:140,
      y: 140,
      color: [1.0, 1.0, 1.0, 1.0],


  });

  var tableau = Draw2DSprite.create({
      width: 90,
      height: 150,
      x:540,
      y: 140,
      color: [1.0, 1.0, 1.0, 1.0],


  });

  var ordi = Draw2DSprite.create({
      width: 50,
      height: 50,
      x:130,
      y: 120,
      color: [1.0, 1.0, 1.0, 1.0],


  });

  var fontaine = Draw2DSprite.create({
      width: 60,
      height: 120,
      x:530,
      y: 400,
      color: [1.0, 1.0, 1.0, 1.0],


  });

  var borne = Draw2DSprite.create({
      width: 100,
      height: 180,
      x:130,
      y: 400,
      color: [1.0, 1.0, 1.0, 1.0],


  });

  var textureDecor = graphicsDevice.createTexture({
      src: "./assets/scenery/office.png",
      mipmaps: true,
      onload: function (texture)
      {
          if (textureDecor)
          {
              table.setTexture(textureDecor);
              table.setTextureRectangle([6, 4, 110, 88]);
              tableau.setTexture(textureDecor);
              tableau.setTextureRectangle([120, 6, 182, 111]);
              ordi.setTexture(textureDecor);
              ordi.setTextureRectangle([11, 110, 65, 164]);
              fontaine.setTexture(textureDecor);
              fontaine.setTextureRectangle([189, 4, 231, 108]);
              borne.setTexture(textureDecor);
              borne.setTextureRectangle([260, 0, 330, 120]);
          }
      }
  });

  //==============================================================
  // Main loop
  //==============================================================

  var dir = 3;
  var state=0;
  var step = 10;
  var pos = sprite.y;
  var stateGame = 0;
  var itPath=0;
  var pathToDeskX=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10  ,-10,-10,-10,-10,-10,-10,-10,0,0,0  ];
  var pathToDeskY=[-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,-10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-10,-10,-10,-10     ];
  var pathToTableauX=[0,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,0,0,0,10,10];
  var pathToTableauY=[10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-10,-10,-10,0,0];

  var timer=0;
  var nextUpdate = 0;

  function update() {

      if (graphicsDevice.beginFrame())
      {
          graphicsDevice.clear(bgColor,1);

          draw2D.begin(blendMode,sortMode);
          draw2D.drawSprite(fond);
          draw2D.drawSprite(sprite);
          draw2D.drawSprite(table);
          draw2D.drawSprite(tableau);
          draw2D.drawSprite(ordi);
          draw2D.drawSprite(fontaine);
          draw2D.drawSprite(borne);


          draw2D.end();

          graphicsDevice.endFrame();
      }
      var currentTime = TurbulenzEngine.time;
      if (currentTime > nextUpdate) {
          nextUpdate = (currentTime + 0.1);
          timer += 1;
          /*state+=1;
          if (state>3) state=0;
          sprite.y+=step;
          if ((sprite.y>500) || (sprite.y<50)) {
              step = - step;
              if (dir == 0) {
                  dir = 3;
              }else{
                  dir =0;
              }
          }*/

          if (stateGame==0){
              if (itPath<pathToDeskX.length){
                  if (pathToDeskX[itPath]==0){
                      if(pathToDeskY[itPath]>0){
                          dir=0;
                      }else{
                          dir=3;
                      }
                  }else{
                      if(pathToDeskX[itPath]>0){
                          dir=2;
                      }else{
                          dir=1;
                      }
                  }
                  sprite.x+=pathToDeskX[itPath];
                  sprite.y+=pathToDeskY[itPath];
                  state+=1;
                  if (state>3) state=0;
                  itPath+=1;


              }
              if (timer>80){
                  stateGame=1;
                  itPath=0;
              }
          }else{
              if(stateGame==1){
                  if (itPath<pathToTableauX.length){
                      if (pathToTableauX[itPath]==0){
                          if(pathToTableauY[itPath]>0){
                              dir=0;
                          }else{
                              dir=3;
                          }
                      }else{
                          if(pathToTableauX[itPath]>0){
                              dir=2;
                          }else{
                              dir=1;
                          }
                      }
                      sprite.x+=pathToTableauX[itPath];
                      sprite.y+=pathToTableauY[itPath];
                      state+=1;
                      if (state>3) state=0;
                      itPath+=1;


                  }
                  if (timer>120){
                      stateGame=2;
                      itPath-=1;
                  }
              }else{
                  if(stateGame==2){
                      if (itPath>=0){
                          if (pathToTableauX[itPath]==0){
                              if(pathToTableauY[itPath]>0){
                                  dir=3;
                              }else{
                                  dir=0;
                              }
                          }else{
                              if(pathToTableauX[itPath]>0){
                                  dir=1;
                              }else{
                                  dir=2;
                              }
                          }
                          sprite.x-=pathToTableauX[itPath];
                          sprite.y-=pathToTableauY[itPath];
                          state+=1;
                          if (state>3) state=0;
                          itPath-=1;
                          console.log(itPath +".." + sprite.x);

                      }
                      if (timer>360){
                          stateGame=4;

                      }
                  }
              }
          }

          sprite.setTexture(textureMainCharacter);
          sprite.setTextureRectangle([0 + 64*state, 0 + 64*dir, 64 + 64*state,  64 + 64*dir]);
      }
  }

  var intervalID;
  intervalID = TurbulenzEngine.setInterval(update, 1000 / 60);

  TurbulenzEngine.onunload = function destroyGame() {
    if (intervalID){
        TurbulenzEngine.clearInterval(intervalID);

    }
  };
};
