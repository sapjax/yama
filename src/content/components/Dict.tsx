import { use, Suspense, memo, PropsWithChildren } from 'react'
import { dictAdapters, DictionaryEntry, DictName } from '@/lib/core/dict'
import { Messages } from '@/lib/message'
import { sendMessage } from 'webext-bridge/content-script'
import { Volume2, BookOpen, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

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

      {data.definitions.map((definition, index) => (
        <div key={index} className="mb-3 last:mb-0">
          <div className="space-y-2 rounded-md border border-border bg-muted p-2.5 text-card-foreground">
            {/* Spelling and Reading */}
            <div className="flex items-center">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-medium text-foreground">{definition.spelling}</span>
                {definition.reading && definition.reading !== definition.spelling && (
                  <span className="text-xs text-muted-foreground">
                    [
                    {definition.reading}
                    ]
                  </span>
                )}
              </div>
              <div
                role="button"
                onClick={() => playAudio(definition.spelling, definition.audioUrl)}
                className="mt-1 px-2 text-muted-foreground hover:text-primary"
              >
                <Volume2 className="h-3 w-3" />
              </div>

              {/* Tags */}
              <div className="ml-auto flex flex-wrap gap-1">
                {!!definition.jlpt && (
                  <Badge classNames={getJLPTColor(definition.jlpt)}>
                    {definition.jlpt}
                  </Badge>
                )}
                {definition.frequency && (
                  <Badge classNames={getJLPTColor()}>
                    {definition.frequency}
                  </Badge>
                )}
              </div>
            </div>

            {/* Pitch Accent */}
            {definition.pitchAccent && (
              <div className="text-xs">
                <span className="text-muted-foreground">pitch: </span>
                <span className="font-mono text-foreground">{definition.pitchAccent}</span>
              </div>
            )}

            {/* Meanings */}
            <div>
              <ul className="space-y-0.5 text-sm leading-tight">
                {definition.meanings.map((meaning, meaningIndex) => (
                  <li key={meaningIndex} className="flex flex-col text-foreground">
                    <div className="flex">
                      <span className="mt-0.5 mr-1.5 flex-shrink-0 text-xs text-muted-foreground">
                        {meaningIndex + 1}
                        .
                      </span>
                      <span>{meaning.explain}</span>
                    </div>
                    {!!meaning.note && <div className="mb-2 pl-[2em] text-muted-foreground">{meaning.note}</div>}
                  </li>
                ))}
              </ul>
            </div>

            {/* Alternative Spellings */}
            {definition.altSpellings && definition.altSpellings.length > 0 && (
              <div className="mt-4 text-xs">
                <table className="mt-1 w-fit border-separate border border-accent-foreground text-center text-xs text-muted-foreground">
                  <caption className="caption-bottom p-2">Alt Spellings </caption>
                  <tbody>
                    <tr>
                      {definition.altSpellings.map((s, i) => (
                        <td key={i} className="border border-accent-foreground p-2 text-sm whitespace-nowrap text-foreground" dangerouslySetInnerHTML={{ __html: s.spelling }}></td>
                      ))}
                    </tr>
                    <tr>
                      {definition.altSpellings.map((s, i) => (
                        <td key={i} className="border border-accent-foreground p-2">{s.percent}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Alternative Readings */}
            {definition.altReadings && definition.altReadings.length > 0 && (
              <div className="mt-4 text-xs">
                <table className="mt-1 w-fit table-auto border-separate border border-accent-foreground text-center text-xs text-muted-foreground">
                  <caption className="caption-bottom p-2">Alt Readings</caption>
                  <tbody>
                    <tr>
                      {definition.altReadings.map((s, i) => (
                        <td key={i} className="border border-accent-foreground p-2 text-sm whitespace-nowrap  text-foreground">{s.reading}</td>
                      ))}
                    </tr>
                    <tr>
                      {definition.altReadings.map((s, i) => (
                        <td key={i} className="border border-accent-foreground p-2">{s.percent}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Examples */}
            {definition.examples && definition.examples.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">例句:</span>
                {definition.examples.map((example, exampleIndex) => (
                  <div key={exampleIndex} className="rounded-md border border-accent/40 bg-accent/30 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs leading-tight font-medium text-foreground">{example.text}</p>
                      {example.audioUrl && (
                        <div
                          role="button"
                          onClick={() => playAudio(example.text, example.audioUrl)}
                          className="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground"
                        >
                          <Volume2 className="h-2.5 w-2.5" />
                        </div>
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
  if (audioUrl) {
    const audio = new Audio(audioUrl)
    audio.play().catch(console.error)
  } else {
    sendMessage(Messages.playAudio, { text }, 'background')
  }
}

const getJLPTColor = (level?: string) => {
  switch (level) {
    case 'N1':
      return 'bg-red-500/20 text-red-400 border-red-500/50'
    case 'N2':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/50'
    case 'N3':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
    case 'N4':
      return 'bg-green-500/20 text-green-400 border-green-500/50'
    case 'N5':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
    default:
      return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
  }
}

type BadgeProps = PropsWithChildren<{ classNames?: string }>

const Badge = ({ classNames, children }: BadgeProps) => {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-md px-1 py-0.5 text-[10px] leading-[0.9] font-medium', classNames,
    )}
    >
      {children}
    </span>
  )
}

export default Dict
