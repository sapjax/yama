import { WordMarker } from '@/lib/core/mark/marker'
import { Segmenter, LinderaSegmenter } from '@/lib/core/segment'
import { type Dictionary, type DictName, dictAdapters } from '@/lib/core/dict'
import { JpdbSynchronizer } from '@/lib/core/sync'

interface Initializable {
  init(): Promise<void>
}

/**
 * The service container, responsible for the instantiation and lifecycle management of all core services.
 */
class ServiceContainer {
  public readonly segmenter: Segmenter & Initializable
  public readonly wordMarker: WordMarker & Initializable
  public readonly jpdbSynchronizer: JpdbSynchronizer

  private readonly initPromises = new Map<Initializable, Promise<void>>()

  constructor() {
    this.segmenter = new LinderaSegmenter()
    this.wordMarker = new WordMarker()
    this.jpdbSynchronizer = new JpdbSynchronizer()
  }

  public ensureInitialized(service: Initializable): Promise<void> {
    if (this.initPromises.has(service)) {
      return this.initPromises.get(service)!
    }

    const promise = service.init()
    this.initPromises.set(service, promise)
    return promise
  }

  public getDictionary(name: DictName): Dictionary {
    return dictAdapters[name]
  }
}

export const services = new ServiceContainer()
