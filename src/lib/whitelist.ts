const WHITELIST_KEY = 'domainWhitelist'

// no hostname for local file or chrome://extension... use pathname instead
export function getUrlDomain(urlString: string) {
  try {
    const url = new URL(urlString)
    return url.hostname || url.pathname
  } catch (e) {
    return ''
  }
}

export async function getWhitelist(): Promise<string[]> {
  const result = await chrome.storage.sync.get(WHITELIST_KEY)
  return result[WHITELIST_KEY] || []
}

export async function addToWhitelist(domain: string) {
  const whitelist = await getWhitelist()
  if (!whitelist.includes(domain)) {
    whitelist.push(domain)
    await chrome.storage.sync.set({ [WHITELIST_KEY]: whitelist })
  }
}

export async function removeFromWhitelist(domain: string) {
  let whitelist = await getWhitelist()
  whitelist = whitelist.filter(d => d !== domain)
  await chrome.storage.sync.set({ [WHITELIST_KEY]: whitelist })
}

export async function isDomainWhitelisted(domain: string): Promise<boolean> {
  const whitelist = await getWhitelist()
  return whitelist.includes(domain)
}

export async function isUrlWhitelisted(url: string): Promise<boolean> {
  const whitelist = await getWhitelist()
  return whitelist.includes(getUrlDomain(url))
}
