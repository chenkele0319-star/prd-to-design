'use client'

import { useState, useRef, useCallback } from 'react'

interface Design {
  id: string
  title: string
  html: string
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [context, setContext] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [designs, setDesigns] = useState<Design[]>([])
  const [error, setError] = useState('')
  const [activeDesign, setActiveDesign] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadingMessages = [
    '正在解析文档内容...',
    '理解需求结构与交互逻辑...',
    '生成方案A：经典表格布局...',
    '生成方案B：卡片视觉设计...',
    '生成方案C：专业深色版...',
    '最后润色中，马上好...',
  ]

  const handleFile = (f: File) => {
    const allowed = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
    const extAllowed = ['.docx', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif']
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!allowed.includes(f.type) && !extAllowed.includes(ext)) {
      setError('仅支持 Word (.docx)、PDF、图片文件')
      return
    }
    setFile(f)
    setError('')
    setDesigns([])
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const generate = async () => {
    if (!file && !context.trim()) {
      setError('请上传文档或输入需求描述')
      return
    }
    setLoading(true)
    setError('')
    setDesigns([])

    let msgIdx = 0
    setLoadingMsg(loadingMessages[0])
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % loadingMessages.length
      setLoadingMsg(loadingMessages[msgIdx])
    }, 3000)

    try {
      const formData = new FormData()
      if (file) formData.append('file', file)
      formData.append('context', context)

      const res = await fetch('/api/generate', { method: 'POST', body: formData })
      const data = await res.json()

      if (!data.success) throw new Error(data.error || '生成失败，请重试')
      setDesigns(data.designs)
      setActiveDesign(0)
    } catch (err: any) {
      setError(err.message || '生成失败，请检查网络或API Key配置')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  const downloadHtml = (design: Design) => {
    const blob = new Blob([design.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${design.title}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openInNewTab = (design: Design) => {
    const blob = new Blob([design.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const fileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (ext === 'docx') return '📄'
    if (ext === 'pdf') return '📕'
    return '🖼️'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部导航 */}
      <header style={{
        background: '#141721',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 32px',
        height: 58,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
          }}>✦</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>PRD → 设计方案</span>
          <span style={{
            background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
            fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
          }}>Beta</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          上传PRD文档，AI自动生成3个可交互的设计方案
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', padding: '40px 24px', width: '100%' }}>

        {/* 主标题区 */}
        {designs.length === 0 && !loading && (
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{
              fontSize: 36, fontWeight: 800, color: '#fff',
              background: 'linear-gradient(135deg,#c7d2fe,#a5b4fc,#8b5cf6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 12,
            }}>
              把PRD变成设计稿
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
              上传 Word / PDF / 截图，AI 自动理解需求<br />
              生成 3 个不同风格的可交互 HTML 设计方案
            </p>
          </div>
        )}

        {designs.length === 0 ? (
          /* 上传区域 */
          <div style={{ maxWidth: 680, margin: '0 auto' }}>

            {/* 拖拽上传区 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              style={{
                border: `2px dashed ${dragging ? '#6366f1' : file ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 16,
                padding: '40px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragging ? 'rgba(99,102,241,0.08)' : file ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s',
                marginBottom: 16,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,.png,.jpg,.jpeg,.webp,.gif"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />

              {file ? (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>{fileIcon(file.name)}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#a5b4fc', marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    {(file.size / 1024).toFixed(1)} KB · 点击重新选择
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 44, marginBottom: 14 }}>📎</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                    拖拽文件到此处，或点击选择
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.8 }}>
                    支持 Word (.docx)、PDF、PNG / JPG 截图<br />
                    可以上传PRD文档、需求截图、逻辑图等
                  </div>
                </div>
              )}
            </div>

            {/* 补充说明 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                补充说明（可选）· 比如设计偏好、特殊要求、品牌色等
              </div>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="例如：这是一个SaaS管理系统，主色调用紫色，需要深色侧边栏，用户是运营人员..."
                rows={4}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 13,
                  color: '#e4e8f0',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5',
                marginBottom: 16,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={generate}
              disabled={loading}
              style={{
                width: '100%',
                height: 52,
                background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#7c3aed)',
                border: 'none',
                borderRadius: 12,
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
              }}
            >
              {loading ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                  生成中...
                </>
              ) : '✦ 生成设计方案'}
            </button>

            {/* 示例说明 */}
            <div style={{
              marginTop: 32,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}>
              {[
                { icon: '📄', title: 'Word PRD', desc: '直接上传产品需求文档，自动提取文字内容' },
                { icon: '📕', title: 'PDF 文件', desc: 'PDF格式需求文档，Claude直接理解内容' },
                { icon: '🖼️', title: '截图 / 逻辑图', desc: '上传流程图、原型截图，图文并茂理解需求' },
              ].map(item => (
                <div key={item.title} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 结果展示区 */
          <div>
            {/* 结果顶栏 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 24,
            }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                  ✦ 已生成 {designs.length} 个设计方案
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                  基于「{file?.name || '文字描述'}」生成
                </div>
              </div>
              <button
                onClick={() => { setDesigns([]); setFile(null); setContext('') }}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ← 重新上传
              </button>
            </div>

            {/* 方案标签页 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {designs.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => setActiveDesign(i)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: activeDesign === i ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    background: activeDesign === i ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    color: activeDesign === i ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                    fontSize: 13,
                    fontWeight: activeDesign === i ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {d.title}
                </button>
              ))}
            </div>

            {/* 当前方案预览 */}
            {designs[activeDesign] && (
              <div style={{
                background: '#141721',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                overflow: 'hidden',
              }}>
                {/* 预览工具栏 */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', opacity: 0.7 }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', opacity: 0.7 }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', opacity: 0.7 }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginLeft: 8 }}>
                      {designs[activeDesign].title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => openInNewTab(designs[activeDesign])}
                      style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 12,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                      }}
                    >
                      ↗ 新窗口打开
                    </button>
                    <button
                      onClick={() => downloadHtml(designs[activeDesign])}
                      style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 12,
                        background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
                        color: '#a5b4fc', cursor: 'pointer', fontWeight: 500,
                      }}
                    >
                      ↓ 下载 HTML
                    </button>
                  </div>
                </div>

                {/* iframe 预览 */}
                <iframe
                  srcDoc={designs[activeDesign].html}
                  style={{ width: '100%', height: 720, border: 'none', display: 'block' }}
                  title={designs[activeDesign].title}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            )}

            {/* 所有方案下载 */}
            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
              {designs.map(d => (
                <button
                  key={d.id}
                  onClick={() => downloadHtml(d)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                  }}
                >
                  ↓ {d.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading 全屏遮罩 */}
        {loading && (
          <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(12,14,24,0.92)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(8px)',
          }}>
            {/* 动画圆圈 */}
            <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 28 }}>
              <div style={{
                position: 'absolute', inset: 0,
                border: '3px solid rgba(99,102,241,0.15)',
                borderTop: '3px solid #6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <div style={{
                position: 'absolute', inset: 8,
                border: '2px solid rgba(139,92,246,0.15)',
                borderBottom: '2px solid #8b5cf6',
                borderRadius: '50%',
                animation: 'spin 1.5s linear infinite reverse',
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>✦</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
              AI 正在生成设计方案
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
              {loadingMsg}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#6366f1',
                  animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
