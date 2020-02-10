class Peer{
    constructor( userid ){
        this.myId = userid;
        this.wsUrl = "ws://localhost:80";
        this.peers = {};
        this.websocket = new WebSocket( this.wsUrl+"/rtc?user="+userid );
        this.onEvents = {};
        this.websocket.onopen = ()=>{
            this.websocket.onmessage = ( e )=>{
                let data = atob( e.data );
                if( this.isJson( data ) == true ){
                    let array = JSON.parse( data );
                    if( "type" in array ){
                        console.log( "[WEBSOCKET][R][EVENT: "+array.type+"]" );
                        if( this.msgEvents[ array.type ] ){
                            this.msgEvents[ array.type ]( array );
                        } else if( this.onEvents[ array.type ] ){
                            this.onEvents[ array.type ]( array );
                        }
                    }
                }
            }
            this.websocket.onclose = ( e )=>{
                let rec = setInterval( ()=>{
                    if( this.websocket.readyState == 3 ){
                        this.websocket = new WebSocket( this.wsUrl+"/rtc?user="+userid );
                    } else {
                        clearInterval( rec );
                    }
                }, 100000 );
            }
            this.websocket.onerror = ( e )=>{
                console.log( e );
            }
        }
        this.msgEvents ={
            "newpeerok":( array )=>{
                if( "user" in array ){
                    this.newPeer( array.user );
                    this.onIceCandidate( array.user, ( candidate )=>{
                        this.wSend({'type':'candidate','candidate':candidate,'to':array.user});
                    } );
                    this.createOffer( array.user, ( offer )=>{
                        this.wSend({'type':'offer','offer':offer,'to':array.user});
                    } );
                }
            },
            "offer":( array )=>{
                if( array.from ){
                    this.newPeer( array.from );
                    this.onIceCandidate( array.from, ( candidate )=>{
                        this.wSend({'type':'candidate','candidate':candidate,'to':array.from});
                    } );
                    this.setOffer( array.from, array.offer );
                    this.createAnswer( array.from, ( answer )=>{
                        this.wSend({'type':'answer','answer':answer,'to':array.from});
                    } );
                }
            },
            "answer":( array )=>{
                if( array.from ){
                    this.setAnswer( array.from, array.answer );
                }
            },
            "candidate":( array )=>{
                if( array.from ){
                    this.setIceCandidate( array.from, array.candidate );
                }
            }
        }
    }
    check( id ){
        this.wSend({'type':'newpeer','user':id});
    }
    wSend( d ){
        this.websocket.send( btoa( JSON.stringify( d ) ) );
    }
    isJson = ( d ) =>{
        try{
            JSON.parse( d );
        }catch( e ){
            return false;
        }
        return true;
    }
    on( name, callback ){
        this.onEvents[ name ] = callback;
    }
    newPeer( name ){
        console.log( "[RTCPeerConnection][NEW][PEER] "+name );
        if( this.myId !== name ){
            this.peers[ name ] = new RTCPeerConnection( { "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }] } );
            this.peers[ name ].onconnectionstatechange = ( e )=>{
                switch(this.peers[ name ].connectionState) {
                    case "connected":
                    break;
                    case "disconnected":
                        this.peers[ name ].close();
                        delete this.peers[ name ];
                    break;
                    case "failed":
                        this.peers[ name ].close();
                        this.peers[ name ].restartIce();
                    break;
                    case "closed":
                    break;
                }
            }
        }
    }
    isSet( name ){
        if( this.peers[ name ] ){
            return true;
        } else {
            return false;
        }
    }
    connectedPeers(){
        return this.peers.length;
    }
    createOffer( name, callback = null ){
        console.log( "[RTCPeerConnection][NEW][offer] "+name );
        this.peers[ name ].createOffer( { offerToReceiveAudio: 1, offerToReceiveVideo: 1 } ).then( ( offer )=>{
            this.peers[ name ].setLocalDescription( offer );
            if( callback !== null ){
                callback( offer );
            }
        } ).catch( ( err )=>{
            console.log( err );
        } );
    }
    onIceCandidate( name, callback = null ){
        console.log( "[RTCPeerConnection][NEW][ICE-CANDIDATE] "+name );
        this.peers[ name ].onicecandidate = ( event )=>{
            if( event.candidate ){
                if( callback !== null ){
                    callback( event.candidate );
                }
            }
        }
    }
    setOffer( name, offer ){
        console.log( "[RTCPeerConnection][SET][OFFER] "+name );
        this.peers[ name ].setRemoteDescription( new RTCSessionDescription( offer ) ).catch( ( err )=>{
            console.log( err );
        } );
    }
    setIceCandidate( name, candidate ){
        console.log( "[RTCPeerConnection][SET][ICE-CANDIDATE] "+name );
        this.peers[ name ].addIceCandidate( new RTCIceCandidate( candidate ) ).catch( ( err )=>{
            console.log( err );
        } );
    }
    createAnswer( name, callback = null ){
        console.log( "[RTCPeerConnection][NEW][ANSWER] "+name );
        this.peers[ name ].createAnswer().then( ( answer )=>{
            this.peers[ name ].setLocalDescription( answer ).catch( ( err )=>{
                console.log( err );
            } );
            if( callback !== null ){
                callback( answer );
            }
        }).catch( ( err )=>{
            console.log( err );
        } );
    }
    setAnswer( name, answer ){
        console.log( "[RTCPeerConnection][SET][ANSWER] "+name );
        this.peers[ name ].setRemoteDescription( new RTCSessionDescription( answer ) ).catch( ( err )=>{
            console.log( err );
        } );
    }
    user( name ){
        return this.peers[ name ]; 
    }
}