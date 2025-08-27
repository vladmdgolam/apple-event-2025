import Link from "next/link"

type InfoPanelProps = {
  onToggleControls?: () => void
  onRandomizeColors?: () => void
}

export const InfoPanel = ({ onToggleControls, onRandomizeColors }: InfoPanelProps) => {
  return (
    <div className="fixed top-0 left-4 text-white text-sm font-mono z-10 pt-[calc(16px+env(safe-area-inset-top))]">
      <div>Apple Event experience recreation</div>
      <div>
        <button
          type="button"
          onClick={onToggleControls}
          className="underline inline px-0 py-0 m-0 bg-transparent border-0 cursor-pointer text-inherit"
        >
          toggle controls (L)
        </button>
      </div>
      <div>
        <button
          type="button"
          onClick={onRandomizeColors}
          className="underline inline px-0 py-0 m-0 bg-transparent border-0 cursor-pointer text-inherit"
        >
          randomize colors (R)
        </button>
      </div>
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
