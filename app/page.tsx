import dynamic from 'next/dynamic'

// Dynamically import to avoid SSR issues with Three.js
const AppleHeatmapScene = dynamic(() => import('../components/AppleHeatmapScene').then(mod => ({ default: mod.AppleHeatmapScene })), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-black flex items-center justify-center text-white">Loading...</div>
})

export default function Home() {
  return (
    <div className="w-full h-screen bg-black">
      <AppleHeatmapScene />
    </div>
  );
}
