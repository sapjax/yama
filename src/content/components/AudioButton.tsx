import { useEffect, useRef, useState } from 'react'
import { Messages } from '@/lib/message'
import { onMessage, sendMessage } from 'webext-bridge/content-script'
import { LoaderCircle, Volume, Volume1, Volume2 } from 'lucide-react'

// When multiple listeners are registered for the same message (audio_state_changed) in the same page, the browser usually only distributes the message to the last listener, so we need to manage callbacks here
type MessageData = { audioUrl: string, state: 'loading' | 'playing' | 'idle' }
const callbacks: Set<(params: MessageData) => void> = new Set()
let listener: () => void

export function AudioButton({ spelling, audioUrls }: { spelling: string, audioUrls: string[] }) {
  const [nextAudio, setNextAudio] = useState(audioUrls[0])
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const [isVolume1, setIsVolume1] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null)

  useEffect(() => {
    if (!listener) {
      listener = onMessage(Messages.audio_state_changed, ({ data }) => {
        callbacks.forEach(cb => cb(data))
      })
    }

    const callback = (data: MessageData) => {
      if (audioUrls.includes(data.audioUrl)) {
        setAudioState(data.state)
      }
    }
    callbacks.add(callback)
    return () => {
      callbacks.delete(callback)
    }
  }, [audioUrls])

  useEffect(() => {
    if (audioState === 'playing') {
      intervalRef.current = setInterval(() => {
        setIsVolume1(prev => !prev)
      }, 300)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      setIsVolume1(false)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [audioState])

  const handleClick = () => {
    if (audioState === 'loading') return
    sendMessage(Messages.playAudio, { text: spelling, audioUrl: nextAudio }, 'background')
    setNextAudio(audioUrls[(audioUrls.indexOf(nextAudio) + 1) % audioUrls.length])
  }

  return (
    <div
      role="button"
      data-pronounce
      onClick={handleClick}
      className="relative mt-1 px-2 text-muted-foreground hover:text-primary"
      data-audios={audioUrls}
    >
      {audioState === 'loading' && (
        <Volume size={14} className="animate-pulse" />
      )}
      {audioState === 'playing'
        && (
          isVolume1
            ? <Volume1 color="var(--primary)" size={14} />
            : <Volume2 color="var(--primary)" size={14} />
        )}
      {audioState === 'idle' && <Volume size={14} />}
    </div>
  )
}
