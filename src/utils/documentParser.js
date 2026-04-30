import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import mammoth from 'mammoth/mammoth.browser'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export function canParseDocumentFile(file) {
  const name = file.name.toLowerCase()
  return (
    file.type === 'application/pdf' ||
    file.type === DOCX_MIME ||
    name.endsWith('.pdf') ||
    name.endsWith('.docx')
  )
}

export function isLegacyWordFile(file) {
  return file.name.toLowerCase().endsWith('.doc')
}

export async function parseDocumentFile(file) {
  const name = file.name.toLowerCase()
  const arrayBuffer = await file.arrayBuffer()

  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    return {
      textContent: await parsePdf(arrayBuffer),
      parser: 'pdfjs'
    }
  }

  if (file.type === DOCX_MIME || name.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ arrayBuffer })
    return {
      textContent: result.value,
      parser: 'mammoth',
      warnings: result.messages || []
    }
  }

  throw new Error('当前只支持解析 PDF 和 DOCX 文档。')
}

async function parsePdf(arrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  const pages = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const text = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (text) pages.push(`--- 第 ${pageNumber} 页 ---\n${text}`)
  }

  return pages.join('\n\n').trim()
}
