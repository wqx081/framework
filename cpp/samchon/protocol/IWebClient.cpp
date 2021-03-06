#include <samchon/protocol/IWebClient.hpp>

#include <random>
#include <memory>
#include <mutex>
#include <boost/asio.hpp>

#include <samchon/ByteArray.hpp>
#include <samchon/WeakString.hpp>
#include <samchon/library/XML.hpp>
#include <samchon/protocol/Invoke.hpp>

using namespace std;
using namespace samchon;
using namespace samchon::library;
using namespace samchon::protocol;

/* -----------------------------------------------------------------------
	CONSTRUCTORS
----------------------------------------------------------------------- */
IWebClient::IWebClient()
	: super()
{
}

auto IWebClient::is_server() const -> bool
{
	return true;
}

/* -----------------------------------------------------------------------
	LISTEN MESSAGE
----------------------------------------------------------------------- */
void IWebClient::listen()
{
	shared_ptr<Invoke> binary_invoke;

	// CLIENT ADDS MASK
	unsigned char mask = is_server() ? 128 : 0;

	while (true)
	{
		try
		{
			size_t content_size = 0;

			///////////////////////
			// READ HEADER
			///////////////////////
			array<unsigned char, 2> header_bytes;
			bool is_text = true; // false then binary
			unsigned char size_header;

			socket->read_some(boost::asio::buffer(header_bytes));
			is_text = (header_bytes.at(0) == (unsigned char)129);
			size_header = header_bytes.at(1) - mask;

			///////////////////////
			// READ CONTENT SIZE
			///////////////////////
			if (size_header == (unsigned char)126)
			{
				array<unsigned char, 2> size_bytes;
				socket->read_some(boost::asio::buffer(size_bytes));

				for (size_t c = 0; c < size_bytes.size(); c++)
					content_size += size_bytes[c] << (8 * (size_bytes.size() - 1 - c));
			}
			else if (size_header == (unsigned char)127)
			{
				array<unsigned char, 8> size_bytes;
				socket->read_some(boost::asio::buffer(size_bytes));

				for (size_t c = 0; c < size_bytes.size(); c++)
					content_size += size_bytes[c] << (8 * (size_bytes.size() - 1 - c));
			}
			else
				content_size = (size_t)size_header;

			///////////////////////
			// READ CONTENTS
			///////////////////////
			if (is_text == true)
				binary_invoke = listen_string(content_size);
			else
				listen_binary(content_size, binary_invoke);
		}
		catch (exception &)
		{
			break;
		}
	}
}

template <class Container>
void listen_data(Socket *socket, Container &data)
{
	// READ CONTENTS
	size_t completed = 0;

	if (completed < data.size())
		completed += socket->read_some(boost::asio::buffer((unsigned char*)data.data() + completed, data.size() - completed));
}

template <class Container>
void listen_masked_data(Socket *socket, Container &data)
{
	// READ MASK
	array<unsigned char, 4> mask;
	socket->read_some(boost::asio::buffer(mask));

	// READ DATA
	listen_data(socket, data);

	// UNMASK
	for (size_t i = 0; i < data.size(); i++)
		data[i] = data[i] ^ mask[i % 4];
}

auto IWebClient::listen_string(size_t size) -> shared_ptr<Invoke>
{
	string data(size, (char)NULL);
	
	///////////////////////
	// READ CONTENT
	///////////////////////
	if (is_server() == true)
		listen_masked_data(socket, data);
	else
		listen_data(socket, data);

	///////////////////////
	// CONSTRUCT INVOKE
	///////////////////////
	shared_ptr<Invoke> invoke(new Invoke());
	invoke->construct(make_shared<XML>(data));

	bool is_binary = std::any_of(invoke->begin(), invoke->end(), 
		[](const shared_ptr<InvokeParameter> &parameter) -> bool
		{
			return parameter->getType() == "ByteArray";
		}
	);

	if (is_binary == true)
		return invoke;
	else
	{
		_replyData(invoke);
		return nullptr;
	}
}
void IWebClient::listen_binary(size_t size, shared_ptr<Invoke> &invoke)
{
	ByteArray *data = nullptr;
	Invoke::iterator param_it;

	// FIND THE MATCHED PARAMETER
	param_it = find_if(invoke->begin(), invoke->end(),
		[size](const shared_ptr<InvokeParameter> &parameter) -> bool
		{
			if (parameter->getType() != "ByteArray")
				return false;

			const ByteArray &byteArray = parameter->referValue<ByteArray>();

			return byteArray.empty() == true && byteArray.capacity() == size;
		});

	if (param_it == invoke->end())
	{
		// FAILED TO FIND
		invoke = nullptr;
		return;
	}
	else
		data = (ByteArray*) &((*param_it)->referValue<ByteArray>());

	if (is_server() == true)
		listen_masked_data(socket, *data);
	else
		listen_data(socket, *data);
	
	// IS THE LAST?
	if (
			std::any_of(next(param_it), invoke->end(), 
			[](const shared_ptr<InvokeParameter> &parameter) -> bool
			{
				return parameter->getType() == "ByteArray";
			}) == true
		)
		return;

	_replyData(invoke);
	invoke = nullptr;
}

void IWebClient::sendData(shared_ptr<Invoke> invoke)
{
	unique_lock<mutex> uk(*sendMtx);

	try
	{
		send_string(invoke->toXML()->toString());

		for (size_t i = 0; i < invoke->size(); i++)
			if (invoke->at(i)->getType() == "ByteArray")
				send_binary(invoke->at(i)->referValue<ByteArray>());
	}
	catch (exception &e) {}
}

/* -----------------------------------------------------------------------
	SEND MESSAGE
----------------------------------------------------------------------- */
template <class Container>
void send_masked_data(Socket *socket, const Container &data)
{
	static uniform_int_distribution<unsigned short> distribution(0, 255);
	static random_device device;

	// CONSTRUCT MASK
	array<unsigned char, 4> mask;
	for (size_t i = 0; i < mask.size(); i++)
		mask[i] = (unsigned char)distribution(device);

	// TO BE MASKED
	vector<unsigned char> masked_data(data.size());
	for (size_t i = 0; i < masked_data.size(); i++)
		masked_data[i] = data[i] ^ mask[i % 4];

	// SEND
	socket->write_some(boost::asio::buffer(masked_data));
}

void IWebClient::send_header(unsigned char type, size_t size)
{
	ByteArray header;
	header.write(type); //1000 0001

	unsigned char mask = is_server() ? 0 : 128;

	if (size < 126)
	{
		header.write((unsigned char)(size + mask));
	}
	else if (size <= 0xFFFF)
	{
		header.write((unsigned char)(126 + mask));
		header.writeReversely((unsigned short)size);
	}
	else
	{
		header.write((unsigned char)127 + mask);
		header.writeReversely((unsigned long long)size);
	}

	socket->write_some(boost::asio::buffer(header));
}

void IWebClient::send_string(const string &data)
{
	send_header(TEXT_HEADER, data.size());

	if (is_server() == true)
		socket->write_some(boost::asio::buffer(data));
	else
		send_masked_data(socket, data);
}
void IWebClient::send_binary(const ByteArray &data)
{
	send_header(BINARY_HEADER, data.size());

	if (is_server() == true)
		socket->write_some(boost::asio::buffer(data));
	else
		send_masked_data(socket, data);
}