import Link from "next/link"

export const InfoPanel = () => {
  return (
    <div className="absolute top-4 left-4 text-white text-sm font-mono z-10">
      <div>Apple Event experience recreation</div>
      <div>press L to toggle controls</div>
      <div>
        ported by{" "}
        <Link className="underline" target="_blank" href="https://vladik.xyz/">
          vladik.xyz
        </Link>
      </div>
      <div>
        <Link
          className="underline"
          target="_blank"
          href="https://github.com/vladmdgolam/apple-event-2025"
        >
          view on github
        </Link>
      </div>
    </div>
  )
}