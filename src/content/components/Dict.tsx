import { use, useState, Suspense, memo } from 'react'
import { dictAdapters, DictionaryEntry, DictName } from '@/lib/core/dict'
import { Messages } from '@/lib/message'
import { sendMessage } from 'webext-bridge/content-script'
import { Volume2, BookOpen, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type DictProps = { word: string, dictName: DictName }

const Dict = memo(function Dict({ word, dictName }: DictProps) {
  const lookupPromise = lookup(word, dictName)

  console.log(word)
  if (!word) return null

  return (
    <Suspense fallback={<DictLoading word={word} dictName={dictName} />}>
      <DictEntry lookupPromise={lookupPromise} word={word} dictName={dictName} />
    </Suspense>
  )
})

function DictEntry({ lookupPromise, dictName, word }: DictProps & {
  lookupPromise: Promise<DictionaryEntry | null>
}) {
  const data = use(lookupPromise)
  if (!data) return null

  return (
    <div className="mb-4 last:mb-0">
      <DictTitle word={word} dictName={dictName} />

      {data.definitions.map((def, index) => (
        <div key={`${def.spelling}_${def.reading}_${index}`} className="mb-3 last:mb-0">
          <div className="space-y-2 rounded-md border border-border bg-card p-2.5 text-card-foreground shadow-sm">
            {/* Spelling and Reading */}
            <div className="flex items-center">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-base font-medium text-foreground">{def.spelling}</span>
                {def.pitchAccents && def.pitchAccents.length > 0
                  ? (
                    <PitchAccents
                      spelling={def.spelling}
                      pitchAccents={def.pitchAccents}
                    />
                  )
                  : (
                    <>
                      {def.reading && def.reading !== def.spelling && (
                        <span className="text-xs text-muted-foreground">
                          [
                          {def.reading}
                          ]
                        </span>
                      )}
                      {
                        !!def.audioUrls && <AudioButton key={index} spelling={def.spelling} audioUrls={def.audioUrls} />
                      }
                    </>
                  )}
              </div>

              {/* Tags */}
              <div className="ml-auto flex flex-wrap gap-1">
                {!!def.jlpt && (
                  <Badge text={def.jlpt} />
                )}
                {def.frequency && (
                  <Badge text={def.frequency} />
                )}
              </div>
            </div>

            {/* Meanings */}
            <div>
              <ul className="space-y-0.5 text-sm leading-tight">
                {def.meanings.map((meaning, meaningIndex) => (
                  <li key={meaningIndex} className="flex flex-col text-foreground">
                    <div className="flex">
                      <span className="mt-0.5 mr-1.5 flex-shrink-0 text-xs text-muted-foreground">
                        {meaningIndex + 1}
                        .
                      </span>
                      <span>{meaning.explain}</span>
                    </div>
                    {!!meaning.note
                      && <div className="mb-2 pl-[2em] text-muted-foreground">{meaning.note}</div>}
                  </li>
                ))}
              </ul>
            </div>

            {/* Alternative Spellings */}
            {def.altSpellings && def.altSpellings.length > 0 && (
              <div className="mt-4 text-xs">
                <table className="mt-1 w-fit border-separate border border-muted-foreground text-center text-xs text-muted-foreground">
                  <caption className="caption-bottom p-2">Alt Spellings</caption>
                  <tbody>
                    {def.altSpellings.map((s, i) => (
                      <tr key={i}>
                        <td className="border border-muted-foreground p-2 text-left text-sm whitespace-nowrap text-foreground" dangerouslySetInnerHTML={{ __html: s.spelling }}></td>
                        <td className="border border-muted-foreground p-2 text-left text-sm whitespace-nowrap text-foreground">{s.percent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Alternative Readings */}
            {def.altReadings && def.altReadings.length > 0 && (
              <div className="mt-4 text-xs">
                <table className="mt-1 w-fit border-separate border border-muted-foreground text-center text-xs text-muted-foreground">
                  <caption className="caption-bottom p-2">Alternative Readings</caption>
                  <tbody>
                    {def.altReadings.map((s, i) => (
                      <tr key={i}>
                        <td className="border border-muted-foreground p-2 text-left text-sm whitespace-nowrap text-foreground">{s.reading}</td>
                        <td className="border border-muted-foreground p-2 text-left text-sm whitespace-nowrap text-foreground">{s.percent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Examples */}
            {def.examples && def.examples.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">例句:</span>
                {def.examples.map((example, exampleIndex) => (
                  <div key={exampleIndex} className="rounded-md border border-accent/40 bg-accent/30 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs leading-tight font-medium text-foreground">{example.text}</p>
                      {example.audioUrl && (
                        <AudioButton spelling={example.text} audioUrls={[example.audioUrl]} />
                      )}
                    </div>
                    {example.translation && <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{example.translation}</p>}
                    {example.ref && (
                      <div className="mt-1">
                        <a
                          href={example.ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-foreground hover:text-primary"
                        >
                          <ExternalLink size={10} />
                          {example.ref.text}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function DictTitle({ word, dictName }: DictProps) {
  const dict = dictAdapters[dictName]
  const webLink = dict.getWebLink?.(word)
  const icon = dict.getIcon?.()
  return (
    <div
      className="mb-2 flex items-center gap-1.5 pb-1 text-primary"
    >
      {!!icon
        ? <img src={icon} className="size-4 rounded-sm" alt={dictName} />
        : <BookOpen className="size-4 text-foreground" />}

      <span className="text-sm font-medium text-foreground">
        {!!webLink
          ? (
            <a href={webLink} target="_blank" className="uppercase hover:underline">
              {dictName}
            </a>
          )
          : <>{ dictName }</>}
      </span>
    </div>
  )
}

function DictLoading({ word, dictName }: DictProps) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-2">
        <DictTitle word={word} dictName={dictName} />
        <div className="h-5 w-32 animate-pulse rounded-md bg-muted"></div>
        <div className="h-5 w-full animate-pulse rounded-md bg-muted"></div>
        <div className="h-5 w-full animate-pulse rounded-md bg-muted"></div>
      </div>
    </>
  )
}

async function lookup(word: string, dictName: DictName) {
  return sendMessage(Messages.lookup, { word, dictName }, 'background')
}

const playAudio = (text: string, audioUrl?: string) => {
  sendMessage(Messages.playAudio, { text, audioUrl }, 'background')
}

function AudioButton({ spelling, audioUrls }: { spelling: string, audioUrls: string[] }) {
  const [nextAudio, setNextAudio] = useState(audioUrls[0])

  return (
    <div
      role="button"
      data-pronounce
      onClick={() => {
        playAudio(spelling, nextAudio)
        setNextAudio(audioUrls[(audioUrls.indexOf(nextAudio) + 1) % audioUrls.length])
      }}
      className="mt-1 px-2 text-muted-foreground hover:text-primary"
    >
      <Volume2 className="h-3 w-3" />
    </div>
  )
}

function PitchAccents({ spelling, pitchAccents }: {
  spelling: string
  pitchAccents: {
    audioUrl: string
    html: string
  }[]
}) {
  const accent = pitchAccents[0]
  if (!accent) return null

  return (
    <div
      key={accent.audioUrl}
      className="flex text-xs text-muted-foreground"
      style={{
        '--background-color': 'var(--card)',
        '--pitch-high-s': 'rgb(232, 104, 123)',
        '--pitch-high-e': 'rgba(232, 104, 123, 0)',
        '--pitch-low-s': 'rgb(78, 134, 202)',
        '--pitch-low-e': 'rgb(78, 134, 202, 0)',
      } as React.CSSProperties}
    >
      <div dangerouslySetInnerHTML={{ __html: accent.html }}></div>
      <AudioButton spelling={spelling} audioUrls={[accent.audioUrl]} />
    </div>
  )
}

function Badge({ text = '' }: { text: string }) {
  let level = 1

  const jlptMatches = text.match(/N(\d)/)
  if (jlptMatches) {
    level = parseInt(jlptMatches[1])
  } else {
    const jpdbMatches = text.match(/Top\s+(\d+)/i)
    if (jpdbMatches) {
      const top = parseInt(jpdbMatches[1])
      if (top < 1000) level = 5
      else if (top < 2000) level = 4
      else if (top < 3000) level = 3
      else if (top < 8000) level = 2
      else level = 1
    }
  }

  // use Literal string to let tailwind generate at build time
  const classNames = [
    '',
    'bg-tag-1/20 text-tag-1 border-tag-1/50',
    'bg-tag-2/20 text-tag-2 border-tag-2/50',
    'bg-tag-3/20 text-tag-3 border-tag-3/50',
    'bg-tag-4/20 text-tag-4 border-tag-4/50',
    'bg-tag-5/20 text-tag-5 border-tag-5/50',
  ][level]

  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-1 py-0.5 text-[10px] leading-[0.9] font-medium text-nowrap',
      classNames,
    )}
    >
      {text}
    </span>
  )
}

export default Dict
