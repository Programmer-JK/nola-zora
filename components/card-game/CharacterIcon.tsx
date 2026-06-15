export default function CharacterIcon({ size = 80 }: { size?: number }) {
  return (
    <img
      src="/charater-association.svg"
      width={size}
      height={size}
      alt="character card icon"
      style={{ display: 'block', margin: '0 auto' }}
    />
  )
}
