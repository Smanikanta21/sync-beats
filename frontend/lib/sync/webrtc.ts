import { Socket } from 'socket.io-client'

const CHUNK_SIZE = 16_384
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

export interface FileTransfer {
  fileName: string
  fileType: string
  fileSize: number
  totalChunks: number
}

export class WebRtcFileStream {
  private readonly peerConnections = new Map<string, RTCPeerConnection>()
  private readonly dataChannels = new Map<string, RTCDataChannel>()
  private readonly receivingFiles = new Map<string, {
    metadata: FileTransfer
    chunks: ArrayBuffer[]
    receivedChunks: number
  }>()

  public onFileSendProgress?: (peerId: string, progress: number) => void
  public onFileReceiveStart?: (peerId: string, metadata: FileTransfer) => void
  public onFileReceiveProgress?: (peerId: string, progress: number) => void
  public onFileReceived?: (peerId: string, url: string, metadata: FileTransfer) => void
  public onFileTransferError?: (peerId: string, error: Error) => void

  constructor(private readonly socket: Socket) {
    this.registerSignalHandlers()
  }

  async sendFile(file: File, recipients: string[]): Promise<void> {
    const metadata: FileTransfer = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      totalChunks: Math.ceil(file.size / CHUNK_SIZE)
    }

    for (const peerId of recipients) {
      await this.sendFileToPeer(file, metadata, peerId)
    }
  }

  cleanup(): void {
    for (const [peerId] of this.peerConnections) {
      this.closePeerConnection(peerId)
    }

    this.socket.off('webrtc:offer', this.handleOfferSignal)
    this.socket.off('webrtc:answer', this.handleAnswerSignal)
    this.socket.off('webrtc:ice-candidate', this.handleIceCandidateSignal)
    this.socket.off('room:user-left', this.handlePeerLeft)
  }

  private registerSignalHandlers(): void {
    this.socket.on('webrtc:offer', this.handleOfferSignal)
    this.socket.on('webrtc:answer', this.handleAnswerSignal)
    this.socket.on('webrtc:ice-candidate', this.handleIceCandidateSignal)
    this.socket.on('room:user-left', this.handlePeerLeft)
  }

  private handleOfferSignal = async (data: {
    from: string
    offer: RTCSessionDescriptionInit
    metadata?: FileTransfer
  }): Promise<void> => {
    const { from, offer, metadata } = data
    const pc = await this.ensurePeerConnection(from)

    if (metadata) {
      this.receivingFiles.set(from, {
        metadata,
        chunks: [],
        receivedChunks: 0
      })
      this.onFileReceiveStart?.(from, metadata)
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    this.socket.emit('webrtc:answer', {
      to: from,
      answer: pc.localDescription
    })
  }

  private handleAnswerSignal = async (data: {
    from: string
    answer: RTCSessionDescriptionInit
  }): Promise<void> => {
    const { from, answer } = data
    const pc = this.peerConnections.get(from)
    if (!pc) return
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
  }

  private handleIceCandidateSignal = async (data: {
    from: string
    candidate: RTCIceCandidateInit
  }): Promise<void> => {
    const { from, candidate } = data
    const pc = this.peerConnections.get(from)
    if (!pc) return

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.warn('Failed to add ICE candidate', err)
    }
  }

  private handlePeerLeft = ({ socketId }: { socketId: string }): void => {
    this.closePeerConnection(socketId)
    this.receivingFiles.delete(socketId)
  }

  private async sendFileToPeer(file: File, metadata: FileTransfer, peerId: string): Promise<void> {
    let pc = await this.ensurePeerConnection(peerId)

    if (!this.isPeerConnectionUsable(pc)) {
      this.closePeerConnection(peerId)
      pc = await this.ensurePeerConnection(peerId)
    }

    let dataChannel: RTCDataChannel

    try {
      dataChannel = pc.createDataChannel('file-transfer', { ordered: true })
    } catch (err) {
      console.warn('Failed to create data channel, retrying with fresh RTCPeerConnection', err)
      this.closePeerConnection(peerId)
      pc = await this.ensurePeerConnection(peerId)
      dataChannel = pc.createDataChannel('file-transfer', { ordered: true })
    }

    dataChannel.binaryType = 'arraybuffer'
  dataChannel.bufferedAmountLowThreshold = CHUNK_SIZE * 5
    this.dataChannels.set(peerId, dataChannel)

    dataChannel.onopen = async () => {
      try {
        this.onFileSendProgress?.(peerId, 0)
        dataChannel.send(JSON.stringify({ type: 'metadata', data: metadata }))

        const arrayBuffer = await file.arrayBuffer()
        let offset = 0
        let chunkIndex = 0

        while (offset < arrayBuffer.byteLength) {
          const chunk = arrayBuffer.slice(offset, offset + CHUNK_SIZE)

          while (dataChannel.bufferedAmount > CHUNK_SIZE * 10) {
            await new Promise((resolve) => {
              const handler = () => {
                dataChannel.removeEventListener('bufferedamountlow', handler)
                resolve(undefined)
              }
              dataChannel.addEventListener('bufferedamountlow', handler, { once: true })
              setTimeout(() => {
                dataChannel.removeEventListener('bufferedamountlow', handler)
                resolve(undefined)
              }, 25)
            })
          }

          dataChannel.send(JSON.stringify({
            type: 'chunk',
            index: chunkIndex,
            total: metadata.totalChunks
          }))
          dataChannel.send(chunk)

          offset += CHUNK_SIZE
          chunkIndex += 1

          const progress = Math.min(100, Math.round((chunkIndex / metadata.totalChunks) * 100))
          this.onFileSendProgress?.(peerId, progress)
        }

        dataChannel.send(JSON.stringify({ type: 'complete' }))
        this.onFileSendProgress?.(peerId, 100)
      } catch (error) {
        const err = error instanceof Error ? error : new Error('File send failed')
        this.onFileTransferError?.(peerId, err)
      } finally {
        try { dataChannel.close() } catch { /* ignore */ }
      }
    }

    dataChannel.onerror = (err) => {
      console.error(`Data channel error with ${peerId}`, err)
      this.onFileTransferError?.(peerId, err instanceof Error ? err : new Error('Data channel error'))
    }

    dataChannel.onclose = () => {
      this.dataChannels.delete(peerId)
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    this.socket.emit('webrtc:offer', {
      to: peerId,
      offer: pc.localDescription,
      metadata
    })
  }

  private async ensurePeerConnection(peerId: string): Promise<RTCPeerConnection> {
    const existing = this.peerConnections.get(peerId)
    if (existing) {
      if (this.isPeerConnectionUsable(existing)) {
        return existing
      }

      this.closePeerConnection(peerId)
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc:ice-candidate', {
          to: peerId,
          candidate: event.candidate.toJSON()
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        const error = new Error(`Peer connection ${pc.connectionState}`)
        this.onFileTransferError?.(peerId, error)
        this.closePeerConnection(peerId)
      }
    }

    pc.ondatachannel = (event) => {
      const channel = event.channel
      channel.binaryType = 'arraybuffer'
      this.handleIncomingChannel(peerId, channel)
    }

    this.peerConnections.set(peerId, pc)
    return pc
  }

  private isPeerConnectionUsable(pc: RTCPeerConnection): boolean {
    const isClosedState = pc.signalingState === 'closed'
    const hasFailedConnection = pc.connectionState === 'failed' || pc.connectionState === 'closed'
    const iceFailed = pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed'

    return !(isClosedState || hasFailedConnection || iceFailed)
  }

  private handleIncomingChannel(peerId: string, channel: RTCDataChannel): void {
    channel.onopen = () => {
      channel.bufferedAmountLowThreshold = CHUNK_SIZE * 5
    }

    channel.onmessage = (event) => {
      const payload = event.data

      if (typeof payload === 'string') {
        try {
          const message = JSON.parse(payload)

          if (message.type === 'metadata') {
            const meta: FileTransfer = message.data
            this.receivingFiles.set(peerId, {
              metadata: meta,
              chunks: [],
              receivedChunks: 0
            })
            this.onFileReceiveStart?.(peerId, meta)
            this.onFileReceiveProgress?.(peerId, 0)
          } else if (message.type === 'complete') {
            const record = this.receivingFiles.get(peerId)
            if (record) {
              this.onFileReceiveProgress?.(peerId, 100)
              this.reconstructFile(peerId, record)
            }
          }
        } catch (err) {
          console.warn('Failed to parse data channel message', err)
        }
        return
      }

      if (payload instanceof ArrayBuffer) {
        this.handleBinaryChunk(peerId, payload)
        return
      }

      if (ArrayBuffer.isView(payload)) {
        const view = payload as ArrayBufferView
        const src = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
        const copy = new Uint8Array(src.length)
        copy.set(src)
        this.handleBinaryChunk(peerId, copy.buffer)
        return
      }

      if (payload instanceof Blob) {
        void payload.arrayBuffer().then((buffer) => {
          this.handleBinaryChunk(peerId, buffer)
        }).catch((error) => {
          console.error('Failed to read blob chunk', error)
          this.onFileTransferError?.(peerId, error instanceof Error ? error : new Error('Failed to read chunk'))
        })
      }
    }

    channel.onerror = (err) => {
      console.error(`Data channel error from ${peerId}`, err)
      this.onFileTransferError?.(peerId, err instanceof Error ? err : new Error('Data channel error'))
    }

    channel.onclose = () => {
      const record = this.receivingFiles.get(peerId)
      if (record && record.receivedChunks < record.metadata.totalChunks) {
        const error = new Error('Transfer ended before completion')
        this.onFileTransferError?.(peerId, error)
      }
      this.dataChannels.delete(peerId)
    }
  }

  private handleBinaryChunk(peerId: string, buffer: ArrayBuffer): void {
    const record = this.receivingFiles.get(peerId)
    if (!record) return

    record.chunks.push(buffer)
    record.receivedChunks += 1

    const progress = Math.min(
      100,
      Math.round((record.receivedChunks / record.metadata.totalChunks) * 100)
    )
    this.onFileReceiveProgress?.(peerId, progress)
  }

  private reconstructFile(peerId: string, fileData: {
    metadata: FileTransfer
    chunks: ArrayBuffer[]
    receivedChunks: number
  }): void {
    try {
      const blob = new Blob(fileData.chunks, { type: fileData.metadata.fileType })
      const url = URL.createObjectURL(blob)
      this.onFileReceived?.(peerId, url, fileData.metadata)
      this.receivingFiles.delete(peerId)
    } catch (err) {
      console.error('Failed to reconstruct file', err)
    }
  }

  private closePeerConnection(peerId: string): void {
    const pc = this.peerConnections.get(peerId)
    if (pc) {
      try { pc.close() } catch { }
      this.peerConnections.delete(peerId)
    }

    const channel = this.dataChannels.get(peerId)
    if (channel) {
      try { channel.close() } catch { }
      this.dataChannels.delete(peerId)
    }
  }
}
