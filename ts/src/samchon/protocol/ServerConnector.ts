/// <reference path="../API.ts" />

namespace samchon.protocol
{
	/**
	 * <p> A server connector for a physical client. </p>
	 *
	 * <p> ServerConnector is a class for a physical client connecting a server. If you want to connect 
	 * to a server,  then implements this ServerConnector and just override some methods like 
	 * getIP(), getPort() and replyData(). That's all. </p>
	 *
	 * <p> In Samchon Framework, package protocol, There are basic 3 + 1 components that can make any 
	 * type of network system in Samchon Framework. The basic 3 components are IProtocol, IServer and
	 * IClient. The last, surplus one is the ServerConnector. Looking around classes in 
	 * Samchon Framework, especially module master and slave which are designed for realizing 
	 * distributed processing systems and parallel processing systems, physical client classes are all 
	 * derived from this ServerConnector. </p>
	 *
	 * <img src="interface.png" />
	 *
	 * @author Jeongho Nam <http://samchon.org>
	 */
	export class ServerConnector
		implements IProtocol
	{
		/**
		 * <p> A parent object who listens and sends Invoke message. </p>
		 * 
		 * <ul>z
		 * 	<li> ServerConnector.replyData(Invoke) -> parent.replyData(Invoke) </li>
		 * </ul>
		 */
		private parent: IProtocol;

		/**
		 * <p> A socket for network I/O. </p>
		 */
		private socket: WebSocket;

		/**
		 * <p> Unused string from a server. </p>
		 */
		private str: string;

		/**
		 * <p> An open-event listener. </p>
		 */
		public onopen: Function;

		/**
		 * <p> Constructor with parent. </p>
		 */
		constructor(parent: IProtocol) 
		{
			this.parent = parent;

			this.str = "";
			this.onopen = null;
		}

		/**
		 * <p> Connects to a cloud server with specified host and port. </p>
		 * 
		 * <p> If the connection fails immediately, either an event is dispatched or an exception is thrown: 
		 * an error event is dispatched if a host was specified, and an exception is thrown if no host 
		 * was specified. Otherwise, the status of the connection is reported by an event. 
		 * If the socket is already connected, the existing connection is closed first. </p>
		 * 
		 * @param ip
		 * 		The name or IP address of the host to connect to. 
		 * 		If no host is specified, the host that is contacted is the host where the calling 
		 * 		file resides. If you do not specify a host, use an event listener to determine whether 
		 * 		the connection was successful.
		 * @param port 
		 * 		The port number to connect to.
		 * 
		 * @throws IOError
		 * 		No host was specified and the connection failed.
		 * @throws SecurityError
		 * 		This error occurs in SWF content for the following reasons: 
		 * 		Local untrusted SWF files may not communicate with the Internet. You can work around 
		 * 		this limitation by reclassifying the file as local-with-networking or as trusted.
		 */
	 public connect(ip: string, port: number): void 
		{
			if(ip.indexOf("ws://") == -1)
			{
				if(ip.indexOf("://") != -1)
					throw "only websocket is possible";
				else
					ip = "ws://" + ip;
			}
			this.socket = new WebSocket(ip + ":" + port);
			
			let this_ = this;

			this.socket.onopen = function (event: Event)
			{
				this_.handleConnect(event);
			}
			this.socket.onmessage = function (event: MessageEvent)
			{
				this_.handleReply(event)
			};
		}

		/* ----------------------------------------------------
			IPROTOCOL'S METHOD
		---------------------------------------------------- */
		/**
		 * <p> Send data to the server. </p>
		 */
		public sendData(invoke: Invoke): void 
		{
			let xml: library.XML = invoke.toXML();
			let str: string = xml.toString();

			this.socket.send(str);
		}

		/**
		 * <p> Shift responsiblity of handling message to parent. </p>
		 */
		public replyData(invoke: Invoke): void 
		{
			this.parent.replyData(invoke);
		}

		/* ----------------------------------------------------
			HANDLING CONNECTION AND MESSAGES
		---------------------------------------------------- */
		private handleConnect(event: Event): void
		{
			if(this.onopen == null)
				return;
		
			this.onopen(event);
		}

		/**
		 * <p> Handling replied message. </p>
		 */
		private handleReply(event: MessageEvent): void
		{
			console.log("ServerConnector.handleReply:", event.data);

			this.str += event.data;
			let invokeArray: Array<Invoke> = new Array<Invoke>();

			let indexPair: std.Pair<number, number> = null;
			let sizePair: std.Pair<number, number> = new std.Pair<number, number>(0, 0);
			let startIndex: number = 0;
			let endIndex: number = 0;

			while (true) 
			{
				let iPair: std.Pair<number, number> = new std.Pair<number, number>
					(
						this.str.indexOf("<invoke", startIndex),
						this.str.indexOf("</invoke>", startIndex)
					); //FIND WORDS
				if (iPair.first != -1) sizePair.first++;
				if (iPair.second != -1) sizePair.second++; //AND COUNTS

				if (indexPair == null && sizePair.first == 1) //IF IT MEANS THE START,
					indexPair = new std.Pair(iPair.first, -1); //SPECIFY THE STARTING INDEX

				//FAILED TO FIND ANYTHING
				if (iPair.first == -1 || iPair.second == -1)
					break;

				/* FOUND SOMETHING FROM NOW ON */

				//AN INVOKE HAS FOUND
				if (indexPair != null && sizePair.first == sizePair.second)
				{
					let start: number = indexPair.first;
					let end: number = indexPair.second + ("</invoke>").length;

					let xml: library.XML = new library.XML(this.str.substring(start, end));
					let invoke: Invoke = new Invoke(xml);
					invokeArray.push(invoke);
				
					//CLEAR CURRENT'S INDEX PAIR
					endIndex = end;
					indexPair = null;
				}

				//ADJUST INDEX
				startIndex = Math.max
					(
						Math.max(iPair.first, iPair.second),
						1
					);
			}

			//ERASE USED CHARACTERS
			if (endIndex != 0)
				this.str = this.str.substr(endIndex);

			//CALL REPLY_DATA
			for (let i: number = 0; i < invokeArray.length; i++)
				this.replyData(invokeArray[i]);
		}
	}
}