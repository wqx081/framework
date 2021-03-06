#include <samchon/namtree/NTCriteria.hpp>
#	include <samchon/namtree/NTSide.hpp>

#include <samchon/namtree/NTFactory.hpp>
#include <samchon/namtree/NTIterator.hpp>

#include <samchon/library/XML.hpp>

using namespace std;

using namespace samchon;
using namespace samchon::library;
using namespace samchon::protocol;
using namespace samchon::namtree;

auto NTCriteria::TAG() const -> string { return "criteria"; }
auto NTCriteria::CHILD_TAG() const -> string { return "criteria"; }

NTCriteria::NTCriteria(NTFactory *factory, NTCriteria *parent)
	: super()
{
	this->factory = factory;
	this->parent = parent;

	leftSide = new NTSide(factory);
	rightSide = new NTSide(factory);
}
NTCriteria::~NTCriteria()
{
	delete leftSide;
	delete rightSide;
}

void NTCriteria::construct(shared_ptr<XML> xml)
{
	super::construct(xml);

	leftSide->construct(xml->get("side")->at(0));
	rightSide->construct(xml->get("side")->at(1));

	operator_ = xml->getProperty<int>("operator");
	weight = xml->getProperty<int>("weight");
}
auto NTCriteria::createChild(shared_ptr<XML> xml) -> NTCriteria*
{
	return factory->createCriteria(this, xml);
}

void NTCriteria::initRetrieve()
{
	leftSide->initRetrieve();
	rightSide->initRetrieve();

	for (size_t i = 0; i < size(); i++)
		at(i)->initRetrieve();
}
auto NTCriteria::calcRetrieved(NTIterator &iterator) const -> double
{
	double left = leftSide->calcRetrieved(iterator);
	double right = rightSide->calcRetrieved(iterator);

	return
		(
			(operator_ <= LESS_EQUAL && left < right) || //LEFT IS SMALLER
			((LESS_EQUAL <= operator_ && operator_ <= LARGER_EQUAL) && left == right) || //VALUES ARE EQUAL
			(LARGER_EQUAL <= operator_) //
		) ? weight : 0.0;
}

auto NTCriteria::toXML() const -> shared_ptr<XML>
{
	shared_ptr<XML> &xml = super::toXML();
	xml->push_back( leftSide->toXML() );
	xml->push_back( rightSide->toXML() );

	xml->setProperty("operator", operator_);
	xml->setProperty("weight", weight);

	return xml;
}