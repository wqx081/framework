package org.samchon.protocol.movie
{
	import flash.events.MouseEvent;
	
	import mx.events.FlexEvent;
	import mx.managers.PopUpManager;
	
	import org.samchon.library.ui.TitleWindow;
	import org.samchon.protocol.invoke.IProtocol;
	import org.samchon.protocol.invoke.Invoke;
	
	/**
	 * <p> TitleWindow is generated by Window having IProtocol. </p>
	 * 
	 * <p> Although a TitleWindow can be made by Movie, make it in Window. </p>
	 * 
	 * <img src="movie.png" />
	 * 
	 * @copy org.samchon.library.ui.TitleWindow 
	 */ 
	public class TitleWindow 
		extends org.samchon.library.ui.TitleWindow 
		implements IProtocol
	{
		/**
		 * Parent Window who made this TitleWindow
		 */
		protected var window:Window;
		
		/**
		 * Pointer of Movie from Window
		 */
		protected function get movie():Movie
		{
			return window.getMovie();
		}
		
		/**
		 * Whether the creation was completed or not
		 */
		protected var creationFlag:Boolean = false;
		
		/**
		 * <p> Constructor from parent Window. </p>
		 * 
		 * @param window Parent Window who made this TitleWindow
		 */
		public function TitleWindow(window:Window = null)
		{
			super();
			
			this.window = window;
			this.addEventListener(FlexEvent.CREATION_COMPLETE, creationCompleted);
		}
		
		/**
		 * <p> Handler of Creation Complete. </p>
		 * 
		 * <p> If you want to do something more, override this method. </p>
		 */
		protected function creationCompleted(event:FlexEvent):void
		{
			this.removeEventListener(FlexEvent.CREATION_COMPLETE, creationCompleted);
			creationFlag = true;
		}
		
		//SOCKET
		public function replyData(invoke:Invoke):void
		{
			
		}
		public function sendData(invoke:Invoke):void
		{
			window.sendData(invoke);
		}
		
		/**
		 * <p> Static factory method for TitleWindow. </p>
		 * <p> Does not recommend to create TitleWindow by this. Use each createPopUp method in Window and Movie </p>
		 * 
		 * @param window Parent Window
		 * @param $class Target TitleWindow class to create
		 * 
		 * @see Window
		 * @see Movie
		 */
		public static function createPopUp(window:Window, $class:Class):org.samchon.protocol.movie.TitleWindow
		{
			var popUp:org.samchon.protocol.movie.TitleWindow = 
				PopUpManager.createPopUp(window, $class, true) as org.samchon.protocol.movie.TitleWindow;
			popUp.window = window;
			PopUpManager.centerPopUp(popUp);
			
			return popUp;
		}
	}
}