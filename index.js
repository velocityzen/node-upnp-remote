const Client = require('node-upnp');
const { code: errorCode } = require('node-upnp/error');
const { formatTime, parseTime } = require('node-upnp/time');

const { parseProtocols } = require('./response');
const { createURIMetadata } = require('./request');

const additionalEvents = ['Transitioning', 'Playing', 'Paused', 'Stopped'];

const forcedVariables = ['Volume', 'Mute'];

class UPnPRemote {
  constructor(opts = {}) {
    this.instanceId = opts.instanceId || 0;
    this.client = opts.client || new Client(opts);
    this.handleStateUpdate = this.handleStateUpdate.bind(this);
    this.customEventCounter = 0;
  }

  async setURI({
    metadata,
    protocolInfo,
    uri,
    autoplay,
    upnpClass,
    subtitles,
    title,
    creator
  }) {
    try {
      const res = await this.client.call(
        'ConnectionManager',
        'PrepareForConnection',
        {
          RemoteProtocolInfo: protocolInfo,
          PeerConnectionManager: null,
          PeerConnectionID: -1,
          Direction: 'Input'
        }
      );
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
        metadata,
        uri,
        upnpClass,
        title,
        creator,
        protocolInfo,
        subtitles
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
    const { TrackDuration, RelTime, AbsTime, ...rest } = await this.client.call(
      'AVTransport',
      'GetPositionInfo',
      {
        InstanceID: this.instanceId
      }
    );

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

  hasService(serviceId) {
    return this.client.hasService(serviceId);
  }

  async on(eventName, listener, options = {}) {
    if (additionalEvents.includes(eventName)) {
      this.client.eventEmmiter.on(eventName, listener);
      await this.client.on('TransportState', this.handleStateUpdate);
      this.customEventCounter++;
      return;
    }

    if (forcedVariables.includes(eventName)) {
      options.force = true;
    }

    await this.client.on(eventName, listener, options);
  }

  async off(eventName, listener) {
    if (additionalEvents.includes(eventName)) {
      this.client.eventEmmiter.off(eventName, listener);
      this.customEventCounter--;
      if (!this.customEventCounter) {
        await this.client.off('TransportState', this.handleStateUpdate);
      }
      return;
    }

    await this.client.off(eventName, listener);
  }

  async removeAllListeners() {
    await this.client.removeAllListeners();
  }

  handleStateUpdate(e) {
    const client = this.client;
    client.emit(e.name, e.value);

    if (e.name === 'TransportState') {
      switch (e.value) {
        case 'TRANSITIONING':
          client.emit('Transitioning');
          break;
        case 'PLAYING':
          client.emit('Playing');
          break;
        case 'PAUSED_PLAYBACK':
          client.emit('Paused');
          break;
        case 'STOPPED':
          client.emit('Stopped');
          break;
      }
    }
  }
}

module.exports = UPnPRemote;
