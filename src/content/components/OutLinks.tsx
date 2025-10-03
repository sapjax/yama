const links = [
  {
    title: 'Jisho',
    url: 'https://jisho.org/search/{q}',
    icon: 'https://lh3.googleusercontent.com/0nWqEmnYktfcys16zlYrabaIguU6nkLPD2UxENF50p_C726fX0xEf4vjN4E5VYU2iOrK1uFpc7w82puxM7cD-zyZrQ=s128-rj-sc0x00ffffff',
  },
  {
    title: 'JPDB',
    url: 'https://jpdb.io/search?q={q}',
    icon: 'https://jpdb.io/static/533228467534.png',
  },
]

function OutLinks({ word }: { word: string }) {
  return (
    <div className="flex justify-end gap-2 p-2 pt-0">
      {links.map(link => (
        <a
          key={link.title}
          href={link.url.replace('{q}', encodeURIComponent(word))}
          target="_blank"
          rel="noopener noreferrer"
          title={link.title}
          className="inline-block rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        >
          <img src={link.icon} alt={link.title} className="h-5 w-5 rounded-md" />
        </a>
      ))}
    </div>
  )
}

export default OutLinks
