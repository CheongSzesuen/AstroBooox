import { useMemo, useState } from 'react'

export function CcInteractiveGrid({ cellSize = 64, className = '' }: { cellSize?: number; className?: string }) {
  const cellWidth = cellSize
  const cellHeight = cellSize
  const columns = 16
  const rows = 16
  const [hoveredIndex, setHoveredIndex] = useState(-1)

  const cells = useMemo(() => {
    const result: Array<{ index: number; x: number; y: number }> = []
    const total = columns * rows
    for (let index = 0; index < total; index += 1) {
      const x = (index % columns) * cellWidth
      const y = Math.floor(index / columns) * cellHeight
      result.push({ index, x, y })
    }
    return result
  }, [cellHeight, cellWidth])

  return (
    <svg width={cellWidth * columns} height={cellHeight * rows} className={`absolute inset-0 h-full w-full border border-white/25 ${className}`} aria-hidden="true">
      {cells.map((cell) => (
        <rect
          key={cell.index}
          x={cell.x}
          y={cell.y}
          width={cellWidth}
          height={cellHeight}
          className="stroke-white/25 transition-all duration-150"
          fill={hoveredIndex === cell.index ? 'rgba(255,255,255,0.2)' : 'transparent'}
          onMouseEnter={() => setHoveredIndex(cell.index)}
          onMouseLeave={() => setHoveredIndex(-1)}
        />
      ))}
    </svg>
  )
}
