import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PRD → 设计方案生成器',
  description: '上传PRD文档，AI自动生成交互设计HTML方案',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
