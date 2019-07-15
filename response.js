
function getProtocols(str) {
  const protocols = str.split(',');
  const result = [];

  protocols.forEach(protocol => {
    if (!protocol) {
      return;
    }

    const p = protocol.split(':');
    result.push({
      protocol: p[0],
      network: p[1],
      contentFormat: p[2],
      additionalInfo: p[3]
    });
  });

  return result;
}

function parseProtocols({ Source, Sink }) {
  return {
    source: getProtocols(Source),
    sink: getProtocols(Sink)
  }
}

module.exports = {
  parseProtocols
}
