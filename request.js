const Parser = require('fast-xml-parser').j2xParser;
const parser = new Parser({
  attributeNamePrefix: '@',
  ignoreAttributes: false
});

function createURIMetadata({ metadata, url, upnpClass, title, creator, protocolInfo, subtitles }) {
  const didlLite = {
    'DIDL-Lite': {
      '@xmlns': 'urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/',
      '@xmlns:dc': 'http://purl.org/dc/elements/1.1/',
      '@xmlns:upnp': 'urn:schemas-upnp-org:metadata-1-0/upnp/',
      '@xmlns:sec': 'http://www.sec.co.kr/'
    }
  }

  // if there is a defined metadata just return it
  if (metadata) {
    didlLite['DIDL-Lite'].item = metadata;
    return parser.parse(didlLite);
  }

  // build item manually
  const itemEl = {
    '@id': 0,
    '@parentID': -1,
    '@restricted': false
  }

  if (upnpClass) {
    itemEl['upnp:class'] = upnpClass;
  }

  if (title) {
    itemEl['dc:title'] = title;
  }

  if (creator) {
    itemEl['dc:creator'] = creator;
  }

  if (url && protocolInfo) {
    itemEl.res = {
      '@protocolInfo': protocolInfo,
      '#text': url
    }
  }

  if (subtitles) {
    itemEl['sec:CaptionInfo'] = {
      '@sec:type': subtitles.type,
      '#text': subtitles.url
    }

    itemEl['sec:CaptionInfoEx'] = {
      '@sec:type': subtitles.type,
      '#text': subtitles.url
    }

    if (itemEl.res) {
      itemEl.res = [
        itemEl.res, {
          '@protocolInfo': subtitles.protocolInfo,
          '#text': subtitles.url
        }
      ];
    } else {
      itemEl.res = {
        '@protocolInfo': subtitles.protocolInfo,
        '#text': subtitles.url
      }
    }
  }

  didlLite['DIDL-Lite'].item = itemEl;
  return parser.parse(didlLite);
}

module.exports = {
  createURIMetadata
}

