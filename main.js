const ws = require( 'ws' );
const url = require('url');
const fs = require('fs');
const http = require('http');
const mime = require('mime-types');
class App{
    constructor(){
        this.websocket = null;
        this.port = 80;
        this.methods = {};
        this.handlers = {};
        this.bannedIps = {};
        this.allowedSite = ["http://localhost"];
    }
    iniate(){
        try{
            console.log( "WebSocket Starting on port:"+this.port );
            const server = http.createServer( ( req, res )=>{
                console.log( req.url );
                let parsed = url.parse( req.url, true );
                if( parsed.pathname == '/' ){
                    this.streamFile( "./index.html", res );
                    //fs.createReadStream( "./index.html" ).pipe( res );
                } else if(parsed.pathname == '/peer.js'){
                    this.streamFile( "./peer.js", res );
                }else if(parsed.pathname == '/video'){
                    this.streamFile( "./video.mp4", res );
                } else {
                    res.end();
                }
            } );
            this.websocket = new ws.Server({ server });
            server.listen( this.port );
            if( fs.existsSync( __dirname+"/methods/" ) ){
                fs.readdirSync( __dirname+"/methods/" ).forEach( ( file )=>{
                    console.log( "LOADED "+file.replace(".js","") );
                    this.methods[ file.replace(".js","") ] = require( __dirname+"/methods/"+file );
                    this.handlers[ file.replace(".js","") ] = new this.methods[ file.replace(".js","") ]();
                } );
            } else {
                fs.mkdirSync( __dirname+"/methods/" );
            }
            console.log( "Allowed Sites: ", this.allowedSite );
            this.websocket.on( "connection", ( connection, req )=>{
                let ip = req.connection.remoteAddress;
                // rateLimit( connection );
                // rateLimit.on( 'banned', ()=>{
                //     this.bannedIps[ip] = "too many messages";
                //     console.log( "banned: "+ip );
                // } );
                req.parsedUrl = url.parse( req.url, true );
                console.log( "new connection "+ip+" - "+req.url );
                if( this.bannedIps[ip] ){
                    connection.terminate();
                } else {
                    if( this.allowedSite.includes( req.headers.origin ) ){
                        console.log( "Allowed: "+ip+" - "+req.headers.origin );
                        if( this.methods[ req.parsedUrl.pathname.replace("/","") ] ){
                            if( this.handlers[ req.parsedUrl.pathname.replace("/","") ].handler ){
                                this.handlers[ req.parsedUrl.pathname.replace("/","") ].handler( connection, ip, req );
                            }
                        }
                    } else {
                        console.log("unwanted origin "+req.headers.origin);
                        connection.send("You cant be here");
                        connection.terminate();
                    }
                }
            } );
        }catch( error ){
            console.log( error );
        }
    }
    streamFile( filename, res ){
        res.writeHead(200, {'Content-Type': mime.lookup( filename )});
        let fileStream = fs.createReadStream( filename );
		fileStream.pipe( res );
		fileStream.on('close', ()=>{
			res.end();
		});
    }
}
App = new App();
App.iniate();