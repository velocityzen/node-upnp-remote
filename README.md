# UPnP Remote

[![NPM Version](https://img.shields.io/npm/v/node-upnp-remote.svg?style=flat-square)](https://www.npmjs.com/package/node-upnp-remote)
[![NPM Downloads](https://img.shields.io/npm/dt/node-upnp-remote.svg?style=flat-square)](https://www.npmjs.com/package/node-upnp-remote)

 Remote control for UPnP media devices (tv, speakers, amplifiers, network streamers).

## Install

`npm i node-upnp-remote`

## Usage

```js
const UPnPRemote = require('node-upnp-remote');

const remote = new UPnPRemote({
  url: 'http://192.168.1.150:44042/some.xml'
});

function volumeHandler(vol) {
  console.log('Volume', vol);
}

await remote.on('Volume', volumeHandler);
const volume = await remote.getVolume();
await remote.setVolume(volume + 1);
await remote.off('Volume', volumeHandler);

```

### Events

UPnP Remote forwards all the events from `AVTransport` and `RenderingControl` services and adds following events for convenience:

- `Transitioning`
- `Playing`
- `Paused`
- `Stopped`

_note that all events names start with a capital letter as it is defined in UPnP_

## API

### async load(options)

loads the media file to the device. Options are:

* __protocolInfo__ – protocol information
* __upnpClass__ - string, or you can use `const upnpclass = require('node-upnp-remote/upnpclass');`
* __autoplay__ - boolean
* __uri__ – string, uri to the file
* __title__ – string, file title
* __creator__ - string, file creator

or

* __protocolInfo__ – protocol information
* __uri__ – string, uri to the file
* __metadata__ – object that reperesent metadata XML. Example:

```json
{
  "@id": 0,
  "@parentId": -1,
  "@restricted": false,
  "upnp:class": "object.item.audioItem",
  "dc:title": "Title",
  "dc:creator": "Artist",
  "res": {
    "@protocolInfo": "http-get:*:video/mp3:*",
    "#text": "https://archive.org/download/testmp3testfile/mpthreetest.mp3"
  }
}
```

_Properties names start with '@' will be parsed as attributes in the XML_

### async on(eventName, listener)

adds UPnP event listener

### async once(eventName, listener)

adds UPnP event listener that will be triggered only once

### async off(eventName, listener)

removes UPnP event listener

### async removeAllListeners()

removes all listeners from all UPnP events

### async play(speed = 1)

sets the play speed, default is 1

### async pause()

pauses current playback

### async stop()

stops current playback

### async seek(seconds)

sets the playback time to `seconds`

### async next()

switches to next track

### async previous()

switches to previous track

### async getVolume(channel = 'Master')

Gets the volume for the channel

### async setVolume(volume, channel = 'Master')

Sets the volume for the channel

### async getMute(channel = 'Master')

gets the mute state for the channel

### async setMute(state, channel = 'Master')

sets the mute state for the channel

### async getProtocolsInfo()

returns the supported protocols

### async getMediaInfo()

returns the current media info

### async getPositionInfo()

returns the current position

### async getTransportInfo()

returns the transport info

### async getTransportSettings()

returns the transport settings

### async getDeviceCapabilities()

returns the device capabilities

License MIT
