/// <reference path="../API.ts" />

namespace samchon.protocol
{
	/**
	 * @author Jeongho Nam <http://samchon.org>
	 */
	export abstract class EntityArray<Ety extends IEntity>
		extends std.Vector<Ety>
	{
		/* ------------------------------------------------------------------
			CONSTRUCTORS
		------------------------------------------------------------------ */
		/**
		 * Default Constructor.
		 */
		public constructor()
		{
			super();
		}

		/**
		 * <p> Construct data of the Entity from an XML object. </p>
		 *
		 * <p> Constructs the EntityArray's own member variables only from the input XML object. </p>
		 *
		 * <p> Do not consider about constructing children Entity objects' data in EntityArray::construct(). 
		 * Those children Entity objects' data will constructed by their own construct() method. Even insertion 
		 * of XML objects representing children are done by abstract method of EntityArray::toXML(). </p>
		 *
		 * <p> Constructs only data of EntityArray's own. </p>
		 * 
		 * @inheritdoc
		 */
		public construct(xml: library.XML): void
		{
			this.clear();

			// MEMBER VARIABLES; ATOMIC
			let propertyMap = xml.getPropertyMap();

			for (let v_it = propertyMap.begin(); v_it.equal_to(propertyMap.end()) != true; v_it = v_it.next())
				if (typeof this[v_it.first] == "number" && v_it.first != "length")
					this[v_it.first] = parseFloat(v_it.second);
				else if (typeof this[v_it.first] == "string")
					this[v_it.first] = v_it.second;

			//CHILDREN
			if (xml.has(this.CHILD_TAG()) == false)
				return;

			let xmlList: library.XMLList = xml.get(this.CHILD_TAG());

			for (let i: number = 0; i < xmlList.size(); i++) 
			{
				let child: Ety = this.createChild(xmlList.at(i));
				if (child == null)
					continue;

				child.construct(xmlList.at(i));
				this.push(child);
			}
		}

		/**
		 * <p> Factory method of a child Entity. </p>
		 *
		 * <p> EntityArray::createChild() is a factory method creating a new child Entity which is belonged 
		 * to the EntityArray. This method is called by EntityArray::construct(). The children construction
		 * methods Entity::construct() will be called by abstract method of the EntityArray::construct(). </p>
		 *
		 * @return A new child Entity belongs to EntityArray.
		 */
		protected abstract createChild(xml: library.XML): Ety;
		
		/* ------------------------------------------------------------------
			GETTERS
		------------------------------------------------------------------ */
		/**
		 * @inheritdoc
		 */
		public key(): any
		{
			return "";
		}

		/**
		 * <p> Whether have the item or not. </p>
		 * 
		 * <p> Indicates whether a map has an item having the specified identifier. </p>
		 *
		 * @param key Key value of the element whose mapped value is accessed.
		 *
		 * @return Whether the map has an item having the specified identifier.
		 */
		public has(key: any): boolean
		{
			return std.any_of(this.begin(), this.end(),
				function (entity: Ety): boolean
				{
					return entity.key() == key;
				}
			);
		}

		/**
		 * <p> Count elements with a specific key. </p>
		 * 
		 * <p> Searches the container for elements whose key is <i>key</i> and returns the number of elements found. </p>
		 *
		 * @param key Key value to be searched for.
		 *
		 * @return The number of elements in the container with a <i>key</i>.
		 */
		public count(key: any): number
		{
			return std.count_if(this.begin(), this.end(),
				function (entity: Ety): boolean
				{
					return entity.key() == key;
				}
			);
		}

		/**
		 * <p> Get an element </p>
		 *
		 * <p> Returns a reference to the mapped value of the element identified with <i>key</i>. </p>
		 *
		 * @param key Key value of the element whose mapped value is accessed.
		 * 
		 * @throw exception out of range
		 * 
		 * @return A reference object of the mapped value (_Ty)
		 */
		public get(key: string): Ety
		{
			let it = std.find_if(this.begin(), this.end(),
				function (entity: Ety): boolean
				{
					return entity.key() == key;
				}
			);

			if (it.equal_to(this.end()))
				throw new std.OutOfRange("out of range");

			return it.value;
		}

		/* ------------------------------------------------------------------
			EXPORTERS
		------------------------------------------------------------------ */
		/**
		 * @inheritdoc
		 */
		public abstract TAG(): string;

		/**
		 * <p> A tag name of children objects. </p>
		 */
		public abstract CHILD_TAG(): string;

		/**
		 * <p> Get an XML object represents the EntityArray. </p>
		 *
		 * <p> Archives the EntityArray's own member variables only to the returned XML object. </p>
		 *
		 * <p> Do not consider about archiving children Entity objects' data in EntityArray::toXML(). 
		 * Those children Entity objects will converted to XML object by their own toXML() method. The 
		 * insertion of XML objects representing children are done by abstract method of 
		 * EntityArray::toXML(). </p>
		 *
		 * <p> Archives only data of EntityArray's own. </p>
		 *
		 * @inheritdoc
		 */
		public toXML(): library.XML
		{
			let xml: library.XML = new library.XML();
			xml.setTag(this.TAG());

			// MEMBERS
			for (let key in this)
				if (typeof key == "string" && key != "length" // LENGTH: MEMBER OF AN ARRAY
					&& (typeof this[key] == "string" || typeof this[key] == "number"))
				{
					// ATOMIC
					xml.setProperty(key, this[key]);
				}
		
			// CHILDREN
			for (let i: number = 0; i < this.size(); i++)
				xml.push(this.at(i).toXML());

			return xml;
		}
	}
}