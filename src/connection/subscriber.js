/* @flow */
import ConnectionBase from './base';

class ConnectionSubscriber extends ConnectionBase {
  connect() {
    this.role = 'downstream';
    if (this.options && this.options.multistream) {
      return this._multiStream();
    }
    else {
      return this._singleStream();
    }
  }
  _singleStream() {
    return this.disconnect()
      .then(this._signaling.bind(this))
      .then(message => {
        if (!message.config) {
          message.config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        }
        return this._connectPeerConnection(message);
      })
      .then(message => {
        this._pc.onaddstream = function(event) {
          this.stream = event.stream;
        }.bind(this);
        return this._setRemoteDescription(message);
      })
      .then(this._createAnswer.bind(this))
      .then(this._sendAnswer.bind(this))
      .then(this._onIceCandidate.bind(this))
      .then(() => {
        return this.stream;
      });
  }

  _multiStream() {
    return this.disconnect()
      .then(this._signaling.bind(this))
      .then(message => {
        if (!message.config) {
          message.config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        }
        return this._connectPeerConnection(message);
      })
      .then(message => {
        if (typeof this._pc.ontrack === 'undefined') {
          this._pc.onaddstream = event => {
            this._callbacks.addstream(event);
          };
        } else {
          this._pc.ontrack = event => {
            const stream = event.streams[0];
            if (stream.id === 'default') return;

            if (event.track.kind === 'video') {
              this._callbacks.addstream(event);
            }
          };
        }
        this._pc.onremovestream = event => {
          this._callbacks.removestream(event);
        };
        return this._setRemoteDescription(message);
      })
      .then(this._createAnswer.bind(this))
      .then(this._sendAnswer.bind(this))
      .then(this._onIceCandidate.bind(this));
  }
}

module.exports = ConnectionSubscriber;