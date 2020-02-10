module.exports = class{
    constructor(){
        this.connection = null;
        this.ip = null;
        this.req = null;
        this.users = {};
    }
    handler( connection, ip, req ){
        this.connection = connection;
        this.ip = ip;
        this.req = req;
        if( req.parsedUrl.query.user !== '' || req.parsedUrl.query.user !== null ){
            let userid = req.parsedUrl.query.user;
            if( userid in this.users ){
                connection.terminate();
            } else {
                this.users[ userid ] = {'connection':connection,"id":userid};
            }
            connection.on( 'message', ( message )=>{
                message = Buffer.from( message, "base64" ).toString('utf8');
                if( this.isJson( message ) === true ){
                    let array = JSON.parse( message );
                    if( clientEvents[ array.type ] ){
                        console.log( "[IP:"+this.ip+"][EVENT: "+array.type+" ]" );
                        clientEvents[ array.type ]( array );
                    } else {
                        connection.terminate();
                    }
                } else {
                    console.log( "not json" );
                    connection.terminate();
                }
            } );
            connection.on( 'close', ()=>{
                console.log( "disconnected "+ip );
                delete this.users[ userid ];
            } );
            const clientEvents = {
                "newpeer":( array )=>{
                    if( array.user !== '' || array.user !== null ){
                        if( this.users[ array.user ] ){
                            this.wSend( this.connection, {'type':'newpeerok','status':'online','user':array.user} );
                        } else {
                            this.wSend( this.connection, {'type':'newpeerfail','status':'offline','user':array.user} );
                        }
                    }
                },
                "offer":( array )=>{
                    if( 'to' in array ){
                        if( this.users[ array.to ] ){
                            let to = this.users[ array.to ].connection;
                            delete array.to;
                            array.from = userid;
                            this.wSend( to, array );
                        }
                    }
                },
                "candidate":( array )=>{
                    if( 'to' in array ){
                        if( this.users[ array.to ] ){
                            let to = this.users[ array.to ].connection;
                            delete array.to;
                            array.from = userid;
                            this.wSend( to, array );
                        }
                    }
                },
                "answer":( array )=>{
                    if( 'to' in array ){
                        if( this.users[ array.to ] ){
                            let to = this.users[ array.to ].connection;
                            delete array.to;
                            array.from = userid;
                            this.wSend( to, array );
                        }
                    }
                }
            }
        } else {
            this.wSend( this.connection, {"type":"error","reason":"userid already exist"} );
            this.connection.terminate();
        }
    }
    wSend( conn, d ){
        conn.send( Buffer.from( JSON.stringify( d ) ).toString('base64')  );
    }
    isJson( d ){
        try{
            JSON.parse( d );
        }catch( e ){
            return false;
        }
        return true;
    }

}
