const test = require('ava');
const UPnPRemote = require('../index');
const UPnPClass = require('../upnpclass');

const DEVICE_URL = process.env.UPNP_DEVICE_URL;
if (!DEVICE_URL) {
  throw Error('Please, use UPNP_DEVICE_URL env variabale to define test device url.');
}

const remote = new UPnPRemote({
  url: DEVICE_URL
});

test.serial('requests device capabilities', async t => {
  const deviceCapabilities = await remote.getDeviceCapabilities();
  t.pass(deviceCapabilities);
});

test.serial('requests protocol information', async t => {
  const protocolsInfo = await remote.getProtocolsInfo();
  t.truthy(protocolsInfo.source);
  t.truthy(protocolsInfo.sink);
  t.truthy(protocolsInfo.sink.length);
  t.truthy(protocolsInfo.sink[0].protocol);
  t.truthy(protocolsInfo.sink[0].network);
  t.truthy(protocolsInfo.sink[0].contentFormat);
  t.truthy(protocolsInfo.sink[0].additionalInfo);
});

test.serial('gets/sets volume', async t => {
  const volume = await remote.getVolume();
  t.is(typeof volume, 'number');

  await remote.setVolume(volume - 1);
  const newVolume = await remote.getVolume();

  t.is(newVolume, volume - 1);
});

test.serial('subscribes to volume events', async t => {
  function handler(volume) {
    t.is(typeof volume, 'number');
  }

  await remote.on('Volume', handler);
  const volume = await remote.getVolume();
  await remote.setVolume(volume + 1);
  await remote.off('Volume', handler);

  t.is(remote.client.hasSubscriptions(), false);
});

test.serial('requests position info', async t => {
  const positionInfo = await remote.getPositionInfo();
  t.is(positionInfo.Track, 0);
  t.is(positionInfo.TrackDuration, 0);
});

test.serial('gets/sets mute state', async t => {
  const mute = await remote.getMute();
  t.is(mute, false);

  await remote.setMute(true);
  const newMute = await remote.getMute();
  t.is(newMute, true);
  await remote.setMute(false);
});

test.serial('loads audio file', async t => {
  await remote.load({
    protocolInfo: 'http-get:*:audio/mp3:*',
    upnpClass: UPnPClass.audioItem,
    url: 'https://archive.org/download/testmp3testfile/mpthreetest.mp3',
    title: 'Spoken Word Test',
    creator: 'Archive.org'
  });

  await remote.play();
  t.pass();
});
