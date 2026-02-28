import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const context = (formData.get('context') as string) || ''

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: '未配置 ANTHROPIC_API_KEY 环境变量' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })

    // 构建消息内容
    const userContent: Anthropic.MessageParam['content'] = []
    let docText = ''

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const fileName = file.name.toLowerCase()

      if (fileName.endsWith('.docx')) {
        // Word 文档：提取文本
        const mammoth = (await import('mammoth')).default
        const result = await mammoth.extractRawText({ buffer })
        docText = result.value
      } else if (fileName.endsWith('.pdf')) {
        // PDF：直接发给 Claude 理解
        userContent.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: buffer.toString('base64'),
          },
        } as any)
      } else if (fileName.match(/\.(png|jpg|jpeg|webp|gif)$/)) {
        // 图片：直接发给 Claude 识别
        const mediaType = file.type as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType || 'image/png',
            data: buffer.toString('base64'),
          },
        })
      }
    }

    // 拼装文字提示
    let prompt = `你是一位资深SaaS产品交互设计师，请根据下方PRD需求，生成3个不同风格的完整HTML交互设计方案。\n\n`

    if (docText) {
      prompt += `## PRD文档内容\n\`\`\`\n${docText}\n\`\`\`\n\n`
    }
    if (context) {
      prompt += `## 补充说明\n${context}\n\n`
    }
    if (!docText && !file && !context) {
      prompt += `请生成一个示例SaaS后台管理页面的3个设计方案作为演示。\n\n`
    }

    prompt += `## 设计要求
- 每个方案都是独立完整的单文件HTML（从DOCTYPE到</html>）
- 所有CSS写在<style>标签内，所有JS写在<script>标签内
- 包含完整的中文界面内容（用示例数据填充）
- 包含基础交互（弹窗、抽屉、状态切换等用JS模拟）
- 深色侧边栏（#1a1d27或#141721）配白色/深色主内容区
- 紫色/靛蓝色系主色调（#6366f1、#8b5cf6）
- 3个方案风格必须明显不同，例如：
  - 方案A：经典白色表格式，贴近现有系统风格
  - 方案B：卡片网格式，视觉层次更丰富
  - 方案C：深色专业版，暗色主题更酷炫

## 严格输出格式
必须按照以下XML标签格式输出，不要有任何多余的文字：

<DESIGN id="1" title="方案A-经典表格">
<!DOCTYPE html>
<html>
...完整HTML代码...
</html>
</DESIGN>
<DESIGN id="2" title="方案B-卡片式">
<!DOCTYPE html>
<html>
...完整HTML代码...
</html>
</DESIGN>
<DESIGN id="3" title="方案C-深色专业">
<!DOCTYPE html>
<html>
...完整HTML代码...
</html>
</DESIGN>`

    userContent.push({ type: 'text', text: prompt })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      messages: [{ role: 'user', content: userContent }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    // 解析设计方案
    const designs: { id: string; title: string; html: string }[] = []
    const regex = /<DESIGN id="(\d+)" title="([^"]+)">([\s\S]*?)<\/DESIGN>/g
    let match

    while ((match = regex.exec(rawText)) !== null) {
      const html = match[3].trim()
      designs.push({ id: match[1], title: match[2], html })
    }

    // 如果解析失败，返回原始内容作为兜底
    if (designs.length === 0) {
      designs.push({ id: '1', title: '生成结果', html: rawText })
    }

    return NextResponse.json({ success: true, designs })
  } catch (err: any) {
    console.error('[generate]', err)
    return NextResponse.json(
      { success: false, error: err.message || '生成失败' },
      { status: 500 }
    )
  }
}
