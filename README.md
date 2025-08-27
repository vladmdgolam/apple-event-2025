# Apple 2025 Heatmap Recreation

A pixel-perfect recreation of Apple's interactive heatmap effect from their 2025 homepage, built with Next.js, React Three Fiber, and custom WebGL shaders.

## Features

- **Exact Apple Implementation**: Reverse-engineered from Apple's original WebGL code
- **Interactive Heat Effect**: Touch and drag to generate dynamic heat visualizations
- **Mobile Optimized**: Touch-aware with mobile-specific radius calculations
- **WebGL Shaders**: Custom vertex and fragment shaders matching Apple's exact implementation
- **Ping-Pong Rendering**: Advanced render target switching for smooth heat decay

## Tech Stack

- **Next.js 15** - React framework
- **React Three Fiber** - React renderer for Three.js
- **Three.js** - 3D graphics library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the heatmap in action.

## Project Structure

- `components/AppleExactHeatmap.tsx` - Main heatmap component with Apple's exact implementation
- `components/DrawRenderer.tsx` - Modular draw renderer component (WIP)
- `app/page.tsx` - Main page showcasing the heatmap

## Implementation Details

This project recreates Apple's complex WebGL heatmap system including:

- **Draw Renderer**: Ping-pong render targets for heat accumulation
- **Heat Shader**: Multi-color gradient system with 7 distinct colors
- **Mobile Detection**: Touch-specific radius calculations (280px vs 220px)
- **Gesture Handling**: DOM-based pointer events matching Apple's approach
- **Frame-based Animation**: Proper delta timing for consistent heat buildup

## Key Components

### DrawRenderer
- Ping-pong rendering between two render targets
- Apple's exact shader uniforms and fade damping (0.98)
- Mobile-aware radius calculations

### HeatMesh  
- 7-color gradient system matching Apple's palette
- Video texture integration with Apple's exact blending
- Heat accumulation with proper decay rates

## Assets Required

Place these files in the `public/` directory:
- `logo__dcojfwkzna2q.png` - Apple logo mask
- `large_2x.mp4` - Background video texture

## Development

The project uses modern React patterns with Three.js:
- Custom hooks for WebGL management
- TypeScript for type safety
- Modular component architecture
- Performance optimizations with useMemo and useCallback
