const EventEmitter = require('events');
const Client = require('node-upnp');
const { code: errorCode } = require('node-upnp/error');
const { formatTime, parseTime } = require('node-upnp/time');

const { parseProtocols } = require('./response');
const { createURIMetadata } = require('./request');

class UPnPRemote extends EventEmitter {
  constructor(opts = {}) {
    super();

    this.instanceId = opts.instanceId || 0;
    this.client = new Client(opts);

    this.handleStateUpdate = this.handleStateUpdate.bind(this);
    this.upnpListenersCount = 0;
  }

  async load({ metadata, protocolInfo, uri, autoplay, upnpClass, subtitles, title, creator }) {
    try {
      const res = await this.client.call('ConnectionManager', 'PrepareForConnection', {
        RemoteProtocolInfo: protocolInfo,
        PeerConnectionManager: null,
        PeerConnectionID: -1,
        Direction: 'Input'
      });
      this.instanceId = res.AVTransportID;
    } catch (e) {
      // If PrepareForConnection is not implemented, we keep the default (0) InstanceID
      if (e.code !== errorCode.NO_ACTION) {
        throw e;
      }
    }

    await this.client.call('AVTransport', 'SetAVTransportURI', {
      InstanceID: this.instanceId,
      CurrentURI: uri,
      CurrentURIMetaData: createURIMetadata({
        metadata, uri, upnpClass, title, creator, protocolInfo, subtitles
      })
    });

    if (autoplay) {
      await this.play();
    }
  }

  play(speed = 1) {
    return this.client.call('AVTransport', 'Play', {
      InstanceID: this.instanceId,
      Speed: speed
    });
  }

  pause() {
    return this.client.call('AVTransport', 'Pause', {
      InstanceID: this.instanceId
    });
  }

  stop() {
    return this.client.call('AVTransport', 'Stop', {
      InstanceID: this.instanceId
    });
  }

  seek(seconds) {
    return this.client.call('AVTransport', 'Seek', {
      InstanceID: this.instanceId,
      Unit: 'ABS_TIME',
      Target: formatTime(seconds)
    });
  }

  next() {
    return this.client.call('AVTransport', 'Next', {
      InstanceID: this.instanceId
    });
  }

  previous() {
    return this.client.call('AVTransport', 'Previous', {
      InstanceID: this.instanceId
    });
  }

  async getVolume(channel = 'Master') {
    const result = await this.client.call('RenderingControl', 'GetVolume', {
      InstanceID: this.instanceId,
      Channel: channel
    });

    return result.CurrentVolume;
  }

  setVolume(volume, channel = 'Master') {
    return this.client.call('RenderingControl', 'SetVolume', {
      InstanceID: this.instanceId,
      Channel: channel,
      DesiredVolume: volume
    });
  }

  async getMute(channel = 'Master') {
    const result = await this.client.call('RenderingControl', 'GetMute', {
      InstanceID: this.instanceId,
      Channel: channel
    });

    return Boolean(result.CurrentMute);
  }

  setMute(state, channel = 'Master') {
    return this.client.call('RenderingControl', 'SetMute', {
      InstanceID: this.instanceId,
      Channel: channel,
      DesiredMute: state ? 1 : 0
    });
  }

  async getProtocolsInfo() {
    const res = await this.client.call('ConnectionManager', 'GetProtocolInfo');
    return parseProtocols(res);
  }

  async getPositionInfo() {
    const {
      TrackDuration,
      RelTime,
      AbsTime,
      ...rest
    } = await this.client.call('AVTransport', 'GetPositionInfo', {
      InstanceID: this.instanceId
    });

    return {
      ...rest,
      TrackDuration: parseTime(TrackDuration),
      RelTime: parseTime(RelTime),
      AbsTime: parseTime(AbsTime)
    };
  }

  getMediaInfo() {
    return this.client.call('AVTransport', 'GetMediaInfo', {
      InstanceID: this.instanceId
    });
  }

  getTransportInfo() {
    return this.client.call('AVTransport', 'GetTransportInfo', {
      InstanceID: this.instanceId
    });
  }

  getTransportSettings() {
    return this.client.call('AVTransport', 'GetTransportSettings', {
      InstanceID: this.instanceId
    });
  }

  getDeviceCapabilities() {
    return this.client.call('AVTransport', 'GetDeviceCapabilities', {
      InstanceID: this.instanceId
    });
  }

  async on(eventName, listener) {
    if (this.upnpListenersCount === 0) {
      await this.addSubscriptions();
    }

    this.upnpListenersCount++;
    super.on(eventName, listener);
  }

  async off(eventName, listener) {
    super.off(eventName, listener);
    this.upnpListenersCount--;
    if (this.upnpListenersCount === 0) {
      await this.removeSubsriptions();
    }
  }

  async once(eventName, listener) {
    async function once(...args) {
      await this.off(event, once);
      listener.apply(undefined, args);
    }

    await this.on(eventName, once);
  }

  async removeAllListeners() {
    super.removeAllListeners();
    this.upnpListenersCount--;
    await this.removeSubsriptions();
  }

  async addSubscriptions() {
    await this.client.subscribe('AVTransport', this.handleStateUpdate);
    await this.client.subscribe('RenderingControl', this.handleStateUpdate);
  }

  async removeSubsriptions() {
    await this.client.unsubscribe('AVTransport', this.handleStateUpdate);
    await this.client.unsubscribe('RenderingControl', this.handleStateUpdate);
  }

  handleStateUpdate(e) {
    this.emit(e.name, e.value);

    if (e.name === 'TransportState') {
      switch (e.value) {
        case 'TRANSITIONING':
          this.emit('Transitioning');
          break;
        case 'PLAYING':
          this.emit('Playing');
          break;
        case 'PAUSED_PLAYBACK':
          this.emit('Paused');
          break;
        case 'STOPPED':
          this.emit('Stopped');
          break;
      }
    }
  }
}

module.exports = UPnPRemote;
