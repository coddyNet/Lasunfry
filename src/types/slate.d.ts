import { BaseEditor } from 'slate'
import { ReactEditor } from 'slate-react'
import { HistoryEditor } from 'slate-history'

export type CustomElement = {
  type: 'paragraph' | 'block-quote' | 'bulleted-list' | 'heading-one' | 'heading-two' | 'list-item' | 'numbered-list' | 'check-list-item'
  align?: string
  checked?: boolean
  children: CustomText[]
}

export type CustomText = {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  underline?: boolean
  strikethrough?: boolean
}

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: CustomElement
    Text: CustomText
  }
}
