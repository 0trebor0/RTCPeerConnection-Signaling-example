const ws = require( 'ws' );
const url = require('url');
const fs = require('fs');
const http = require('http');
const mime = require('mime-types');

const App = {
    streamFile:( filename, res )=>{
        res.writeHead(200, {'Content-Type': mime.lookup( filename )});
        let fileStream = fs.createReadStream( filename );
		fileStream.pipe( res );
		fileStream.on('close', ()=>{
			res.end();
		});
    },
    wSend:( conn, d )=>{
        conn.send( Buffer.from( JSON.stringify( d ) ).toString('base64')  );
    },
    isJson:( d )=>{
        try{
            JSON.parse( d );
        }catch( e ){
            return false;
        }
        return true;
    },
    users:{},
    clientEvents:{
        "newpeer":( array, userid )=>{
            if( array.user !== '' || array.user !== null ){
                if( App.users[ array.user ] ){
                    App.wSend( App.users[userid].connection, {'type':'newpeerok','status':'online','user':array.user} );
                } else {
                    App.wSend( App.users[userid].connection, {'type':'newpeerfail','status':'offline','user':array.user} );
                }
            }
        },
        "offer":( array, userid )=>{
            if( 'to' in array ){
                if( App.users[ array.to ] ){
                    let to = App.users[ array.to ].connection;
                    delete array.to;
                    array.from = userid;
                    App.wSend( to, array );
                }
            }
        },
        "candidate":( array, userid )=>{
            if( 'to' in array ){
                if( App.users[ array.to ] ){
                    let to = App.users[ array.to ].connection;
                    delete array.to;
                    array.from = userid;
                    App.wSend( to, array );
                }
            }
        },
        "answer":( array, userid )=>{
            if( 'to' in array ){
                if( App.users[ array.to ] ){
                    let to = App.users[ array.to ].connection;
                    delete array.to;
                    array.from = userid;
                    App.wSend( to, array );
                }
            }
        }
    }
};

const server = http.createServer( ( req, res )=>{
    console.log( req.url );
    let parsed = url.parse( req.url, true );
    if( parsed.pathname == '/' ){
        App.streamFile( "./index.html", res );
    } else if(parsed.pathname == '/peer.js'){
        App.streamFile( "./peer.js", res );
    } else {
        res.end();
    }
} );
server.listen( 8080 );
const websocket = new ws.Server({ server });
console.log( "WebSocket Starting on port:8080" );
websocket.on( "connection", ( connection, req )=>{
    let ip = req.connection.remoteAddress;
    req.parsedUrl = url.parse( req.url, true );
    console.log( "new connection "+ip+" - "+req.url );
    if( req.parsedUrl.query.user !== '' || req.parsedUrl.query.user !== null ){
        let userid = req.parsedUrl.query.user;
        if( userid in App.users ){
            connection.terminate();
        } else {
            App.users[userid] = {'connection':connection,"id":userid};
            connection.on( 'message', ( message )=>{
                message = Buffer.from( message, "base64" ).toString('utf8');
                if( App.isJson( message ) === true ){
                    let array = JSON.parse( message );
                    if( App.clientEvents[ array.type ] ){
                        console.log( "[IP:"+ip+"][EVENT: "+array.type+" ]" );
                        console.log( array );
                        App.clientEvents[ array.type ]( array, userid );
                    } else {
                        connection.terminate();
                    }
                } else {
                    connection.terminate();
                }
            });
            connection.on( 'close', ()=>{
                console.log( "disconnected "+ip );
                delete App.users[ userid ];
            } );
        }
    } else {
        console.log( connection );
        connection.terminate();
    }
    
});
